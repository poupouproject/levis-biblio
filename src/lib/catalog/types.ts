// Types du catalogue (notices scrapées du catalogue SirsiDynix de Lévis, regroupées en œuvres).
import type { FormatGroup } from './normalize';

/** Une ligne de la table `editions`, telle que lue de la base ou du jeu de démo. */
export interface RawEdition {
  isbn: string | null;
  titleId: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  year: number | null;
  format: string | null;
  pages: number | null;
  cover: string | null;
  summary: string | null;
  subjects: string[] | null;
}

export interface CatalogEdition {
  titleId: string;
  isbn: string | null;
  title: string;
  year: number | null;
  format: FormatGroup;
  formatLabel: string;
  publisher: string | null;
  pages: number | null;
  cover: string | null;
}

export interface SeriesRef {
  name: string;
  slug: string;
  volume: number | null;
}

/** Une œuvre : toutes les éditions d'un même titre du même auteur (ou d'un même tome de série). */
export interface CatalogWork {
  id: string; // title_id de référence, stable
  title: string;
  subtitle: string | null;
  authors: string[];
  series: SeriesRef | null;
  cover: string | null;
  year: number | null; // Édition la plus récente
  formats: FormatGroup[];
  summary: string | null;
  subjects: string[];
  editions: CatalogEdition[];
}

export interface SeriesSummary {
  name: string;
  slug: string;
  authors: string[];
  count: number;
  covers: string[]; // Jusqu'à 3, pour la pile de couvertures
  latestYear: number | null;
}

export type Period = 'recent' | '2010' | '2000' | 'older';
export type SortOrder = 'pertinence' | 'recent' | 'titre';

export interface SearchQuery {
  q: string;
  formats: FormatGroup[];
  period: Period | null;
  author: string | null;
  available: boolean;
  branch: string | null;
  sort: SortOrder;
  limit: number;
}

export interface FacetCount<T extends string = string> {
  id: T;
  label: string;
  count: number;
}

export interface SearchResult {
  total: number;
  works: CatalogWork[];
  series: SeriesSummary[];
  facets: { formats: FacetCount<FormatGroup>[]; periods: FacetCount<Period>[] };
  tookMs: number;
  /** Aucun résultat exact : résultats aux titres proches (faute de frappe). */
  approximate?: boolean | undefined;
}

/** Une série et tous ses tomes, dans l'ordre. */
export interface SeriesWithWorks {
  summary: SeriesSummary;
  works: CatalogWork[];
}

export type SuggestionKind = 'oeuvre' | 'serie' | 'auteur';

export interface Suggestion {
  kind: SuggestionKind;
  label: string;
  detail: string;
  href: string;
  cover: string | null;
}
