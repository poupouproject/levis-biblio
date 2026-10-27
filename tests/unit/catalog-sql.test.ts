import { describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { EMPTY_QUERY, PERIOD_LABELS } from '@/lib/catalog/engine';
import { PostgresCatalog } from '@/lib/catalog/postgres';
import {
  browseKey,
  interleave,
  isBrowse,
  needsApproximate,
  parseText,
  prefixed,
  rowToWork,
  rowsToEditions,
  searchSql,
  searchValues,
  toFacets,
  toTsQuery,
} from '@/lib/catalog/sql';

const NOW = new Date('2026-10-20T12:00:00Z');

describe('recherche Postgres : requête plein texte', () => {
  it('cherche chaque mot en début de mot, une lettre seule en mot entier', () => {
    expect(toTsQuery(['harry', 'pot'])).toBe('harry:* & pot:*');
    expect(toTsQuery(['a', 'dune'])).toBe('a & dune:*');
    expect(toTsQuery([])).toBeNull();
  });

  it('écarte tout ce qui pourrait casser la syntaxe tsquery', () => {
    expect(toTsQuery(['ok', 'a&b', "l'x", ''])).toBe('ok:*');
  });

  it('reconnaît un ISBN, avec ou sans tirets', () => {
    expect(parseText('978-2-07-036002-4')).toEqual({
      isbn: '9782070360024',
      tokens: ['9782070360024'],
      phrase: '9782070360024',
    });
    expect(parseText('Le cœur de Lévis')).toMatchObject({ isbn: null, tokens: ['coeur', 'levis'] });
  });

  it('distingue le parcours (ni texte ni auteur) de la recherche', () => {
    expect(isBrowse({ ...EMPTY_QUERY, formats: ['livre'] })).toBe(true);
    expect(isBrowse({ ...EMPTY_QUERY, q: 'dune' })).toBe(false);
    expect(isBrowse({ ...EMPTY_QUERY, author: 'Michel Tremblay' })).toBe(false);
  });

  it('passe les paramètres dans l’ordre de la requête', () => {
    const values = searchValues(
      { ...EMPTY_QUERY, q: 'One Piece', formats: ['livre'], available: true, branch: 'PDL' },
      ['id-1'],
      2025,
    );
    expect(values).toEqual([
      'one:* & piece:*',
      ['one', 'piece'],
      'one piece',
      null,
      ['id-1'],
      ['livre'],
      null,
      2025,
      true,
      'PDL',
      'pertinence',
      24,
    ]);
    // Un ISBN se cherche dans la liste des ISBN, pas dans le texte
    expect(searchValues({ ...EMPTY_QUERY, q: '2070360024' }, null, 2025).slice(0, 4)).toEqual([
      null,
      ['2070360024'],
      '2070360024',
      '2070360024',
    ]);
  });

  it('n’utilise que des paramètres, jamais le texte de la requête', () => {
    for (const mode of ['exact', 'approchant'] as const) {
      const sql = searchSql(mode, true);
      expect(sql).not.toContain('one piece');
      for (let n = 1; n <= 12; n++) expect(sql).toContain(`$${String(n)}`);
    }
  });

  it('met en cache les compteurs d’un parcours selon les seuls filtres', () => {
    const a = browseKey({ ...EMPTY_QUERY, formats: ['audio', 'livre'], limit: 24 }, 2025);
    const b = browseKey({ ...EMPTY_QUERY, formats: ['livre', 'audio'], limit: 48 }, 2025);
    expect(a).toBe(b);
    expect(browseKey({ ...EMPTY_QUERY, available: true }, 2025)).not.toBe(a);
  });
});

describe('recherche Postgres : conversions', () => {
  it('transforme une ligne en carte d’œuvre', () => {
    expect(
      rowToWork({
        ref: '469229',
        titre: 'Romance dawn',
        sous_titre: null,
        serie_nom: 'One Piece',
        serie_slug: 'one-piece',
        tome: 1,
        auteurs: ['Eiichirô Oda'],
        annee: 2013,
        formats: ['livre', 'inconnu'],
        couverture: null,
        nb_editions: 3,
      }),
    ).toMatchObject({
      id: '469229',
      series: { name: 'One Piece', slug: 'one-piece', volume: 1 },
      authors: ['Eiichirô Oda'],
      formats: ['livre'],
      editions: [],
      // Sans la liste, la carte garde le compte (badge « 3 éditions »)
      editionCount: 3,
    });
  });

  it('préfixe les colonnes d’une table', () => {
    expect(prefixed('ref, titre', 'r')).toBe('r.ref, r.titre');
  });

  it('normalise les éditions d’une fiche comme le moteur', () => {
    const editions = rowsToEditions(
      [
        {
          title_id: '1',
          isbn: null,
          titre: 'A',
          annee: 9782,
          format: 'Livres',
          editeur: null,
          pages: null,
          couverture: null,
        },
        {
          title_id: '2',
          isbn: null,
          titre: 'B',
          annee: 2020,
          format: 'Disque audio',
          editeur: null,
          pages: 10,
          couverture: null,
        },
        {
          title_id: null,
          isbn: null,
          titre: 'Sans identifiant',
          annee: 2021,
          format: null,
          editeur: null,
          pages: null,
          couverture: null,
        },
      ],
      NOW,
    );
    expect(editions.map((e) => [e.titleId, e.year, e.format])).toEqual([
      ['2', 2020, 'audio'],
      ['1', null, 'livre'],
    ]);
  });

  it('garde les formats présents ou cochés, et toutes les périodes', () => {
    const facets = toFacets({ livre: 3, audio: 0 }, { recent: 1 }, ['audio'], PERIOD_LABELS);
    expect(facets.formats.map((f) => [f.id, f.count])).toEqual([
      ['livre', 3],
      ['audio', 0],
    ]);
    expect(facets.periods.map((p) => p.count)).toEqual([1, 0, 0, 0]);
  });

  it('alterne les auteurs, une œuvre par série', () => {
    const items = [
      { bucket: 0, key: 's1', id: 'a' },
      { bucket: 0, key: 's1', id: 'b' },
      { bucket: 0, key: 'x', id: 'c' },
      { bucket: 1, key: 'y', id: 'd' },
    ];
    expect(interleave(items, 2, 10).map((i) => i.id)).toEqual(['a', 'd', 'c']);
    expect(interleave(items, 2, 2).map((i) => i.id)).toEqual(['a', 'd']);
  });
});

describe('recherche Postgres : titres approchants', () => {
  it('seulement quand le texte ne trouve rien, jamais pour un ISBN', () => {
    expect(needsApproximate('harry poter', 0)).toBe(true);
    expect(needsApproximate('harry potter', 56)).toBe(false);
    expect(needsApproximate('9782070360024', 0)).toBe(false);
    expect(needsApproximate('', 0)).toBe(false);
  });

  const card = {
    ref: '1',
    titre: 'Harry Potter à l’école des sorciers',
    sous_titre: null,
    serie_nom: null,
    serie_slug: null,
    tome: null,
    auteurs: ['J. K. Rowling'],
    annee: 1998,
    formats: ['livre'],
    couverture: null,
    nb_editions: 1,
  };

  /** Une base simulée : chaque requête est reconnue à son texte. */
  function fakePool(exact: { correspondances: number; total: number }): {
    pool: Pool;
    approchantes: () => number;
  } {
    let approchantes = 0;
    const query = (sql: string): Promise<{ rows: unknown[] }> => {
      if (sql.includes('from series')) return Promise.resolve({ rows: [] });
      if (sql.includes('operator(extensions.<%)')) {
        approchantes++;
        return Promise.resolve({
          rows: [{ correspondances: 1, total: 1, formats: null, periods: null, works: [card] }],
        });
      }
      return Promise.resolve({
        rows: [{ ...exact, formats: null, periods: null, works: exact.total > 0 ? [card] : [] }],
      });
    };
    return { pool: { query } as unknown as Pool, approchantes: () => approchantes };
  }

  it('propose des titres proches quand le texte ne trouve rien', async () => {
    const { pool, approchantes } = fakePool({ correspondances: 0, total: 0 });
    const result = await new PostgresCatalog(pool).search({ ...EMPTY_QUERY, q: 'harry poter' });
    expect(approchantes()).toBe(1);
    expect(result.approximate).toBe(true);
    expect(result.works[0]?.title).toBe('Harry Potter à l’école des sorciers');
  });

  it('n’en propose pas quand ce sont les filtres qui vident les résultats', async () => {
    const { pool, approchantes } = fakePool({ correspondances: 56, total: 0 });
    const result = await new PostgresCatalog(pool).search({
      ...EMPTY_QUERY,
      q: 'harry potter',
      formats: ['video'],
    });
    expect(approchantes()).toBe(0);
    expect(result.approximate).toBeUndefined();
    expect(result.total).toBe(0);
  });
});
