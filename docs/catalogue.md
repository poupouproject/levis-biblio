# Catalogue : recherche, séries, accueil

## 1. Données

Les notices viennent de la base locale scrapée du catalogue SirsiDynix de Lévis (Postgres, table `editions`, ~160 000 éditions : titre, auteur, ISBN, année, format, couverture). Aucune disponibilité n'y figure.

| Contexte | Source | Chargement |
|---|---|---|
| Développement (`DATABASE_URL` défini) | Table `editions` (+ `oeuvres` pour les résumés) | ~0,5 s de requête, ~4 s d'indexation, une fois par processus |
| Production, ou base injoignable | `src/lib/catalog/catalogue-demo.json` (~6 000 éditions, ~940 Ko) | Instantané |

Le jeu de démo se régénère avec `npm run catalogue:demo`. Il retient les 60 plus grandes séries illustrées, les nouveautés, les auteurs d'ici et les recherches populaires (`src/lib/catalog/curation.ts`), les notices enrichies et un échantillon stable du reste. Il garde le nombre total d'éditions pour l'accueil.

La base n'est jamais modifiée : pas d'extension, pas d'index, lecture seule.

## 2. Moteur (`src/lib/catalog/engine.ts`)

Tout se passe en mémoire, dans le processus serveur. Le moteur ne dépend pas de la source : il est testé sur des lignes fictives.

- **Normalisation** (`normalize.ts`) : accents et ponctuation repliés ; série et tome tirés du titre (« One Piece. 25, L'homme… ») ; mention de genre retirée (« : roman ») ; auteur remis en « Prénom Nom », sans dates ni fonctions ; formats regroupés (Livres, Gros caractères, Livres audio, Musique, Films, Trousses, Numérique) ; années impossibles écartées.
- **Œuvres** : les éditions d'un même titre du même auteur (ou d'un même tome de série) forment une œuvre. Son identifiant est le plus petit `title_id`. Chaque `title_id` de ses éditions mène à sa fiche.
- **Séries** : toutes les œuvres portant le même nom de série, triées par tome.
- **Recherche** : chaque mot doit apparaître (titre, sous-titre, série, auteurs, éditeur, ISBN). Classement : série exacte (tomes dans l'ordre), titre exact, titre qui commence par la requête, mots entiers, auteur, popularité (nombre d'éditions, couverture). Un ISBN avec tirets est reconnu.
- **Facettes** : chaque facette compte les résultats en ignorant son propre filtre.
- **Suggestions** : 2 séries, 2 auteurs, puis les œuvres les mieux classées.

Ordre de grandeur sur 153 000 œuvres : 40 à 70 ms par recherche, 80 à 100 ms par suggestion.

## 3. Disponibilité simulée (`availability.ts`)

Le catalogue public de la Ville (exemplaires, succursales) est protégé contre les requêtes automatisées. En attendant un accès officiel, chaque œuvre reçoit des exemplaires fictifs, dérivés de son identifiant : les mêmes à chaque visite. Les filtres « Disponible maintenant » et « Succursale » s'appuient dessus. Toutes les vues le signalent (« Démo »). La réservation renvoie à la fiche de l'œuvre sur le portail de la Ville.

### Résumés (Google Livres, `google-books.ts`)

Le catalogue scrapé n'a pas de résumé : les listes de résultats lues par le scraper n'en contiennent pas. Le portail affiche ceux d'**Electre/BTLF** sur la fiche détaillée, sous licence de la Ville : on ne les reprend pas.

Sur la fiche d'une œuvre, le résumé vient de l'**API Google Books**, interrogée au moment de l'affichage :

- **Côté serveur seulement** : clé `GOOGLE_BOOKS_API_KEY`, jamais préfixée `NEXT_PUBLIC_` (elle serait livrée au navigateur). Sans clé : aucune requête, aucune zone réservée.
- **Par ISBN**, jusqu'à 3 éditions de l'œuvre, délai de 3 s, en streaming (`Suspense`) : la fiche s'affiche sans attendre.
- **Rien n'est stocké.** Les conditions de Google (Google APIs Terms of Service, § 5 e) interdisent toute base ou copie permanente, et tout cache plus long que l'en-tête de la réponse. Le cache en mémoire suit donc le `Cache-Control` de Google. Une absence de résumé est retenue 24 h (ce n'est pas un contenu de Google). Après un dépassement de quota ou une clé refusée (429, 403), pause d'une heure.
- **Attribution** (lignes directrices de Google) : logo « Powered by Google » et lien vers la fiche Google Livres.
- **Quota** : à lire dans la console Google Cloud. Le chiffre de 1 000 requêtes par jour est souvent cité comme quota par défaut. Seule la fiche d'une œuvre interroge Google, jamais la recherche ni les suggestions. Sans clé, le quota anonyme partagé est épuisé (constaté) : la clé est indispensable.

Chercher *dans* les résumés (plein texte, vecteurs) demanderait de les stocker. Il faudrait alors une source qui le permet : BnF (Licence Ouverte), Open Library (CC0), ou les résumés Electre de la Ville avec son accord.

## 4. Pages et composants

| Route | Rendu |
|---|---|
| `/` | Statique, régénérée toutes les heures : recherche, nouveautés, séries, auteurs d'ici, parcourir par type, succursales ouvertes (heure lue dans le navigateur), Mon dossier |
| `/recherche` | Dynamique ; l'état est dans l'URL (`q`, `auteur`, `format`, `periode`, `dispo`, `succursale`, `tri`, `n`), donc partageable |
| `/oeuvre/[id]` | Fiche : série et tomes voisins, disponibilité par succursale avec heures, éditions, du même auteur |
| `/serie/[slug]` | Tous les tomes, nombre disponible, « commencer par le tome N » |
| `/api/catalogue/suggestions?q=` | JSON, en cache public 5 min |

- `SearchBox` : combobox ARIA (flèches, Entrée, Échap), raccourci `/`, suggestions après 120 ms (requête annulée si la saisie change, réponses gardées en mémoire), recherches récentes dans le navigateur, mots en gras.
- `Filters` : l'URL change dans une transition (`useTransition`). Le filtre change tout de suite à l'écran (`useOptimistic`) et les résultats s'estompent pendant le chargement. Panneau latéral sur grand écran, feuille du bas (`<dialog>` natif) sur mobile.
- `Shelf` : étagère horizontale, aimantée au doigt, flèches sur ordinateur. Les cartes restent des composants serveur.
- `Cover` : couverture 2:3. Sans image, une couverture typographique est générée à partir du titre. Sur Vercel, le portail refuse les requêtes du serveur, donc de l'optimiseur d'images : le navigateur charge alors la couverture directement (`NEXT_PUBLIC_VERCEL_ENV`).

## 5. Limites connues

- Disponibilités fictives tant qu'il n'y a pas d'accès officiel.
- Pas de genre ni de public cible (jeunesse, adulte) dans les notices : on ne peut pas filtrer par là.
- Regroupement heuristique : deux éditions au titre légèrement différent restent deux œuvres.
- Sur `next dev`, le premier affichage attend le chargement du catalogue (quelques secondes). Le préchargement par `instrumentation.ts` a été écarté : avec Turbopack, il fait boucler le rechargement à chaud.
