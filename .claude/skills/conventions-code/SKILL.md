---
name: conventions-code
description: Conventions de code de LévisBiblio (Next.js 16, React 19, TypeScript très strict, ESLint sans avertissement, français partout, mode démonstration). À lire avant d'écrire ou de modifier du code dans ce dépôt, et avant de committer.
---

# Conventions de code

## Langue

- Tout en **français** : interface, commentaires, documentation, messages de commit,
  changesets, tests. Typographie française : « guillemets », apostrophe ’ dans les textes
  affichés, espace avant « : ».
- Commentaires sobres, au niveau du code voisin : le pourquoi, pas le quoi.

## TypeScript strict (tsconfig)

`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`.

- Prop ou champ optionnel qui peut recevoir `undefined` : `prop?: T | undefined`.
- `tableau[i]` est `T | undefined` : `?.` / `??`, jamais `!`.

## ESLint (zéro avertissement) : règles rencontrées

- `no-non-null-assertion` : pas de `!`. Échanger deux éléments : passer par un tri ou une
  copie plutôt que `[a[i], a[j]] = [a[j]!, a[i]!]`.
- `react-hooks/set-state-in-effect` : pas de `setState` synchrone dans un effet. Dériver la
  valeur au rendu, ou ajuster l'état pendant le rendu (`if (prev !== prop) { … }`).
- `no-deprecated` : `FormEvent` est obsolète → `SyntheticEvent<HTMLFormElement>`.
- `consistent-type-definitions` : `interface` plutôt que `type` pour un objet.
- `no-misused-spread` : pas de `[...chaîne]` ; parcourir avec `charAt`.
- Un fichier `'use server'` n'exporte que des fonctions async : la logique à tester va dans
  `src/lib/…`.

## Formatage, fins de ligne

- `npx prettier --write` **sur les seuls fichiers touchés**. Jamais `npm run format` ni un
  dossier entier : Prettier reformate des fichiers sans rapport (et un `.json` de données).
  Si c'est arrivé : `git checkout --` des fichiers non concernés.
- `core.autocrlf=true` : les fichiers extraits par git sont en CRLF. Un remplacement de texte
  par script (Node, sed sur plusieurs lignes) qui cherche des `\n` échoue alors sans bruit.
  Utiliser l'outil d'édition, ou vérifier que le remplacement a bien eu lieu.

## Architecture à respecter

- Accès au portail : `src/lib/levis/` (serveur seulement, `server-only`). Lectures avec
  `loadZone` (stricte) ; soumissions de formulaire avec `submitZone`.
- Mon dossier a un **mode démonstration** (`src/lib/account/demo.ts`) : toute nouvelle
  lecture ou action du portail a son équivalent démo, branché dans `withAccount` (dal) ou
  `withSession` (actions).
- Résultat d'une action : `ActionResult` (`success` | `partial` | `error`), résumé par
  `src/lib/account/summary.ts` (accords en genre et en nombre), annoncé par des
  notifications (`notifyResult`, React-Toastify).
- Catalogue : voir le skill `catalogue`.

## Avant de committer

```bash
npm run typecheck && npm run lint && npm run test:unit
```

Ajouter des tests unitaires (`tests/unit/`, données fictives) pour toute logique nouvelle.
Une erreur d'hydratation est un bogue : `<dialog>`, `<div>` ou `<ul>` jamais dans un `<p>`.
Puis le skill `publication` (changesets, PR).
