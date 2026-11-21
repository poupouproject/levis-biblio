import { describe, expect, it } from 'vitest';
import type { Checkout, HistoryEntry, Hold } from '@/types';
import type { AccountLoans } from '@/lib/levis/account';
import type { CatalogEdition, CatalogWork, RawEdition } from '@/lib/catalog/types';
import { Catalog } from '@/lib/catalog/engine';
import { demoRead, newDemoState } from '@/lib/account/demo';
import { getAccountLoans } from '@/lib/levis/account';
import { todayIso } from '@/lib/account/format';
import { workIdentity, workStatus } from '@/lib/account/work-status';
import { workStatusLabel } from '@/lib/account/work-status-label';
import demoFile from '@/lib/catalog/catalogue-demo.json';

const TODAY = '2026-11-20';

const edition = (titleId: string, title: string): CatalogEdition => ({
  titleId,
  isbn: null,
  title,
  year: 2020,
  format: 'livre',
  formatLabel: 'Livres',
  publisher: null,
  pages: null,
  cover: null,
});

const work = (
  id: string,
  authors: string[],
  editions: CatalogEdition[],
): Pick<CatalogWork, 'id' | 'authors' | 'editions'> => ({ id, authors, editions });

const ONE_PIECE_22 = work(
  '321022',
  ['Eiichirô Oda'],
  [edition('321022', 'One Piece. 22, Espoir'), edition('500022', 'One Piece. 22, Espoir')],
);

const checkout = (titleId: string | null, dueDate: string | null): Checkout => ({
  barcode: `b${titleId ?? ''}`,
  titleId,
  title: 'Titre',
  author: null,
  callNumber: null,
  dueDate,
  renewals: 0,
  alert: null,
});

const hold = (titleId: string, status: Hold['status'], queuePosition: number | null): Hold => ({
  key: `ent://SD_ILS/0/SD_ILS:${titleId}|1`,
  holdId: '1',
  titleId,
  title: 'Titre',
  author: null,
  callNumber: null,
  status,
  statusLabel: '',
  pickupLibrary: 'Anne-Marie-Filteau (St-Nicolas)',
  pickupCode: 'AMF',
  date: null,
  dateLabel: null,
  queuePosition,
  canChangePickup: true,
  canCancel: true,
});

const past = (
  title: string,
  author: string | null,
  checkedOut: string,
  returned: string,
  titleId: string | null = null,
): HistoryEntry => ({ titleId, title, author, checkedOut, returned });

const loans = (partial: Partial<AccountLoans>): AccountLoans => ({
  checkouts: [],
  holds: [],
  history: [],
  ...partial,
});

describe('état personnel d’une œuvre', () => {
  const identity = workIdentity(ONE_PIECE_22);

  it('reconnaît un emprunt en cours par l’ID de n’importe quelle édition', () => {
    expect(
      workStatus(loans({ checkouts: [checkout('500022', '2026-12-01')] }), identity, TODAY),
    ).toEqual({ kind: 'checkout', dueDate: '2026-12-01', overdue: false });
    expect(
      workStatus(loans({ checkouts: [checkout('321022', '2026-11-19')] }), identity, TODAY),
    ).toMatchObject({ overdue: true });
  });

  it('donne la réservation, son statut et son rang dans la file', () => {
    expect(workStatus(loans({ holds: [hold('321022', 'waiting', 3)] }), identity, TODAY)).toEqual({
      kind: 'hold',
      status: 'waiting',
      queuePosition: 3,
      pickupLibrary: 'Anne-Marie-Filteau (St-Nicolas)',
      date: null,
    });
  });

  it('privilégie le document en main, puis la réservation, puis l’historique', () => {
    const history = [
      past('One Piece. 22, Espoir', 'Oda, Eiichirô, 1975-', '2025-01-02', '2025-01-20'),
    ];
    const holds = [hold('321022', 'waiting', 1)];
    expect(
      workStatus(loans({ checkouts: [checkout('321022', TODAY)], holds, history }), identity, TODAY)
        ?.kind,
    ).toBe('checkout');
    expect(workStatus(loans({ holds, history }), identity, TODAY)?.kind).toBe('hold');
    expect(workStatus(loans({ history }), identity, TODAY)?.kind).toBe('history');
  });

  it('retrouve un emprunt passé par son titre et son auteur, et compte les emprunts', () => {
    const history = [
      past('One piece. 22 : espoir', 'Oda, Eiichirô, 1975-', '2024-03-01', '2024-03-20'),
      past('One Piece. 22, Espoir', 'Oda, Eiichirô', '2025-06-01', '2025-06-15'),
      past('One Piece. 23, L’aventure de Vivi', 'Oda, Eiichirô, 1975-', '2025-07-01', '2025-07-15'),
    ];
    expect(workStatus(loans({ history }), identity, TODAY)).toEqual({
      kind: 'history',
      lastCheckedOut: '2025-06-01',
      count: 2,
    });
  });

  it('ne confond pas deux auteurs ni deux tomes', () => {
    const history = [
      past('One Piece. 22, Espoir', 'Autre, Personne', '2025-06-01', '2025-06-15'),
      past('One Piece. 2, Espoir', 'Oda, Eiichirô', '2025-06-01', '2025-06-15'),
    ];
    expect(workStatus(loans({ history }), identity, TODAY)).toBeNull();
  });

  it('accepte un tome sans auteur dans l’historique', () => {
    const history = [past('One Piece. 22, Espoir', null, '2025-06-01', '2025-06-15')];
    expect(workStatus(loans({ history }), identity, TODAY)?.kind).toBe('history');
  });

  it('se fie à l’ID du titre quand l’historique le donne', () => {
    const other = [
      past('One Piece. 22, Espoir', 'Oda, Eiichirô', '2025-06-01', '2025-06-15', '999'),
    ];
    expect(workStatus(loans({ history: other }), identity, TODAY)).toBeNull();
    const same = [past('Titre abrégé', null, '2025-06-01', '2025-06-15', '500022')];
    expect(workStatus(loans({ history: same }), identity, TODAY)?.kind).toBe('history');
  });

  it('écarte une réservation annulée inscrite à l’historique', () => {
    const history = [past('One Piece. 22, Espoir', 'Oda, Eiichirô', '2025-06-01', '2025-06-01')];
    expect(workStatus(loans({ history }), identity, TODAY)).toBeNull();
  });

  it('rien quand l’œuvre n’apparaît nulle part', () => {
    expect(
      workStatus(
        loans({
          checkouts: [checkout('1', TODAY), checkout(null, TODAY)],
          holds: [hold('2', 'ready', 1)],
        }),
        identity,
        TODAY,
      ),
    ).toBeNull();
  });
});

describe('libellés de l’état d’une œuvre', () => {
  it('décrit chaque cas', () => {
    expect(
      workStatusLabel({ kind: 'checkout', dueDate: '2026-12-03', overdue: false }, TODAY),
    ).toMatchObject({
      title: 'Vous l’avez en main',
      detail: 'À rapporter d’ici le 3 décembre 2026',
      href: '/compte/emprunts',
      tone: 'ok',
    });
    expect(
      workStatusLabel({ kind: 'checkout', dueDate: '2026-11-18', overdue: true }, TODAY).tone,
    ).toBe('warning');
    expect(
      workStatusLabel(
        { kind: 'hold', status: 'waiting', queuePosition: 2, pickupLibrary: 'X', date: null },
        TODAY,
      ),
    ).toMatchObject({
      title: 'Vous l’avez réservé',
      detail: 'Rang dans la file d’attente : 2',
      href: '/compte/reservations',
    });
    expect(
      workStatusLabel(
        {
          kind: 'hold',
          status: 'ready',
          queuePosition: 1,
          pickupLibrary: 'Pierre-Georges-Roy',
          date: '2026-11-27',
        },
        TODAY,
      ),
    ).toMatchObject({
      title: 'Votre réservation est prête',
      detail: 'À récupérer à Pierre-Georges-Roy avant le 27 novembre 2026',
      tone: 'ready',
    });
    expect(
      workStatusLabel({ kind: 'history', lastCheckedOut: '2025-06-01', count: 3 }, TODAY).detail,
    ).toBe('3 fois, la dernière le 1er juin 2025');
    expect(
      workStatusLabel({ kind: 'history', lastCheckedOut: '2026-06-01', count: 1 }, TODAY).detail,
    ).toBe('Le 1er juin 2026');
  });
});

describe('état d’une œuvre en mode démonstration', () => {
  const rows: RawEdition[] = (demoFile as unknown as { rows: unknown[][] }).rows.map((r) => ({
    isbn: r[0] as string | null,
    titleId: r[1] as string | null,
    title: r[2] as string,
    author: r[3] as string | null,
    publisher: null,
    year: r[5] as number | null,
    format: r[6] as string | null,
    pages: null,
    cover: null,
    summary: null,
    subjects: null,
  }));
  const catalog = new Catalog(rows);
  const demoLoans = demoRead(getAccountLoans, newDemoState());

  const statusOf = (titleId: string): ReturnType<typeof workStatus> => {
    const found = catalog.getWork(titleId);
    if (!found) throw new Error(`Œuvre ${titleId} absente du jeu de démo`);
    return workStatus(demoLoans, workIdentity(found), todayIso());
  };

  it('donne les emprunts, les réservations et l’historique du dossier fictif', () => {
    expect(statusOf('475765')?.kind).toBe('checkout'); // Harry Potter 6, en main
    expect(statusOf('492386')).toMatchObject({ kind: 'hold', queuePosition: 2 });
    expect(statusOf('321022')?.kind).toBe('history'); // One Piece 22, rendu
  });
});
