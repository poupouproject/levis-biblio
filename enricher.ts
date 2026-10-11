/**
 * enricher.ts
 * Phase 2 : enrichissement des livres depuis Open Library et BnF.
 *
 * Pour chaque livre ayant un ISBN dans Supabase (et enrichi_at IS NULL),
 * on interroge :
 *   1. Open Library → work_id_ol, résumé, sujets, éditeur, nb_pages
 *   2. BnF SRU       → bnf_ark, résumé FR, sujets FR, éditeur, collection, langue, nb_pages
 *
 * BnF a la priorité pour les livres francophones (résumé + sujets en français).
 * Open Library complète pour les livres anglophones ou quand BnF ne trouve rien.
 *
 * Usage :
 *   npx ts-node enricher.ts             → traite tous les livres non-enrichis
 *   npx ts-node enricher.ts --dry-run   → affiche ce qui serait fait sans écrire
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
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

const BATCH_SIZE = 50;          // livres récupérés par batch depuis Supabase
const DELAI_OL_MS = 1200;       // Open Library : ≤ 1 req/s recommandé
const DELAI_BNF_MS = 600;       // BnF SRU : poli
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LivreSupabase {
  id_levis: string;
  isbn: string[];
}

interface DonneesEnrichies {
  work_id_ol: string | null;
  bnf_ark: string | null;
  resume: string | null;
  sujets: string[];
  editeur: string | null;
  collection: string | null;
  langue: string | null;
  nb_pages: number | null;
  enrichi_at: string;
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
const attendre = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Open Library
// API doc : https://openlibrary.org/dev/docs/api
// ---------------------------------------------------------------------------
async function enrichirOpenLibrary(isbn: string): Promise<Partial<DonneesEnrichies>> {
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'levis-biblio-enricher/1.0 (github.com/poupouproject)' },
    });
    if (!resp.ok) return {};

    const data = await resp.json() as Record<string, unknown>;
    const book = data[`ISBN:${isbn}`] as Record<string, unknown> | undefined;
    if (!book) return {};

    const work_id_ol = (book.works as Array<{ key: string }> | undefined)?.[0]?.key ?? null;

    const resume =
      typeof book.description === 'string'
        ? book.description
        : (book.description as { value?: string } | undefined)?.value ?? null;

    const sujets = ((book.subjects as Array<string | { name: string }>) ?? [])
      .map(s => (typeof s === 'string' ? s : s.name))
      .slice(0, 20);

    const editeur = (book.publishers as Array<{ name: string }> | undefined)?.[0]?.name ?? null;
    const nb_pages = (book.number_of_pages as number | undefined) ?? null;

    return { work_id_ol, resume, sujets, editeur, nb_pages };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// BnF SRU (Dublin Core)
// API doc : https://api.bnf.fr/fr/api-catalogue-bnf-sru-z3950
// ---------------------------------------------------------------------------
async function enrichirBnF(isbn: string): Promise<Partial<DonneesEnrichies>> {
  try {
    const query = encodeURIComponent(`bib.isbn adj "${isbn}"`);
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&recordSchema=dublincore&maximumRecords=1&query=${query}`;

    const resp = await fetch(url, {
      headers: { 'User-Agent': 'levis-biblio-enricher/1.0 (github.com/poupouproject)' },
    });
    if (!resp.ok) return {};

    const xml = await resp.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    // Vérifie qu'on a un résultat
    const nbResults = parseInt($('srw\\:numberOfRecords, numberOfRecords').first().text(), 10);
    if (!nbResults || nbResults === 0) return {};

    const record = $('oai_dc\\:dc, dc').first();
    if (!record.length) return {};

    // BnF ARK (dans dc:identifier, commence par "ark:")
    let bnf_ark: string | null = null;
    $('dc\\:identifier, identifier', record).each((_, el) => {
      const val = $(el).text().trim();
      if (val.startsWith('ark:')) bnf_ark = val;
    });

    const resume = $('dc\\:description, description', record).first().text().trim() || null;

    const sujets = $('dc\\:subject, subject', record)
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    const editeur = $('dc\\:publisher, publisher', record).first().text().trim() || null;

    // Collection / série (dc:relation)
    const collection = $('dc\\:relation, relation', record).first().text().trim() || null;

    // Langue (ex: "fre", "eng")
    const langue = $('dc\\:language, language', record).first().text().trim() || null;

    // Nombre de pages depuis dc:format : "1 vol. (246 p.) : ill."
    const formatStr = $('dc\\:format, format', record).text();
    const pagesMatch = formatStr.match(/\((\d+)\s*p[\s.]/);
    const nb_pages = pagesMatch ? parseInt(pagesMatch[1]!, 10) : null;

    return { bnf_ark, resume, sujets, editeur, collection, langue, nb_pages };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Fusion des données (BnF prioritaire pour le contenu FR)
// ---------------------------------------------------------------------------
function fusionner(ol: Partial<DonneesEnrichies>, bnf: Partial<DonneesEnrichies>): DonneesEnrichies {
  return {
    // BnF prioritaire pour les métadonnées françaises
    work_id_ol: ol.work_id_ol ?? null,
    bnf_ark: bnf.bnf_ark ?? null,
    resume: bnf.resume ?? ol.resume ?? null,
    sujets: bnf.sujets?.length ? bnf.sujets : (ol.sujets ?? []),
    editeur: bnf.editeur ?? ol.editeur ?? null,
    collection: bnf.collection ?? null,
    langue: bnf.langue ?? null,
    nb_pages: bnf.nb_pages ?? ol.nb_pages ?? null,
    enrichi_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Boucle principale
// ---------------------------------------------------------------------------
async function enrichir(): Promise<void> {
  console.log(`🔍 Démarrage de l'enrichissement${DRY_RUN ? ' (DRY RUN — aucune écriture)' : ''}`);

  let offset = 0;
  let totalTraites = 0;
  let totalEnrichis = 0;

  while (true) {
    // Récupère un batch de livres non-enrichis avec au moins un ISBN
    const { data: livres, error } = await supabase
      .from('livres')
      .select('id_levis, isbn')
      .is('enrichi_at', null)
      .not('isbn', 'eq', '{}')
      .range(offset, offset + BATCH_SIZE - 1)
      .returns<LivreSupabase[]>();

    if (error) {
      console.error('❌ Erreur Supabase :', error.message);
      break;
    }
    if (!livres || livres.length === 0) {
      console.log('\n✅ Plus aucun livre à enrichir.');
      break;
    }

    console.log(`\n--- Batch offset ${offset} : ${livres.length} livres ---`);

    for (const livre of livres) {
      totalTraites++;
      let olData: Partial<DonneesEnrichies> = {};
      let bnfData: Partial<DonneesEnrichies> = {};

      // Essaie chaque ISBN jusqu'à obtenir un résultat
      for (const isbn of livre.isbn) {
        // Open Library
        if (!olData.work_id_ol) {
          olData = await enrichirOpenLibrary(isbn);
          await attendre(DELAI_OL_MS);
        }

        // BnF
        if (!bnfData.bnf_ark) {
          bnfData = await enrichirBnF(isbn);
          await attendre(DELAI_BNF_MS);
        }

        // Arrête si on a les deux
        if (olData.work_id_ol && bnfData.bnf_ark) break;
      }

      const donnees = fusionner(olData, bnfData);
      const aDesInfos = donnees.work_id_ol || donnees.bnf_ark || donnees.resume;

      if (aDesInfos) {
        console.log(`  ✅ ${livre.id_levis} — OL: ${donnees.work_id_ol ?? 'non trouvé'} | BnF: ${donnees.bnf_ark ?? 'non trouvé'}`);
      } else {
        console.log(`  ⚪ ${livre.id_levis} — aucune donnée trouvée (marqué enrichi quand même)`);
      }

      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('livres')
          .update(donnees)
          .eq('id_levis', livre.id_levis);

        if (updateError) {
          console.error(`  ❌ Erreur update ${livre.id_levis}:`, updateError.message);
        } else {
          totalEnrichis++;
        }
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(`\n🏁 ${totalTraites} livres traités, ${totalEnrichis} mis à jour.`);
}

enrichir();
