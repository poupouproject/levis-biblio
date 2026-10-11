/**
 * enricher-bnf.ts
 * Réconciliation des éditions avec la BnF via SPARQL.
 *
 * Pour chaque édition dans Supabase sans oeuvre_id (non réconciliée) :
 *   1. Collecte les ISBN par lots de 1000 max
 *   2. Interroge data.bnf.fr/sparql → arkOeuvre + arkManifestation
 *   3. Upsert l'oeuvre dans la table `oeuvres` (bnf_ark)
 *   4. Met à jour l'édition : oeuvre_id + statut_reconciliation = 'reconcilie_bnf'
 *
 * Usage :
 *   npx ts-node enricher-bnf.ts            → traite toutes les éditions non réconciliées
 *   npx ts-node enricher-bnf.ts --dry-run  → affiche les résultats sans écrire
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BNF_SPARQL = 'https://data.bnf.fr/sparql';
const BATCH_ISBN = 1000;    // max ISBN par requête SPARQL
const BATCH_DB   = 500;     // max éditions récupérées par page Supabase
const DRY_RUN    = process.argv.includes('--dry-run');

const attendre = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EditionNonReconciliee {
  id: string;
  isbn: string;
  titre_brut: string | null;
}

interface ResultatBnF {
  isbn: string;
  arkOeuvre: string;
  arkManifestation: string;
}

// ---------------------------------------------------------------------------
// Étape 1 : lire les éditions sans oeuvre_id
// ---------------------------------------------------------------------------
async function lireEditionsNonReconciliees(): Promise<EditionNonReconciliee[]> {
  const editions: EditionNonReconciliee[] = [];
  let from = 0;

  console.log('📖 Lecture des éditions non réconciliées...');

  while (true) {
    const { data, error } = await supabase
      .from('editions')
      .select('id, isbn, titre_brut')
      .is('oeuvre_id', null)
      .not('isbn', 'is', null)
      .range(from, from + BATCH_DB - 1);

    if (error) {
      console.error('❌ Erreur lecture Supabase :', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    editions.push(...(data as EditionNonReconciliee[]));
    console.log(`  → ${editions.length} éditions chargées...`);

    if (data.length < BATCH_DB) break;
    from += BATCH_DB;
  }

  return editions;
}

// ---------------------------------------------------------------------------
// Étape 2 : requête BnF SPARQL (lot d'ISBN)
// ---------------------------------------------------------------------------
async function interrogerBnF(isbns: string[]): Promise<ResultatBnF[]> {
  const valuesString = isbns.map(isbn => `"${isbn}"`).join(' ');

  const sparqlQuery = `
PREFIX bnf-onto: <http://data.bnf.fr/ontology/bnf-onto/>
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>

SELECT DISTINCT ?isbn ?arkOeuvre ?arkManifestation WHERE {
  VALUES ?isbn { ${valuesString} }
  ?arkManifestation bnf-onto:isbn ?isbn .
  ?arkManifestation rdarelationships:workManifested ?arkOeuvre .
}`;

  const response = await fetch(BNF_SPARQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/sparql-results+json',
    },
    body: new URLSearchParams({ query: sparqlQuery, format: 'json' }),
  });

  if (!response.ok) {
    throw new Error(`BnF HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { results: { bindings: Record<string, { value: string }>[] } };

  return data.results.bindings.map(b => ({
    // Normalise l'ISBN BnF (avec tirets) → chiffres purs pour matcher notre index
    isbn:             b['isbn']!.value.replace(/[-\s]/g, ''),
    arkOeuvre:        b['arkOeuvre']!.value,
    arkManifestation: b['arkManifestation']!.value,
  }));
}

// ---------------------------------------------------------------------------
// Étape 3 : upsert oeuvre + mise à jour édition
// ---------------------------------------------------------------------------

/** Retourne true si l'ARK est un identifiant temporaire BnF (pas encore pérenne) */
function estTempWork(ark: string): boolean {
  return ark.includes('/temp-work/');
}

async function reconcilier(
  edition: EditionNonReconciliee,
  resultat: ResultatBnF,
): Promise<void> {
  const statut = estTempWork(resultat.arkOeuvre)
    ? 'reconcilie_bnf_temp'
    : 'reconcilie_bnf';

  if (DRY_RUN) {
    const tag = estTempWork(resultat.arkOeuvre) ? ' [temp-work]' : '';
    console.log(`  [DRY-RUN] "${edition.titre_brut}"${tag} → ${resultat.arkOeuvre}`);
    return;
  }

  // Upsert de l'oeuvre (on_conflict sur bnf_ark)
  const { data: oeuvre, error: errOeuvre } = await supabase
    .from('oeuvres')
    .upsert(
      { bnf_ark: resultat.arkOeuvre },
      { onConflict: 'bnf_ark' },
    )
    .select('id')
    .single();

  if (errOeuvre || !oeuvre) {
    console.error(`  ❌ Upsert oeuvre échoué pour ISBN ${edition.isbn} :`, errOeuvre?.message);
    return;
  }

  // Mise à jour de l'édition
  const { error: errEdition } = await supabase
    .from('editions')
    .update({
      oeuvre_id:             oeuvre.id,
      statut_reconciliation: statut,
    })
    .eq('id', edition.id);

  if (errEdition) {
    console.error(`  ❌ Update édition échoué (${edition.id}) :`, errEdition.message);
  }
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  if (DRY_RUN) console.log('🔍 Mode dry-run : aucune écriture.\n');

  const editions = await lireEditionsNonReconciliees();

  if (editions.length === 0) {
    console.log('✅ Toutes les éditions sont déjà réconciliées.');
    return;
  }

  console.log(`\n🔎 ${editions.length} éditions à réconcilier.\n`);

  // Index editions par ISBN pour retrouver rapidement
  const indexParIsbn = new Map<string, EditionNonReconciliee>();
  for (const ed of editions) indexParIsbn.set(ed.isbn, ed);

  const isbns = [...indexParIsbn.keys()];
  let totalReconcilies = 0;
  let totalBatch = 0;

  // Traitement par lots de BATCH_ISBN
  for (let i = 0; i < isbns.length; i += BATCH_ISBN) {
    const lot = isbns.slice(i, i + BATCH_ISBN);
    totalBatch++;

    console.log(`📦 Lot ${totalBatch} — ${lot.length} ISBN (${i + 1}–${Math.min(i + BATCH_ISBN, isbns.length)} / ${isbns.length})`);

    try {
      const resultats = await interrogerBnF(lot);
      console.log(`  → ${resultats.length} correspondances BnF trouvées`);

      for (const res of resultats) {
        const edition = indexParIsbn.get(res.isbn);
        if (!edition) continue;

        await reconcilier(edition, res);
        totalReconcilies++;
      }

      // Affichage des ISBN sans correspondance BnF
      const isbnsTrouves = new Set(resultats.map(r => r.isbn));
      const sansReponse = lot.filter(isbn => !isbnsTrouves.has(isbn));
      if (sansReponse.length > 0) {
        console.log(`  ⚠️  ${sansReponse.length} ISBN sans correspondance BnF`);
      }

    } catch (err) {
      console.error(`  ❌ Erreur lot ${totalBatch} :`, err);
    }

    // Pause polie entre les lots
    if (i + BATCH_ISBN < isbns.length) {
      await attendre(1500);
    }
  }

  console.log(`\n🎉 Terminé ! ${totalReconcilies} éditions réconciliées sur ${editions.length}.`);
}

main();
