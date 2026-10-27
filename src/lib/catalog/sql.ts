// Recherche dans Postgres : requêtes et conversions pures (testées), sans connexion.
// Tables et vue interrogées (catalogue_oeuvres, series, auteurs) : colonnes et vecteurs tenus à
// jour par Postgres, voir supabase/migrations/20261027060000_normalisation_sql.sql.
import { FORMAT_LABELS, formatGroup, normalizeIsbn, plausibleYear, tokenize } from './normalize';
import type { FormatGroup } from './normalize';
import type {
  CatalogEdition,
  CatalogWork,
  FacetCount,
  Period,
  SearchQuery,
  SeriesSummary,
} from './types';

export const PERIOD_IDS: Period[] = ['recent', '2010', '2000', 'older'];

/**
 * Requête plein texte : chaque mot doit être présent, en début de mot (« pot » trouve
 * « potter »), pour la recherche à la saisie. Une lettre seule est un mot entier : en préfixe,
 * « a » toucherait presque tout le catalogue. Les mots sont déjà repliés (a-z, 0-9).
 */
export function toTsQuery(tokens: string[]): string | null {
  const words = tokens.filter((t) => /^[a-z0-9]+$/.test(t));
  if (words.length === 0) return null;
  return words.map((t) => (t.length > 1 ? `${t}:*` : t)).join(' & ');
}

/** Ce que la recherche cherche : un ISBN, ou des mots. */
export function parseText(q: string): { isbn: string | null; tokens: string[]; phrase: string } {
  const isbn = normalizeIsbn(q.trim());
  const tokens = isbn ? [isbn] : tokenize(q);
  return { isbn, tokens, phrase: tokens.join(' ') };
}

/** Recherche sans texte ni auteur : la liste suit l'index, les compteurs viennent du cache. */
export function isBrowse(query: SearchQuery): boolean {
  return parseText(query.q).tokens.length === 0 && query.author === null;
}

// Ordre de base, sans requête : couverture d'abord, puis les plus récents, puis les populaires
const BASE_ORDER = '(couverture is not null) desc, annee desc nulls last, popularite desc, ref';

const PERIOD_SQL = `case when r.annee is null or r.annee < 2000 then 'older'
  when r.annee >= $8 then 'recent' when r.annee >= 2010 then '2010' else '2000' end`;

/** Colonnes d'une carte d'œuvre (listes, étagères, séries). */
export const CARD_COLUMNS =
  'ref, titre, sous_titre, serie_nom, serie_slug, tome, auteurs, annee, formats, couverture';

// Pertinence : celle du moteur en mémoire (engine.ts, score) plus le rang plein texte.
// Série exacte : tous ses tomes passent devant, dans l'ordre des tomes.
const SCORE_EXACT = `case when $3::text = '' then 0
  when r.serie_cle = $3 then 1000 - coalesce(r.tome, 0)
  else case when r.titre_cle = $3 then 100 when r.titre_cle like $3 || '%' then 60 else 0 end
    + case when not exists (select 1 from unnest($2::text[]) t where strpos(r.titre_cle, t) = 0)
           then 40 else 0 end
    + case when r.serie_cle is not null
             and not exists (select 1 from unnest($2::text[]) t where strpos(r.serie_cle, t) = 0)
           then 45 - coalesce(r.tome, 0) * 0.05 else 0 end
    + case when exists (select 1 from unnest(string_to_array(r.auteurs_cle, '|')) a
                        where not exists (select 1 from unnest($2::text[]) t where strpos(a, t) = 0))
           then 30 else 0 end
    + (select count(*) from unnest($2::text[]) t
        where strpos(' ' || r.titre_cle || ' ', ' ' || t || ' ') > 0) * 6
    + r.popularite
    + coalesce(ts_rank_cd(r.document, q.tsq), 0) * 10 end`;

// Fautes de frappe : titre proche de la requête (trigrammes), si rien ne correspond exactement
const SCORE_APPROCHANT = `extensions.word_similarity($3::text, r.titre_cle) * 100 + r.popularite`;

export type SearchMode = 'exact' | 'approchant';

/**
 * Une seule requête : correspondance, filtres, facettes (chacune ignore son propre filtre) et
 * page de résultats. Paramètres : voir searchValues.
 */
export function searchSql(mode: SearchMode, withFacets: boolean): string {
  const match =
    mode === 'exact'
      ? '($1::text is null or r.document @@ q.tsq) and ($4::text is null or r.isbns @> array[$4::text])'
      : '$3::text operator(extensions.<%) r.titre_cle';
  const facets = withFacets
    ? `count(*) filter (where ok_f and ok_p)::int as total,
       json_build_object(${(Object.keys(FORMAT_LABELS) as FormatGroup[])
         .map((f) => `'${f}', count(*) filter (where ok_p and '${f}' = any(formats))`)
         .join(', ')}) as formats,
       json_build_object(${PERIOD_IDS.map(
         (p) => `'${p}', count(*) filter (where ok_f and periode = '${p}')`,
       ).join(', ')}) as periods`
    : 'null::int as total, null::json as formats, null::json as periods';
  return `
    with q as (select case when $1::text is null then null
                           else to_tsquery('public.catalogue', $1::text) end as tsq,
                      -- Paramètres typés même quand le mode ne s'en sert pas
                      $2::text[] as mots, $4::text as isbn),
    m as materialized (
      select ${CARD_COLUMNS.split(', ')
        .map((c) => `r.${c}`)
        .join(', ')}, r.popularite, r.titre_cle,
             ${PERIOD_SQL} as periode,
             ${mode === 'exact' ? SCORE_EXACT : SCORE_APPROCHANT} as score
        from catalogue_oeuvres r, q
       where ${match}
         and ($5::uuid[] is null or r.auteur_ids && $5::uuid[])
         and case when $10::text is not null
                  then $10::text = any(case when $9::boolean then r.succursales_dispo else r.succursales end)
                  when $9::boolean then cardinality(r.succursales_dispo) > 0 else true end
    ),
    f as (
      select m.*, (cardinality($6::text[]) = 0 or m.formats && $6::text[]) as ok_f,
             ($7::text is null or m.periode = $7::text) as ok_p
        from m
    ),
    agg as (select ${facets} from f)
    select agg.total, agg.formats, agg.periods,
           (select coalesce(json_agg(w), '[]') from (
              select ${CARD_COLUMNS} from f where ok_f and ok_p
               order by case when $11::text = 'titre' then titre_cle end,
                        case when $11::text = 'recent' then annee end desc nulls last,
                        case when $11::text = 'pertinence' and $3::text <> '' then score end desc,
                        ${BASE_ORDER}
               limit $12::int) w) as works
      from agg`;
}

/** Paramètres de searchSql, dans l'ordre ($1 à $12). */
export function searchValues(
  query: SearchQuery,
  authorIds: string[] | null,
  recentYear: number,
): unknown[] {
  const { isbn, tokens, phrase } = parseText(query.q);
  return [
    isbn ? null : toTsQuery(tokens),
    tokens,
    phrase,
    isbn,
    authorIds,
    query.formats,
    query.period,
    recentYear,
    query.available,
    query.branch,
    query.sort,
    query.limit,
  ];
}

/** Parcours sans texte : la page de résultats, sans facettes (servies par le cache). */
export const BROWSE_SQL = `
  select ${CARD_COLUMNS} from catalogue_oeuvres r
   where (cardinality($1::text[]) = 0 or r.formats && $1::text[])
     and ($2::text is null or ${PERIOD_SQL.replace('$8', '$3')} = $2::text)
     and case when $5::text is not null
              then $5::text = any(case when $4::boolean then r.succursales_dispo else r.succursales end)
              when $4::boolean then cardinality(r.succursales_dispo) > 0 else true end
   order by case when $6::text = 'titre' then titre_cle end,
            case when $6::text = 'recent' then annee end desc nulls last,
            ${BASE_ORDER}
   limit $7::int`;

export function browseValues(query: SearchQuery, recentYear: number): unknown[] {
  return [
    query.formats,
    query.period,
    recentYear,
    query.available,
    query.branch,
    query.sort,
    query.limit,
  ];
}

/** Clé de cache des compteurs d'un parcours : seuls les filtres comptent. */
export function browseKey(query: SearchQuery, recentYear: number): string {
  return JSON.stringify([
    [...query.formats].sort(),
    query.period,
    query.available,
    query.branch,
    recentYear,
  ]);
}

export interface CardRow {
  ref: string;
  titre: string;
  sous_titre: string | null;
  serie_nom: string | null;
  serie_slug: string | null;
  tome: number | null;
  auteurs: string[] | null;
  annee: number | null;
  formats: string[] | null;
  couverture: string | null;
}

const FORMAT_IDS = new Set<string>(Object.keys(FORMAT_LABELS));

/** Carte d'œuvre : sans éditions ni résumé (la fiche les lit à part). */
export function rowToWork(row: CardRow): CatalogWork {
  return {
    id: row.ref,
    title: row.titre,
    subtitle: row.sous_titre,
    authors: row.auteurs ?? [],
    series:
      row.serie_nom && row.serie_slug
        ? { name: row.serie_nom, slug: row.serie_slug, volume: row.tome }
        : null,
    cover: row.couverture,
    year: row.annee,
    formats: (row.formats ?? []).filter((f): f is FormatGroup => FORMAT_IDS.has(f)),
    summary: null,
    subjects: [],
    editions: [],
  };
}

export interface EditionRow {
  title_id: string | null;
  isbn: string | null;
  titre: string | null;
  annee: number | null;
  format: string | null;
  editeur: string | null;
  pages: number | null;
  couverture: string | null;
}

/** Éditions d'une fiche, comme le moteur : formats regroupés, années plausibles, récentes d'abord. */
export function rowsToEditions(rows: EditionRow[], now = new Date()): CatalogEdition[] {
  return rows
    .map((r) => ({
      titleId: r.title_id ?? r.isbn ?? '',
      isbn: r.isbn,
      title: r.titre ?? '',
      year: plausibleYear(r.annee, now),
      format: formatGroup(r.format),
      formatLabel: r.format ?? 'Livre',
      publisher: r.editeur,
      pages: r.pages,
      cover: r.couverture,
    }))
    .filter((e) => e.titleId !== '')
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

export interface SeriesRow {
  nom: string;
  slug: string;
  nb_tomes: number;
  couvertures: string[] | null;
  annee_max: number | null;
  auteurs: string[] | null;
}

export function rowToSeries(row: SeriesRow): SeriesSummary {
  return {
    name: row.nom,
    slug: row.slug,
    authors: row.auteurs ?? [],
    count: row.nb_tomes,
    covers: row.couvertures ?? [],
    latestYear: row.annee_max,
  };
}

/** Facettes au format du moteur : formats présents (ou cochés), toutes les périodes. */
export function toFacets(
  formats: Record<string, number> | null,
  periods: Record<string, number> | null,
  selected: FormatGroup[],
  periodLabels: Record<Period, string>,
): { formats: FacetCount<FormatGroup>[]; periods: FacetCount<Period>[] } {
  const chosen = new Set(selected);
  return {
    formats: (Object.keys(FORMAT_LABELS) as FormatGroup[])
      .map((id) => ({ id, label: FORMAT_LABELS[id], count: formats?.[id] ?? 0 }))
      .filter((f) => f.count > 0 || chosen.has(f.id)),
    periods: PERIOD_IDS.map((id) => ({
      id,
      label: periodLabels[id],
      count: periods?.[id] ?? 0,
    })),
  };
}

/**
 * Étagère « auteurs d'ici » : une œuvre par série, en alternant les auteurs. `bucket` donne
 * l'auteur (sa position dans la liste demandée) de chaque œuvre, déjà triée par ordre de base.
 */
export function interleave<T extends { bucket: number; key: string }>(
  items: T[],
  authors: number,
  limit: number,
): T[] {
  const buckets: T[][] = Array.from({ length: authors }, () => []);
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    buckets[item.bucket]?.push(item);
  }
  const out: T[] = [];
  for (let round = 0; out.length < limit && buckets.some((b) => b.length > round); round++) {
    for (const bucket of buckets) {
      const item = bucket[round];
      if (item && out.length < limit) out.push(item);
    }
  }
  return out;
}
