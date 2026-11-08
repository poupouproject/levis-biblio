import { describe, expect, it } from 'vitest';
import type { Checkout, HistoryEntry } from '@/types';
import {
  bookTitle,
  buildYearRecap,
  comparisonText,
  daysText,
  defaultRecapYear,
  estimatedStart,
  isRecapOpen,
  recapSeasonYear,
  recapYears,
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
  entry('Le petit prince', 'Saint-Exupéry, Antoine de, 1900-1944', '2026-04-10', '2026-04-10'),
  entry('Alice au pays des merveilles', 'Carroll, Lewis, 1832-1898', '2026-06-01', '2026-06-29'),
  entry('Le Petit Nicolas', 'Goscinny, René, 1926-1977', '2025-11-20', '2025-12-04'),
];

describe('récapitulatif de l’année', () => {
  it('compte l’année civile, emprunts en cours compris', () => {
    const recap = buildYearRecap(
      HISTORY,
      [checkout('One Piece. 5, Pour qui sonne le glas', '2026-07-22')],
      2026,
    );
    expect(recap.total).toBe(6);
    expect(recap.inProgress).toBe(1);
    expect(recap.since).toBe('2025-11-20');
  });

  it('estime la date d’emprunt d’un document en cours : échéance moins prêt et renouvellements', () => {
    expect(estimatedStart({ dueDate: '2026-11-25', renewals: 0 })).toBe('2026-11-04');
    expect(estimatedStart({ dueDate: '2026-11-25', renewals: 2 })).toBe('2026-09-23');
    expect(estimatedStart({ dueDate: null, renewals: 0 })).toBeNull();
  });

  it('un emprunt en cours commencé l’an dernier compte pour l’an dernier', () => {
    const recap = buildYearRecap([], [checkout('One Piece. 9', '2026-01-10', 1)], 2026);
    expect(recap.total).toBe(0);
    expect(buildYearRecap([], [checkout('One Piece. 9', '2026-01-10', 1)], 2025).total).toBe(1);
  });

  it('compare avec l’année précédente seulement si l’historique la couvre', () => {
    expect(buildYearRecap(HISTORY, [], 2026).previousTotal).toBe(1);
    expect(buildYearRecap(HISTORY, [], 2025).previousTotal).toBeNull();
  });

  it('mois par mois, mois le plus occupé et plus longue suite de mois', () => {
    const recap = buildYearRecap(HISTORY, [], 2026);
    expect(recap.months).toEqual([0, 0, 3, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
    expect(recap.topMonth).toEqual({ month: 2, count: 3 });
    expect(recap.streak).toBe(2);
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

  it('rythme : documents rendus seulement, le plus vite et le plus longtemps', () => {
    const recap = buildYearRecap(HISTORY, [checkout('Long en cours', '2026-12-01', 3)], 2026);
    expect(recap.pace).toEqual({
      averageDays: 12,
      fastest: { title: 'Le petit prince', days: 0 },
      longest: { title: 'Alice au pays des merveilles', days: 28 },
    });
  });

  it('année sans emprunt : tout est vide', () => {
    const recap = buildYearRecap(HISTORY, [], 2024);
    expect(recap.total).toBe(0);
    expect(recap.topMonth).toBeNull();
    expect(recap.pace).toBeNull();
    expect(recap.streak).toBe(0);
  });

  it('années disponibles, de la plus récente à la plus ancienne', () => {
    expect(recapYears(HISTORY, [checkout('x', '2027-01-15')])).toEqual([2026, 2025]);
    expect(recapYears(HISTORY, [checkout('x', '2027-02-15')])).toEqual([2027, 2026, 2025]);
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
