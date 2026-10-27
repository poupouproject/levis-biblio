# Catalogue : recherche, séries, accueil

## 1. Données

Les notices viennent de la base locale scrapée du catalogue SirsiDynix de Lévis (Postgres, table `editions`, ~160 000 éditions : titre, auteur, ISBN, année, format, couverture). Aucune disponibilité n'y figure.

| Contexte                    | Source                                                           | Recherche                                     |
| --------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| `DATABASE_URL` défini       | Postgres (voir 2), base locale ou Supabase                       | Requêtes SQL, index plein texte et trigrammes |
| Pas de base, ou injoignable | `src/lib/catalog/catalogue-demo.json` (~6 000 éditions, ~940 Ko) | Moteur en mémoire (`engine.ts`)               |

Choix fait une fois par requête de page (`CatalogSelector`, `connexion.ts`) : une page ne mélange jamais les deux sources. Seule une erreur de connexion (réseau, TLS, authentification, serveur arrêté) fait servir le jeu de démo ; une requête en erreur (délai dépassé, SQL) remonte sans rien changer. Base injoignable : la démo répond tout de suite, et une seule tentative en arrière-plan, toutes les 30 s, rétablit la base dès qu'elle répond.

Hors de la machine locale, la connexion exige TLS avec vérification du certificat : Supabase signe avec sa propre autorité, dont le certificat racine (tableau de bord → Database → SSL Configuration) va dans `DATABASE_CA_CERT` (PEM). Les paramètres `ssl*` de `DATABASE_URL` sont retirés (pg les ferait passer avant le certificat). `DATABASE_TLS=desactive` coupe TLS pour une base dans un conteneur joint par son nom, jamais en production. En production, `DATABASE_URL` est l'adresse du pooler de Supabase en mode transaction (port 6543) ; ce pooler ignore `statement_timeout`, d'où une limite de durée côté client (`query_timeout`).

Le jeu de démo se régénère avec `npm run catalogue:demo`. Il retient les 60 plus grandes séries illustrées, les nouveautés, les auteurs d'ici et les recherches populaires (`src/lib/catalog/curation.ts`), les notices enrichies et un échantillon stable du reste. Il garde le nombre total d'éditions pour l'accueil.

Le partage du travail entre le site et la base :

- **Le site analyse** chaque notice (TypeScript, `normalize.ts`, `auteurs.ts`) : série et tome, clé de regroupement en œuvre (`groupKey`, la règle du moteur), auteur. Une notice découverte est injectée par `src/lib/catalog/ingestion.ts` (`injectNotice`, dans une transaction) ; le chargement complet passe par `scripts/structurer-catalogue.mjs`, seulement à la demande du propriétaire.
- **Postgres calcule le reste**, à chaque écriture : colonnes générées (clés repliées, groupe de format, année plausible, formes ISBN, vecteur de recherche) et déclencheurs par instruction (une notice → son œuvre : formats, année, couverture, ISBN, auteurs ; une œuvre → sa série et ses auteurs). Fonctions de normalisation `public.replier`, `groupe_format`, `annee_plausible`, `isbn_formes` : mêmes règles que `normalize.ts`, vérifiées sur toutes les notices (seules quelques notices au texte corrompu diffèrent).

| Table               | Écrit par le site                                                                           | Calculé par Postgres                                                        |
| ------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `editions`          | La notice brute, `oeuvre_id`                                                                | `format_groupe`, `annee`, `isbns`                                           |
| `oeuvres`           | Titre, série et tome, `cle_regroupement`, `title_id_reference` (URL), disponibilité simulée | Formats, année, couverture, ISBN, éditions, auteurs, popularité, `document` |
| `series`            | `nom`, `cle` (nom replié, unique), `slug`                                                   | Nombre de tomes, couvertures, dernière année, auteurs, `document`           |
| `auteurs`           | Une personne : `cle` = nom de famille, prénom et année de naissance repliés                 | Nombre d’œuvres, `nom_cle`, `document`                                      |
| `auteurs_variantes` | Chaque forme brute (« Greg, 1931- . ») → un seul auteur                                     |                                                                             |
| `oeuvres_auteurs`   | Œuvre ↔ auteurs, avec un rôle                                                               |                                                                             |
| `liens_externes`    | Identifiants Open Library, Wikidata, BnF : plusieurs par œuvre, série ou auteur             |                                                                             |

Les auteurs sont réunis sans doublons par `src/lib/catalog/auteurs.ts`. Au chargement complet : même nom et même année de naissance (ou un an d’écart avec le même prénom, une coquille) ; une forme sans date rejoint la seule personne possible, ou celle qui signe au moins 75 % des notices de ce nom ; les cas douteux (homonymes sans date, noms différents dans une même série) vont dans un fichier de revue et ne sont jamais fusionnés. À l’injection d’une notice, seules les règles qui ne dépendent que de la forme s’appliquent (`findExistingAuthor`) ; sans candidat sûr, une nouvelle personne est créée.

Le chargement complet refuse de tourner deux fois ; `--remplacer` refait toute la structure, en gardant les œuvres qui ont un contenu propre (résumé, sujets, vecteur). Il suspend les déclencheurs le temps du chargement, puis demande un seul recalcul à Postgres (environ 3 min en local).

Migrations : `supabase/migrations/` (séries, auteurs et liens ; configuration plein texte ; normalisation dans Postgres).

**Supabase (plan gratuit)** : disque limité. Un recalcul de tout le catalogue en place (ancienne et nouvelle version de chaque ligne dans la même transaction) le remplit. Pour une migration lourde : vider les tables du catalogue, migrer, puis recharger les données de la base locale (`pg_dump --data-only`, déclencheurs suspendus pendant le chargement).

## 2. Recherche

### Dans Postgres (`postgres.ts`, `sql.ts`)

Requêtes sur la vue `catalogue_oeuvres` (œuvres qui ont au moins une édition, avec leur série ; sans stockage, `security_invoker`) et sur `series` et `auteurs`. Configuration plein texte `public.catalogue` : `simple` + `unaccent` (pas de radical français : les titres sont en plusieurs langues). Chaque mot se cherche en début de mot (« pot » trouve « potter »), une lettre seule en mot entier. Vecteur pondéré : titre et série A, auteurs B, sous-titre C, éditeur D. Index GIN sur le vecteur, les ISBN et les auteurs ; trigrammes (`pg_trgm`) sur le titre.

- **Une requête** par recherche : correspondance, filtres, facettes (`count(*) filter`, chacune ignore son propre filtre) et page de résultats.
- **Classement** : celui du moteur (série exacte, titre exact ou qui commence par la requête, mots entiers, auteur, popularité) plus le rang plein texte.
- **Faute de frappe** : sans résultat exact, les titres proches (trigrammes) sont proposés, avec un message.
- **Parcours sans texte** : la page suit l’index d’ordre de base ; les compteurs des facettes, qui portent sur tout le catalogue, sont gardés en cache une heure par combinaison de filtres.

Ordre de grandeur sur la base locale : 2 à 15 ms par recherche, ~130 ms pour une lettre seule, 300 à 500 ms pour le premier parcours d’une combinaison de filtres (puis en cache). Avec Supabase, ajouter l’aller-retour réseau.

### En mémoire (`engine.ts`, jeu de démo)

Le moteur ne dépend pas de la source : il est testé sur des lignes fictives. Il sert le jeu de démo, et son regroupement remplit les tables de la base.

- **Normalisation** (`normalize.ts`) : accents et ponctuation repliés ; série et tome tirés du titre (« One Piece. 25, L'homme… ») ; mention de genre retirée (« : roman ») ; auteur remis en « Prénom Nom », sans dates ni fonctions ; formats regroupés (Livres, Gros caractères, Livres audio, Musique, Films, Trousses, Numérique) ; années impossibles écartées.
- **Œuvres** : les éditions d'un même titre du même auteur (ou d'un même tome de série) forment une œuvre. Son identifiant est le plus petit `title_id`. Chaque `title_id` de ses éditions mène à sa fiche.
- **Séries** : toutes les œuvres portant le même nom de série, triées par tome.
- **Recherche** : chaque mot doit apparaître (titre, sous-titre, série, auteurs, éditeur, ISBN). Classement : série exacte (tomes dans l'ordre), titre exact, titre qui commence par la requête, mots entiers, auteur, popularité (nombre d'éditions, couverture). Un ISBN avec tirets est reconnu.
- **Facettes** : chaque facette compte les résultats en ignorant son propre filtre.
- **Suggestions** : 2 séries, 2 auteurs, puis les œuvres les mieux classées.

Ordre de grandeur, en mémoire sur 153 000 œuvres : 40 à 70 ms par recherche, 80 à 100 ms par suggestion, mais 4 à 8 s de chargement par processus : d'où la recherche dans Postgres.

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

Chercher _dans_ les résumés (plein texte, vecteurs) demanderait de les stocker. Il faudrait alors une source qui le permet : BnF (Licence Ouverte), Open Library (CC0), ou les résumés Electre de la Ville avec son accord.

## 4. Pages et composants

| Route                           | Rendu                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                             | Statique, régénérée toutes les heures : recherche, nouveautés, séries, auteurs d'ici, parcourir par type, succursales ouvertes (heure lue dans le navigateur), Mon dossier |
| `/recherche`                    | Dynamique ; l'état est dans l'URL (`q`, `auteur`, `format`, `periode`, `dispo`, `succursale`, `tri`, `n`), donc partageable                                                |
| `/oeuvre/[id]`                  | Fiche : série et tomes voisins, disponibilité par succursale avec heures, éditions, du même auteur                                                                         |
| `/serie/[slug]`                 | Tous les tomes, nombre disponible, « commencer par le tome N »                                                                                                             |
| `/api/catalogue/suggestions?q=` | JSON, en cache public 5 min                                                                                                                                                |

- `SearchBox` : combobox ARIA (flèches, Entrée, Échap), raccourci `/`, suggestions après 120 ms (requête annulée si la saisie change, réponses gardées en mémoire), recherches récentes dans le navigateur, mots en gras.
- `Filters` : l'URL change dans une transition (`useTransition`). Le filtre change tout de suite à l'écran (`useOptimistic`) et les résultats s'estompent pendant le chargement. Panneau latéral sur grand écran, feuille du bas (`<dialog>` natif) sur mobile.
- `Shelf` : étagère horizontale, aimantée au doigt, flèches sur ordinateur. Les cartes restent des composants serveur.
- `Cover` : couverture 2:3. Sans image, une couverture typographique est générée à partir du titre. Sur Vercel, le portail refuse les requêtes du serveur, donc de l'optimiseur d'images : le navigateur charge alors la couverture directement (`NEXT_PUBLIC_VERCEL_ENV`).

## 5. Limites connues

- Disponibilités fictives tant qu'il n'y a pas d'accès officiel.
- Pas de genre ni de public cible (jeunesse, adulte) dans les notices : on ne peut pas filtrer par là.
- Regroupement heuristique : deux éditions au titre légèrement différent restent deux œuvres.
- Sur `next dev`, le premier affichage attend le chargement du catalogue (quelques secondes). Le préchargement par `instrumentation.ts` a été écarté : avec Turbopack, il fait boucler le rechargement à chaud.
