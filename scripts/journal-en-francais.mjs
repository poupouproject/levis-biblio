/**
 * Traduit les titres que Changesets ajoute à CHANGELOG.md (« ### Patch Changes »…) et date
 * la version qu'il vient d'écrire.
 *
 * Aucun réglage de Changesets ne change les titres, et il n'écrit aucune date ; ce script est
 * appelé juste après `changeset version` (script `version` de package.json).
 *
 * La date est celle de la **préparation** de la version (label « ready »), pas de la publication :
 * la fusion suit quelques minutes plus tard, sauf si une vérification échoue et que « ready » est
 * reposé un autre jour, auquel cas la date reste celle du premier passage. La page /nouveautes
 * l'affiche comme date de mise en production. Elle va sur sa propre ligne plutôt que dans le
 * titre « ## X.Y.Z », que .github/workflows/publier.yml cherche tel quel ; ce workflow retire
 * cette ligne des notes de la release GitHub, qui ont leur propre date.
 *
 * Pour les tests : node journal-en-francais.mjs <journal> <version> <AAAA-MM-JJ>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [, , cheminArg, versionArg, dateArg] = process.argv;

const changelogPath = cheminArg ?? fileURLToPath(new URL('../CHANGELOG.md', import.meta.url));
if (!existsSync(changelogPath)) process.exit(0);

const titres = { Major: 'Changements majeurs', Minor: 'Nouveautés', Patch: 'Correctifs' };

const version =
  versionArg ??
  JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))
    .version;
// « en-CA » écrit AAAA-MM-JJ ; le fuseau de Lévis évite une date du lendemain en soirée.
// Même règle que todayIso() (src/lib/account/format.ts), qu'un .mjs ne peut pas importer :
// à changer aux deux endroits.
const date =
  dateArg ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());

/** Ajoute « Mise en production : <date> » sous « ## <version> » si elle n'y est pas déjà. */
function dater(journal) {
  const lignes = journal.split('\n');
  const i = lignes.findIndex((l) => l.trimEnd() === `## ${version}`);
  if (i === -1) return journal;
  const suite = lignes.slice(i + 1, i + 4);
  if (suite.some((l) => l.startsWith('Mise en production : '))) return journal;
  lignes.splice(i + 1, 0, '', `Mise en production : ${date}`);
  return lignes.join('\n');
}

const changelog = readFileSync(changelogPath, 'utf8');
const traduit = dater(
  changelog.replace(/^### (Major|Minor|Patch) Changes$/gm, (_, type) => `### ${titres[type]}`),
);

if (traduit !== changelog) {
  writeFileSync(changelogPath, traduit);
  console.log('CHANGELOG.md : titres de Changesets traduits, version datée');
}
