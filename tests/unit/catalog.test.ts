import { describe, it, expect } from 'vitest';
import {
  fold,
  formatGroup,
  isbnForms,
  parseAuthor,
  parseTitle,
  plausibleYear,
  tokenize,
} from '@/lib/catalog/normalize';
import { Catalog, EMPTY_QUERY, groupKey } from '@/lib/catalog/engine';
import { parseSearchParams, searchHref } from '@/lib/catalog/query';
import { simulateAvailability } from '@/lib/catalog/availability';
import type { RawEdition } from '@/lib/catalog/types';

const NOW = new Date('2026-10-20T12:00:00Z');

describe('normalisation des notices', () => {
  it('replie accents, ligatures et ponctuation', () => {
    expect(fold('Cœur de Lévis : ROMAN!')).toBe('coeur de levis roman');
    // Comme unaccent dans Postgres (public.replier)
    expect(fold('Einar Már Guðmundsson')).toBe('einar mar gudmundsson');
    expect(fold('Les sorcières de Vardø, Hałasa, Straße')).toBe(
      'les sorcieres de vardo halasa strasse',
    );
    expect(tokenize('Le cœur de la forêt')).toEqual(['coeur', 'foret']);
  });

  it('détecte la série et le tome', () => {
    expect(parseTitle("One Piece. 25, L'homme qui valait cent millions")).toEqual({
      title: "L'homme qui valait cent millions",
      subtitle: null,
      series: 'One Piece',
      volume: 25,
      omnibus: null,
    });
    expect(parseTitle('Shaman King. 23')).toMatchObject({
      title: 'Shaman King, tome 23',
      series: 'Shaman King',
      volume: 23,
    });
    expect(parseTitle('Op-center. 5, Rapport de force : roman')).toMatchObject({
      title: 'Rapport de force',
      series: 'Op-center',
      volume: 5,
    });
  });

  it('garde une intégrale dans sa série, à part du tome de même numéro', () => {
    expect(parseTitle('Sorcière. Intégrale 5')).toMatchObject({
      title: 'Sorcière, intégrale 5',
      series: 'Sorcière',
      volume: null,
      omnibus: 5,
    });
    expect(parseTitle('La balade de Yaya : intégrale 1')).toMatchObject({
      series: 'La balade de Yaya',
      omnibus: 1,
    });
    // L'intégrale 5 et le tome 5 du même auteur restent deux œuvres
    const omnibus = groupKey(parseTitle('Sorcière. Intégrale 5'), 'tiernan');
    const tome = groupKey(parseTitle('Sorcière. 5, L’éveil'), 'tiernan');
    expect(omnibus.key).toBe('s:sorciere|integrale 5|tiernan');
    expect(tome.key).toBe('s:sorciere|5|tiernan');
    // Et l'intégrale passe après les tomes dans la série
    const catalog = new Catalog(
      [
        { title: 'Sorcière. Intégrale 5', isbn: null, titleId: '3' },
        { title: 'Sorcière. 5, L’éveil', isbn: null, titleId: '2' },
        { title: 'Sorcière. 1, Le début', isbn: null, titleId: '1' },
      ].map((r) => ({
        ...r,
        author: 'Tiernan, Cate',
        publisher: null,
        year: 2010,
        format: 'Livres',
        pages: null,
        cover: null,
        summary: null,
        subjects: null,
      })),
      NOW,
    );
    expect(catalog.getSeries('sorciere')?.works.map((w) => w.title)).toEqual([
      'Le début',
      'L’éveil',
      'Sorcière, intégrale 5',
    ]);
  });

  it('détecte les autres écritures du tome', () => {
    expect(parseTitle('Les maîtres de Rome. [3], Le favori des dieux')).toMatchObject({
      title: 'Le favori des dieux',
      series: 'Les maîtres de Rome',
      volume: 3,
    });
    expect(parseTitle('Abarat. [1]')).toMatchObject({ series: 'Abarat', volume: 1 });
    expect(parseTitle('À découvert [1]')).toMatchObject({ series: 'À découvert', volume: 1 });
    // La mention de genre ne fait pas partie du nom de la série
    expect(parseTitle('Et si c’était ça, le bonheur? : roman. [1]')).toMatchObject({
      series: 'Et si c’était ça, le bonheur?',
      volume: 1,
    });
    expect(parseTitle('Belem. [1]. Le temps des naufrageurs')).toMatchObject({
      title: 'Le temps des naufrageurs',
      series: 'Belem',
      volume: 1,
    });
    expect(parseTitle('Mon oeuvre à moi : 7')).toMatchObject({
      title: 'Mon oeuvre à moi, tome 7',
      series: 'Mon oeuvre à moi',
      volume: 7,
    });
    expect(parseTitle('Les contes du Korrigan : 2 : les mille visages du diable')).toMatchObject({
      title: 'Les mille visages du diable',
      series: 'Les contes du Korrigan',
      volume: 2,
    });
    expect(parseTitle('Louisette la taupe : [2] : sardine express')).toMatchObject({
      series: 'Louisette la taupe',
      volume: 2,
    });
    expect(parseTitle('Histoires drôles : tome 49')).toMatchObject({
      series: 'Histoires drôles',
      volume: 49,
    });
    expect(parseTitle('Le Québec en chansons volume 1')).toMatchObject({
      series: 'Le Québec en chansons',
      volume: 1,
    });
    expect(parseTitle('Switch girl!! 15')).toMatchObject({ series: 'Switch girl!!', volume: 15 });
  });

  it('ne prend pas un nombre du titre pour un tome', () => {
    for (const title of [
      'Salades : 500 recettes variées et savoureuses pour toute l’année',
      'Formule 1 : le livre d’or 2001',
      'Ephemeris : 1000 ans d’histoire au jour le jour',
      'Jeux & activités pour votre enfant : 3 ans',
      'Fahrenheit 451',
      'Les 4 saisons',
    ]) {
      expect(parseTitle(title)).toMatchObject({ series: null, volume: null });
    }
  });

  it('retire la mention de genre et sépare le sous-titre', () => {
    expect(parseTitle('Les années perdues : roman')).toMatchObject({
      title: 'Les années perdues',
      subtitle: null,
      series: null,
    });
    expect(parseTitle('Voitures de course : les modèles qui ont fait l’histoire')).toMatchObject({
      title: 'Voitures de course',
      subtitle: 'les modèles qui ont fait l’histoire',
    });
    expect(parseTitle('[Souvenirs]').title).toBe('Souvenirs');
  });

  it('remet les auteurs dans l’ordre prénom nom, sans dates ni fonctions', () => {
    expect(parseAuthor('Sutherland, Tui, 1978-')).toEqual({
      display: 'Tui Sutherland',
      key: 'sutherland',
    });
    expect(parseAuthor('Rowling, J. K. (Joanne Kathleen), 1965-')?.display).toBe('J. K. Rowling');
    expect(parseAuthor('Bullier, Julie auteur, illustrateur.')?.display).toBe('Julie Bullier');
    expect(parseAuthor('Oda, Eiichirô, 1975- One Piece.')?.display).toBe('Eiichirô Oda');
    expect(parseAuthor('Walt Disney Company.')?.display).toBe('Walt Disney Company');
    expect(parseAuthor(null)).toBeNull();
  });

  it('regroupe les formats et écarte les années impossibles', () => {
    expect(formatGroup("Caractères d'imprimerie ordinaires")).toBe('livre');
    expect(formatGroup('Gros caractères')).toBe('gros-caracteres');
    expect(formatGroup('Enregistrement sonore musical')).toBe('musique');
    expect(formatGroup('Disque vidéo')).toBe('video');
    expect(plausibleYear(9782, NOW)).toBeNull();
    expect(plausibleYear(2024, NOW)).toBe(2024);
  });
});

const row = (
  title: string,
  author: string | null,
  extra: Partial<RawEdition> = {},
): RawEdition => ({
  isbn: null,
  titleId: null,
  title,
  author,
  publisher: null,
  year: 2020,
  format: 'Livres',
  pages: null,
  cover: null,
  summary: null,
  subjects: null,
  ...extra,
});

const ROWS: RawEdition[] = [
  row('One Piece. 1, Romance dawn', 'Oda, Eiichirô, 1975-', {
    titleId: '101',
    isbn: '9782723434621',
    cover: 'https://x/1.jpg',
    year: 2013,
  }),
  row('One Piece. 2, Luffy versus la bande à Baggy!!', 'Oda, Eiichirô, 1975-', {
    titleId: '102',
    cover: 'https://x/2.jpg',
  }),
  row('One Piece. 2, Luffy versus la bande à Baggy!!', 'Oda, Eiichiro.', {
    titleId: '103',
    format: 'Gros caractères',
    year: 2001,
  }),
  row('One Piece, la malédiction de l’épée sacrée. 1', 'Oda, Eiichirô', { titleId: '104' }),
  row('Les années perdues : roman', 'Clark, Mary Higgins, 1927-2020.', {
    titleId: '201',
    year: 2012,
  }),
  row('Les années perdues', 'Clark, Mary Higgins', {
    titleId: '202',
    year: 2026,
    cover: 'https://x/3.jpg',
  }),
  row('Le chat', 'Geluck, Philippe', { titleId: '301', format: 'Disque audio', year: 1995 }),
];

describe('moteur de recherche', () => {
  const catalog = new Catalog(ROWS, NOW);

  it('regroupe les éditions d’une même œuvre et d’un même tome', () => {
    expect(catalog.stats).toMatchObject({ editions: 7, works: 5 });
    const tome2 = catalog.getWork('103');
    expect(tome2?.editions).toHaveLength(2);
    expect(tome2?.id).toBe('102'); // identifiant stable : le plus petit title_id
    expect(tome2?.formats.sort()).toEqual(['gros-caracteres', 'livre']);
    expect(catalog.getWork('201')?.cover).toBe('https://x/3.jpg');
  });

  it('retrouve l’ISBN et la couverture de la notice exacte par title_id', () => {
    expect(catalog.editionCovers(['101', '103', '999'])).toEqual({
      '101': { isbn: '9782723434621', cover: 'https://x/1.jpg' },
      // L'édition 103 n'a pas de couverture : pas celle de son œuvre (102)
      '103': { isbn: null, cover: null },
    });
  });

  it('place les tomes de la série exacte en premier, dans l’ordre', () => {
    const r = catalog.search({ ...EMPTY_QUERY, q: 'one piece' });
    expect(r.works.map((w) => w.id)).toEqual(['101', '102', '104']);
    expect(r.series[0]).toMatchObject({ name: 'One Piece', count: 2 });
  });

  it('cherche sans accents, par auteur et par ISBN avec tirets', () => {
    expect(catalog.search({ ...EMPTY_QUERY, q: 'annees perdues' }).total).toBe(1);
    expect(catalog.search({ ...EMPTY_QUERY, q: 'higgins' }).works[0]?.title).toBe(
      'Les années perdues',
    );
    expect(catalog.search({ ...EMPTY_QUERY, q: '978-2-7234-3462-1' }).works[0]?.id).toBe('101');
  });

  it('filtre par format et par période, avec des facettes qui ignorent leur propre filtre', () => {
    const r = catalog.search({ ...EMPTY_QUERY, formats: ['audio'] });
    expect(r.works.map((w) => w.title)).toEqual(['Le chat']);
    expect(r.facets.formats.find((f) => f.id === 'livre')?.count).toBe(4);
    expect(catalog.search({ ...EMPTY_QUERY, period: 'recent' }).works.map((w) => w.id)).toEqual([
      '201',
    ]);
    expect(catalog.search({ ...EMPTY_QUERY, author: 'Philippe Geluck' }).total).toBe(1);
  });

  it('suggère séries, auteurs et œuvres', () => {
    const s = catalog.suggest('one pi');
    expect(s[0]).toMatchObject({ kind: 'serie', label: 'One Piece', href: '/serie/one-piece' });
    expect(
      catalog.suggest('oda').some((x) => x.kind === 'auteur' && x.label === 'Eiichirô Oda'),
    ).toBe(true);
    expect(s.some((x) => x.kind === 'oeuvre' && x.href === '/oeuvre/101')).toBe(true);
    expect(catalog.suggest('o')).toEqual([]);
  });

  it('donne la série complète et les étagères de l’accueil', () => {
    expect(catalog.getSeries('one-piece')?.works.map((w) => w.series?.volume)).toEqual([1, 2]);
    expect(catalog.newest().map((w) => w.id)).toEqual(['201']);
  });
});

describe('recherche ↔ URL', () => {
  it('lit et valide les paramètres', () => {
    const q = parseSearchParams({
      q: ' chat ',
      format: 'audio,inconnu',
      periode: 'recent',
      dispo: '1',
      succursale: 'AMF',
      tri: 'x',
      n: '9999',
    });
    expect(q).toMatchObject({
      q: 'chat',
      formats: ['audio'],
      period: 'recent',
      available: true,
      branch: 'AMF',
      sort: 'pertinence',
      limit: 240,
    });
    expect(parseSearchParams({ succursale: '<script>' }).branch).toBeNull();
  });

  it('écrit un lien sans les valeurs par défaut', () => {
    expect(searchHref({ ...EMPTY_QUERY, q: 'one piece', formats: ['livre'] })).toBe(
      '/recherche?q=one+piece&format=livre',
    );
    expect(searchHref({ ...EMPTY_QUERY })).toBe('/recherche');
  });
});

describe('corrections de la revue', () => {
  it('garde les mots vides quand la requête n’a que ça', () => {
    expect(tokenize('Les')).toEqual(['les']);
    expect(tokenize('Les années')).toEqual(['annees']);
    const catalog = new Catalog(ROWS, NOW);
    expect(catalog.search({ ...EMPTY_QUERY, q: 'Les' }).works.map((w) => w.id)).toEqual(['201']);
  });

  it('ne prend pas une année pour un tome', () => {
    expect(parseTitle('Histoire du Québec. 1960, la révolution tranquille')).toMatchObject({
      series: null,
      title: 'Histoire du Québec. 1960, la révolution tranquille',
    });
    expect(parseTitle('Astérix. 39, Astérix et le griffon').volume).toBe(39);
  });

  it('donne les formes ISBN-10 et ISBN-13', () => {
    expect(isbnForms('2-07-054127-X')).toEqual(['207054127x', '9782070541270']);
    expect(isbnForms('9782723434621')).toEqual(['9782723434621', '2723434621']);
    expect(isbnForms('abc')).toEqual([]);
  });

  it('retrouve un ISBN terminé par X, et un ISBN-10 enregistré en 978', () => {
    const catalog = new Catalog(
      [
        row('Le petit prince', 'Saint-Exupéry, Antoine de', { titleId: '900', isbn: '207054127X' }),
        ...ROWS,
      ],
      NOW,
    );
    expect(catalog.search({ ...EMPTY_QUERY, q: '2-07-054127-x' }).works[0]?.id).toBe('900');
    expect(catalog.search({ ...EMPTY_QUERY, q: '978-2-07-054127-0' }).works[0]?.id).toBe('900');
    expect(catalog.search({ ...EMPTY_QUERY, q: '2723434621' }).works[0]?.id).toBe('101');
  });

  it('sépare les tomes homonymes d’auteurs différents', () => {
    const catalog = new Catalog(
      [
        row('Coeur. 1, Premier', 'Tremblay, Michel', { titleId: '1' }),
        row('Coeur. 1, Autre', 'Roy, Gabrielle', { titleId: '2' }),
        row('Coeur. 1, Premier', null, { titleId: '3' }),
      ],
      NOW,
    );
    expect(catalog.getWork('1')?.id).not.toBe(catalog.getWork('2')?.id);
    expect(catalog.getWork('1')?.authors).toEqual(['Michel Tremblay']);
    // Sans auteur et avec deux candidats : reste à part plutôt que de fusionner au hasard
    expect(catalog.getWork('3')?.editions).toHaveLength(1);
  });

  it('relie « Goscinny » et « René Goscinny » pour le filtre et les suggestions', () => {
    const catalog = new Catalog(
      [
        row('Astérix. 1, Astérix le Gaulois', 'Goscinny, René', { titleId: '10' }),
        row('Astérix. 2, La serpe d’or', 'Goscinny.', { titleId: '11' }),
        row('Le petit Nicolas', 'Goscinny, René, 1926-1977', { titleId: '12' }),
      ],
      NOW,
    );
    const ids = (author: string): string[] =>
      catalog
        .search({ ...EMPTY_QUERY, author })
        .works.map((w) => w.id)
        .sort();
    expect(ids('René Goscinny')).toEqual(['10', '11', '12']);
    expect(ids('Goscinny')).toEqual(['10', '11', '12']);
    const authors = catalog.suggest('goscinny').filter((s) => s.kind === 'auteur');
    expect(authors).toEqual([
      expect.objectContaining({ label: 'René Goscinny', detail: 'Auteur · 3 œuvres' }),
    ]);
  });
});

describe('disponibilité simulée', () => {
  it('est stable pour une même œuvre et cohérente', () => {
    const a = simulateAvailability('321025', NOW);
    expect(simulateAvailability('321025', NOW)).toEqual(a);
    expect(a.branches.length).toBeGreaterThan(0);
    expect(a.available).toBe(a.branches.reduce((n, b) => n + b.available, 0));
    expect(a.nextReturn === null).toBe(a.available > 0);
  });
});
