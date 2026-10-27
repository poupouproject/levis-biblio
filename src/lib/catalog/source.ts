import 'server-only';
import type { Pool, PoolConfig } from 'pg';
import { Catalog } from './engine';
import { PostgresCatalog } from './postgres';
import { memoryStore, type CatalogStore } from './store';
import type { RawEdition } from './types';

/**
 * Source du catalogue :
 * - `DATABASE_URL` défini : Postgres (tables de recherche, index plein texte), interrogé à chaque
 *   requête. En production, l'adresse du pooler de Supabase.
 * - Sinon, ou si la base ne répond pas : le jeu de démo `src/lib/catalog/catalogue-demo.json`
 *   (`npm run catalogue:demo`), cherché en mémoire par le moteur (engine.ts).
 */
export type CatalogSourceName = 'postgres' | 'demo';

interface Loaded {
  catalog: CatalogStore;
  source: CatalogSourceName;
  /** Taille du catalogue complet (le jeu de démo n'en est qu'un échantillon). */
  totalEditions: number;
}

const COVER_PREFIX = 'https://levi.ent.sirsidynix.net/client/accueil/search/btlffile/';

/** Jeu de démo compact : une ligne par édition, couverture réduite à son identifiant. */
export interface DemoCatalogFile {
  generatedAt: string;
  totalEditions: number;
  rows: [
    isbn: string | null,
    titleId: string | null,
    title: string,
    author: string | null,
    publisher: string | null,
    year: number | null,
    format: string | null,
    pages: number | null,
    coverId: string | null,
    summary: string | null,
    subjects: string[] | null,
  ][];
}

export function coverUrl(coverId: string | null): string | null {
  return coverId ? `${COVER_PREFIX}${coverId}/cover` : null;
}

export function coverId(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith(COVER_PREFIX)
    ? url.slice(COVER_PREFIX.length).replace(/\/cover$/, '')
    : null;
}

async function loadDemo(): Promise<{ catalog: Catalog; totalEditions: number }> {
  const file = (await import('./catalogue-demo.json')).default as unknown as DemoCatalogFile;
  const rows: RawEdition[] = file.rows.map(
    ([isbn, titleId, title, author, publisher, year, format, pages, cover, summary, subjects]) => ({
      isbn,
      titleId,
      title,
      author,
      publisher,
      year,
      format,
      pages,
      cover: coverUrl(cover),
      summary,
      subjects,
    }),
  );
  return { catalog: new Catalog(rows), totalEditions: file.totalEditions };
}

/**
 * TLS : aucun en local ; ailleurs, vérification complète du certificat. Supabase signe avec sa
 * propre autorité : son certificat racine (tableau de bord → Database → SSL Configuration) va
 * dans `DATABASE_CA_CERT`, en PEM (les retours à la ligne peuvent s'écrire « \n »).
 */
export function tlsOptions(url: string, ca = process.env.DATABASE_CA_CERT): PoolConfig['ssl'] {
  const host = new URL(url).hostname;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  return ca ? { ca: ca.replace(/\\n/g, '\n') } : true;
}

/** Délai avant de réessayer la base quand elle n'a pas répondu (le jeu de démo sert entre-temps). */
export const DATABASE_RETRY_MS = 30_000;

interface State {
  engine: typeof Catalog;
  demo: Promise<Loaded> | null;
  pool: Pool | null;
  postgres: PostgresCatalog | null;
  /** Base injoignable : heure à partir de laquelle la réessayer. */
  retryAt: number;
}

// Conservé entre les rechargements à chaud du serveur de développement. Si le code du moteur
// change (nouvelle classe Catalog), tout est recréé.
const store = globalThis as typeof globalThis & { __levisCatalog?: State | undefined };

function state(): State {
  let s = store.__levisCatalog;
  if (s?.engine !== Catalog) {
    void s?.pool?.end();
    s = { engine: Catalog, demo: null, pool: null, postgres: null, retryAt: 0 };
    store.__levisCatalog = s;
  }
  return s;
}

function demo(s: State): Promise<Loaded> {
  s.demo ??= loadDemo()
    .then(({ catalog, totalEditions }) => ({
      catalog: memoryStore(catalog),
      source: 'demo' as const,
      totalEditions,
    }))
    .catch((error: unknown) => {
      s.demo = null;
      throw error;
    });
  return s.demo;
}

function warn(error: unknown): void {
  console.warn(
    `[catalogue] Base inaccessible (${error instanceof Error ? error.message : 'erreur'}) : jeu de démo utilisé, nouvel essai dans ${String(DATABASE_RETRY_MS / 1000)} s.`,
  );
}

async function postgres(s: State, url: string): Promise<PostgresCatalog> {
  if (!s.postgres) {
    const { Pool } = await import('pg');
    s.pool = new Pool({
      connectionString: url,
      ssl: tlsOptions(url),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 8_000,
      application_name: 'levisbiblio',
    });
    // Une connexion inactive coupée par le serveur ne doit pas faire tomber le processus
    s.pool.on('error', warn);
    s.postgres = new PostgresCatalog(s.pool);
  }
  return s.postgres;
}

/**
 * Chaque appel passe d'abord par Postgres ; si la base ne répond pas, le jeu de démo répond à
 * sa place et la base est réessayée 30 s plus tard.
 */
function resilient(s: State, primary: CatalogStore): CatalogStore {
  async function call<T>(run: (catalog: CatalogStore) => Promise<T>): Promise<T> {
    if (Date.now() >= s.retryAt) {
      try {
        return await run(primary);
      } catch (error) {
        warn(error);
        s.retryAt = Date.now() + DATABASE_RETRY_MS;
      }
    }
    return run((await demo(s)).catalog);
  }
  return {
    search: (query) => call((c) => c.search(query)),
    suggest: (q, limit) => call((c) => c.suggest(q, limit)),
    getWork: (id) => call((c) => c.getWork(id)),
    getSeries: (slug) => call((c) => c.getSeries(slug)),
    related: (work, limit) => call((c) => c.related(work, limit)),
    newest: (limit) => call((c) => c.newest(limit)),
    topSeries: (limit) => call((c) => c.topSeries(limit)),
    byAuthors: (names, limit) => call((c) => c.byAuthors(names, limit)),
    formatCounts: () => call((c) => c.formatCounts()),
    editionCount: () => call((c) => c.editionCount()),
  };
}

export async function getCatalog(): Promise<Loaded> {
  const s = state();
  const url = process.env.DATABASE_URL;
  if (!url || Date.now() < s.retryAt) return demo(s);
  try {
    const primary = await postgres(s, url);
    const totalEditions = await primary.editionCount();
    return { catalog: resilient(s, primary), source: 'postgres', totalEditions };
  } catch (error) {
    warn(error);
    s.retryAt = Date.now() + DATABASE_RETRY_MS;
    return demo(s);
  }
}
