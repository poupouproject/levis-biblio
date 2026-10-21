/**
 * Générateur d'entrées de CHANGELOG.md (voir .changeset/config.json).
 *
 * Le générateur par défaut de Changesets préfixe chaque entrée de l'identifiant
 * du commit (« - a71ed36: ... ») : du bruit dans les notes de la release GitHub.
 * On n'écrit donc que la phrase du changeset.
 *
 * Les titres « ### Patch Changes » sont ajoutés par Changesets lui-même, hors
 * de portée d'un générateur : scripts/journal-en-francais.mjs les traduit.
 */

/** Une entrée par changeset, sans identifiant de commit. */
async function getReleaseLine(changeset) {
  const [first, ...rest] = changeset.summary
    .trim()
    .split('\n')
    .map((line) => line.trimEnd());

  return [`- ${first}`, ...rest.map((line) => `  ${line}`)].join('\n');
}

/** Un seul paquet dans le dépôt : aucune dépendance interne à annoncer. */
async function getDependencyReleaseLine() {
  return '';
}

const changelogFunctions = { getReleaseLine, getDependencyReleaseLine };

export default changelogFunctions;
