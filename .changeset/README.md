# Changesets

Chaque branche qui modifie l'application ajoute un fichier ici pour décrire son changement.
Il devient une entrée de `CHANGELOG.md` et des notes de la release GitHub.

```bash
npx changeset              # décrire le changement (patch, minor ou major)
npx changeset add --empty  # aucun effet visible : CI, refactor, dépendances
```

La version est calculée par la CI quand on pose le label `ready` sur la pull request
(voir [docs/publication-par-label.md](../docs/publication-par-label.md)) : ne pas lancer
`npm run version` soi-même.
