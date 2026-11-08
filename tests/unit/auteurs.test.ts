import { describe, expect, it } from 'vitest';
import {
  compatibleFirstNames,
  parseAuthorForm,
  resolveAuthors,
  type AuthorEntry,
} from '@/lib/catalog/auteurs';

const entry = (forme: string, count = 1, series: string[] = []): AuthorEntry => ({
  forme,
  count,
  series,
});

describe('formes d’auteur', () => {
  it('lit le nom, le prénom et les dates', () => {
    expect(parseAuthorForm('Tremblay, Michel, 1942- auteur.')).toEqual({
      forme: 'Tremblay, Michel, 1942- auteur.',
      nom: 'Michel Tremblay',
      nomFamille: 'tremblay',
      prenom: 'michel',
      naissance: 1942,
      deces: null,
    });
    expect(parseAuthorForm('Greg, Michel, 1931-1999.')).toMatchObject({
      naissance: 1931,
      deces: 1999,
    });
    expect(parseAuthorForm('Greg, 1931-    .')).toMatchObject({
      nom: 'Greg',
      prenom: null,
      naissance: 1931,
    });
  });

  it('compare les prénoms, initiales comprises', () => {
    expect(compatibleFirstNames('m', 'michel')).toBe(true);
    expect(compatibleFirstNames('j k', 'j k')).toBe(true);
    expect(compatibleFirstNames(null, 'larry')).toBe(true);
    expect(compatibleFirstNames('michel', 'larry')).toBe(false);
  });
});

describe('regroupement des auteurs sans doublons', () => {
  it('réunit les formes d’une même personne', () => {
    const { auteurs } = resolveAuthors([
      entry('Greg, 1931-    .', 54),
      entry('Greg, 1931-1999.', 29),
      entry('Greg, Michel, 1931-1999.', 14),
    ]);
    expect(auteurs).toHaveLength(1);
    expect(auteurs[0]).toMatchObject({ nom: 'Michel Greg', naissance: 1931, deces: 1999 });
    expect(auteurs[0]?.formes).toHaveLength(3);
  });

  it('sépare les homonymes nés à des années différentes', () => {
    const { auteurs } = resolveAuthors([
      entry('Tremblay, Michel, 1942-', 79),
      entry('Tremblay, Michel, 1960-', 3),
      entry('Tremblay, Larry, 1954-', 10),
    ]);
    expect(auteurs).toHaveLength(3);
  });

  it('corrige une année de naissance décalée d’un an (coquille)', () => {
    const { auteurs } = resolveAuthors([
      entry('Tremblay, Michel, 1942-', 79),
      entry('Tremblay, Michel, 1943- auteur.', 1),
    ]);
    expect(auteurs).toHaveLength(1);
    expect(auteurs[0]?.naissance).toBe(1942);
  });

  it('garde à part un père et un fils, ou une initiale à un an d’écart', () => {
    expect(
      resolveAuthors([
        entry('Aubert de Gaspé, Philippe, 1786-1871'),
        entry('Aubert de Gaspé, Philippe, 1814-1841'),
      ]).auteurs,
    ).toHaveLength(2);
    expect(
      resolveAuthors([entry('Tremblay, Michel, 1942-'), entry('Tremblay, M., 1943-')]).auteurs,
    ).toHaveLength(2);
  });

  it('rattache une forme sans date à l’unique personne possible, ou à la dominante', () => {
    const unique = resolveAuthors([entry('Tremblay, Larry, 1954-', 10), entry('Tremblay, Larry.')]);
    expect(unique.auteurs).toHaveLength(1);

    const dominante = resolveAuthors([
      entry('Tremblay, Michel, 1942-', 79),
      entry('Tremblay, Michel, 1960-', 3),
      entry('Tremblay, Michel.', 5),
    ]);
    expect(dominante.auteurs).toHaveLength(2);
    expect(dominante.auteurs.find((a) => a.naissance === 1942)?.formes).toContain(
      'Tremblay, Michel.',
    );
  });

  it('préfère la personne de la même série à la dominante', () => {
    const { auteurs } = resolveAuthors([
      entry('Tremblay, Michel, 1942-', 79, ['belles-soeurs']),
      entry('Tremblay, Michel, 1960-', 3, ['enqueteur']),
      entry('Tremblay, Michel.', 2, ['enqueteur']),
    ]);
    expect(auteurs.find((a) => a.naissance === 1960)?.formes).toContain('Tremblay, Michel.');
  });

  it('garde à part, et signale, une forme sans date trop ambiguë', () => {
    const { auteurs, aRevoir } = resolveAuthors([
      entry('Roy, Gabrielle, 1909-1983', 10),
      entry('Roy, Gabrielle, 1950-', 10),
      entry('Roy, Gabrielle.', 2),
    ]);
    expect(auteurs).toHaveLength(3);
    expect(aRevoir[0]?.raison).toBe('homonymes-sans-date');
  });

  it('signale sans les fusionner des noms différents dans une même série', () => {
    const { auteurs, aRevoir } = resolveAuthors([
      entry('Zidrou, 1962-', 5, ['ducobu']),
      entry('Drousie, Benoît.', 1, ['ducobu']),
    ]);
    expect(auteurs).toHaveLength(2);
    expect(aRevoir).toContainEqual(
      expect.objectContaining({ raison: 'noms-differents-dans-une-serie', detail: 'ducobu' }),
    );
  });

  it('affiche la graphie accentuée', () => {
    const { auteurs } = resolveAuthors([
      entry('Goscinny, Rene, 1926-1977', 3),
      entry('Goscinny, René, 1926-1977', 1),
    ]);
    expect(auteurs).toHaveLength(1);
    expect(auteurs[0]?.nom).toBe('René Goscinny');
  });
});
