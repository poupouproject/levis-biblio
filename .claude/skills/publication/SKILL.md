---
name: publication
description: Conventions de publication de LévisBiblio (Changesets, label « ready », versions). À lire avant de committer un changement, d'ouvrir ou de compléter une pull request, ou de répondre à une question sur les versions et le journal. Un changeset par changement, jamais un seul pour toute la branche.
---

# Publier un changement dans LévisBiblio

Le dépôt publie une version à chaque pull request fusionnée sur `main`, calculée par
la CI à partir des fichiers `.changeset/*.md`. Détails : `docs/publication-par-label.md`
et `.changeset/README.md`.

## Changesets : un par changement

Une branche peut regrouper plusieurs correctifs et nouveautés. **Chaque changement a
son propre fichier**, comme Changesets les accumule. Chacun devient une ligne du journal
et des notes de release.

1. Pour chaque changement de la branche, créer un fichier `.changeset/<nom-parlant>.md` :
   ```md
   ---
   "levis-biblio": patch
   ---

   Une ou deux phrases pour les usagers : ce qui change pour eux.
   ```
   Type : `patch` = correctif, `minor` = nouveauté visible, `major` = rupture. La version
   de la release prend le plus élevé de la branche.
2. Un changement ajouté plus tard dans la branche → **un nouveau fichier**. Ne pas
   réécrire ni fusionner les changesets existants. On n'en modifie un que pour corriger
   la description de *son* changement.
3. Changement sans effet visible (CI, refactor, documentation, dépendances) :
   `npx changeset add --empty`. Il en faut au moins un par branche : la vérification
   « Un changeset accompagne la branche » l'exige.
4. Texte en français, orienté usager. Pas de nom de fichier, de fonction ni de détail
   d'implémentation : ceux-là vont dans le message de commit et la description de PR.

Avant de committer, vérifier : un fichier par changement ? le bon type pour chacun ?

## Ne pas faire

- Ne pas lancer `npm run version` ni modifier `CHANGELOG.md` ou la version de
  `package.json` : la CI le fait quand on pose le label `ready`.
- Ne pas poser soi-même le label `ready` ni `publication-en-cours`. Poser `ready`
  publie : c'est la décision de la personne responsable du dépôt.
- Ne pas fusionner une PR soi-même.

## Pull request

- Une branche par lot de travail, PR vers `main`.
- **Lier les issues** (détail : skill `feuille-de-route`) :
  - issue entièrement résolue → `Closes #N` dans la description : GitHub la ferme à la fusion ;
  - issue seulement avancée → `Refs #N`, et un commentaire d'avancement sur l'issue
    (fait, reste à faire). Ne pas la fermer.
  - travail sans issue (ex. un bogue trouvé en cours de route) → créer l'issue, avec son
    jalon et ses labels, et la lier avec `Closes #N`.
- Titre et description en français. La description résume chaque changement (une section
  chacun), comment il a été vérifié, et ses limites.
- Un nouveau commit retire `ready` : il faut le reposer pour publier.
- Une branche de fonctionnalités qui accumule plusieurs changements reste en **brouillon**
  (draft) jusqu'à ce que le propriétaire décide de la publier.

## Voir aussi

- `conventions-code` : vérifications à lancer avant de committer.
- `verifier-app` : vérifier le changement dans un navigateur.
- `dependances-npm` : si la branche ajoute une dépendance.
- `feuille-de-route` : créer, lier, commenter et fermer les issues ; statut dans le projet.
