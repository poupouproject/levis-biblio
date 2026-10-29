import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { injectNotice, type Queryable } from '@/lib/catalog/ingestion';
import type { RawEdition } from '@/lib/catalog/types';

/** Faux client `pg` : répond selon le début de la requête, et garde chaque requête. */
function fakeDb(answers: Record<string, unknown[]> = {}): Queryable & { sql: string[] } {
  const sql: string[] = [];
  const query = (text: string): Promise<{ rows: unknown[] }> => {
    sql.push(text.replace(/\s+/g, ' ').trim());
    const key = Object.keys(answers).find((k) => text.includes(k));
    return Promise.resolve({ rows: key ? (answers[key] ?? []) : [] });
  };
  return { sql, query: query as unknown as Queryable['query'] };
}

const NOTICE: RawEdition = {
  isbn: '9782723434621',
  titleId: '103',
  title: 'Les années perdues',
  author: null,
  publisher: null,
  year: null,
  format: null,
  pages: null,
  cover: 'https://x/1/cover',
  summary: null,
  subjects: null,
};

describe('ajout d’une notice partielle', () => {
  it('marque la notice à compléter et garde sa date d’ajout', async () => {
    const db = fakeDb({
      'returning id': [{ id: 'o1' }],
    });
    expect(await injectNotice(db, NOTICE, { partielle: true })).toMatchObject({
      statut: 'ajoutee',
      oeuvreId: 'o1',
    });
    const insert = db.sql.find((s) => s.startsWith('insert into editions'));
    expect(insert).toContain('notice_partielle');
    expect(insert).not.toContain('created_at');
  });

  it('n’ajoute pas de colonne hors notice partielle', async () => {
    const db = fakeDb({ 'returning id': [{ id: 'o1' }] });
    await injectNotice(db, NOTICE);
    expect(db.sql.find((s) => s.startsWith('insert into editions'))).not.toContain(
      'notice_partielle',
    );
  });

  it('rattache le title_id du portail à l’édition connue sous un autre', async () => {
    const db = fakeDb({ 'from editions': [{ id: 'e1', title_id: '999' }] });
    expect(await injectNotice(db, NOTICE, { partielle: true })).toEqual({ statut: 'rattachee' });
    expect(db.sql).toContain('update editions set title_id = $2 where id = $1');
    expect(db.sql.some((s) => s.startsWith('insert'))).toBe(false);
  });

  it('laisse une édition déjà connue sous le même title_id', async () => {
    const db = fakeDb({ 'from editions': [{ id: 'e1', title_id: '103' }] });
    expect(await injectNotice(db, NOTICE, { partielle: true })).toEqual({ statut: 'connue' });
    expect(db.sql).toHaveLength(1);
  });
});

// ─── injectNotices : une transaction par notice ──────────────────────────────

const pg = vi.hoisted(() => ({
  clients: [] as { sql: string[]; released: boolean }[],
  fail: new Set<string>(),
}));

vi.mock('pg', () => ({
  Pool: class {
    on(): void {
      // Erreurs de connexion inactive : sans objet ici
    }
    end(): Promise<void> {
      return Promise.resolve();
    }
    connect(): Promise<unknown> {
      const client = { sql: [] as string[], released: false };
      pg.clients.push(client);
      return Promise.resolve({
        query: (text: string, params?: unknown[]) => {
          client.sql.push(text.replace(/\s+/g, ' ').trim());
          if (params?.some((p) => typeof p === 'string' && pg.fail.has(p)))
            return Promise.reject(Object.assign(new Error('refus'), { code: '42501' }));
          return Promise.resolve({ rows: text.includes('returning id') ? [{ id: 'o1' }] : [] });
        },
        release: () => {
          client.released = true;
        },
      });
    }
  },
}));

describe('ajout des notices de Mon dossier', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_INJECTION_URL', 'postgresql://u:p@localhost:5432/postgres');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    pg.clients.length = 0;
    pg.fail.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('valide chaque notice dans sa transaction et rend la connexion', async () => {
    const { injectNotices } = await import('@/lib/catalog/injection');
    await injectNotices([NOTICE, { ...NOTICE, isbn: '111', titleId: '104' }]);
    expect(pg.clients).toHaveLength(2);
    for (const client of pg.clients) {
      expect(client.sql[0]).toBe('begin');
      expect(client.sql.at(-1)).toBe('commit');
      expect(client.released).toBe(true);
    }
  });

  it('annule une notice refusée sans empêcher les autres, sans la nommer', async () => {
    const { injectNotices } = await import('@/lib/catalog/injection');
    pg.fail.add('Titre refusé');
    await injectNotices([{ ...NOTICE, title: 'Titre refusé' }, NOTICE]);
    const [refused, accepted] = pg.clients;
    expect(refused?.sql.at(-1)).toBe('rollback');
    expect(refused?.released).toBe(true);
    expect(accepted?.sql.at(-1)).toBe('commit');
    expect(console.warn).toHaveBeenCalledWith('[catalogue] Notice non ajoutée (42501).');
  });

  it('n’ouvre aucune connexion sans DATABASE_INJECTION_URL', async () => {
    vi.stubEnv('DATABASE_INJECTION_URL', '');
    const { injectNotices } = await import('@/lib/catalog/injection');
    await injectNotices([NOTICE]);
    expect(pg.clients).toHaveLength(0);
  });
});
