// Recherche ↔ paramètres d'URL. Partagé client/serveur : une recherche est un lien partageable.
import { FORMAT_LABELS, type FormatGroup } from './normalize';
import type { Period, SearchQuery, SortOrder } from './types';

export const PAGE_SIZE = 24;
const MAX_LIMIT = 240;
const PERIODS: Period[] = ['recent', '2010', '2000', 'older'];
const SORTS: SortOrder[] = ['pertinence', 'recent', 'titre'];

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? '';

export function parseSearchParams(params: Params): SearchQuery {
  const formats = (Array.isArray(params.format) ? params.format : [params.format ?? ''])
    .flatMap((v) => v.split(','))
    .filter((v): v is FormatGroup => Object.hasOwn(FORMAT_LABELS, v));
  const period = first(params.periode);
  const sort = first(params.tri);
  const limit = Number.parseInt(first(params.n), 10);
  return {
    q: first(params.q).slice(0, 120),
    formats: [...new Set(formats)],
    period: PERIODS.includes(period as Period) ? (period as Period) : null,
    author: first(params.auteur).slice(0, 120) || null,
    available: first(params.dispo) === '1',
    branch: /^[A-Z]{2,3}$/.test(first(params.succursale)) ? first(params.succursale) : null,
    sort: SORTS.includes(sort as SortOrder) ? (sort as SortOrder) : 'pertinence',
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, PAGE_SIZE), MAX_LIMIT) : PAGE_SIZE,
  };
}

/** Chaîne de recherche (`q=…&format=…`), sans les valeurs par défaut. */
export function toSearchString(query: Partial<SearchQuery>): string {
  const p = new URLSearchParams();
  if (query.q) p.set('q', query.q);
  if (query.author) p.set('auteur', query.author);
  if (query.formats && query.formats.length > 0) p.set('format', query.formats.join(','));
  if (query.period) p.set('periode', query.period);
  if (query.available) p.set('dispo', '1');
  if (query.branch) p.set('succursale', query.branch);
  if (query.sort && query.sort !== 'pertinence') p.set('tri', query.sort);
  if (query.limit && query.limit > PAGE_SIZE) p.set('n', String(query.limit));
  return p.toString();
}

export function searchHref(query: Partial<SearchQuery>): string {
  const s = toSearchString(query);
  return s ? `/recherche?${s}` : '/recherche';
}
