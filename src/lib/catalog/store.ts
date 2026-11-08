// Ce que les pages demandent au catalogue, quelle que soit sa source : Postgres (postgres.ts)
// ou le moteur en mémoire sur le jeu de démo (engine.ts), quand il n'y a pas de base.
import type { Catalog } from './engine';
import type { FormatGroup } from './normalize';
import type {
  CatalogWork,
  EditionCover,
  FacetCount,
  SearchQuery,
  SearchResult,
  SeriesSummary,
  SeriesWithWorks,
  Suggestion,
} from './types';

export interface CatalogStore {
  search(query: SearchQuery): Promise<SearchResult>;
  suggest(q: string, limit?: number): Promise<Suggestion[]>;
  /** Par title_id de n'importe quelle édition de l'œuvre, ou par ISBN. */
  getWork(id: string): Promise<CatalogWork | null>;
  /** ISBN et couverture de la notice exacte, par title_id ; les inconnues sont absentes. */
  editionCovers(titleIds: string[]): Promise<Record<string, EditionCover>>;
  getSeries(slug: string): Promise<SeriesWithWorks | null>;
  /** Autres œuvres des mêmes auteurs, une par série, hors série de l'œuvre. */
  related(work: CatalogWork, limit?: number): Promise<CatalogWork[]>;
  newest(limit?: number): Promise<CatalogWork[]>;
  topSeries(limit?: number): Promise<SeriesSummary[]>;
  byAuthors(names: string[], limit?: number): Promise<CatalogWork[]>;
  formatCounts(): Promise<FacetCount<FormatGroup>[]>;
  /** Nombre d'éditions servies (le jeu de démo n'en est qu'un échantillon). */
  editionCount(): Promise<number>;
}

/** Le moteur en mémoire, derrière la même interface. */
export function memoryStore(catalog: Catalog): CatalogStore {
  return {
    search: (query) => Promise.resolve(catalog.search(query)),
    suggest: (q, limit) => Promise.resolve(catalog.suggest(q, limit)),
    getWork: (id) => Promise.resolve(catalog.getWork(id)),
    editionCovers: (titleIds) => Promise.resolve(catalog.editionCovers(titleIds)),
    getSeries: (slug) => {
      const entry = catalog.getSeries(slug);
      return Promise.resolve(entry ? { summary: entry.summary, works: entry.works } : null);
    },
    related: (work, limit) => Promise.resolve(catalog.related(work, limit)),
    newest: (limit) => Promise.resolve(catalog.newest(limit)),
    topSeries: (limit) => Promise.resolve(catalog.topSeries(limit)),
    byAuthors: (names, limit) => Promise.resolve(catalog.byAuthors(names, limit)),
    formatCounts: () => Promise.resolve(catalog.formatCounts()),
    editionCount: () => Promise.resolve(catalog.stats.editions),
  };
}
