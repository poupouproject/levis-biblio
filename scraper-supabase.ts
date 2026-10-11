/**
 * scraper-supabase.ts
 * Scraping massif du catalogue Lévis → insertion directe dans Supabase.
 *
 * Usage :
 *   npx ts-node scraper-supabase.ts           → reprend depuis le dernier checkpoint
 *   npx ts-node scraper-supabase.ts --reset   → repart de la page 1 (ignore checkpoint)
 *   npx ts-node scraper-supabase.ts 50-100    → scrape seulement les pages 50 à 100
 *
 * Insère dans la table `editions` du schéma local Supabase.
 * La colonne `title_id` contient l'ID interne Lévis et a une contrainte UNIQUE.
 * La colonne `oeuvre_id` est laissée nulle (réconciliation par enricher.ts).
 * Le premier ISBN trouvé est utilisé (contrainte UNIQUE sur isbn).
 */

import * as fs from 'fs';
import * as cheerio from 'cheerio';
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

const ITEMS_PAR_PAGE = 12;
const TOTAL_PAGES = 14475;         // ~173 689 / 12 — ajuster si besoin
const CHECKPOINT_FILE = '.scraper-checkpoint.json';
const DELAI_MIN_MS = 2500;
const DELAI_MAX_MS = 10500;
const MAX_RETRIES = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EditionRow {
  title_id: string;              // ID interne Lévis (unique)
  titre_brut: string;
  auteur_brut: string | null;
  annee_publication: number | null;
  format: string | null;
  isbn: string;              // toujours présent (items sans ISBN ignorés)
  image_couverture: string | null;
  statut_reconciliation: 'non_reconcilie';
}

// ---------------------------------------------------------------------------
// Checkpoint (reprise après crash)
// ---------------------------------------------------------------------------
interface Checkpoint {
  dernierePage: number;
  totalInseres: number;
}

function lireCheckpoint(): Checkpoint {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8')) as Checkpoint;
  }
  return { dernierePage: 0, totalInseres: 0 };
}

function sauvegarderCheckpoint(cp: Checkpoint): void {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
const attendre = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function estHeureArrêt(): boolean {
  const heure = new Date().getHours();
  return heure >= 5 && heure < 6; // Seulement entre 5h et 6h du matin
}

function parserArgsCLI(args: string[]): number[] | null {
  if (args.length === 0 || args[0] === '--reset') return null;

  const pages = new Set<number>();
  for (const arg of args.filter(a => a !== '--reset')) {
    const plage = arg.match(/^(\d+)-(\d+)$/);
    if (plage) {
      const debut = parseInt(plage[1]!, 10);
      const fin = parseInt(plage[2]!, 10);
      for (let p = debut; p <= fin; p++) pages.add(p);
    } else if (/^\d+$/.test(arg)) {
      pages.add(parseInt(arg, 10));
    } else {
      console.error(`❌ Argument non reconnu : "${arg}"`);
      process.exit(1);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Extraction HTML
// ---------------------------------------------------------------------------
function extraireItems(html: string): EditionRow[] {
  const $ = cheerio.load(html);
  const items: EditionRow[] = [];

  $('.results_cell').each((_i, element) => {
    const titre = $(element).find('.displayDetailLink a').first().text().trim();
    if (!titre) return;

    const auteur = $(element).find('.INITIAL_AUTHOR_SRCH .displayElementText').first().text().trim() || null;
    const datePublication = $(element).find('.PUBDATE .displayElementText').first().text().trim() || null;
    const format = $(element).find('.FORMAT .formatText').first().text().trim() || null;

    // Un ISBN = une ligne dans editions (même title_id, isbn différent)
    // Si aucun ISBN → ignoré pour l'instant
    const isbns = $(element)
      .find('.ISBN_value')
      .map((_j, el) => $(el).text().trim())
      .get()
      .filter(v => /^\d{10,13}$/.test(v));

    const rawId = $(element).find('.results_chkbox').attr('value') ?? '';
    const title_id = rawId.split(':').pop() || '';
    if (!title_id) return;

    // Année extraite de la date de publication (ex: "2021" ou "c2021")
    const anneeMatch = datePublication?.match(/(\d{4})/);
    const annee_publication = anneeMatch ? parseInt(anneeMatch[1]!, 10) : null;

    // Image : préférer les URLs absolues (btlffile = cover réelle)
    const imgSrc = $(element).find('.results_img').attr('src') ?? null;
    const image_couverture = imgSrc?.startsWith('http') ? imgSrc : null;

    const base = { title_id, titre_brut: titre, auteur_brut: auteur, annee_publication, format, image_couverture, statut_reconciliation: 'non_reconcilie' as const };

    if (isbns.length === 0) return; // ignoré temporairement

    for (const isbn of isbns) {
      items.push({ ...base, isbn });
    }
  });

  return items;
}

// ---------------------------------------------------------------------------
// Scraping + insertion Supabase
// ---------------------------------------------------------------------------
async function scraperEtInserer(pagesAFaire: number[], checkpoint: Checkpoint): Promise<void> {
  let totalInseres = checkpoint.totalInseres;

  for (let i = 0; i < pagesAFaire.length; i++) {
    // Vérifier si on atteint 5h du matin
    if (estHeureArrêt()) {
      console.log(`\n⏹️  Il est 5h du matin — arrêt du scraping.`);
      sauvegarderCheckpoint({ dernierePage: pagesAFaire[i - 1] ?? 0, totalInseres });
      process.exit(0);
    }

    const page = pagesAFaire[i] as number;
    const offset = (page - 1) * ITEMS_PAR_PAGE;
    let retries = 0;
const url = `https://levi.ent.sirsidynix.net/client/fr_CA/accueil/search/results?te=ILS&ps=${ITEMS_PAR_PAGE}&rw=${offset}`;

    console.log(`\n📄 Page ${page}/${TOTAL_PAGES} (offset ${offset})...`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-CA,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      // Gestion spécifique des blocages temporaires (Rate Limit)
      if (response.status === 429 || response.status === 403) {
        retries++;
        if (retries > MAX_RETRIES) {
          console.error(`❌ Page ${page} bloquée après ${MAX_RETRIES} tentatives — arrêt du scraping.`);
          sauvegarderCheckpoint({ dernierePage: page - 1, totalInseres });
          process.exit(1);
        }
        const pauseMs = retries * 60_000 * 5; // 5 min, 10 min, 15 min…
        console.warn(`⚠️ Blocage HTTP ${response.status} (tentative ${retries}/${MAX_RETRIES}). Pause de ${pauseMs / 60_000} min...`);
        await attendre(pauseMs);
        i--;
        continue;
      }
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const items = extraireItems(html);

      if (items.length === 0) {
        console.log(`⚠️  Aucun item extrait — page vide ou fin du catalogue.`);
      } else {
        let erreurs = 0;

        // Upsert sur isbn (unique) — une ligne par ISBN
        const { error } = await supabase
          .from('editions')
          .upsert(items, { onConflict: 'isbn' });
        if (error) { console.error(`❌ Erreur upsert page ${page}:`, error.message); erreurs++; }

        if (erreurs === 0) {
          totalInseres += items.length;
          console.log(`✅ ${items.length} items insérés (total : ${totalInseres})`);
        }
      }

      // Checkpoint après chaque page réussie
      sauvegarderCheckpoint({ dernierePage: page, totalInseres });

      // Pause toutes les 100 pages
      if (page % 100 === 0) {
        console.log(`\n⏳ Pause de 2 minutes après ${page} pages...`);
        await attendre(120000);
      }

    } catch (error) {
      console.error(`❌ Erreur page ${page}:`, error);
      // On continue sur la prochaine page plutôt que d'arrêter
    }

    // Délai poli sauf sur la dernière page
    if (i < pagesAFaire.length - 1) {
      const delai = Math.floor(Math.random() * (DELAI_MAX_MS - DELAI_MIN_MS)) + DELAI_MIN_MS;
      console.log(`⏳ Pause ${(delai / 1000).toFixed(1)}s...`);
      await attendre(delai);
    }
  }

  console.log(`\n🎉 Terminé ! ${totalInseres} items au total dans Supabase.`);
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const resetMode = args.includes('--reset');

const checkpoint = resetMode ? { dernierePage: 0, totalInseres: 0 } : lireCheckpoint();

if (resetMode) {
  console.log('🔄 Mode reset : on repart de la page 1.');
} else if (checkpoint.dernierePage > 0) {
  console.log(`🔁 Reprise depuis la page ${checkpoint.dernierePage + 1} (${checkpoint.totalInseres} items déjà insérés).`);
}

// Détermine les pages à scraper
let pagesAFaire: number[];

const pagesManuel = parserArgsCLI(args);
if (pagesManuel) {
  pagesAFaire = pagesManuel;
} else {
  const pageDepart = checkpoint.dernierePage + 1;
  pagesAFaire = Array.from({ length: TOTAL_PAGES - pageDepart + 1 }, (_, i) => pageDepart + i);
}

if (pagesAFaire.length === 0) {
  console.log('✅ Toutes les pages ont déjà été scrapées selon le checkpoint.');
  process.exit(0);
}

console.log(`🚀 ${pagesAFaire.length} pages à scraper (${pagesAFaire[0]} → ${pagesAFaire[pagesAFaire.length - 1]})`);

scraperEtInserer(pagesAFaire, checkpoint);
