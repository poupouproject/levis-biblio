import { describe, expect, it } from 'vitest';
import { findExistingAuthor, parseAuthorForm, type AuthorForm } from '@/lib/catalog/auteurs';
import { analyzeNotice } from '@/lib/catalog/ingestion';

const form = (forme: string): AuthorForm => {
  const parsed = parseAuthorForm(forme);
  if (!parsed) throw new Error(forme);
  return parsed;
};

describe('analyse d’une notice à injecter', () => {
  it('donne la série, le tome et la clé de regroupement du moteur', () => {
    expect(
      analyzeNotice({
        title: 'One Piece. 25, L’homme qui valait cent millions',
        author: 'Oda, Eiichirô, 1975-',
      }),
    ).toEqual({
      title: 'L’homme qui valait cent millions',
      subtitle: null,
      series: { name: 'One Piece', cle: 'one piece', slug: 'one-piece' },
      volume: 25,
      authorKey: 'oda',
      key: 's:one piece|25|oda',
      tome: 's:one piece|25',
    });
    expect(analyzeNotice({ title: 'Les années perdues : roman', author: null })).toMatchObject({
      series: null,
      key: 't:les annees perdues|',
      tome: null,
    });
  });

  it('ignore une notice sans titre', () => {
    expect(analyzeNotice({ title: '  ', author: 'X' })).toBeNull();
  });
});

describe('rattachement d’une forme d’auteur nouvelle', () => {
  const michel1942 = { id: 'm42', prenom: 'michel', naissance: 1942 };
  const michel1960 = { id: 'm60', prenom: 'michel', naissance: 1960 };
  const larry = { id: 'l', prenom: 'larry', naissance: 1954 };

  it('retrouve la personne de même année, prénom compatible', () => {
    expect(
      findExistingAuthor(form('Tremblay, Michel, 1942- auteur.'), [michel1942, michel1960, larry]),
    ).toBe('m42');
    expect(findExistingAuthor(form('Tremblay, M., 1960-'), [michel1942, michel1960])).toBe('m60');
  });

  it('corrige une coquille d’un an, prénom écrit au long', () => {
    expect(findExistingAuthor(form('Tremblay, Michel, 1943-'), [michel1942, larry])).toBe('m42');
    expect(findExistingAuthor(form('Tremblay, M., 1943-'), [michel1942])).toBeNull();
  });

  it('rattache une forme sans date seulement s’il n’y a qu’une personne possible', () => {
    expect(findExistingAuthor(form('Tremblay, Larry.'), [michel1942, larry])).toBe('l');
    expect(findExistingAuthor(form('Tremblay, Michel.'), [michel1942, michel1960])).toBeNull();
  });

  it('crée une nouvelle personne plutôt que de deviner', () => {
    expect(
      findExistingAuthor(form('Tremblay, Michel, 1980-'), [michel1942, michel1960]),
    ).toBeNull();
    expect(findExistingAuthor(form('Tremblay, Jean, 1980-'), [])).toBeNull();
    // Une personne connue sans date, seule de ce nom
    expect(
      findExistingAuthor(form('Tremblay, Jean, 1980-'), [
        { id: 'j', prenom: 'jean', naissance: null },
      ]),
    ).toBe('j');
  });
});
