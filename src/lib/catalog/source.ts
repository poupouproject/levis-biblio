import 'server-only';
import { Catalog } from './engine';
import type { RawEdition } from './types';

/**
 * Catalogue chargé une seule fois par processus, puis gardé en mémoire.
 * - `DATABASE_URL` défini (développement) : la table `editions` scrapée (~160 000 notices, ~1 s).
 * - Sinon, ou si la base ne répond pas (production sur Vercel) : le jeu de démo
 *   `src/lib/catalog/catalogue-demo.json`, extrait de la même base (`npm run catalogue:demo`).
 */
export type CatalogSourceName = 'postgres' | 'demo';

interface Loaded {
  catalog: Catalog;
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

async function loadPostgres(url: string): Promise<RawEdition[]> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 15_000 });
  await client.connect();
  try {
    const { rows } = await client.query<{
      isbn: string | null;
      title_id: string | null;
      titre_brut: string | null;
      auteur_brut: string | null;
      editeur: string | null;
      annee_publication: number | null;
      format: string | null;
      nb_pages: number | null;
      image_couverture: string | null;
      resume: string | null;
      sujets: string[] | null;
    }>(
      `select e.isbn, e.title_id, e.titre_brut, e.auteur_brut, e.editeur, e.annee_publication,
              e.format, e.nb_pages, e.image_couverture, o.resume, o.sujets
         from editions e left join oeuvres o on o.id = e.oeuvre_id`,
    );
    return rows.map((r) => ({
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
    }));
  } finally {
    await client.end();
  }
}

async function loadDemo(): Promise<{ rows: RawEdition[]; totalEditions: number }> {
  const file = (await import('./catalogue-demo.json')).default as unknown as DemoCatalogFile;
  const rows = file.rows.map(
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
  return { rows, totalEditions: file.totalEditions };
}

/** Délai avant de réessayer la base quand elle n'a pas répondu (le jeu de démo sert entre-temps). */
export const DATABASE_RETRY_MS = 30_000;

async function loadFromDatabase(url: string): Promise<Loaded> {
  const rows = await loadPostgres(url);
  return { catalog: new Catalog(rows), source: 'postgres', totalEditions: rows.length };
}

async function loadFromDemo(): Promise<Loaded> {
  const demo = await loadDemo();
  return { catalog: new Catalog(demo.rows), source: 'demo', totalEditions: demo.totalEditions };
}

interface Entry {
  engine: typeof Catalog;
  loaded: Promise<Loaded>;
  /** Base injoignable : heure à partir de laquelle la réessayer. */
  retryAt: number | null;
  retrying: boolean;
}

// Conservé entre les rechargements à chaud du serveur de développement. Si le code du moteur
// change (nouvelle classe Catalog), le catalogue est reconstruit.
const store = globalThis as typeof globalThis & { __levisCatalog?: Entry | undefined };

function warn(error: unknown): void {
  console.warn(
    `[catalogue] Base inaccessible (${error instanceof Error ? error.message : 'erreur'}) : jeu de démo utilisé, nouvel essai dans ${String(DATABASE_RETRY_MS / 1000)} s.`,
  );
}

function start(): Entry {
  const url = process.env.DATABASE_URL;
  const entry: Omit<Entry, 'loaded'> = { engine: Catalog, retryAt: null, retrying: false };
  const loaded = (
    url
      ? loadFromDatabase(url).catch((error: unknown) => {
          warn(error);
          entry.retryAt = Date.now() + DATABASE_RETRY_MS;
          return loadFromDemo();
        })
      : loadFromDemo()
  ).catch((error: unknown) => {
    if (store.__levisCatalog === entry) store.__levisCatalog = undefined;
    throw error;
  });
  return Object.assign(entry, { loaded });
}

/** Réessaie la base en arrière-plan ; le jeu de démo reste servi tant qu'elle ne répond pas. */
function retryDatabase(entry: Entry, url: string): void {
  entry.retrying = true;
  loadFromDatabase(url)
    .then((loaded) => {
      entry.loaded = Promise.resolve(loaded);
      entry.retryAt = null;
      console.info('[catalogue] Base de nouveau accessible : catalogue complet chargé.');
    })
    .catch((error: unknown) => {
      warn(error);
      entry.retryAt = Date.now() + DATABASE_RETRY_MS;
    })
    .finally(() => {
      entry.retrying = false;
    });
}

export function getCatalog(): Promise<Loaded> {
  let entry = store.__levisCatalog;
  if (entry?.engine !== Catalog) {
    entry = start();
    store.__levisCatalog = entry;
  }
  const url = process.env.DATABASE_URL;
  if (url && entry.retryAt !== null && !entry.retrying && Date.now() >= entry.retryAt) {
    retryDatabase(entry, url);
  }
  return entry.loaded;
}
