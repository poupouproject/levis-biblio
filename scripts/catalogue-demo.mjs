// Extrait le jeu de démo du catalogue (src/lib/catalog/catalogue-demo.json) depuis la base locale.
// Usage : npm run catalogue:demo   (lit DATABASE_URL dans .env.local)
//
// Le jeu sert en production, où il n'y a pas de base : quelques milliers d'éditions avec
// couverture, choisies pour que l'accueil et les recherches courantes soient riches.
import { writeFileSync } from 'node:fs';
import pg from 'pg';
import { AUTEURS_DICI, RECHERCHES_POPULAIRES } from '../src/lib/catalog/curation.ts';

const OUT = new URL('../src/lib/catalog/catalogue-demo.json', import.meta.url);
const COVER_PREFIX = 'https://levi.ent.sirsidynix.net/client/accueil/search/btlffile/';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL manquant (voir .env.local).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const COLUMNS = `e.isbn, e.title_id, e.titre_brut, e.auteur_brut, e.editeur, e.annee_publication,
  e.format, e.nb_pages, e.image_couverture, o.resume, o.sujets`;
const FROM = 'editions e left join oeuvres o on o.id = e.oeuvre_id';
const SERIES = String.raw`substring(e.titre_brut from '^(.+?)\.\s+[0-9]{1,4}(?:[,.]|$)')`;

const queries = {
  // 1. Les 60 plus grandes séries illustrées, tous leurs tomes
  series: `
    with s as (
      select lower(${SERIES}) serie from editions e
       where e.image_couverture is not null and ${SERIES} is not null
       group by 1 having count(*) >= 5 order by count(*) desc limit 60)
    select ${COLUMNS} from ${FROM} join s on lower(${SERIES}) = s.serie`,
  // 2. Nouveautés illustrées
  recent: `select ${COLUMNS} from ${FROM}
    where e.image_couverture is not null and e.annee_publication between extract(year from now()) - 1 and extract(year from now()) + 1
    order by e.annee_publication desc, e.title_id desc limit 900`,
  // 3. Auteurs d'ici et recherches populaires
  curated: `select ${COLUMNS} from ${FROM}
    where e.auteur_brut ~* $1 or e.titre_brut ~* $2`,
  // 4. Notices enrichies (résumé, sujets)
  enriched: `select ${COLUMNS} from ${FROM} where o.id is not null`,
  // 5. Variété : un échantillon stable du reste du catalogue
  sample: `select ${COLUMNS} from ${FROM}
    where e.image_couverture is not null order by md5(e.isbn) limit 2500`,
};

const surnames = AUTEURS_DICI.map((name) => {
  const parts = name.split(' ');
  return `${parts.at(-1)}, ${parts.slice(0, -1).join(' ')}`;
});
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const authorRe = `^(${surnames.map(escape).join('|')})`;
const titleRe = `^(${RECHERCHES_POPULAIRES.map(escape).join('|')})`;

const byIsbn = new Map();
for (const [name, sql] of Object.entries(queries)) {
  const { rows } = await client.query(sql, name === 'curated' ? [authorRe, titleRe] : []);
  let added = 0;
  for (const r of rows) {
    const key = r.isbn ?? r.title_id;
    if (byIsbn.has(key)) continue;
    byIsbn.set(key, r);
    added++;
  }
  console.log(`${name.padEnd(9)} ${String(added).padStart(5)} éditions`);
}
const {
  rows: [{ total }],
} = await client.query('select count(*)::int total from editions');
await client.end();

const rows = [...byIsbn.values()]
  .sort((a, b) => String(a.title_id).localeCompare(String(b.title_id), 'en', { numeric: true }))
  .map((r) => [
    r.isbn,
    r.title_id,
    r.titre_brut,
    r.auteur_brut,
    r.editeur,
    r.annee_publication,
    r.format,
    r.nb_pages,
    r.image_couverture?.startsWith(COVER_PREFIX)
      ? r.image_couverture.slice(COVER_PREFIX.length).replace(/\/cover$/, '')
      : null,
    r.resume,
    r.sujets?.length ? r.sujets : null,
  ]);

const json = JSON.stringify({
  generatedAt: new Date().toISOString().slice(0, 10),
  totalEditions: total,
  rows,
});
writeFileSync(OUT, `${json}\n`);
console.log(`→ ${String(rows.length)} éditions, ${(json.length / 1024).toFixed(0)} Ko`);
