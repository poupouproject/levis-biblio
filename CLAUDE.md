# LévisBiblio

Interface citoyenne, open source, pour les bibliothèques de Lévis : recherche dans le
catalogue (séries, œuvres) et « Mon dossier » (emprunts, réservations). Next.js 16,
React 19, TypeScript très strict. Présentation : `README.md`.

@AGENTS.md

## Toujours

- **Français partout** : interface, commentaires, documentation, commits, changesets, PR.
- **Avant de committer** : `npm run typecheck && npm run lint && npm run test:unit`
  (zéro avertissement ESLint). Toute logique nouvelle a ses tests dans `tests/unit/`.
- `npx prettier --write` sur les **seuls fichiers touchés** : jamais `npm run format` ni un
  dossier entier.
- Toute lecture ou action de Mon dossier a son équivalent en **mode démonstration**
  (`src/lib/account/demo.ts`).
- Un **changeset par changement** ; issues liées aux PR (`Closes #N` / `Refs #N`).

## Jamais sans demande explicite du propriétaire

- Modifier le vrai dossier de bibliothèque (le portail est en lecture seule par défaut).
- Poser le label `ready`, fusionner une PR, lancer `npm run version`.
- Arrêter son serveur `next dev` (port 3000), écrire dans la base Docker du catalogue.

## Skills du projet (`.claude/skills/`)

| Quand | Skill |
|---|---|
| Écrire ou modifier du code | `conventions-code` |
| Committer, ouvrir ou compléter une PR | `publication` |
| Créer, lier, commenter ou fermer une issue | `feuille-de-route` |
| Vérifier dans un navigateur, captures, simuler la production | `verifier-app` |
| Interroger ou tester le vrai portail des bibliothèques | `portail-levis` |
| Ajouter ou mettre à jour une dépendance npm | `dependances-npm` |
| Recherche, catalogue, base des notices, jeu de démo | `catalogue` |
