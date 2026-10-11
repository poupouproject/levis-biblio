import * as fs from 'fs';
import * as cheerio from 'cheerio';

async function scrapeCatalogueLevis() {
  // L'URL de la première page obtenue suite à la redirection dans le HAR
  const url = 'https://levi.ent.sirsidynix.net/client/fr_CA/accueil/search/results?te=ILS';
  console.log(`🚀 Début du scraping pour : ${url}`);
  
  try {
    // 1. Requête HTTP pour récupérer le HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'fr-CA,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const html = await response.text();
    
    // 2. Parsing du HTML avec Cheerio
    const $ = cheerio.load(html);
    
    const items: Array<{
      idLivre: string;
      titre: string;
      auteur: string;
      datePublication: string;
      format: string;
      isbn: string;
      imageCouverture: string;
    }> = [];

    // 3. Extraction des données (itération sur chaque cellule de résultat)
    $('.results_cell').each((index, element) => {
      const titre = $(element).find('.displayDetailLink a').first().text().trim();
      if (!titre) return;

      const auteur = $(element).find('.INITIAL_AUTHOR_SRCH .displayElementText').first().text().trim() || 'N/A';
      const datePublication = $(element).find('.PUBDATE .displayElementText').first().text().trim() || 'N/A';
      const format = $(element).find('.FORMAT .formatText').first().text().trim() || 'N/A';
      const isbn = $(element).find('input.isbnValue').attr('value') || 'N/A';
      
      // Extraction de l'ID unique (ex: "ent://SD_ILS/0/SD_ILS:422127" devient "422127")
      const rawId = $(element).find('.results_chkbox').attr('value') || '';
      const idLivre = rawId.split(':').pop() || 'N/A';
      
      // Extraction de l'URL de l'image de couverture
      const imageCouverture = $(element).find('.results_img').attr('src') || 'N/A';

      items.push({
        idLivre,
        titre,
        auteur,
        datePublication,
        format,
        isbn,
        imageCouverture
      });
    });

    console.log(`✅ ${items.length} éléments extraits avec leur ID unique.`);

    // Génération du CSV avec les nouvelles colonnes
    const csvHeader = 'ID Livre;Titre;Auteur;Date de publication;Format;ISBN;Image Couverture\n';
    const csvRows = items.map(item => {
      // Petite fonction pour échapper les guillemets et gérer les points-virgules dans le texte
      const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
      return `${escapeCsv(item.idLivre)};${escapeCsv(item.titre)};${escapeCsv(item.auteur)};${escapeCsv(item.datePublication)};${escapeCsv(item.format)};${escapeCsv(item.isbn)};${escapeCsv(item.imageCouverture)}`;
    }).join('\n');

    fs.writeFileSync('catalogue_levis.csv', '\uFEFF' + csvHeader + csvRows, 'utf-8');
    console.log('📁 Fichier "catalogue_levis.csv" généré avec les IDs !');

  } catch (error) {
    console.error('❌ Erreur lors du scraping:', error);
  }
}

scrapeCatalogueLevis();