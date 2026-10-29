import 'server-only';
import type {
  ActionItemResult,
  Checkout,
  CoverMap,
  Fines,
  HistoryEntry,
  Hold,
  HoldStatus,
  Preferences,
  Profile,
} from '@/types';
import {
  getCheckouts,
  getFines,
  getHistory,
  getHolds,
  getOverview,
  getProfile,
  type CheckoutsResult,
  type HoldAction,
  type HoldsResult,
} from '@/lib/levis/account';
import { branchName } from '@/lib/levis/config';
import type { LevisClient } from '@/lib/levis/client';
import { LevisError } from '@/lib/levis/errors';
import { addDays, formatDate, renewalRefusedMessage, todayIso } from './format';

/**
 * Mode démonstration (`LEVIS_DEMO=1`) : « Mon dossier » fonctionne sans le portail de la Ville,
 * avec un dossier fictif. Sert en production, où le portail refuse les requêtes venant de Vercel,
 * et pour les captures d'écran. Aucune requête n'est envoyée au portail dans ce mode.
 *
 * Les dates sont calculées à partir d'aujourd'hui pour que le dossier reste vraisemblable.
 * Les modifications (renouvellements, annulations…) sont gardées dans le cookie de session :
 * chaque visiteur a sa propre démo, remise à zéro à la déconnexion.
 */
export function isDemoMode(): boolean {
  return process.env.LEVIS_DEMO === '1';
}

/**
 * Pastille « Démo » de l'en-tête (`LEVIS_BANNIERE_DEMO=1`). Indépendante de `LEVIS_DEMO` : on
 * peut essayer le vrai Mon dossier tout en gardant la pastille, tant que les données du
 * catalogue restent fictives ou partielles. Le mode démonstration l'affiche aussi.
 */
export function isDemoBadgeVisible(): boolean {
  return isDemoMode() || process.env.LEVIS_BANNIERE_DEMO === '1';
}

export const DEMO_FIRST_NAME = 'Camille';

/** Modifications apportées par le visiteur, scellées dans le cookie de session. */
export interface DemoState {
  renewed: Record<string, number>; // code-barres → nombre de renouvellements faits
  cancelled: string[]; // clés de réservation
  suspended: Record<string, { start: string; end: string }>;
  pickup: Record<string, string>; // clé de réservation → code de succursale
  preferences?: Preferences;
}

export function newDemoState(): DemoState {
  return { renewed: {}, cancelled: [], suspended: {}, pickup: {} };
}

const MAX_RENEWALS = 3;
/** « Poussière de rêve » est réservé par un autre usager : son renouvellement est toujours refusé. */
const RESERVED_BY_OTHER = new Set(['990000000103']);
const RENEWAL_DAYS = 21;
const COVERS = '/maquette/couvertures';

const cover = (isbn: string): CoverMap[string] => ({ url: `${COVERS}/${isbn}.jpg`, isbn });

// ─── Dossier de base ─────────────────────────────────────────────────────────

/** L'ISBN sert à la couverture ; il reste sur l'objet envoyé au navigateur (donnée publique). */
interface DemoCheckout extends Checkout {
  isbn: string;
}

function baseCheckouts(today: string): DemoCheckout[] {
  const item = (
    barcode: string,
    titleId: string,
    title: string,
    author: string,
    callNumber: string,
    dueIn: number,
    isbn: string,
  ): DemoCheckout => ({
    barcode,
    titleId,
    title,
    author,
    callNumber,
    dueDate: addDays(today, dueIn),
    renewals: 0,
    alert: null,
    isbn,
  });
  return [
    item(
      '990000000101',
      '475765',
      'Harry Potter. 6, Harry Potter et le prince de Sang-Mêlé',
      'Rowling, J. K. (Joanne Kathleen), 1965-',
      'J R884 har v.6',
      2,
      '9782075187794',
    ),
    item(
      '990000000102',
      '499373',
      'Cupcake girls. 3, Sucré Salé',
      'Simon, Coco',
      'J BD C9744',
      8,
      '9782266334761',
    ),
    item(
      '990000000103',
      '507110',
      'Poussière de rêve',
      'Guilbault, Geneviève, 1978-',
      'J G953p',
      11,
      '9782897468309',
    ),
    item(
      '990000000104',
      '448655',
      'Animal Jack. 3, La planète du singe',
      'Toussaint, Kid',
      'J BD A5984',
      16,
      '9791034748068',
    ),
    item(
      '990000000105',
      '469231',
      "One Piece. 23, L'aventure de Vivi",
      'Oda, Eiichirô, 1975-',
      'BD O585',
      16,
      '9782723494793',
    ),
  ];
}

interface DemoHold extends Hold {
  isbn: string;
}

const STATUS_LABEL: Record<HoldStatus, string> = {
  ready: 'Retirer avant le',
  waiting: 'En attente',
  in_transit: 'En transit',
  suspended: 'Suspendue',
  other: '',
};

function baseHolds(today: string): DemoHold[] {
  const item = (
    titleId: string,
    holdId: string,
    title: string,
    author: string,
    callNumber: string,
    status: HoldStatus,
    queuePosition: number,
    isbn: string,
  ): DemoHold => {
    const date = status === 'ready' ? addDays(today, 7) : null;
    return {
      key: `ent://SD_ILS/0/SD_ILS:${titleId}|${holdId}`,
      holdId,
      titleId,
      title,
      author,
      callNumber,
      status,
      statusLabel: STATUS_LABEL[status],
      pickupLibrary: branchName('AMF') ?? '',
      pickupCode: 'AMF',
      date,
      dateLabel: date,
      queuePosition,
      canChangePickup: status !== 'ready',
      canCancel: status !== 'ready',
      isbn,
    };
  };
  return [
    item(
      '321025',
      '9000001',
      "One Piece. 25, L'homme qui valait cent millions",
      'Oda, Eiichirô, 1975-',
      'BD O585',
      'ready',
      1,
      '2723448290',
    ),
    item(
      '449255',
      '9000002',
      'Animal Jack. 2, La montagne magique',
      'Toussaint, Kid',
      'J BD A5984',
      'in_transit',
      1,
      '9791034737031',
    ),
    item(
      '492386',
      '9000003',
      'Les royaumes de feu, la bande dessinée. 7, Le piège de glace',
      'Sutherland, Tui, 1978-',
      'J BD R8886',
      'waiting',
      2,
      '9782075204453',
    ),
    item(
      '486931',
      '9000004',
      'One Piece. 21, Utopia',
      'Oda, Eiichirô, 1975-',
      'BD O585',
      'waiting',
      2,
      '9782723494779',
    ),
    item(
      '402871',
      '9000005',
      'One Piece. 24, Croire en ses rêves',
      'Oda, Eiichirô, 1975-',
      'BD O585',
      'waiting',
      3,
      '9782723494809',
    ),
    item(
      '494215',
      '9000006',
      'One Piece. 18, Ace entre en scène',
      'Oda, Eiichirô, 1975-',
      'BD O585',
      'waiting',
      4,
      '9782723494748',
    ),
    item(
      '479801',
      '9000007',
      'Les royaumes de feu, la bande dessinée. 6, La montagne de Jade',
      'Sutherland, Tui, 1978-',
      'J BD R8886',
      'waiting',
      4,
      '9782075185073',
    ),
  ];
}

function baseHistory(today: string): HistoryEntry[] {
  const item = (title: string, author: string, out: number, back: number): HistoryEntry => ({
    title,
    author,
    checkedOut: addDays(today, -out),
    returned: addDays(today, -back),
  });
  return [
    item('One Piece. 22, Espoir', 'Oda, Eiichirô, 1975-', 10, 2),
    item('One Piece. 19, Rébellion', 'Oda, Eiichirô, 1975-', 12, 5),
    item('One Piece. 20, Duel au sommet', 'Oda, Eiichirô, 1975-', 12, 5),
    item('Animal Jack. 1, Le cœur de la forêt', 'Toussaint, Kid', 30, 9),
    item(
      'Les royaumes de feu, la bande dessinée. 5, La nuit-la-plus-claire',
      'Sutherland, Tui, 1978-',
      34,
      13,
    ),
    item(
      'Harry Potter. 5, Harry Potter et l’Ordre du Phénix',
      'Rowling, J. K. (Joanne Kathleen), 1965-',
      45,
      16,
    ),
    item('Cupcake girls. 2, Le défi de Katie', 'Simon, Coco', 45, 24),
    item('Cupcake girls. 1, La rentrée de Katie', 'Simon, Coco', 66, 45),
    item(
      'Les royaumes de feu, la bande dessinée. 4, Le palais de la nuit',
      'Sutherland, Tui, 1978-',
      66,
      45,
    ),
    item(
      'Harry Potter. 4, Harry Potter et la coupe de feu',
      'Rowling, J. K. (Joanne Kathleen), 1965-',
      80,
      52,
    ),
  ];
}

const BASE_PREFERENCES: Preferences = {
  language: 'fr_CA',
  defaultTab: 'PERSONAL',
  pickupLibrary: 'AMF',
  showCheckoutHistory: true,
};

const NO_FINES: Fines = {
  currentCount: 0,
  amountDue: 0,
  amountDueLabel: '0,00 $',
  accruedCount: 0,
  totalPaid: 0,
  totalPaidLabel: '0,00 $',
  headers: [],
  lines: [],
};

// ─── Lectures (dossier de base + modifications du visiteur) ──────────────────

function demoCheckouts(state: DemoState): CheckoutsResult {
  const items = baseCheckouts(todayIso()).map((c) => {
    const renewed = state.renewed[c.barcode] ?? 0;
    return {
      ...c,
      renewals: renewed,
      dueDate: c.dueDate ? addDays(c.dueDate, renewed * RENEWAL_DAYS) : null,
    };
  });
  items.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const covers = Object.fromEntries(items.map((c) => [c.barcode, cover(c.isbn)]));
  const today = todayIso();
  return {
    checkouts: items,
    summary: {
      total: items.length,
      overdue: items.filter((c) => c.dueDate !== null && c.dueDate < today).length,
    },
    covers: Promise.resolve(covers),
  };
}

const HOLD_ORDER: Record<HoldStatus, number> = {
  ready: 0,
  in_transit: 1,
  waiting: 2,
  suspended: 3,
  other: 4,
};

function demoHolds(state: DemoState): HoldsResult {
  const items = baseHolds(todayIso())
    .filter((h) => !state.cancelled.includes(h.key))
    .map((h): DemoHold => {
      const code = state.pickup[h.key];
      const moved = code ? { pickupCode: code, pickupLibrary: branchName(code) ?? '' } : {};
      const suspension = state.suspended[h.key];
      if (!suspension) return { ...h, ...moved };
      return {
        ...h,
        ...moved,
        status: 'suspended',
        statusLabel: STATUS_LABEL.suspended,
        date: suspension.end,
        dateLabel: suspension.end,
      };
    });
  items.sort(
    (a, b) =>
      HOLD_ORDER[a.status] - HOLD_ORDER[b.status] ||
      (a.queuePosition ?? 999) - (b.queuePosition ?? 999),
  );
  const covers = Object.fromEntries(items.map((h) => [h.holdId, cover(h.isbn)]));
  return {
    holds: items,
    summary: { total: items.length, ready: items.filter((h) => h.status === 'ready').length },
    covers: Promise.resolve(covers),
  };
}

function demoProfile(state: DemoState): Profile {
  return {
    fullName: `Tremblay, ${DEMO_FIRST_NAME}`,
    firstName: DEMO_FIRST_NAME,
    street: '123, rue de l’Exemple',
    city: 'Lévis (Québec)',
    postalCode: 'G6V 0A0',
    phone: '418 555-0123',
    email: 'camille@exemple.ca',
    preferences: state.preferences ?? BASE_PREFERENCES,
  };
}

type Read = (client: LevisClient) => Promise<unknown>;

/** Équivalent démo de chaque lecture passée à `withAccount`. */
const DEMO_READS = new Map<Read, (state: DemoState) => unknown>([
  [getCheckouts, demoCheckouts],
  [getHolds, demoHolds],
  [getHistory, () => baseHistory(todayIso())],
  [getFines, () => NO_FINES],
  [getProfile, demoProfile],
  [
    getOverview,
    (state) => ({ checkouts: demoCheckouts(state), holds: demoHolds(state), fines: NO_FINES }),
  ],
]);

export function demoRead<T>(read: (client: LevisClient) => Promise<T>, state: DemoState): T {
  const demo = DEMO_READS.get(read);
  if (!demo) throw new Error('Lecture non disponible en mode démonstration.');
  return demo(state) as T;
}

// ─── Actions (modifient l'état du visiteur) ──────────────────────────────────

export function demoRenew(state: DemoState, barcodes: string[]): ActionItemResult[] {
  const { checkouts } = demoCheckouts(state);
  return checkouts
    .filter((c) => barcodes.includes(c.barcode))
    .map((c) => {
      if (RESERVED_BY_OTHER.has(c.barcode) || c.renewals >= MAX_RENEWALS) {
        // Même message que le portail : il ne précise pas le motif du refus
        return {
          id: c.barcode,
          title: c.title,
          ok: false,
          message: renewalRefusedMessage(c.dueDate),
        };
      }
      state.renewed[c.barcode] = c.renewals + 1;
      const due = c.dueDate ? addDays(c.dueDate, RENEWAL_DAYS) : null;
      return {
        id: c.barcode,
        title: c.title,
        ok: true,
        message: `Renouvelé${due ? ` jusqu’au ${formatDate(due)}` : ''}.`,
      };
    });
}

export function demoHoldAction(
  state: DemoState,
  action: HoldAction,
  keys: string[],
  dates?: { start: string; end: string },
): ActionItemResult[] {
  const targets = demoHolds(state).holds.filter(
    (h) => keys.includes(h.key) && (action !== 'cancel' || h.canCancel),
  );
  if (targets.length === 0)
    throw new LevisError('Aucune des réservations sélectionnées n’a été trouvée.');
  return targets.map((h) => {
    if (action === 'cancel') {
      state.cancelled.push(h.key);
      return { id: h.key, title: h.title, ok: true, message: 'Réservation annulée.' };
    }
    if (action === 'suspend' && dates) {
      state.suspended[h.key] = dates;
      return {
        id: h.key,
        title: h.title,
        ok: true,
        message: `Réservation suspendue du ${formatDate(dates.start)} au ${formatDate(dates.end)}.`,
      };
    }
    state.suspended = Object.fromEntries(
      Object.entries(state.suspended).filter(([key]) => key !== h.key),
    );
    return { id: h.key, title: h.title, ok: true, message: 'Réservation réactivée.' };
  });
}

export function demoChangePickup(
  state: DemoState,
  keys: string[],
  branchCode: string,
): ActionItemResult[] {
  const library = branchName(branchCode);
  if (!library) throw new LevisError('Succursale inconnue.');
  const targets = demoHolds(state).holds.filter((h) => keys.includes(h.key) && h.canChangePickup);
  if (targets.length === 0)
    throw new LevisError('Ces réservations ne peuvent plus changer de lieu de retrait.');
  return targets.map((h) => {
    state.pickup[h.key] = branchCode;
    return { id: h.key, title: h.title, ok: true, message: `À retirer à ${library}.` };
  });
}

export function demoUpdatePreferences(state: DemoState, preferences: Preferences): Profile {
  state.preferences = preferences;
  return demoProfile(state);
}
