import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogStore } from '@/lib/catalog/store';
import type { Suggestion } from '@/lib/catalog/types';

// Hors de Next : le cache et la requête sont simulés, la source du catalogue est pilotée.
const next = vi.hoisted(() => ({ lives: [] as string[], connections: 0 }));
vi.mock('next/cache', () => ({
  cacheLife: (profile: string) => next.lives.push(profile),
  cacheTag: () => undefined,
}));
vi.mock('next/server', () => ({
  connection: () => {
    next.connections += 1;
    return Promise.resolve();
  },
}));

const source = vi.hoisted(() => ({
  sequence: [] as ('postgres' | 'demo')[],
  stores: {} as Record<'postgres' | 'demo', Pick<CatalogStore, 'suggest'>>,
}));
vi.mock('@/lib/catalog/source', () => ({
  getCatalog: () => {
    const name =
      source.sequence.length > 1
        ? (source.sequence.shift() ?? 'demo')
        : (source.sequence[0] ?? 'demo');
    return Promise.resolve({ catalog: source.stores[name], source: name, totalEditions: 0 });
  },
}));

const { suggest } = await import('@/lib/catalog/cached');

const answer = (label: string): Suggestion[] => [
  { kind: 'oeuvre', label, detail: '', href: `/oeuvre/${label}`, cover: null },
];

describe('lectures du catalogue en cache', () => {
  beforeEach(() => {
    next.lives.length = 0;
    next.connections = 0;
    source.stores = {
      postgres: { suggest: vi.fn(() => Promise.resolve(answer('base'))) },
      demo: { suggest: vi.fn(() => Promise.resolve(answer('démo'))) },
    };
  });

  it('lit la base dans une fonction en cache, à la requête', async () => {
    source.sequence = ['postgres'];
    expect(await suggest('harr')).toEqual(answer('base'));
    expect(next.lives).toEqual(['hours']);
    expect(next.connections).toBe(1);
  });

  it('ne met jamais le jeu de démo en cache', async () => {
    source.sequence = ['demo'];
    expect(await suggest('harr')).toEqual(answer('démo'));
    expect(next.lives).toEqual([]);
  });

  it('repasse par la source du moment si la base tombe pendant la lecture en cache', async () => {
    // Base au départ, démo dans la fonction en cache (refus), démo pour la relecture
    source.sequence = ['postgres', 'demo', 'demo'];
    expect(await suggest('harr')).toEqual(answer('démo'));
    expect(source.stores.postgres.suggest).not.toHaveBeenCalled();
  });
});
