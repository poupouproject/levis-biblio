# Liens vers les services des bibliothèques

Le portail SirsiDynix affiche, autour de sa recherche, une colonne de liens vers les services des
bibliothèques (numérique, prêt entre bibliothèques, abonnement, calendrier…). LévisBiblio les
reprend là où ils servent, sans recopier la colonne telle quelle. Ce document recense ce qui est
accessible et la répartition retenue.

## 1. Sources

- **Site de la Ville (levis.ca)** : pages trouvées par son plan de site
  (`https://levis.ca/fr/sitemaps-1-sitemap.xml`). Le `robots.txt` de levis.ca n'interdit que
  `/cpresources/`, `/vendor/`, `/.env` et `/cache/`.
- **Portail SirsiDynix** : la page d'accueil n'est pas lue (seuls les chemins de Mon dossier le
  sont, voir le skill `portail-levis`). Les liens qui n'existent que sur le portail sont relevés à
  la main.

## 2. Liens disponibles

| Lien du portail                         | Cible                                                                                       | État          |
| --------------------------------------- | ------------------------------------------------------------------------------------------- | ------------- |
| Livres, revues et ressources numériques | `https://levis.ca/fr/loisirs-et-communaute/bibliotheques/ressources-numeriques`             | Trouvé        |
| Abonnement et règlements                | `https://levis.ca/fr/loisirs-et-communaute/bibliotheques/abonnement-modalites-et-services`  | Trouvé        |
| Portail des bibliothèques               | `https://levis.ca/fr/loisirs-et-communaute/bibliotheques`                                   | Trouvé        |
| Programmation                           | `https://levis.ca/fr/loisirs-et-communaute/bibliotheques/programmes`                        | Trouvé        |
| Calendrier des activités                | `https://levis.ca/fr/calendrier-des-evenements?types=a-la-bibliotheque`                     | Trouvé        |
| Nous joindre                            | `https://levis.ca/fr/loisirs-et-communaute/bibliotheques/foire-aux-questions-bibliotheques` | À confirmer   |
| Suggestion d'achat                      | —                                                                                           | URL à relever |
| Prêt entre bibliothèques                | —                                                                                           | URL à relever |
| S'inscrire                              | —                                                                                           | URL à relever |
| Facebook « Bibliothèques de Lévis »     | —                                                                                           | URL à relever |

Autres pages utiles de levis.ca : `…/bibliotheques/horaires-des-bibliotheques`,
`…/bibliotheques/decouvrir-les-bibliotheques`, `…/bibliotheques/salles-dexposition`, et les fiches
de chaque succursale (`https://levis.ca/fr/trouver-un-lieu/…`, déjà dans
`src/lib/levis/branches.ts`, plus `bibliocube`).

**Écartés** : le quiz « À go, on lit! » et la brochure de programmation de la saison, contenus
saisonniers dont les liens deviendraient morts.

## 3. Répartition prévue

Une seule source, `LIENS_BIBLIOTHEQUES` dans `src/lib/site.ts`, utilisée à trois endroits :

1. **Page Bibliothèques** : section « Services et ressources », en cartes avec icônes (numérique,
   prêt entre bibliothèques, suggestion d'achat, abonnement et inscription, activités, nous
   joindre).
2. **Pied de page** : une ligne courte (calendrier, numérique, abonnement, site des
   bibliothèques, Facebook).
3. **En contexte** : recherche sans résultat ou avec peu de résultats (« Pas trouvé ? Suggérez
   un achat ou demandez un prêt entre bibliothèques ») ; Mon dossier (abonnement et règlements).

L'en-tête reste réservé à la recherche, aux bibliothèques et au dossier.

## 4. Activités à venir : accessibles, non intégrées

Le calendrier de levis.ca est servi par une API GraphQL (Craft CMS) :

- `POST https://levis.ca/graphql/`, en-tête `x-craft-authorization: Bearer <jeton>`. Le jeton est
  celui du site public, lisible dans son propre JavaScript ; aucun témoin (cookie) n'est
  nécessaire.
- Requête `pagesEntries(slug: "calendrier-des-evenements", type: "listingEvenementsTemplate")` →
  `calendarElement.events(...)`, filtrée par
  `relatedToEntries: [{section: "evenementsStructure", relatedToEntries: [{slug: ["a-la-bibliotheque"]}]}]`,
  `rangeStart: "now"`, `orderBy: "isToday DESC, startDate ASC"` ; `eventCount` donne le total.
- Par activité : dates de début et de fin, titre, description (HTML simple), image, lieu
  (« Bibliothèque Lauréat-Vallière »), secteurs, lien vers la fiche levis.ca.

Vérifié le 2026-11-08 : 40 activités à venir. **Décision** : ne pas les intégrer, le site de la
Ville les présente déjà bien ; LévisBiblio renvoie seulement vers son calendrier. Si on y revient :
jeton en variable d'environnement (il peut changer sans préavis), cache partagé d'une heure, et
correspondance du lieu avec `src/lib/levis/branches.ts`.
