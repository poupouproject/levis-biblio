// Chargement complet : analyse toutes les notices (src/lib/catalog) et remplit séries, œuvres et
// auteurs. Postgres calcule ensuite le reste (agrégats, clés repliées, vecteurs de recherche :
// supabase/migrations/20261027060000_normalisation_sql.sql). Les notices ajoutées plus tard
// passent par src/lib/catalog/ingestion.ts, une à une.
// Usage : node --env-file=.env.local scripts/structurer-catalogue.mjs [--remplacer] [--revue <fichier.json>]
//
// Écrit dans la base de DATABASE_URL, en une transaction. Refuse de tourner si les séries ou
// les auteurs sont déjà remplis, sauf avec --remplacer (refait toute la structure) : une
// deuxième exécution ne crée jamais de doublons.
// Le moteur importe des modules TypeScript avec l'alias « @/ » : chargé par jiti.
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const VERSION_REGLES = 1;
const root = fileURLToPath(new URL('..', import.meta.url));
const { createJiti } = createRequire(import.meta.url)('jiti');
const jiti = createJiti(import.meta.url, { alias: { '@': join(root, 'src') } });
const { Catalog, groupKey } = await jiti.import('../src/lib/catalog/engine.ts');
const { fold, parseAuthor, parseTitle } = await jiti.import('../src/lib/catalog/normalize.ts');
const { resolveAuthors } = await jiti.import('../src/lib/catalog/auteurs.ts');
const { simulateAvailability } = await jiti.import('../src/lib/catalog/availability.ts');

const revueArg = process.argv.indexOf('--revue');
const REVUE = revueArg > 0 ? process.argv[revueArg + 1] : join(tmpdir(), 'auteurs-a-revoir.json');
const REMPLACER = process.argv.includes('--remplacer');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL manquant (voir .env.local).');
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();

const { rows: deja } = await client.query(
  'select (select count(*) from series)::int as series, (select count(*) from auteurs)::int as auteurs',
);
if ((deja[0].series > 0 || deja[0].auteurs > 0) && !REMPLACER) {
  console.error('Séries ou auteurs déjà remplis : relancer avec --remplacer pour tout refaire.');
  await client.end();
  process.exit(1);
}

// Tout se passe dans une transaction : en cas d'erreur, la base reste telle quelle.
// Les déclencheurs sont suspendus pendant le chargement : un seul recalcul à la fin.
const TABLES = ['editions', 'oeuvres', 'series', 'auteurs', 'auteurs_variantes'];
await client.query('begin');
for (const table of TABLES) await client.query(`alter table ${table} disable trigger user`);
if (REMPLACER) {
  // Retire ce qu'une exécution précédente a créé. Les œuvres qui ont un contenu propre
  // (résumé, sujets, vecteur, identifiant importé) sont gardées, sans leur structure.
  const creee = `version_regles is not null and resume is null and sujets is null
    and embedding is null and ol_work_id is null and bnf_ark is null`;
  await client.query(`
    delete from oeuvres_auteurs;
    delete from auteurs_variantes;
    delete from auteurs;
    update editions set oeuvre_id = null where oeuvre_id in (select id from oeuvres where ${creee});
    delete from oeuvres where ${creee};
    update oeuvres set sous_titre = null, serie_id = null, tome = null, title_id_reference = null,
                       cle_regroupement = null, version_regles = null;
    delete from series;`);
}

// 1. Regroupement du moteur
const { rows } = await client.query(
  `select e.id, e.oeuvre_id, e.isbn, e.title_id, e.titre_brut, e.auteur_brut, e.editeur,
          e.annee_publication, e.format, e.nb_pages, e.image_couverture, o.resume, o.sujets
     from editions e left join oeuvres o on o.id = e.oeuvre_id`,
);
const catalogue = new Catalog(
  rows.map((r) => ({
    isbn: r.isbn,
    titleId: r.title_id,
    title: r.titre_brut ?? '',
    author: r.auteur_brut,
    publisher: r.editeur,
    year: r.annee_publication,
    format: r.format,
    pages: r.nb_pages,
    cover: r.image_couverture,
    summary: r.resume,
    subjects: r.sujets,
  })),
);

// 2. Œuvres, séries, formes d'auteur
const series = new Map(); // clé → { id, nom, slug }
const oeuvres = new Map(); // id du moteur → { id, work, existante, cle }
const editionOeuvre = []; // [id édition, œuvre]
const formes = new Map(); // forme brute → { count, series: Set, oeuvres: Set }
const reprises = new Set(); // œuvres existantes déjà attribuées
for (const row of rows) {
  const work = row.title_id ? catalogue.getWork(row.title_id) : null;
  if (!work) continue;
  let oeuvre = oeuvres.get(work.id);
  if (!oeuvre) {
    oeuvre = { id: null, work, existante: false, cle: null };
    oeuvres.set(work.id, oeuvre);
  }
  // Clé de regroupement : celle d'une édition qui a un auteur (un tome sans auteur a rejoint
  // le tome de même numéro qui en a un), sinon celle de n'importe quelle édition
  const author = parseAuthor(row.auteur_brut);
  if (!oeuvre.cle || (author && oeuvre.cle.endsWith('|'))) {
    oeuvre.cle = groupKey(parseTitle(row.titre_brut ?? ''), author?.key ?? null).key;
  }
  // Une œuvre déjà en base (résumé, sujets, vecteur) garde son identifiant, pour une seule
  // œuvre du moteur : les autres en reçoivent un nouveau
  if (row.oeuvre_id && !oeuvre.existante && !reprises.has(row.oeuvre_id)) {
    oeuvre.id = row.oeuvre_id;
    oeuvre.existante = true;
    reprises.add(row.oeuvre_id);
  }
  editionOeuvre.push([row.id, oeuvre]);
  const serieCle = work.series ? fold(work.series.name) : null;
  if (work.series && !series.has(serieCle)) {
    series.set(serieCle, { id: randomUUID(), nom: work.series.name, slug: work.series.slug });
  }
  if (row.auteur_brut) {
    const f = formes.get(row.auteur_brut) ?? { count: 0, series: new Set(), oeuvres: new Set() };
    f.count++;
    if (serieCle) f.series.add(serieCle);
    f.oeuvres.add(work.id);
    formes.set(row.auteur_brut, f);
  }
}
for (const oeuvre of oeuvres.values()) oeuvre.id ??= randomUUID();

const { auteurs, aRevoir } = resolveAuthors(
  [...formes].map(([forme, f]) => ({ forme, count: f.count, series: [...f.series] })),
);
const auteurIds = auteurs.map(() => randomUUID());
const auteurDeForme = new Map();
auteurs.forEach((a, i) => {
  for (const forme of a.formes) auteurDeForme.set(forme, auteurIds[i]);
});
const oeuvresAuteurs = new Set();
for (const [forme, f] of formes) {
  const auteurId = auteurDeForme.get(forme);
  if (!auteurId) continue;
  for (const workId of f.oeuvres) oeuvresAuteurs.add(`${oeuvres.get(workId).id}|${auteurId}`);
}

// 3. Écriture : seulement ce que le site sait analyser ; Postgres calcule le reste
const col = (list, pick) => list.map(pick);
const started = Date.now();
try {
  const s = [...series.values()];
  await client.query(
    `insert into series (id, nom, cle, slug)
     select * from unnest($1::uuid[], $2::text[], $3::text[], $4::text[])`,
    [col(s, (x) => x.id), col(s, (x) => x.nom), [...series.keys()], col(s, (x) => x.slug)],
  );
  const all = [...oeuvres.values()];
  const serieId = (w) => (w.series ? series.get(fold(w.series.name)).id : null);
  const dispo = new Map(all.map((o) => [o, simulateAvailability(o.work.id)]));
  const structure = (list) => [
    col(list, (o) => o.id),
    col(list, (o) => o.work.subtitle),
    col(list, (o) => serieId(o.work)),
    col(list, (o) => o.work.series?.volume ?? null),
    col(list, (o) => o.work.id),
    col(list, (o) => o.cle),
    col(list, (o) =>
      dispo
        .get(o)
        .branches.map((b) => b.code)
        .join('|'),
    ),
    col(list, (o) =>
      dispo
        .get(o)
        .branches.filter((b) => b.available > 0)
        .map((b) => b.code)
        .join('|'),
    ),
  ];
  const nouvelles = all.filter((o) => !o.existante);
  await client.query(
    `insert into oeuvres (id, titre, sous_titre, serie_id, tome, title_id_reference,
                          cle_regroupement, succursales, succursales_dispo, version_regles, langue)
     select v.id, v.titre, v.sous_titre, v.serie_id, v.tome, v.ref, v.cle,
            coalesce(string_to_array(nullif(v.succ, ''), '|'), '{}')::text[],
            coalesce(string_to_array(nullif(v.dispo, ''), '|'), '{}')::text[], $10::smallint, null::text
       from unnest($1::uuid[], $2::text[], $3::uuid[], $4::int[], $5::text[], $6::text[],
                   $7::text[], $8::text[], $9::text[])
            as v(id, sous_titre, serie_id, tome, ref, cle, succ, dispo, titre)`,
    [...structure(nouvelles), col(nouvelles, (o) => o.work.title), VERSION_REGLES],
  );
  // Œuvres existantes : on garde titre, résumé, sujets et vecteur ; on ajoute la structure
  const existantes = all.filter((o) => o.existante);
  await client.query(
    `update oeuvres o set sous_titre = v.sous_titre, serie_id = v.serie_id, tome = v.tome,
            title_id_reference = v.ref, cle_regroupement = v.cle,
            succursales = coalesce(string_to_array(nullif(v.succ, ''), '|'), '{}'),
            succursales_dispo = coalesce(string_to_array(nullif(v.dispo, ''), '|'), '{}'),
            version_regles = $9::smallint
       from unnest($1::uuid[], $2::text[], $3::uuid[], $4::int[], $5::text[], $6::text[],
                   $7::text[], $8::text[]) as v(id, sous_titre, serie_id, tome, ref, cle, succ, dispo)
      where o.id = v.id`,
    [...structure(existantes), VERSION_REGLES],
  );
  await client.query(
    `update editions e set oeuvre_id = v.oeuvre_id
       from unnest($1::uuid[], $2::uuid[]) as v(id, oeuvre_id) where e.id = v.id`,
    [col(editionOeuvre, ([id]) => id), col(editionOeuvre, ([, o]) => o.id)],
  );
  await client.query(
    `insert into auteurs (id, nom, nom_famille, prenom, naissance, deces, cle)
     select * from unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::smallint[],
                          $6::smallint[], $7::text[])`,
    [
      auteurIds,
      col(auteurs, (a) => a.nom),
      col(auteurs, (a) => a.nomFamille),
      col(auteurs, (a) => a.prenom),
      col(auteurs, (a) => a.naissance),
      col(auteurs, (a) => a.deces),
      col(auteurs, (a) => a.cle),
    ],
  );
  const variantes = [...auteurDeForme];
  await client.query(
    `insert into auteurs_variantes (forme, auteur_id) select * from unnest($1::text[], $2::uuid[])`,
    [col(variantes, ([forme]) => forme), col(variantes, ([, id]) => id)],
  );
  const liens = [...oeuvresAuteurs].map((k) => k.split('|'));
  await client.query(
    `insert into oeuvres_auteurs (oeuvre_id, auteur_id) select * from unnest($1::uuid[], $2::uuid[])`,
    [col(liens, ([o]) => o), col(liens, ([, a]) => a)],
  );

  // 4. Déclencheurs rétablis, puis un seul recalcul par Postgres (œuvres → séries, auteurs)
  for (const table of TABLES) await client.query(`alter table ${table} enable trigger user`);
  await client.query(
    'update oeuvres o set serie_cle = s.cle from series s where s.id = o.serie_id',
  );
  await client.query('select rafraichir_oeuvres(array(select id from oeuvres))');
  await client.query('commit');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}

writeFileSync(REVUE, JSON.stringify(aRevoir, null, 2));
console.log(
  `${String(series.size)} séries, ${String(oeuvres.size)} œuvres (${String([...oeuvres.values()].filter((o) => o.existante).length)} existantes conservées), ` +
    `${String(auteurs.length)} auteurs pour ${String(formes.size)} formes, ${String(oeuvresAuteurs.size)} liens œuvre-auteur, ` +
    `écriture et recalcul en ${String(Math.round((Date.now() - started) / 1000))} s.`,
);
console.log(`${String(aRevoir.length)} cas à revoir : ${REVUE}`);
