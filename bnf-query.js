// bnf-query.js

/**
 * Récupère les identifiants ARK de la BnF pour une liste d'ISBN.
 * @param {string[]} isbns - Un tableau de chaînes de caractères représentant les ISBN.
 * @returns {Promise<Array<{isbn: string, ark: string}>>}
 */
async function getBnFIdentifiers(isbns) {
  const endpointUrl = 'https://data.bnf.fr/sparql';

  // 1. Formatage des ISBN pour la clause VALUES : "isbn1" "isbn2" ...
  const valuesString = isbns.map((isbn) => `"${isbn}"`).join(' ');

  // 2. Construction de la requête SPARQL
  const sparqlQuery = `
    PREFIX bnf-onto: <http://data.bnf.fr/ontology/bnf-onto/>
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>

SELECT DISTINCT ?isbn ?arkOeuvre ?arkManifestation WHERE {
  # 1. On liste nos ISBN
  VALUES ?isbn { ${valuesString} }
  
  # 2. On trouve la Manifestation (l'édition) qui correspond à l'ISBN
  ?arkManifestation bnf-onto:isbn ?isbn .
  
  # 3. On remonte à l'Oeuvre parente via la relation RDA
  ?arkManifestation rdarelationships:workManifested ?arkOeuvre .
}
  `;

  try {
    // 3. Appel à l'API en POST
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        // En-tête standard pour l'envoi de requêtes SPARQL via POST
        'Content-Type': 'application/x-www-form-urlencoded',
        // On exige une réponse en JSON
        Accept: 'application/sparql-results+json',
      },
      // Les paramètres doivent être encodés dans le corps de la requête
      body: new URLSearchParams({
        query: sparqlQuery,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    // 4. Nettoyage de la structure JSON renvoyée par SPARQL
    // L'API renvoie un format standardisé un peu lourd, on le simplifie.
    const results = data.results.bindings.map((binding) => ({
      isbn: binding.isbn.value,
      arkOeuvre: binding.arkOeuvre.value,
      arkManifestation: binding.arkManifestation.value,
    }));

    return results;
  } catch (error) {
    console.error('Erreur lors de la requête vers data.bnf.fr :', error);
    return [];
  }
}

// ==========================================
// Exemple d'utilisation
// ==========================================
async function main() {
  // Liste d'exemple (tu peux en mettre jusqu'à ~500-1000 sans problème)
  const listeISBN = [
    '978-2-211-21125-3',
    '2-7028-4777-3',
    '978-2-07-061275-8', // Un ISBN supplémentaire pour tester
  ];

  console.log(`Recherche de ${listeISBN.length} ISBN(s) en cours...`);

  const correspondances = await getBnFIdentifiers(listeISBN);

  console.log('\n--- Résultats ---');
  if (correspondances.length > 0) {
    console.table(correspondances);
  } else {
    console.log('Aucune correspondance trouvée ou erreur réseau.');
  }
}

main();
