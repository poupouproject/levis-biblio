import { describe, expect, it, vi } from 'vitest';
import {
  CatalogSelector,
  databaseConfig,
  isConnectionError,
  isLocalHost,
  type Database,
  type Loaded,
} from '@/lib/catalog/connexion';
import type { CatalogStore } from '@/lib/catalog/store';

const PEM = '-----BEGIN\\nAAA\\n-----END';

describe('adresse et TLS de la base', () => {
  it('se passe de TLS sur la machine locale, IPv4 ou IPv6', () => {
    for (const host of ['localhost', '127.0.0.1', '127.0.1.1', '[::1]']) {
      expect(isLocalHost(host)).toBe(true);
      expect(databaseConfig(`postgresql://u@${host}:54332/postgres`, {}).ssl).toBe(false);
    }
    expect(isLocalHost('db.example.com')).toBe(false);
  });

  it('vérifie le certificat partout ailleurs, avec celui de Supabase s’il est fourni', () => {
    expect(databaseConfig('postgresql://u@db.example.com:6543/postgres', {}).ssl).toBe(true);
    expect(
      databaseConfig('postgresql://u@db.example.com:6543/postgres', { DATABASE_CA_CERT: PEM }).ssl,
    ).toEqual({ ca: '-----BEGIN\nAAA\n-----END' });
  });

  it('retire les paramètres ssl de l’adresse, qui passeraient avant le certificat', () => {
    const config = databaseConfig(
      'postgresql://u:p@db.example.com:6543/postgres?sslmode=require&sslrootcert=x&application_name=a',
      { DATABASE_CA_CERT: PEM },
    );
    expect(config.connectionString).toBe(
      'postgresql://u:p@db.example.com:6543/postgres?application_name=a',
    );
    expect(config.ssl).toEqual({ ca: '-----BEGIN\nAAA\n-----END' });
  });

  it('coupe TLS à la demande pour un conteneur local, jamais en production', () => {
    const url = 'postgresql://u@catalogue-db:5432/postgres';
    expect(databaseConfig(url, { DATABASE_TLS: 'desactive', NODE_ENV: 'development' }).ssl).toBe(
      false,
    );
    expect(databaseConfig(url, { DATABASE_TLS: 'desactive', NODE_ENV: 'production' }).ssl).toBe(
      true,
    );
  });
});

const erreur = (message: string, code?: string): Error =>
  Object.assign(new Error(message), { code });

describe('erreurs de connexion', () => {
  it('reconnaît une base injoignable, mal configurée ou arrêtée', () => {
    for (const e of [
      erreur('refusée', 'ECONNREFUSED'),
      erreur('introuvable', 'ENOTFOUND'),
      erreur('certificat', 'SELF_SIGNED_CERT_IN_CHAIN'),
      erreur('mot de passe', '28P01'),
      erreur('connexion perdue', '08006'),
      erreur('arrêt', '57P01'),
      erreur('trop de connexions', '53300'),
      erreur('timeout exceeded when trying to connect'),
      erreur('Connection terminated unexpectedly'),
    ]) {
      expect(isConnectionError(e)).toBe(true);
    }
  });

  it('laisse remonter une requête en erreur', () => {
    for (const e of [
      erreur('délai de la requête', '57014'),
      erreur('syntaxe', '42601'),
      erreur('Query read timeout'),
      'pas une erreur',
    ]) {
      expect(isConnectionError(e)).toBe(false);
    }
  });
});

/** Une source simulée : chaque méthode renvoie le nom de la source, ou échoue. */
function fakeStore(name: string, fail: () => Error | null): CatalogStore {
  const answer = (): Promise<never> => {
    const error = fail();
    return error ? Promise.reject(error) : (Promise.resolve(name) as Promise<never>);
  };
  return {
    search: answer,
    suggest: answer,
    getWork: answer,
    getSeries: answer,
    related: answer,
    newest: answer,
    topSeries: answer,
    byAuthors: answer,
    formatCounts: answer,
    editionCount: () => {
      const error = fail();
      return error ? Promise.reject(error) : Promise.resolve(159_690);
    },
  };
}

function setup(): {
  selector: CatalogSelector;
  state: { error: Error | null; pings: number; time: number };
} {
  const state = { error: null as Error | null, pings: 0, time: 0 };
  const database: Database = {
    store: fakeStore('postgres', () => state.error),
    ping: () => {
      state.pings++;
      return state.error ? Promise.reject(state.error) : Promise.resolve();
    },
  };
  const demo: Loaded = {
    catalog: fakeStore('demo', () => null),
    source: 'demo',
    totalEditions: 159_690,
  };
  const selector = new CatalogSelector(
    () => Promise.resolve(database),
    () => Promise.resolve(demo),
    { retryMs: 30_000, now: () => state.time, warn: vi.fn() },
  );
  return { selector, state };
}

describe('repli sur le jeu de démo', () => {
  it('sert la base quand elle répond', async () => {
    const { selector } = setup();
    const loaded = await selector.load();
    expect(loaded.source).toBe('postgres');
    expect(await loaded.catalog.newest()).toBe('postgres');
  });

  it('ne bascule pas sur une requête en erreur : l’erreur remonte', async () => {
    const { selector, state } = setup();
    const loaded = await selector.load();
    state.error = erreur('délai de la requête', '57014');
    await expect(loaded.catalog.search({} as never)).rejects.toThrow('délai');
    state.error = null;
    expect((await selector.load()).source).toBe('postgres');
  });

  it('bascule sur une erreur de connexion, sans mélanger les sources d’une même page', async () => {
    const { selector, state } = setup();
    const loaded = await selector.load();
    state.error = erreur('refusée', 'ECONNREFUSED');
    // La page en cours échoue plutôt que de servir la démo au milieu
    await expect(loaded.catalog.newest()).rejects.toThrow('refusée');
    // Les pages suivantes viennent du jeu de démo, sans attendre la base
    const next = await selector.load();
    expect(next.source).toBe('demo');
    expect(await next.catalog.newest()).toBe('demo');
  });

  it('ne fait qu’une tentative à la fois, au plus toutes les 30 s, et revient sur la base', async () => {
    const { selector, state } = setup();
    state.error = erreur('refusée', 'ECONNREFUSED');
    expect((await selector.load()).source).toBe('demo');
    // Avant 30 s : aucune tentative
    state.time = 10_000;
    await selector.load();
    expect(state.pings).toBe(0);
    // Après 30 s, plusieurs requêtes simultanées : une seule tentative, la démo répond tout de suite
    state.time = 31_000;
    const loads = await Promise.all([selector.load(), selector.load(), selector.load()]);
    expect(loads.map((l) => l.source)).toEqual(['demo', 'demo', 'demo']);
    expect(state.pings).toBe(1);
    // La base répond de nouveau : la tentative suivante la rétablit
    await selector.pending();
    state.error = null;
    state.time = 62_000;
    await selector.load();
    await selector.pending();
    expect((await selector.load()).source).toBe('postgres');
  });

  it('sert le jeu de démo sans base configurée', async () => {
    const selector = new CatalogSelector(
      () => Promise.resolve(null),
      () =>
        Promise.resolve({
          catalog: fakeStore('demo', () => null),
          source: 'demo' as const,
          totalEditions: 6000,
        }),
      { retryMs: 30_000 },
    );
    expect((await selector.load()).source).toBe('demo');
  });
});
