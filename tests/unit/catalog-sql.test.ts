import { describe, expect, it } from 'vitest';
import { EMPTY_QUERY, PERIOD_LABELS } from '@/lib/catalog/engine';
import {
  browseKey,
  interleave,
  isBrowse,
  parseText,
  rowToWork,
  rowsToEditions,
  searchSql,
  searchValues,
  toFacets,
  toTsQuery,
} from '@/lib/catalog/sql';
import { tlsOptions } from '@/lib/catalog/source';

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
      }),
    ).toMatchObject({
      id: '469229',
      series: { name: 'One Piece', slug: 'one-piece', volume: 1 },
      authors: ['Eiichirô Oda'],
      formats: ['livre'],
      editions: [],
    });
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

describe('connexion à la base', () => {
  it('se passe de TLS en local, le vérifie partout ailleurs', () => {
    expect(tlsOptions('postgresql://postgres@127.0.0.1:54332/postgres', undefined)).toBe(false);
    expect(tlsOptions('postgresql://u@db.example.com:5432/postgres', undefined)).toBe(true);
    expect(
      tlsOptions('postgresql://u@db.example.com:5432/postgres', '-----BEGIN\\nAAA\\n-----END'),
    ).toEqual({ ca: '-----BEGIN\nAAA\n-----END' });
  });
});
