/**
 * Traduit les titres que Changesets ajoute à CHANGELOG.md (« ### Patch Changes »…).
 *
 * Aucun réglage de Changesets ne les change ; ce script est appelé juste après
 * `changeset version` (script `version` de package.json).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const changelogPath = fileURLToPath(new URL('../CHANGELOG.md', import.meta.url));
if (!existsSync(changelogPath)) process.exit(0);

const titres = { Major: 'Changements majeurs', Minor: 'Nouveautés', Patch: 'Correctifs' };

const changelog = readFileSync(changelogPath, 'utf8');
const traduit = changelog.replace(
  /^### (Major|Minor|Patch) Changes$/gm,
  (_, type) => `### ${titres[type]}`,
);

if (traduit !== changelog) {
  writeFileSync(changelogPath, traduit);
  console.log('CHANGELOG.md : titres de Changesets traduits');
}
