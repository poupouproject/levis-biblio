import 'server-only';
import { cache } from 'react';
import type { Pool } from 'pg';
import { CatalogSelector, databaseConfig, type Database, type Loaded } from './connexion';
import { Catalog } from './engine';
import { PostgresCatalog } from './postgres';
import { memoryStore } from './store';
import type { RawEdition } from './types';

/**
 * Source du catalogue :
 * - `DATABASE_URL` défini : Postgres (index plein texte), interrogé à chaque requête. En
 *   production, l'adresse du pooler de Supabase.
 * - Sinon, ou si la base ne répond pas : le jeu de démo `src/lib/catalog/catalogue-demo.json`
 *   (`npm run catalogue:demo`), cherché en mémoire par le moteur (engine.ts).
 * Le repli et les nouvelles tentatives : `CatalogSelector` (connexion.ts).
 */
export type { CatalogSourceName } from './connexion';

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

/** Délai avant de réessayer la base quand elle n'a pas répondu (le jeu de démo sert entre-temps). */
export const DATABASE_RETRY_MS = 30_000;

interface State {
  engine: typeof Catalog;
  url: string | undefined;
  pool: () => Pool | null;
  selector: CatalogSelector;
}

function createState(url: string | undefined): State {
  let pool: Pool | null = null;
  let database: Database | null = null;
  let demoLoaded: Promise<Loaded> | null = null;
  const demo = (): Promise<Loaded> => {
    demoLoaded ??= loadDemo()
      .then(({ catalog, totalEditions }) => ({
        catalog: memoryStore(catalog),
        source: 'demo' as const,
        totalEditions,
      }))
      .catch((error: unknown) => {
        demoLoaded = null;
        throw error;
      });
    return demoLoaded;
  };
  const connect = async (): Promise<Database | null> => {
    if (!url) return null;
    if (!database) {
      const { Pool } = await import('pg');
      const created = new Pool({
        ...databaseConfig(url),
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        // Le pooler de Supabase ignore statement_timeout envoyé à la connexion : limite côté client
        statement_timeout: 8_000,
        query_timeout: 10_000,
        application_name: 'levisbiblio',
      });
      // Une connexion inactive coupée par le serveur ne doit pas faire tomber le processus
      created.on('error', (error) => {
        console.warn(`[catalogue] Connexion perdue : ${error.message}`);
      });
      pool = created;
      database = {
        store: new PostgresCatalog(created),
        ping: async () => {
          await created.query('select 1');
        },
      };
    }
    return database;
  };
  return {
    engine: Catalog,
    url,
    pool: () => pool,
    selector: new CatalogSelector(connect, demo, { retryMs: DATABASE_RETRY_MS }),
  };
}

// Conservé entre les rechargements à chaud du serveur de développement. Si le code du moteur
// ou l'adresse de la base change, tout est recréé. La clé change avec la forme de l'état :
// un état laissé par une version précédente du code est ignoré.
const store = globalThis as typeof globalThis & { __levisCatalogue?: State | undefined };

function state(): State {
  const url = process.env.DATABASE_URL;
  let s = store.__levisCatalogue;
  if (s?.engine !== Catalog || s.url !== url) {
    void s?.pool()?.end();
    s = createState(url);
    store.__levisCatalogue = s;
  }
  return s;
}

/** Une seule source pour toute une requête de page (cache de React) : jamais de mélange. */
export const getCatalog = cache((): Promise<Loaded> => state().selector.load());
