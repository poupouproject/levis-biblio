import * as fs from 'fs';
import * as cheerio from 'cheerio';

async function scrapeRssLevis() {
  // Ton URL magique sans token
  const url = 'https://levi.ent.sirsidynix.net/client/rss/hitlist/accueil/te=ILS';
  
  console.log(`🚀 Début du scraping via RSS : ${url}`);
  
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const xml = await response.text();
    
    // On indique à Cheerio de traiter le texte comme du XML
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const items: Array<{
      idLivre: string;
      rawId: string;
      titre: string;
      detailsBruts: string;
    }> = [];

    // Le flux est au format Atom, chaque livre est dans une balise <entry>
    $('entry').each((index, element) => {
      // Le titre
      const titre = $(element).find('title').text().trim();
      
      // L'ID complet et l'ID numérique
      const rawId = $(element).find('id').text().trim();
      const idLivre = rawId.split(':').pop() || 'N/A';
      
      // Le contenu (Auteur, Format, Date) est du HTML encodé dans la balise <content>
      const contentHtml = $(element).find('content').text();
      
      // Astuce: On utilise une expression régulière simple pour nettoyer les balises <br/> et les espaces insécables (&#160;)
      const detailsBruts = contentHtml
        .replace(/<br\s*\/?>/gi, ' | ') // Remplace les retours à la ligne par des " | "
        .replace(/&#160;/g, ' ')        // Nettoie les espaces
        .trim();

      items.push({
        idLivre,
        rawId,
        titre,
        detailsBruts
      });
    });

    console.log(`✅ ${items.length} éléments extraits du flux RSS !`);

    // Affichons le premier résultat dans la console pour voir la structure
    if (items.length > 0) {
      console.log('\n--- Aperçu du premier élément ---');
      console.log(items[0]);
      console.log('---------------------------------\n');
    }

    // Génération du fichier CSV
    const csvHeader = 'ID Livre;ID SirsiDynix;Titre;Détails (Auteur/Date/Format)\n';
    const csvRows = items.map(item => {
      const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
      return `${escapeCsv(item.idLivre)};${escapeCsv(item.rawId)};${escapeCsv(item.titre)};${escapeCsv(item.detailsBruts)}`;
    }).join('\n');

    fs.writeFileSync('catalogue_rss_levis.csv', '\uFEFF' + csvHeader + csvRows, 'utf-8');
    console.log('📁 Fichier "catalogue_rss_levis.csv" généré avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du scraping RSS:', error);
  }
}

// Exécution
scrapeRssLevis();