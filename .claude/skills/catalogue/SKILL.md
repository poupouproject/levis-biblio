---
name: catalogue
description: Travailler sur la recherche et le catalogue de LévisBiblio (moteur en mémoire, base Postgres des notices dans Docker, jeu de démo de production, séries, suggestions, disponibilité simulée). À lire avant de modifier src/lib/catalog, les pages /recherche, /oeuvre, /serie, l'accueil, ou d'interroger la base.
---

# Catalogue

Documentation complète : `docs/catalogue.md`.

## Données

- **Base locale** (développement) : Supabase dans Docker Desktop, conteneur
  `supabase_db_levis-biblio`, port 54332, table `editions` (~160 000 notices scrapées) et
  `oeuvres` (résumés, 30 lignes). **Lecture seule** : ne rien écrire, ne pas créer d'index ni
  d'extension. Interroger : `docker exec supabase_db_levis-biblio psql -U postgres -c "…"`.
- **Production** (Vercel, pas de base) : `src/lib/catalog/catalogue-demo.json`, échantillon
  de ~6 000 éditions. Régénérer avec `npm run catalogue:demo` après un changement de
  sélection (`scripts/catalogue-demo.mjs`, `src/lib/catalog/curation.ts`). Ne jamais le
  reformater avec Prettier.
- Source choisie par `source.ts` : base si `DATABASE_URL` répond, sinon jeu de démo, avec un
  nouvel essai de la base toutes les 30 s.

## Moteur (`engine.ts`, pur et testé)

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

## Couvertures

URL du portail (`btlffile/<isbn>/cover`). Sur Vercel, chargées directement par le navigateur
(`unoptimized`, voir `Cover.tsx`). Sans image : couverture typographique générée.
