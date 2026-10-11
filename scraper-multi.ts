import * as fs from 'fs';
import * as cheerio from 'cheerio';

interface LivreItem {
  idLivre: string;
  titre: string;
  auteur: string;
  datePublication: string;
  format: string;
  isbn: string;        // peut contenir plusieurs ISBN séparés par ";"
  imageCouverture: string;
}

// Pause (politesse réseau)
const attendre = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Échappe une valeur pour l'inclure dans un champ CSV (RFC 4180)
const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

/**
 * Parse les arguments CLI en liste de numéros de pages.
 * Formats acceptés (combinables) :
 *   - Numéros isolés  : 1 2 3
 *   - Plages          : 1-5
 *   - Mix             : 1-3 5 7-9
 * Exemple : npx ts-node scraper-multi.ts 1-5 8 10
 */
function parserArgsCLI(args: string[]): number[] {
  if (args.length === 0) return [];

  const pages = new Set<number>();

  for (const arg of args) {
    const plage = arg.match(/^(\d+)-(\d+)$/);
    if (plage) {
      const debut = parseInt(plage[1]!, 10);
      const fin = parseInt(plage[2]!, 10);
      if (debut > fin) {
        console.error(`❌ Plage invalide "${arg}" : le début doit être <= la fin.`);
        process.exit(1);
      }
      for (let p = debut; p <= fin; p++) pages.add(p);
    } else if (/^\d+$/.test(arg)) {
      pages.add(parseInt(arg, 10));
    } else {
      console.error(`❌ Argument non reconnu : "${arg}". Attendu : un nombre ou une plage (ex. 1-5).`);
      process.exit(1);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

// Fonction principale pour scraper une ou plusieurs pages
async function scraperCatalogue(pagesAExplorer: number[]) {
  console.log(`🚀 Lancement du scraping pour les pages : ${pagesAExplorer.join(', ')}`);

  const tousLesItems: LivreItem[] = [];
  const ITEMS_PAR_PAGE = 12;

  for (let i = 0; i < pagesAExplorer.length; i++) {
    const page = pagesAExplorer[i] as number;
    const offset = (page - 1) * ITEMS_PAR_PAGE;
    const url = `https://levi.ent.sirsidynix.net/client/fr_CA/accueil/search/results?te=ILS&ps=${ITEMS_PAR_PAGE}&st=${offset}`;

    console.log(`\n📄 Scraping de la page ${page} (offset: ${offset})...`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'fr-CA,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

      const html = await response.text();
      const $ = cheerio.load(html);
      const itemsDeLaPage: LivreItem[] = [];

      $('.results_cell').each((_index, element) => {
        const titre = $(element).find('.displayDetailLink a').first().text().trim();
        if (!titre) return;

        const auteur = $(element).find('.INITIAL_AUTHOR_SRCH .displayElementText').first().text().trim() || 'N/A';
        const datePublication = $(element).find('.PUBDATE .displayElementText').first().text().trim() || 'N/A';
        const format = $(element).find('.FORMAT .formatText').first().text().trim() || 'N/A';

        // Tous les ISBNs sont dans les divs .ISBN_value (filtre les valeurs non-numériques comme "(rel.)")
        const isbnValues = $(element).find('.ISBN_value')
          .map((_i, el) => $(el).text().trim())
          .get()
          .filter(v => /^\d{10,13}$/.test(v));
        const isbn = isbnValues.length > 0 ? isbnValues.join(';') : 'N/A';

        const rawId = $(element).find('.results_chkbox').attr('value') ?? '';
        const idLivre = rawId.split(':').pop() || 'N/A';
        const imageCouverture = $(element).find('.results_img').attr('src') ?? 'N/A';

        itemsDeLaPage.push({ idLivre, titre, auteur, datePublication, format, isbn, imageCouverture });
      });

      console.log(`✅ ${itemsDeLaPage.length} éléments extraits de la page ${page}.`);
      tousLesItems.push(...itemsDeLaPage);

      if (i < pagesAExplorer.length - 1) {
        const delaiMs = Math.floor(Math.random() * 2000) + 2500;
        console.log(`⏳ Pause de ${(delaiMs / 1000).toFixed(1)}s avant la prochaine page...`);
        await attendre(delaiMs);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du scraping de la page ${page}:`, error);
    }
  }

  if (tousLesItems.length === 0) {
    console.log("⚠️ Aucun élément récupéré, le CSV n'a pas été généré.");
    return;
  }

  console.log(`\n💾 Génération du fichier CSV avec ${tousLesItems.length} éléments...`);

  const csvHeader = 'ID Livre,Titre,Auteur,Date de publication,Format,ISBN,Image Couverture\n';
  const csvRows = tousLesItems
    .map(item =>
      [item.idLivre, item.titre, item.auteur, item.datePublication, item.format, item.isbn, item.imageCouverture]
        .map(escapeCsv)
        .join(',')
    )
    .join('\n');

  fs.writeFileSync('catalogue_levis_multi.csv', '\uFEFF' + csvHeader + csvRows, 'utf-8');
  console.log('📁 Fichier "catalogue_levis_multi.csv" généré avec succès !');
}

// ==========================================
// Point d'entrée — lecture des arguments CLI
// ==========================================
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage : npx ts-node scraper-multi.ts <pages>');
  console.log('  Exemples :');
  console.log('    npx ts-node scraper-multi.ts 1          → page 1 seulement');
  console.log('    npx ts-node scraper-multi.ts 1 3 5      → pages 1, 3 et 5');
  console.log('    npx ts-node scraper-multi.ts 1-10       → pages 1 à 10');
  console.log('    npx ts-node scraper-multi.ts 1-5 8 10   → pages 1-5, 8 et 10');
  process.exit(0);
}

const pagesVoulues = parserArgsCLI(args);
scraperCatalogue(pagesVoulues);