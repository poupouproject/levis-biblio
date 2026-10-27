import 'server-only';
import type { Pool, QueryResultRow } from 'pg';
import { PERIOD_LABELS } from './engine';
import { fold, tokenize } from './normalize';
import {
  BROWSE_SQL,
  CARD_COLUMNS,
  browseKey,
  browseValues,
  interleave,
  isBrowse,
  parseText,
  rowToSeries,
  rowToWork,
  rowsToEditions,
  searchSql,
  searchValues,
  toFacets,
  toTsQuery,
  type CardRow,
  type EditionRow,
  type SearchMode,
  type SeriesRow,
} from './sql';
import type { CatalogStore } from './store';
import type { CatalogWork, SearchQuery, SearchResult, SeriesSummary, Suggestion } from './types';

const BASE_ORDER = '(couverture is not null) desc, annee desc nulls last, popularite desc, ref';

/** Les compteurs d'un parcours ne changent qu'à la restructuration du catalogue. */
const CACHE_MS = 60 * 60 * 1000;

interface SearchRow {
  total: number | null;
  formats: Record<string, number> | null;
  periods: Record<string, number> | null;
  works: CardRow[];
}

interface Cached<T> {
  value: T;
  until: number;
}

/** Le catalogue interrogé dans Postgres (vue catalogue_oeuvres, index GIN et trigrammes). */
export class PostgresCatalog implements CatalogStore {
  private readonly cache = new Map<string, Cached<unknown>>();

  constructor(private readonly pool: Pool) {}

  private async rows<T extends QueryResultRow>(sql: string, values: unknown[] = []): Promise<T[]> {
    return (await this.pool.query<T>(sql, values)).rows;
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.until > Date.now()) return hit.value as T;
    const value = await load();
    if (this.cache.size > 500) this.cache.clear();
    this.cache.set(key, { value, until: Date.now() + CACHE_MS });
    return value;
  }

  private recentYear(): number {
    return new Date().getFullYear() - 1;
  }

  /** Auteurs d'un nom affiché (« René Goscinny »), ou d'un nom de famille seul (« Goscinny »). */
  private async authorIds(name: string): Promise<string[]> {
    const key = fold(name);
    const [row] = await this.rows<{ ids: string[] | null }>(
      `select coalesce(
         (select array_agg(id) from auteurs where nom_cle = $1 and nb_oeuvres > 0),
         (select array_agg(id) from auteurs where nom_cle like '% ' || $1 and nb_oeuvres > 0)) as ids`,
      [key],
    );
    return row?.ids ?? [];
  }

  private async runSearch(
    mode: SearchMode,
    withFacets: boolean,
    query: SearchQuery,
    authorIds: string[] | null,
  ): Promise<SearchRow> {
    const [row] = await this.rows<SearchRow>(
      searchSql(mode, withFacets),
      searchValues(query, authorIds, this.recentYear()),
    );
    return row ?? { total: 0, formats: null, periods: null, works: [] };
  }

  /** Séries dont le nom contient tous les mots : nom exact d'abord, puis les plus populaires. */
  private async matchSeries(tokens: string[], limit: number): Promise<SeriesSummary[]> {
    const tsq = toTsQuery(tokens);
    if (!tsq) return [];
    const rows = await this.rows<SeriesRow>(
      `select nom, slug, nb_tomes, couvertures, annee_max, auteurs from series
        where nb_tomes > 0 and document @@ to_tsquery('public.catalogue', $1)
        order by (cle = $2)::int * 10000 + (cle like $2 || '%')::int * 20 + poids desc, slug
        limit $3`,
      [tsq, tokens.join(' '), limit],
    );
    return rows.map(rowToSeries);
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const started = performance.now();
    const recentYear = this.recentYear();
    const authorIds = query.author ? await this.authorIds(query.author) : null;
    const done = (row: SearchRow, series: SeriesSummary[], approximate = false): SearchResult => ({
      total: row.total ?? 0,
      works: row.works.map(rowToWork),
      series,
      facets: toFacets(row.formats, row.periods, query.formats, PERIOD_LABELS),
      tookMs: Math.round(performance.now() - started),
      ...(approximate ? { approximate } : {}),
    });

    if (isBrowse(query)) {
      // Parcours : la page suit l'index, les compteurs (tout le catalogue) viennent du cache
      const [works, counts] = await Promise.all([
        this.rows<CardRow>(BROWSE_SQL, browseValues(query, recentYear)),
        this.cached(`parcours:${browseKey(query, recentYear)}`, () =>
          this.runSearch('exact', true, { ...query, limit: 0 }, null),
        ),
      ]);
      return done({ ...counts, works }, []);
    }

    const { isbn, tokens } = parseText(query.q);
    const [exact, series] = await Promise.all([
      this.runSearch('exact', true, query, authorIds),
      isbn || tokens.length === 0 ? Promise.resolve([]) : this.matchSeries(tokens, 3),
    ]);
    if ((exact.total ?? 0) > 0 || isbn || tokens.length === 0) return done(exact, series);
    const near = await this.runSearch('approchant', true, query, authorIds);
    return (near.total ?? 0) > 0 ? done(near, series, true) : done(exact, series);
  }

  async suggest(q: string, limit = 8): Promise<Suggestion[]> {
    const tokens = tokenize(q);
    const tsq = toTsQuery(tokens);
    if (!tsq || fold(q).length < 2) return [];
    const query: SearchQuery = {
      q,
      formats: [],
      period: null,
      author: null,
      available: false,
      branch: null,
      sort: 'pertinence',
      limit,
    };
    const [series, authors, works] = await Promise.all([
      this.matchSeries(tokens, 2),
      this.rows<{ nom: string; nb_oeuvres: number }>(
        `select nom, nb_oeuvres from auteurs
          where document @@ to_tsquery('public.catalogue', $1) and nb_oeuvres >= 2
          order by nb_oeuvres desc, nom limit 2`,
        [tsq],
      ),
      this.runSearch('exact', false, query, null),
    ]);
    const out: Suggestion[] = [
      ...series.map((s): Suggestion => ({
        kind: 'serie',
        label: s.name,
        detail: `Série · ${String(s.count)} tome${s.count > 1 ? 's' : ''}`,
        href: `/serie/${s.slug}`,
        cover: s.covers[0] ?? null,
      })),
      ...authors.map((a): Suggestion => ({
        kind: 'auteur',
        label: a.nom,
        detail: `Auteur · ${String(a.nb_oeuvres)} œuvre${a.nb_oeuvres > 1 ? 's' : ''}`,
        href: `/recherche?auteur=${encodeURIComponent(a.nom)}`,
        cover: null,
      })),
    ];
    for (const w of works.works.map(rowToWork)) {
      out.push({
        kind: 'oeuvre',
        label: w.series?.volume
          ? `${w.series.name} ${String(w.series.volume)} · ${w.title}`
          : w.title,
        detail: [w.authors[0], w.year].filter(Boolean).join(' · '),
        href: `/oeuvre/${w.id}`,
        cover: w.cover,
      });
    }
    return out.slice(0, limit);
  }

  async getWork(id: string): Promise<CatalogWork | null> {
    const [row] = await this.rows<
      CardRow & { resume: string | null; sujets: string[] | null; editions: EditionRow[] }
    >(
      `select ${CARD_COLUMNS.split(', ')
        .map((c) => `r.${c}`)
        .join(', ')}, o.resume, o.sujets,
              (select coalesce(json_agg(json_build_object(
                 'title_id', e.title_id, 'isbn', e.isbn, 'titre', e.titre_brut,
                 'annee', e.annee_publication, 'format', e.format, 'editeur', e.editeur,
                 'pages', e.nb_pages, 'couverture', e.image_couverture)), '[]')
                 from editions e where e.oeuvre_id = r.id) as editions
         from catalogue_oeuvres r join oeuvres o on o.id = r.id
        where r.id = coalesce(
          (select id from catalogue_oeuvres where ref = $1),
          (select oeuvre_id from editions where title_id = $1 or isbn = $1 limit 1))`,
      [id],
    );
    if (!row) return null;
    return {
      ...rowToWork(row),
      summary: row.resume,
      subjects: row.sujets ?? [],
      editions: rowsToEditions(row.editions),
    };
  }

  async getSeries(slug: string): Promise<{ summary: SeriesSummary; works: CatalogWork[] } | null> {
    const [row] = await this.rows<SeriesRow & { works: CardRow[] }>(
      `select s.nom, s.slug, s.nb_tomes, s.couvertures, s.annee_max, s.auteurs,
              (select coalesce(json_agg(w order by coalesce(w.tome, 0), w.ref), '[]')
                 from (select ${CARD_COLUMNS} from catalogue_oeuvres
                        where serie_id = s.id) w) as works
         from series s where s.slug = $1 and s.nb_tomes > 0`,
      [slug],
    );
    return row ? { summary: rowToSeries(row), works: row.works.map(rowToWork) } : null;
  }

  async related(work: CatalogWork, limit = 12): Promise<CatalogWork[]> {
    const rows = await this.rows<CardRow>(
      `with w as (select id, auteur_ids, serie_id from catalogue_oeuvres where ref = $1)
       select ${CARD_COLUMNS} from (
         select r.*, row_number() over (
                  partition by coalesce(r.serie_id::text, r.ref) order by ${BASE_ORDER}) as rang
           from catalogue_oeuvres r, w
          where cardinality(w.auteur_ids) > 0 and r.auteur_ids && w.auteur_ids
            and r.id <> w.id
            and (w.serie_id is null or r.serie_id is distinct from w.serie_id)) x
        where rang = 1 order by ${BASE_ORDER} limit $2`,
      [work.id, limit],
    );
    return rows.map(rowToWork);
  }

  /** Nouveautés avec couverture, une seule par série pour varier l'étagère. */
  async newest(limit = 18): Promise<CatalogWork[]> {
    const rows = await this.rows<CardRow>(
      `select ${CARD_COLUMNS} from (
         select r.*, row_number() over (
                  partition by coalesce(r.serie_id::text, r.ref) order by ${BASE_ORDER}) as rang
           from catalogue_oeuvres r where r.couverture is not null and r.annee >= $1) x
        where rang = 1 order by ${BASE_ORDER} limit $2`,
      [this.recentYear(), limit],
    );
    return rows.map(rowToWork);
  }

  async topSeries(limit = 10): Promise<SeriesSummary[]> {
    const rows = await this.rows<SeriesRow>(
      `select nom, slug, nb_tomes, couvertures, annee_max, auteurs from series
        where nb_tomes >= 4 and cardinality(couvertures) >= 3
        order by nb_tomes desc, slug limit $1`,
      [limit],
    );
    return rows.map(rowToSeries);
  }

  /** Œuvres avec couverture des auteurs donnés, une par série, en alternant les auteurs. */
  async byAuthors(names: string[], limit = 18): Promise<CatalogWork[]> {
    const rows = await this.rows<CardRow & { bucket: number; serie_id: string | null }>(
      `with a as (select id as auteur_id, array_position($1::text[], nom_cle) - 1 as bucket
                    from auteurs where nom_cle = any($1::text[]) and nb_oeuvres > 0)
       select ${CARD_COLUMNS}, serie_id,
              (select min(a.bucket) from a where a.auteur_id = any(r.auteur_ids))::int as bucket
         from catalogue_oeuvres r
        where r.auteur_ids && (select array_agg(auteur_id) from a) and r.couverture is not null
        order by ${BASE_ORDER} limit 2000`,
      [names.map(fold)],
    );
    return interleave(
      rows.map((r) => ({ ...r, key: r.serie_id ?? r.ref })),
      names.length,
      limit,
    ).map(rowToWork);
  }

  formatCounts(): ReturnType<CatalogStore['formatCounts']> {
    return this.cached('formats', async () => {
      const rows = await this.rows<{ format: string; n: number }>(
        `select f as format, count(*)::int as n from catalogue_oeuvres, unnest(formats) f group by f`,
      );
      return toFacets(Object.fromEntries(rows.map((r) => [r.format, r.n])), null, [], PERIOD_LABELS)
        .formats;
    });
  }

  editionCount(): Promise<number> {
    return this.cached('editions', async () => {
      const [row] = await this.rows<{ n: number }>('select count(*)::int as n from editions');
      return row?.n ?? 0;
    });
  }
}
