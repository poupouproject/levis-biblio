// Extrait du dump des éditions d'Open Library (CC0) celles qui portent un de nos ISBN.
// Usage : node --env-file=.env.local --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
//           scripts/openlibrary-editions.mjs [--limite <lignes>]
//
// Lit le .gz en continu (jamais décompressé sur le disque : plusieurs dizaines de Go) et ne
// garde que les éditions dont un ISBN est dans notre catalogue (`DATABASE_URL`, table `editions`).
// Écrit dans OL_DUMP_DIR (défaut : ~/openlibrary-dump) :
//   extraits/editions.jsonl : une ligne par édition Open Library retrouvée ;
//   extraits/editions-stats.json : couverture par format et par préfixe d'éditeur.
// La base n'est jamais modifiée.
import { createReadStream, createWriteStream, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import pg from 'pg';
import { canonicalIsbn13 } from '../src/lib/catalog/isbn.ts';

const DIR = process.env.OL_DUMP_DIR ?? join(homedir(), 'openlibrary-dump');
const SOURCE = join(DIR, 'ol_dump_editions_2026-09-30.txt.gz');
const OUT_DIR = join(DIR, 'extraits');
const limitArg = process.argv.indexOf('--limite');
const LINE_LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL manquant (voir .env.local).');
  process.exit(1);
}

// 1. Nos ISBN : ISBN-13 canonique → { format, titleIds }
const client = new pg.Client({ connectionString: url });
await client.connect();
const { rows } = await client.query('select isbn, title_id, format from editions');
await client.end();

const ours = new Map();
let withoutValidIsbn = 0;
for (const row of rows) {
  const key = canonicalIsbn13(row.isbn);
  if (!key) {
    withoutValidIsbn++;
    continue;
  }
  const known = ours.get(key);
  if (known) known.titleIds.push(row.title_id);
  else ours.set(key, { format: row.format ?? '(sans format)', titleIds: [row.title_id] });
}
console.log(
  `${String(rows.length)} notices, ${String(ours.size)} ISBN uniques à chercher, ${String(withoutValidIsbn)} sans ISBN valide.`,
);

// 2. Lecture du dump. Ligne : type \t clé \t révision \t date \t JSON (sans tabulation brute).
mkdirSync(OUT_DIR, { recursive: true });
const out = createWriteStream(join(OUT_DIR, 'editions.jsonl'));
const totalBytes = statSync(SOURCE).size;
let bytesRead = 0;
const raw = createReadStream(SOURCE, { highWaterMark: 4 * 1024 * 1024 });
raw.on('data', (chunk) => {
  bytesRead += chunk.length;
});
const gunzip = createGunzip();
const lines = createInterface({ input: raw.pipe(gunzip), crlfDelay: Infinity });

const ISBN_FIELD = /"isbn_1[03]"\s*:\s*\[([^\]]*)\]/g;
const QUOTED = /"([^"]*)"/g;
const matchedIsbn = new Set();
let lineCount = 0;
let withIsbn = 0;
let records = 0;
let truncated = false;
const started = Date.now();

function oursIn(line) {
  const found = new Set();
  for (const field of line.matchAll(ISBN_FIELD)) {
    for (const quoted of (field[1] ?? '').matchAll(QUOTED)) {
      const key = canonicalIsbn13(quoted[1]);
      if (key && ours.has(key)) found.add(key);
    }
  }
  return found;
}

const keys = (list) => (Array.isArray(list) ? list.map((item) => item?.key).filter(Boolean) : []);

try {
  for await (const line of lines) {
    lineCount++;
    if (lineCount > LINE_LIMIT) break;
    if (lineCount % 2_000_000 === 0) {
      const seconds = (Date.now() - started) / 1000;
      console.log(
        `${String(lineCount / 1e6)} M lignes, ${((bytesRead / totalBytes) * 100).toFixed(1)} %, ` +
          `${String(records)} éditions retenues, ${String(Math.round(seconds))} s`,
      );
    }
    if (!line.includes('"isbn_1')) continue;
    withIsbn++;
    const found = oursIn(line);
    if (found.size === 0) continue;

    let tabs = 0;
    let start = 0;
    while (tabs < 4) {
      start = line.indexOf('\t', start) + 1;
      tabs++;
    }
    const edition = JSON.parse(line.slice(start));
    for (const isbn of found) matchedIsbn.add(isbn);
    records++;
    out.write(
      `${JSON.stringify({
        isbn: [...found],
        key: edition.key,
        works: keys(edition.works),
        title: edition.title,
        subtitle: edition.subtitle,
        series: edition.series,
        authors: keys(edition.authors),
        languages: keys(edition.languages),
        publishDate: edition.publish_date,
        publishers: edition.publishers,
        pages: edition.number_of_pages,
        physicalFormat: edition.physical_format,
        translationOf: edition.translation_of,
        translatedFrom: keys(edition.translated_from),
        identifiers: edition.identifiers,
        oclc: edition.oclc_numbers,
        lccn: edition.lccn,
      })}\n`,
    );
  }
} catch (error) {
  if (error?.code !== 'Z_BUF_ERROR' && !/unexpected end of file/i.test(String(error?.message))) {
    throw error;
  }
  truncated = true;
}
// Arrêt anticipé (--limite) : sans cela, la lecture du fichier continue en arrière-plan.
raw.destroy();
gunzip.destroy();
await new Promise((resolve) => out.end(resolve));

// 3. Couverture
const byFormat = {};
const byPrefix = {};
for (const [isbn, info] of ours) {
  const prefix = isbn.slice(0, 7);
  const formatStats = (byFormat[info.format] ??= { total: 0, trouves: 0 });
  const prefixStats = (byPrefix[prefix] ??= { total: 0, trouves: 0 });
  formatStats.total++;
  prefixStats.total++;
  if (matchedIsbn.has(isbn)) {
    formatStats.trouves++;
    prefixStats.trouves++;
  }
}
const stats = {
  source: SOURCE,
  lignesLues: Math.min(lineCount, LINE_LIMIT),
  fichierTronque: truncated,
  limiteDeLignes: Number.isFinite(LINE_LIMIT) ? LINE_LIMIT : null,
  lignesAvecIsbn: withIsbn,
  isbnRecherches: ours.size,
  isbnTrouves: matchedIsbn.size,
  editionsRetenues: records,
  sansIsbnValide: withoutValidIsbn,
  parFormat: byFormat,
  parPrefixe: Object.fromEntries(
    Object.entries(byPrefix)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 60),
  ),
  secondes: Math.round((Date.now() - started) / 1000),
};
writeFileSync(join(OUT_DIR, 'editions-stats.json'), JSON.stringify(stats, null, 2));

const pct = (found, total) => (total ? `${((found / total) * 100).toFixed(1)} %` : '–');
console.log(
  `\n${String(stats.lignesLues)} lignes lues en ${String(stats.secondes)} s` +
    (truncated ? ' (fichier tronqué)' : '') +
    `\nISBN trouvés : ${String(stats.isbnTrouves)} / ${String(stats.isbnRecherches)} (${pct(stats.isbnTrouves, stats.isbnRecherches)})`,
);
for (const [format, s] of Object.entries(byFormat).sort((a, b) => b[1].total - a[1].total)) {
  console.log(
    `  ${format.padEnd(40)} ${pct(s.trouves, s.total).padStart(7)}  (${String(s.total)})`,
  );
}
