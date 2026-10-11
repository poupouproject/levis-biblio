/**
 * Exemple de rebond pour trouver tous les ISBN d'une oeuvre via WorldCat
 * Prérequis : Un accessToken valide généré via les identifiants OCLC de l'institution.
 */
async function getAllIsbnsFromWorldCat(targetIsbn, accessToken) {
  const baseUrl = 'https://americas.discovery.api.oclc.org/worldcat/search/v2/bibs';
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json'
  };

  try {
    // ==========================================
    // ÉTAPE 1 : Trouver l'ID de l'Oeuvre (OWI)
    // ==========================================
    // L'index 'bn:' cible spécifiquement les numéros standard (ISBN, ISSN, etc.)
    const searchUrl = `${baseUrl}?q=bn:${targetIsbn}`;
    
    const searchResponse = await fetch(searchUrl, { headers });
    if (!searchResponse.ok) throw new Error(`Erreur Étape 1: ${searchResponse.status}`);
    
    const searchData = await searchResponse.json();
    
    // On s'assure qu'on a trouvé au moins un résultat
    if (searchData.numberOfRecords === 0) {
      console.log("ISBN introuvable dans WorldCat.");
      return [];
    }

    // On extrait l'identifiant de l'oeuvre du premier résultat
    const workId = searchData.bibRecords[0].work.id;
    console.log(`Œuvre parente trouvée : OWI-${workId}`);

    // ==========================================
    // ÉTAPE 2 : Récupérer toutes les éditions
    // ==========================================
    // L'index 'ow:' cible l'OCLC Work Identifier
    // On met une limite (limit=50) pour ramener un lot d'éditions d'un coup
    const editionsUrl = `${baseUrl}?q=ow:${workId}&limit=50`;
    
    const editionsResponse = await fetch(editionsUrl, { headers });
    if (!editionsResponse.ok) throw new Error(`Erreur Étape 2: ${editionsResponse.status}`);
    
    const editionsData = await editionsResponse.json();

    // ==========================================
    // ÉTAPE 3 : Extraire et nettoyer les ISBN
    // ==========================================
    const allIsbns = new Set(); // Le Set évite naturellement les doublons

    editionsData.bibRecords.forEach(record => {
      // Les notices MARC ont souvent plusieurs ISBN (ex: le 10 et le 13)
      if (record.isbns && Array.isArray(record.isbns)) {
        record.isbns.forEach(isbnObj => {
          // On nettoie la donnée (WorldCat renvoie parfois du texte avec l'ISBN)
          const cleanIsbn = isbnObj.value.replace(/[^0-9X]/gi, '');
          if (cleanIsbn) allIsbns.add(cleanIsbn);
        });
      }
    });

    return Array.from(allIsbns);

  } catch (error) {
    console.error("Erreur d'intégration WorldCat:", error);
    return [];
  }
}