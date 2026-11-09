import { describe, expect, it } from 'vitest';
import type { Checkout, HistoryEntry } from '@/types';
import {
  bookTitle,
  buildYearRecap,
  comparisonText,
  daysText,
  defaultRecapYear,
  estimatedStart,
  GLIMPSE_SIZE,
  isCancelledHold,
  isRecapOpen,
  nextInSeries,
  PERIOD_MONTHS,
  periodStart,
  periodText,
  SHARE_FACTS,
  shareFacts,
  readerProfile,
  recapYearOf,
  recapSeasonYear,
  recapYears,
  seriesVolumesRead,
  volumeRanges,
} from '@/lib/account/recap';

const ODA = 'Oda, Eiichirô, 1975-';

function entry(title: string, author: string | null, out: string, back: string): HistoryEntry {
  return { title, author, checkedOut: out, returned: back };
}

function checkout(title: string, dueDate: string, renewals = 0): Checkout {
  return {
    barcode: title,
    titleId: null,
    title,
    author: ODA,
    callNumber: null,
    dueDate,
    renewals,
    alert: null,
  };
}

const HISTORY: HistoryEntry[] = [
  entry('One Piece. 1, À l’aube d’une grande aventure', ODA, '2026-03-02', '2026-03-05'),
  entry('One Piece. 2, Luffy versus la bande à Baggy!!', ODA, '2026-03-09', '2026-03-20'),
  entry('One Piece. 4, Attaque au clair de lune', ODA, '2026-03-15', '2026-04-01'),
  entry('Le petit prince', 'Saint-Exupéry, Antoine de, 1900-1944', '2026-04-10', '2026-04-12'),
  entry('Alice au pays des merveilles', 'Carroll, Lewis, 1832-1898', '2026-06-01', '2026-06-29'),
  // Le premier jour de l'année 2025 du récapitulatif : l'historique couvre toute l'année 2025
  entry('Le Petit Nicolas', 'Goscinny, René, 1926-1977', '2024-11-01', '2024-11-20'),
];

describe('récapitulatif de l’année', () => {
  it('compte du 1er novembre au 31 octobre, emprunts en cours compris', () => {
    const recap = buildYearRecap(
      HISTORY,
      [checkout('One Piece. 5, Pour qui sonne le glas', '2026-07-22')],
      2026,
    );
    expect(recap.total).toBe(6);
    expect(recap.inProgress).toBe(1);
    expect(recap.since).toBe('2024-11-01');
  });

  it('novembre et décembre comptent pour l’année suivante', () => {
    expect(recapYearOf('2025-10-31')).toBe(2025);
    expect(recapYearOf('2025-11-01')).toBe(2026);
    expect(recapYearOf('2025-12-31')).toBe(2026);
    expect(recapYearOf('2026-01-01')).toBe(2026);
    expect(recapYearOf('2026-10-31')).toBe(2026);
    const late = [entry('Le Petit Nicolas', null, '2025-12-10', '2025-12-20')];
    expect(buildYearRecap(late, [], 2026).total).toBe(1);
    expect(buildYearRecap(late, [], 2025).total).toBe(0);
    expect(periodText(2026)).toBe('du 1er novembre 2025 au 31 octobre 2026');
  });

  it('estime la date d’emprunt d’un document en cours : échéance moins prêt et renouvellements', () => {
    expect(estimatedStart({ dueDate: '2026-11-25', renewals: 0 })).toBe('2026-11-04');
    expect(estimatedStart({ dueDate: '2026-11-25', renewals: 2 })).toBe('2026-09-23');
    expect(estimatedStart({ dueDate: null, renewals: 0 })).toBeNull();
  });

  it('un emprunt en cours compte pour l’année de sa date d’emprunt estimée', () => {
    // Échéance du 20 novembre : emprunté le 30 octobre, donc dans l'année qui finit
    const october = [checkout('One Piece. 9', '2025-11-20')];
    expect(buildYearRecap([], october, 2025).total).toBe(1);
    expect(buildYearRecap([], october, 2026).total).toBe(0);
    // Échéance du 25 novembre : emprunté le 4 novembre, donc dans l'année suivante
    expect(buildYearRecap([], [checkout('One Piece. 9', '2025-11-25')], 2026).total).toBe(1);
  });

  it('compare avec l’année précédente seulement si l’historique la couvre', () => {
    expect(periodStart(2025)).toBe('2024-11-01');
    expect(buildYearRecap(HISTORY, [], 2026).previousTotal).toBe(1);
    expect(buildYearRecap(HISTORY, [], 2025).previousTotal).toBeNull();
  });

  it('historique commencé en cours d’année précédente : pas de comparaison trompeuse', () => {
    // Historique activé en septembre 2025 : 2025 n'a que deux mois, comparer serait trompeur
    const partial = [
      entry('a', null, '2025-09-05', '2025-09-20'),
      entry('b', null, '2025-10-05', '2025-10-20'),
      ...Array.from({ length: 30 }, (_, i) =>
        entry(
          `Livre ${String(i)}`,
          null,
          `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
          '2026-04-30',
        ),
      ),
    ];
    expect(buildYearRecap(partial, [], 2026).previousTotal).toBeNull();
  });

  it('mois par mois de novembre à octobre, mois le plus occupé et plus longue suite', () => {
    const recap = buildYearRecap(HISTORY, [], 2026);
    expect(PERIOD_MONTHS).toEqual([10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // nov. déc. janv. févr. mars avr. mai juin…
    expect(recap.months).toEqual([0, 0, 0, 0, 3, 1, 0, 1, 0, 0, 0, 0]);
    // Mois du calendrier : mars
    expect(recap.topMonth).toEqual({ month: 2, count: 3 });
    expect(recap.streak).toBe(2);
  });

  it('la régularité passe d’une année civile à l’autre', () => {
    const winter = [
      entry('a', null, '2025-11-05', '2025-11-20'),
      entry('b', null, '2025-12-05', '2025-12-20'),
      entry('c', null, '2026-01-05', '2026-01-20'),
    ];
    expect(buildYearRecap(winter, [], 2026).streak).toBe(3);
  });

  it('plume de l’année : au moins deux documents, nom affiché « Prénom Nom »', () => {
    expect(buildYearRecap(HISTORY, [], 2026).topAuthor).toEqual({ name: 'Eiichirô Oda', count: 3 });
    expect(buildYearRecap(HISTORY, [], 2025).topAuthor).toBeNull();
  });

  it('série de l’année : la plus de tomes différents, au moins deux', () => {
    expect(buildYearRecap(HISTORY, [], 2026).topSeries).toEqual({
      name: 'One Piece',
      slug: 'one-piece',
      volumes: [1, 2, 4],
    });
    const single = [
      entry(
        'Harry Potter. 1, À l’école des sorciers',
        'Rowling, J. K.',
        '2026-01-02',
        '2026-01-09',
      ),
    ];
    expect(buildYearRecap(single, [], 2026).topSeries).toBeNull();
  });

  it('suite de la série : le tome après le plus haut lu, jamais un tome sauté', () => {
    const available = [1, 2, 3, 4, 5, 6, 7, 8];
    // Tomes 1, 2 et 4 lus : le 3 est sauté, mais on propose le 5
    expect(nextInSeries(available, [1, 2, 4], [1, 2, 4])).toEqual({ kind: 'suivant', volume: 5 });
    // Le 5 déjà lu une autre année : on passe au 6
    expect(nextInSeries(available, [1, 2, 4], [1, 2, 4, 5])).toEqual({
      kind: 'suivant',
      volume: 6,
    });
    // La bibliothèque n'a pas le 9 : on propose le 10
    expect(nextInSeries([7, 8, 10], [7, 8], [7, 8])).toEqual({ kind: 'suivant', volume: 10 });
  });

  it('fin de la série : à jour avec le dernier tome de la bibliothèque', () => {
    expect(nextInSeries([1, 2, 3], [2, 3], [1, 2, 3])).toEqual({ kind: 'a-jour', last: 3 });
    // Au-delà de ce que possède la bibliothèque (tome emprunté ailleurs ou retiré)
    expect(nextInSeries([1, 2], [3, 4], [3, 4])).toEqual({ kind: 'a-jour', last: 4 });
    expect(nextInSeries([1, 2], [], [])).toBeNull();
  });

  it('tomes d’une série empruntés un jour, toutes années confondues', () => {
    expect(
      seriesVolumesRead(
        HISTORY,
        [checkout('One Piece. 7, Vieille canaille', '2027-03-01')],
        'one-piece',
      ),
    ).toEqual([1, 2, 4, 7]);
    expect(seriesVolumesRead(HISTORY, [], 'harry-potter')).toEqual([]);
  });

  it('rythme : documents rendus seulement, le plus vite et le plus longtemps', () => {
    const recap = buildYearRecap(HISTORY, [checkout('Long en cours', '2026-12-01', 3)], 2026);
    expect(recap.pace).toEqual({
      averageDays: 12,
      fastest: { title: 'Le petit prince', days: 2 },
      longest: { title: 'Alice au pays des merveilles', days: 28 },
    });
  });

  it('rendu le jour même : une réservation arrivée annulée, qui ne compte nulle part', () => {
    const cancelled = entry('One Piece. 9, Larmes', ODA, '2026-05-20', '2026-05-20');
    expect(isCancelledHold(cancelled)).toBe(true);
    expect(isCancelledHold(entry('x', null, '2026-05-20', '2026-05-21'))).toBe(false);
    expect(isCancelledHold({ checkedOut: null, returned: null })).toBe(false);

    const recap = buildYearRecap([...HISTORY, cancelled], [], 2026);
    const without = buildYearRecap(HISTORY, [], 2026);
    expect(recap.total).toBe(without.total);
    expect(recap.months).toEqual(without.months);
    expect(recap.topSeries?.volumes).toEqual([1, 2, 4]);
    expect(recap.pace?.fastest.days).toBe(2);
    expect(recap.glimpse.map((g) => g.title)).not.toContain('One Piece. 9, Larmes');
    expect(seriesVolumesRead([cancelled], [], 'one-piece')).toEqual([]);
    // Seule dans l'année : pas de récapitulatif pour cette année
    expect(recapYears([cancelled], [])).toEqual([]);
  });

  it('avant-goût : derniers documents différents de l’année, ID du titre si en cours', () => {
    const encours = { ...checkout('Le petit prince', '2026-07-22'), titleId: 'ent://SD_ILS/0/42' };
    const glimpse = buildYearRecap(HISTORY, [encours], 2026).glimpse;
    // Le même titre, rendu en avril puis emprunté de nouveau en juillet : une seule couverture
    expect(glimpse.map((g) => g.title)).toEqual([
      'Le petit prince',
      'Alice au pays des merveilles',
      'One Piece. 4, Attaque au clair de lune',
      'One Piece. 2, Luffy versus la bande à Baggy!!',
      'One Piece. 1, À l’aube d’une grande aventure',
    ]);
    expect(glimpse[0]?.titleId).toBe('ent://SD_ILS/0/42');
    expect(glimpse[1]?.titleId).toBeNull();
  });

  it('avant-goût : au plus douze documents', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      entry(`Livre ${String(i)}`, null, `2026-05-${String(i + 10)}`, '2026-06-30'),
    );
    expect(buildYearRecap(many, [], 2026).glimpse).toHaveLength(GLIMPSE_SIZE);
  });

  it('année sans emprunt : tout est vide', () => {
    const recap = buildYearRecap(HISTORY, [], 2024);
    expect(recap.glimpse).toEqual([]);
    expect(recap.total).toBe(0);
    expect(recap.topMonth).toBeNull();
    expect(recap.pace).toBeNull();
    expect(recap.streak).toBe(0);
  });

  it('années disponibles, de la plus récente à la plus ancienne', () => {
    // Emprunté le 31 octobre, puis le 1er novembre
    expect(recapYears(HISTORY, [checkout('x', '2026-11-21')])).toEqual([2026, 2025]);
    expect(recapYears(HISTORY, [checkout('x', '2026-11-22')])).toEqual([2027, 2026, 2025]);
  });
});

describe('récapitulatif : textes', () => {
  it('titre court d’un tome de série', () => {
    expect(bookTitle('One Piece. 26, À l’aventure en terre divine')).toBe('One Piece, tome 26');
    expect(bookTitle('Les années perdues : roman')).toBe('Les années perdues');
  });

  it('plages de tomes', () => {
    expect(volumeRanges([1, 2, 3, 5, 7, 8])).toBe('1 à 3, 5, 7 et 8');
    expect(volumeRanges([4])).toBe('4');
    expect(volumeRanges([2, 1])).toBe('1 et 2');
    expect(volumeRanges([])).toBe('');
  });

  it('comparaison avec l’année précédente', () => {
    expect(comparisonText({ year: 2026, total: 83, previousTotal: 30 })).toBe(
      'Deux fois plus qu’en 2025!',
    );
    expect(comparisonText({ year: 2026, total: 95, previousTotal: 30 })).toBe(
      '3 fois plus qu’en 2025!',
    );
    expect(comparisonText({ year: 2026, total: 40, previousTotal: 30 })).toBe(
      '10 de plus qu’en 2025!',
    );
    expect(comparisonText({ year: 2026, total: 30, previousTotal: 30 })).toBe('Autant qu’en 2025.');
    expect(comparisonText({ year: 2026, total: 20, previousTotal: 30 })).toBe('30 en 2025.');
    expect(comparisonText({ year: 2026, total: 20, previousTotal: 0 })).toBe(
      'Rien en 2025 : quelle reprise!',
    );
    expect(comparisonText({ year: 2026, total: 20, previousTotal: null })).toContain(
      'première année',
    );
  });

  it('image à partager : ni série ni plume sans le consentement de l’usager', () => {
    const recap = buildYearRecap(HISTORY, [], 2026);
    const numbers = shareFacts(recap, false);
    expect(numbers.join(' ')).not.toContain('One Piece');
    expect(numbers.join(' ')).not.toContain('Oda');
    expect(numbers).toEqual([
      'Mars, mon mois record : 3',
      '2 mois de suite à la bibliothèque',
      '5 fois plus qu’en 2025',
    ]);
  });

  it('image à partager : série et plume en tête si l’usager les montre, quatre faits au plus', () => {
    const facts = shareFacts(buildYearRecap(HISTORY, [], 2026), true);
    expect(facts).toHaveLength(SHARE_FACTS);
    expect(facts.slice(0, 2)).toEqual([
      'One Piece, ma série de l’année',
      'Eiichirô Oda, ma plume de l’année',
    ]);
  });

  it('durées', () => {
    expect(daysText(0)).toBe('le jour même');
    expect(daysText(1)).toBe('en 1 jour');
    expect(daysText(9)).toBe('en 9 jours');
  });
});

describe('récapitulatif : saison, comme les bilans de fin d’année', () => {
  it('l’année en cours ouvre le 15 novembre ; les années passées, toujours', () => {
    expect(isRecapOpen(2026, '2026-11-14')).toBe(false);
    expect(isRecapOpen(2026, '2026-11-15')).toBe(true);
    expect(isRecapOpen(2026, '2026-12-31')).toBe(true);
    expect(isRecapOpen(2025, '2026-06-01')).toBe(true);
    expect(isRecapOpen(2027, '2026-12-01')).toBe(false);
  });

  it('sans année précise : en janvier, celle qui vient de finir', () => {
    expect(defaultRecapYear('2027-01-20')).toBe(2026);
    expect(defaultRecapYear('2026-02-01')).toBe(2026);
    expect(defaultRecapYear('2026-11-20')).toBe(2026);
  });

  it('bouton du sommaire : du 15 novembre au 31 janvier seulement', () => {
    expect(recapSeasonYear('2026-11-14')).toBeNull();
    expect(recapSeasonYear('2026-11-15')).toBe(2026);
    expect(recapSeasonYear('2026-12-31')).toBe(2026);
    expect(recapSeasonYear('2027-01-31')).toBe(2026);
    expect(recapSeasonYear('2027-02-01')).toBeNull();
    expect(recapSeasonYear('2026-07-01')).toBeNull();
  });
});

describe('récapitulatif : profil de lecture', () => {
  const base = buildYearRecap(HISTORY, [], 2026);

  it('compte les plumes différentes', () => {
    expect(base.authors).toBe(3);
  });

  it('série suivie (5 tomes et plus) : le nom de la série seulement si l’usager le montre', () => {
    const recap = {
      ...base,
      topSeries: { name: 'One Piece', slug: 'one-piece', volumes: [1, 2, 3, 4, 5] },
    };
    expect(readerProfile(recap, true)).toEqual({
      kind: 'serie',
      label: 'Marathon de séries',
      reason: '5 tomes de One Piece cette année',
    });
    expect(readerProfile(recap, false).reason).toBe('5 tomes d’une même série cette année');
  });

  it('puis lecture éclair, variété, régularité, et un profil pour tout le monde', () => {
    const fast = {
      ...base,
      total: 8,
      pace: { averageDays: 9, fastest: { title: 'a', days: 1 }, longest: { title: 'b', days: 20 } },
    };
    expect(readerProfile(fast, false).kind).toBe('eclair');
    expect(readerProfile({ ...base, authors: 12 }, false).kind).toBe('exploration');
    expect(readerProfile({ ...base, streak: 7 }, false)).toMatchObject({
      kind: 'regularite',
      reason: '7 mois de suite à la bibliothèque',
    });
    expect(readerProfile({ ...base, total: 1, topSeries: null }, false)).toMatchObject({
      kind: 'debut',
      reason: '1 document cette année : à suivre!',
    });
  });
});
