---
name: catalogue
description: Travailler sur la recherche et le catalogue de LévisBiblio (moteur en mémoire, base Postgres des notices dans Docker, jeu de démo de production, séries, suggestions, disponibilité simulée). À lire avant de modifier src/lib/catalog, les pages /recherche, /oeuvre, /serie, l'accueil, ou d'interroger la base.
---

# Catalogue

Documentation complète : `docs/catalogue.md`.

## Données

- **Base locale** (développement) : Supabase dans Docker Desktop, conteneur
  `supabase_db_levis-biblio`, port 54332 : `editions` (~160 000 notices scrapées), `oeuvres`,
  `series`, `auteurs`, `auteurs_variantes`, `oeuvres_auteurs`, `liens_externes`, et la vue
  `catalogue_oeuvres` (voir `docs/catalogue.md`). **Lecture seule par défaut** : un changement
  de schéma passe par une
  migration (`supabase/migrations/`), la structure se refait avec
  `scripts/structurer-catalogue.mjs --remplacer`, et l'un comme l'autre seulement à la demande
  du propriétaire. Interroger : `docker exec supabase_db_levis-biblio psql -U postgres -c "…"`
  (dans Git Bash, `MSYS_NO_PATHCONV=1` pour les chemins du conteneur).
- **Supabase en ligne** : même schéma et mêmes données que la base locale (copie des tables
  après chaque restructuration, pour garder les mêmes identifiants). Plan gratuit, disque
  limité : jamais de recalcul de tout le catalogue en place (disque plein) ; vider, migrer,
  recharger (voir `docs/catalogue.md`).
- **Qui calcule quoi** : le site analyse (série, tome, clé de regroupement, auteur ;
  `ingestion.ts` pour une notice, `structurer-catalogue.mjs` pour tout) ; Postgres calcule le
  reste (colonnes générées, déclencheurs, vecteurs). Les fonctions SQL `replier`,
  `groupe_format`, `annee_plausible`, `isbn_formes` doublent `normalize.ts` : changer l'un,
  c'est changer l'autre, et le vérifier sur toutes les notices.
- **Sans base** (Vercel tant que `DATABASE_URL` n'y est pas défini) :
  `src/lib/catalog/catalogue-demo.json`, échantillon de ~6 000 éditions. Régénérer avec
  `npm run catalogue:demo` après un changement de sélection (`scripts/catalogue-demo.mjs`,
  `src/lib/catalog/curation.ts`). Ne jamais le reformater avec Prettier.
- Source choisie par `source.ts`, à chaque appel : Postgres si `DATABASE_URL` répond, sinon
  jeu de démo, avec un nouvel essai de la base toutes les 30 s. Hors local, TLS vérifié :
  certificat racine de Supabase dans `DATABASE_CA_CERT` ; ne jamais désactiver la
  vérification.

## Recherche dans Postgres (`postgres.ts`, requêtes pures dans `sql.ts`)

- Requêtes paramétrées seulement (jamais le texte de l'usager dans le SQL). Plein texte
  `public.catalogue` (`simple` + `unaccent`), préfixes `mot:*`, index GIN ; trigrammes pour
  les fautes de frappe. Une requête par recherche (facettes avec `count(*) filter`).
- Les pages passent par `CatalogStore` (`store.ts`) : même interface pour Postgres et pour le
  moteur en mémoire. Tests : `tests/unit/catalog-sql.test.ts`, `tests/unit/ingestion.test.ts`,
  et `tests/live/ingestion.live.test.ts` (base locale, transaction annulée :
  `npx vitest run --config vitest.live.config.mts tests/live/ingestion.live.test.ts`).
- Mesurer sur la base complète : une recherche doit rester sous ~100 ms hors réseau.

## Moteur en mémoire (`engine.ts`, pur et testé)

- Normalisation dans `normalize.ts` : série et tome tirés du titre, auteur « Prénom Nom »,
  formats regroupés, ISBN sous ses formes 10 et 13. Toute nouvelle règle : un test dans
  `tests/unit/catalog.test.ts`.
- Une œuvre = même titre (ou même tome) **et** même auteur. Identifiant = plus petit
  `title_id`. Ne pas changer cette règle sans mesurer l'effet sur la base complète.
- Le catalogue est gardé en mémoire (`globalThis`) et reconstruit quand la classe `Catalog`
  change (rechargement à chaud).
- Mesurer sur la **base complète** (pas seulement le jeu de démo) : une recherche doit rester
  sous ~100 ms, une suggestion aussi.

## Disponibilité

Simulée (`availability.ts`), stable par œuvre et par jour, signalée « Démo » partout. Le
catalogue public de la Ville est protégé : ne jamais interroger les fiches ou la
disponibilité du portail.

## Résumés (Google Livres)

`src/lib/catalog/google-books.ts`, affiché par `components/catalog/BookSummary.tsx` sur la
fiche d'une œuvre seulement. Clé `GOOGLE_BOOKS_API_KEY`, **côté serveur** (jamais
`NEXT_PUBLIC_`). **Ne jamais stocker** un résumé Google (base, jeu de démo, fichier) : les
conditions l'interdisent ; le cache en mémoire suit l'en-tête `Cache-Control`. Garder
l'attribution (logo « Powered by Google » et lien). Ne pas appeler Google depuis la recherche,
les suggestions ou les étagères (quota). Les résumés Electre du portail sont sous licence de
la Ville : ne pas les reprendre. Détails : `docs/catalogue.md`.

## Couvertures

URL du portail (`btlffile/<isbn>/cover`). Sur Vercel, chargées directement par le navigateur
(`unoptimized`, voir `Cover.tsx`). Sans image : couverture typographique générée.
