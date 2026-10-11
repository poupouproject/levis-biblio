/**
 * reconciliateur-ol.ts
 * Réconciliation des éditions non-reconciliées avec les Œuvres d'Open Library.
 *
 * Pour chaque édition avec statut_reconciliation = 'non_reconcilie' :
 *   1. Cherche l'œuvre OL via ISBN → récupère l'ol_work_id
 *   2. Si une oeuvre avec cet ol_work_id existe déjà → on y rattache l'édition
 *   3. Sinon → crée une nouvelle oeuvre depuis OL, puis rattache l'édition
 *   4. Met à jour statut_reconciliation = 'reconcilie_ol'
 *
 * Usage :
 *   npx ts-node reconciliateur-ol.ts              → traite toutes les éditions non-réconciliées
 *   npx ts-node reconciliateur-ol.ts --dry-run    → affiche sans écrire
 *   npx ts-node reconciliateur-ol.ts --batch 100  → change la taille du batch (défaut : 50)
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

const DRY_RUN = process.argv.includes('--dry-run');
const batchArg = process.argv.indexOf('--batch');
const BATCH_SIZE = batchArg !== -1 ? parseInt(process.argv[batchArg + 1] ?? '50', 10) : 50;
const DELAI_MS = 400; // 400ms entre chaque appel réseau = 2.5 req/s (< 3 req/s limit)
const DELAI_AUTEUR_MS = 500; // 500ms pour les appels d'auteurs

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EditionNonReconciliee {
  id: string;
  isbn: string;
  title_id: string | null;
  titre_brut: string;
  auteur_brut: string | null;
  annee_publication: number | null;
  format: string | null;
  image_couverture: string | null;
}

interface OeuvreRow {
  id: string;
  ol_work_id: string;
}

interface OLEditionResponse {
  works?: Array<{ key: string }>;
  title?: string;
  authors?: Array<{ key: string }>;
  publishers?: string[];
  number_of_pages?: number;
  publish_date?: string;
  covers?: number[];
}

interface OLWorkResponse {
  key: string;
  title?: string;
  authors?: Array<{ author: { key: string } }>;
  description?: string | { value: string };
  subjects?: string[];
}

interface OLAuthorResponse {
  name?: string;
  personal_name?: string;
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
const attendre = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function extraireTexte(val: string | { value: string } | undefined): string | null {
  if (!val) return null;
  return typeof val === 'string' ? val : val.value;
}

// ---------------------------------------------------------------------------
// Open Library — cherche via ISBN (Books API)
// Retourne ol_work_id + métadonnées de base
// ---------------------------------------------------------------------------
async function chercherParISBN(isbn: string): Promise<{
  ol_work_id: string | null;
  titre: string | null;
  auteurs: string[];
  resume: string | null;
  sujets: string[];
  editeur: string | null;
  nb_pages: number | null;
}> {
  const vide = { ol_work_id: null, titre: null, auteurs: [], resume: null, sujets: [], editeur: null, nb_pages: null };
  try {
    const url = `https://openlibrary.org/isbn/${isbn}.json`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'levis-biblio-reconciliateur/1.0 (info@nexvio.ca)' },
    });
    if (!resp.ok) return vide;

    const book = await resp.json() as OLEditionResponse;
    if (!book.works?.length) return vide;

    const ol_work_id = book.works[0]!.key.replace('/works/', '');

    return {
      ol_work_id,
      titre: book.title ?? null,
      auteurs: [], // les auteurs sont récupérés via la Works API (seulement des clés ici)
      resume: null,
      sujets: [],
      editeur: book.publishers?.[0] ?? null,
      nb_pages: book.number_of_pages ?? null,
    };
  } catch {
    return vide;
  }
}

// ---------------------------------------------------------------------------
// Open Library — détails de l'œuvre (Works API)
// Utilisé quand Books API ne retourne pas de titre/auteurs complets
// ---------------------------------------------------------------------------
async function chercherOeuvreOL(ol_work_id: string): Promise<{
  titre: string | null;
  auteurs: string[];
  resume: string | null;
  sujets: string[];
}> {
  try {
    const url = `https://openlibrary.org/works/${ol_work_id}.json`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'levis-biblio-reconciliateur/1.0 (info@nexvio.ca)' },
    });
    if (!resp.ok) return { titre: null, auteurs: [], resume: null, sujets: [] };

    const work = await resp.json() as OLWorkResponse;

    // Récupère les noms d'auteurs (nécessite des appels séparés)
    const auteurs: string[] = [];
    for (const a of (work.authors ?? []).slice(0, 5)) {
      const authorKey = a.author?.key;
      if (!authorKey) continue;
      try {
        await attendre(DELAI_AUTEUR_MS);
        const aResp = await fetch(`https://openlibrary.org${authorKey}.json`, {
          headers: { 'User-Agent': 'levis-biblio-reconciliateur/1.0 (info@nexvio.ca)' },
        });
        if (aResp.ok) {
          const aData = await aResp.json() as OLAuthorResponse;
          const nom = aData.personal_name ?? aData.name;
          if (nom) auteurs.push(nom);
        }
      } catch { /* ignore */ }
    }

    return {
      titre: work.title ?? null,
      auteurs,
      resume: extraireTexte(work.description),
      sujets: (work.subjects ?? []).slice(0, 20),
    };
  } catch {
    return { titre: null, auteurs: [], resume: null, sujets: [] };
  }
}

// ---------------------------------------------------------------------------
// Récupère ou crée une oeuvre dans Supabase
// Retourne l'UUID de l'oeuvre
// ---------------------------------------------------------------------------
async function obtenirOuCreerOeuvre(
  ol_work_id: string,
  titre: string,
  auteurs: string[],
  resume: string | null,
  sujets: string[],
): Promise<string | null> {
  // 1. Vérifier si l'oeuvre existe déjà
  const { data: existing, error: fetchError } = await supabase
    .from('oeuvres')
    .select('id, ol_work_id')
    .eq('ol_work_id', ol_work_id)
    .maybeSingle<OeuvreRow>();

  if (fetchError) {
    console.error(`  ❌ Erreur recherche oeuvre (${ol_work_id}):`, fetchError.message);
    return null;
  }

  if (existing) {
    return existing.id;
  }

  // 2. Créer une nouvelle oeuvre
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Créerait oeuvre : "${titre}" (${ol_work_id})`);
    return 'dry-run-id';
  }

  const { data: created, error: insertError } = await supabase
    .from('oeuvres')
    .insert({
      titre,
      auteurs,
      resume,
      sujets,
      ol_work_id,
      langue: 'fr',
    })
    .select('id')
    .single<{ id: string }>();

  if (insertError) {
    console.error(`  ❌ Erreur création oeuvre "${titre}":`, insertError.message);
    return null;
  }

  console.log(`  ✨ Nouvelle oeuvre créée : "${titre}" (${ol_work_id})`);
  return created.id;
}

// ---------------------------------------------------------------------------
// Boucle principale
// ---------------------------------------------------------------------------
async function reconcilier(): Promise<void> {
  console.log(`🔍 Démarrage de la réconciliation OL${DRY_RUN ? ' (DRY RUN — aucune écriture)' : ''}`);
  console.log(`   Batch size : ${BATCH_SIZE}`);

  let offset = 0;
  let totalTraites = 0;
  let totalReconcilies = 0;
  let totalSansMatch = 0;

  while (true) {
    // Récupère un batch d'éditions non-réconciliées
    const { data: editions, error } = await supabase
      .from('editions')
      .select('id, isbn, title_id, titre_brut, auteur_brut, annee_publication, format, image_couverture')
      .eq('statut_reconciliation', 'non_reconcilie')
      .not('isbn', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1)
      .returns<EditionNonReconciliee[]>();

    if (error) {
      console.error('❌ Erreur Supabase :', error.message);
      break;
    }

    if (!editions || editions.length === 0) {
      console.log('\n✅ Plus d\'éditions à réconcilier.');
      break;
    }

    console.log(`\n📦 Batch ${Math.floor(offset / BATCH_SIZE) + 1} — ${editions.length} éditions`);

    for (const edition of editions) {
      totalTraites++;
      process.stdout.write(`  [${totalTraites}] ISBN ${edition.isbn} "${edition.titre_brut}" → `);

      // 1. Déduction par title_id (ID interne Lévis) — évite un appel OL si déjà connu
      if (edition.title_id) {
        const { data: soeur } = await supabase
          .from('editions')
          .select('oeuvre_id')
          .eq('title_id', edition.title_id)
          .in('statut_reconciliation', ['reconcilie_ol', 'reconcilie_bnf', 'reconcilie_bnf_temp'])
          .not('oeuvre_id', 'is', null)
          .limit(1)
          .maybeSingle<{ oeuvre_id: string }>();

        if (soeur?.oeuvre_id) {
          process.stdout.write(`🔗 Déduit via title_id ${edition.title_id}\n`);
          if (!DRY_RUN) {
            await supabase
              .from('editions')
              .update({ oeuvre_id: soeur.oeuvre_id, statut_reconciliation: 'reconcilie_ol' })
              .eq('id', edition.id);
          }
          totalReconcilies++;
          continue;
        }
      }

      // 2. Chercher sur OL par ISBN
      const olData = await chercherParISBN(edition.isbn);
      await attendre(DELAI_MS);

      if (!olData.ol_work_id) {
        process.stdout.write(`❓ Pas de match OL\n`);
        totalSansMatch++;

        // Marquer comme tenté mais sans résultat pour ne pas retraiter indéfiniment
        if (!DRY_RUN) {
          await supabase
            .from('editions')
            .update({ statut_reconciliation: 'non_reconcilie_ol' })
            .eq('id', edition.id);
        }
        continue;
      }

      // 3. Compléter avec la Works API si titre/auteurs manquants
      let { titre, auteurs, resume, sujets } = olData;

      if (!titre || auteurs.length === 0) {
        const workData = await chercherOeuvreOL(olData.ol_work_id);
        await attendre(DELAI_MS);
        titre = titre ?? workData.titre;
        auteurs = auteurs.length ? auteurs : workData.auteurs;
        resume = resume ?? workData.resume;
        sujets = sujets.length ? sujets : workData.sujets;
      }

      // Fallback sur les données brutes Lévis si OL n'a pas de titre
      const titreFinal = titre ?? edition.titre_brut;
      const auteursFinal = auteurs.length ? auteurs : (edition.auteur_brut ? [edition.auteur_brut] : []);

      // 4. Obtenir ou créer l'oeuvre
      const oeuvreId = await obtenirOuCreerOeuvre(
        olData.ol_work_id,
        titreFinal,
        auteursFinal,
        resume,
        sujets,
      );

      if (!oeuvreId) {
        process.stdout.write(`❌ Échec création oeuvre\n`);
        continue;
      }

      // 5. Rattacher l'édition à l'oeuvre + cascade sur toutes les sœurs (même title_id)
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('editions')
          .update({
            oeuvre_id: oeuvreId,
            statut_reconciliation: 'reconcilie_ol',
            editeur: olData.editeur ?? undefined,
            nb_pages: olData.nb_pages ?? undefined,
          })
          .eq('id', edition.id);

        if (updateError) {
          process.stdout.write(`❌ Échec mise à jour édition: ${updateError.message}\n`);
          continue;
        }

        // Cascade : toutes les éditions avec le même title_id non encore réconciliées
        if (edition.title_id) {
          // Compte d'abord combien vont être affectées
          const { count } = await supabase
            .from('editions')
            .select('id', { count: 'exact', head: true })
            .eq('title_id', edition.title_id)
            .in('statut_reconciliation', ['non_reconcilie', 'non_reconcilie_ol']);

          // Puis update
          await supabase
            .from('editions')
            .update({
              oeuvre_id: oeuvreId,
              statut_reconciliation: 'reconcilie_ol',
            })
            .eq('title_id', edition.title_id)
            .in('statut_reconciliation', ['non_reconcilie', 'non_reconcilie_ol']);

          if (count && count > 0) {
            process.stdout.write(`✅ ${olData.ol_work_id} ("${titreFinal}") + cascade ${count} sœur(s)\n`);
            totalReconcilies += count;
            continue;
          }
        }
      } else {
        console.log(`  [DRY-RUN] Lierait édition ${edition.id} → oeuvre ${olData.ol_work_id} + cascade title_id ${edition.title_id}`);
      }

      process.stdout.write(`✅ ${olData.ol_work_id} ("${titreFinal}")\n`);
      totalReconcilies++;
    }

    offset += BATCH_SIZE;
  }

  console.log('\n─────────────────────────────────');
  console.log(`📊 Résumé :`);
  console.log(`   Traités       : ${totalTraites}`);
  console.log(`   Réconciliés   : ${totalReconcilies}`);
  console.log(`   Sans match OL : ${totalSansMatch}`);
  console.log('─────────────────────────────────');
}

reconcilier();
