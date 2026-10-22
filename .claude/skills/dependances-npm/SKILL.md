---
name: dependances-npm
description: Ajouter, retirer ou mettre à jour une dépendance npm dans LévisBiblio sans casser le package-lock.json (npm sous Windows élague des entrées optionnelles et `npm ci` échoue ensuite en CI). À lire avant tout `npm install`, `npm uninstall` ou changement de package.json.
---

# Dépendances npm

## Choisir

- Préférer une librairie **open source, maintenue et répandue** à un composant maison quand
  elle couvre le besoin (accessibilité, cas limites) : préférence du propriétaire.
- Vérifier avant : `npm view <paquet> version license peerDependencies dependencies --json`.
  Licence compatible MIT, compatible React 19 et Next 16, peu de dépendances.
- Si une librairie ne fait pas ce qui est demandé, le dire et proposer une alternative qui le
  fait nativement, plutôt que de l'étendre avec du code fragile.

## Installer sans casser le lockfile

Sous Windows, `npm install` retire du `package-lock.json` des entrées optionnelles d'autres
plateformes (constaté : `@emnapi/core`, `@emnapi/runtime`, y compris sous
`@tailwindcss/oxide-wasm32-wasi/node_modules/`). La CI (Linux) fait `npm ci` et peut alors
échouer (« lock file … does not satisfy … »).

1. Avant : garder le lockfile de référence : `git show origin/main:package-lock.json > "$TEMP/lock-before.json"`.
2. Installer avec une version exacte : `npm install <paquet>@<version> --no-audit --no-fund`.
3. Comparer et **restaurer** ce qui a disparu sans raison (script Node) : pour chaque clé de
   `packages` présente avant et absente après (hors paquets retirés volontairement), la
   remettre telle quelle, puis trier les clés et réécrire le fichier.
4. Vérifier que le diff du lockfile ne contient **que des ajouts** liés au paquet :
   `git diff package-lock.json | grep -E '^[+-]    "node_modules/'`.
5. Valider comme la CI, dans un dossier à part du scratchpad :
   `cp package.json package-lock.json <dossier>/ && cd <dossier> && npm ci --dry-run --ignore-scripts`
   → aucune ligne « npm error ».

Ne jamais régénérer tout le lockfile (`rm package-lock.json && npm install`).
