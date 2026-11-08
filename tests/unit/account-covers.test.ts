import { describe, expect, it, vi } from 'vitest';
import { readyCovers, resolveCovers } from '@/lib/account/covers';
import type { EditionCover } from '@/lib/catalog/types';
import type { CoverMap } from '@/types';

const URL_1 = 'https://x/1/cover';
const URL_2 = 'https://x/2/cover';

const lookupOf =
  (known: Record<string, EditionCover>) =>
  (ids: string[]): Promise<Record<string, EditionCover>> =>
    Promise.resolve(Object.fromEntries(ids.flatMap((id) => (known[id] ? [[id, known[id]]] : []))));

const ITEMS = [
  { id: 'b1', titleId: '101' },
  { id: 'b2', titleId: '102' },
];

describe('couvertures de Mon dossier', () => {
  it('prend tout dans le catalogue sans appeler le portail', async () => {
    const portal = vi.fn((): Promise<CoverMap> => Promise.resolve({}));
    const covers = resolveCovers(
      ITEMS,
      lookupOf({ '101': { isbn: '111', cover: URL_1 }, '102': { isbn: '222', cover: URL_2 } }),
      portal,
    );
    expect(await covers.known).toEqual({
      b1: { url: URL_1, isbn: '111' },
      b2: { url: URL_2, isbn: '222' },
    });
    expect(await covers.late).toEqual({});
    expect(portal).not.toHaveBeenCalled();
  });

  it('livre le catalogue sans attendre le portail, qui ne complète que ce qui manque', async () => {
    let answer: (map: CoverMap) => void = () => undefined;
    const portal = vi.fn(
      () =>
        new Promise<CoverMap>((resolve) => {
          answer = resolve;
        }),
    );
    const covers = resolveCovers(ITEMS, lookupOf({ '101': { isbn: '111', cover: URL_1 } }), portal);
    // Le portail n'a pas encore répondu : le catalogue est déjà là
    expect(await covers.known).toEqual({ b1: { url: URL_1, isbn: '111' } });
    answer({ b1: { url: 'https://portail/ignore', isbn: '999' }, b2: { url: URL_2, isbn: '222' } });
    expect(await covers.late).toEqual({ b2: { url: URL_2, isbn: '222' } });
    expect(portal).toHaveBeenCalledTimes(1);
  });

  it('garde l’ISBN du catalogue quand ni lui ni le portail n’ont de couverture', async () => {
    const covers = resolveCovers(
      [{ id: 'b1', titleId: '101' }],
      lookupOf({ '101': { isbn: '111', cover: null } }),
      () => Promise.resolve({}),
    );
    expect(await covers.known).toEqual({});
    expect(await covers.late).toEqual({ b1: { url: null, isbn: '111' } });
  });

  it('se rabat sur le portail si le catalogue ne répond pas', async () => {
    const covers = resolveCovers(
      [{ id: 'h1', titleId: '101' }],
      () => Promise.reject(new Error('base injoignable')),
      () => Promise.resolve({ h1: { url: URL_1, isbn: '111' } }),
    );
    expect(await covers.known).toEqual({});
    expect(await covers.late).toEqual({ h1: { url: URL_1, isbn: '111' } });
  });

  it('passe par le portail pour un document sans title_id, sans interroger le catalogue', async () => {
    const lookup = vi.fn(lookupOf({}));
    const covers = resolveCovers([{ id: 'h1', titleId: null }], lookup, () =>
      Promise.resolve({ h1: { url: URL_1, isbn: null } }),
    );
    expect(await covers.late).toEqual({ h1: { url: URL_1, isbn: null } });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('propose d’ajouter au catalogue les seuls documents qui en sont absents', async () => {
    const covers = resolveCovers(
      [
        { id: 'b1', titleId: '101', notice: { title: 'Connu', author: null } },
        { id: 'b2', titleId: '102', notice: { title: 'Connu sans couverture', author: null } },
        {
          id: 'b3',
          titleId: '103',
          notice: { title: 'One Piece. 25, Nouveauté', author: 'Oda, Eiichirô, 1975-' },
        },
        { id: 'b4', titleId: '103', notice: { title: 'One Piece. 25, Nouveauté', author: null } },
        { id: 'b5', titleId: null, notice: { title: 'Sans identifiant', author: null } },
      ],
      lookupOf({ '101': { isbn: '111', cover: URL_1 }, '102': { isbn: '222', cover: null } }),
      () => Promise.resolve({ b3: { url: URL_2, isbn: '9782723434621' } }),
    );
    expect(await covers.newNotices).toEqual([
      {
        isbn: '9782723434621',
        titleId: '103',
        title: 'One Piece. 25, Nouveauté',
        author: 'Oda, Eiichirô, 1975-',
        publisher: null,
        year: null,
        format: null,
        pages: null,
        cover: URL_2,
        summary: null,
        subjects: null,
      },
    ]);
  });

  it('n’ajoute rien si le catalogue n’a pas répondu', async () => {
    const covers = resolveCovers(
      [{ id: 'b1', titleId: '101', notice: { title: 'Titre', author: null } }],
      () => Promise.reject(new Error('base injoignable')),
      () => Promise.resolve({ b1: { url: URL_1, isbn: '111' } }),
    );
    expect(await covers.newNotices).toEqual([]);
  });

  it('n’ajoute rien que le portail n’a pas décrit (en panne, trop lent)', async () => {
    const covers = resolveCovers(
      [{ id: 'b1', titleId: '101', notice: { title: 'Titre', author: null } }],
      lookupOf({}),
      () => Promise.resolve({}),
    );
    expect(await covers.newNotices).toEqual([]);
  });

  it('demande l’ISBN au portail pour une édition qui a une couverture sans ISBN', async () => {
    const portal = vi.fn(() => Promise.resolve({ b1: { url: null, isbn: '111' } }));
    const covers = resolveCovers(
      [{ id: 'b1', titleId: '101' }],
      lookupOf({ '101': { isbn: null, cover: URL_1 } }),
      portal,
    );
    expect(await covers.known).toEqual({});
    expect(await covers.late).toEqual({ b1: { url: URL_1, isbn: '111' } });
    expect(portal).toHaveBeenCalledTimes(1);
  });

  it('n’attend pas un catalogue trop lent : le portail prend le relais', async () => {
    const covers = resolveCovers(
      [{ id: 'b1', titleId: '101', notice: { title: 'Titre', author: null } }],
      () => new Promise(() => undefined),
      () => Promise.resolve({ b1: { url: URL_1, isbn: '111' } }),
      { timeoutMs: 5 },
    );
    expect(await covers.known).toEqual({});
    expect(await covers.late).toEqual({ b1: { url: URL_1, isbn: '111' } });
    expect(await covers.newNotices).toEqual([]);
  });

  it('des couvertures déjà résolues n’attendent rien du portail', async () => {
    const covers = readyCovers({ b1: { url: URL_1, isbn: '111' } });
    expect(await covers.known).toEqual({ b1: { url: URL_1, isbn: '111' } });
    expect(await covers.late).toEqual({});
  });
});
