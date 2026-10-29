import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { getCatalog } from './source';
import type { CatalogStore } from './store';
import type { CatalogWork, SearchQuery, SearchResult, SeriesWithWorks, Suggestion } from './types';

/**
 * Lectures publiques du catalogue gardées en cache ('use cache', 1 h) : une fiche, une série, une
 * recherche ou des suggestions déjà demandées ne retournent pas à la base. Sur Vercel, ce cache
 * vit en mémoire de chaque instance (pas partagé entre elles ; l'accueil, lui, passe par
 * `unstable_cache`, partagé). Une notice ajoutée depuis Mon dossier y paraît dans l'heure.
 *
 * Jamais le jeu de démo : servi pendant une panne de la base, il ne doit pas la remplacer 1 h.
 * La source est vérifiée avant (rien n'entre en cache) et dans la fonction en cache (la base a pu
 * tomber entre-temps : l'erreur n'est pas gardée, et la lecture repasse par la source du moment).
 */
export const CATALOGUE_TAG = 'catalogue';

async function database(): Promise<CatalogStore> {
  const { catalog, source } = await getCatalog();
  if (source !== 'postgres') throw new Error('Jeu de démo : pas de cache.');
  return catalog;
}

async function read<T>(
  cached: () => Promise<T>,
  live: (catalog: CatalogStore) => Promise<T>,
): Promise<T> {
  // À la requête, jamais au build ni dans une coquille : la base peut être lente ou absente
  await connection();
  const { catalog, source } = await getCatalog();
  if (source !== 'postgres') return live(catalog);
  try {
    return await cached();
  } catch {
    return live((await getCatalog()).catalog);
  }
}

async function cachedWork(id: string): Promise<CatalogWork | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(CATALOGUE_TAG);
  return (await database()).getWork(id);
}

async function cachedRelated(id: string): Promise<CatalogWork[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(CATALOGUE_TAG);
  const catalog = await database();
  const work = await catalog.getWork(id);
  return work ? catalog.related(work) : [];
}

async function cachedSeries(slug: string): Promise<SeriesWithWorks | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(CATALOGUE_TAG);
  return (await database()).getSeries(slug);
}

async function cachedSearch(query: SearchQuery): Promise<SearchResult> {
  'use cache';
  cacheLife('hours');
  cacheTag(CATALOGUE_TAG);
  return (await database()).search(query);
}

async function cachedSuggest(q: string): Promise<Suggestion[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(CATALOGUE_TAG);
  return (await database()).suggest(q);
}

export function getWork(id: string): Promise<CatalogWork | null> {
  return read(
    () => cachedWork(id),
    (c) => c.getWork(id),
  );
}

export function getRelated(work: CatalogWork): Promise<CatalogWork[]> {
  return read(
    () => cachedRelated(work.id),
    (c) => c.related(work),
  );
}

export function getSeries(slug: string): Promise<SeriesWithWorks | null> {
  return read(
    () => cachedSeries(slug),
    (c) => c.getSeries(slug),
  );
}

export function search(query: SearchQuery): Promise<SearchResult> {
  return read(
    () => cachedSearch(query),
    (c) => c.search(query),
  );
}

export function suggest(q: string): Promise<Suggestion[]> {
  return read(
    () => cachedSuggest(q),
    (c) => c.suggest(q),
  );
}
