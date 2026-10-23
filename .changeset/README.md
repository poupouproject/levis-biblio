# Changesets

Chaque changement qui modifie l'application ajoute un fichier ici pour le décrire.
Il devient une entrée de `CHANGELOG.md` et des notes de la release GitHub.

```bash
npx changeset              # décrire un changement (patch, minor ou major)
npx changeset add --empty  # aucun effet visible : CI, refactor, dépendances, documentation
```

## Un changeset par changement

Une branche regroupe souvent plusieurs changements. **Chacun a son propre changeset**,
comme Changesets les accumule : un fichier par correctif ou par nouveauté, jamais un seul
fichier qui résume toute la branche. Chaque fichier devient une ligne du journal.

- Un nouveau changement plus tard dans la branche → **un nouveau fichier**, sans réécrire
  les précédents. On ne modifie un changeset que pour corriger le changement qu'il décrit.
- Le type de chaque fichier est celui de son changement : `patch` (correctif), `minor`
  (nouveauté visible), `major` (rupture). La version de la release prend le plus élevé.
- Le texte s'adresse aux usagers : ce qui change pour eux, en une ou deux phrases, au
  présent ou au passé composé. Pas de nom de fichier ni de détail d'implémentation.
- Nom du fichier : court et parlant (`renouvellement-session-expiree.md`).

Exemple, une branche avec un correctif et une nouveauté :

```md
<!-- .changeset/renouvellement-session-expiree.md -->
---
"levis-biblio": patch
---

Renouveler un emprunt n'affiche plus « session expirée » à tort.
```

```md
<!-- .changeset/notifications-actions.md -->
---
"levis-biblio": minor
---

Mon dossier : le résultat des actions s'affiche en notifications, avec le temps restant.
```

La version est calculée par la CI quand on pose le label `ready` sur la pull request
(voir [docs/publication-par-label.md](../docs/publication-par-label.md)) : ne pas lancer
`npm run version` soi-même.
