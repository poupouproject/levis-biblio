// Données fictives qui donnent leur forme aux composants affichés en squelette (<SkeletonScope>).
// Jamais visibles : le texte est masqué, seule sa longueur sert à dessiner les barres.
import type {
  Checkout,
  CheckoutsSummary,
  CoverMap,
  Fines,
  HistoryEntry,
  Hold,
  Profile,
} from '@/types';
import { addDays, todayIso } from './format';

const TITLES = [
  'Titre du document en cours de chargement',
  'Un autre titre assez long, tome 2',
  'Titre plus court',
];

const pick = (i: number): string => TITLES[i % TITLES.length] ?? '';

/** Promesse de couvertures déjà résolue et vide : les vignettes s'affichent en bloc. */
export const NO_COVERS: Promise<CoverMap> = Promise.resolve({});

export function placeholderCheckouts(count = 3): {
  checkouts: Checkout[];
  summary: CheckoutsSummary;
} {
  const today = todayIso();
  return {
    checkouts: Array.from({ length: count }, (_, i) => ({
      barcode: `squelette-${String(i)}`,
      titleId: null,
      title: pick(i),
      author: 'Nom, Prénom de l’auteur',
      callNumber: 'J R000 abc',
      dueDate: addDays(today, 14 + i * 7),
      renewals: 0,
      alert: null,
    })),
    summary: { total: count, overdue: 0 },
  };
}

export function placeholderHolds(count = 3): Hold[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `squelette-${String(i)}`,
    holdId: `squelette-${String(i)}`,
    titleId: null,
    title: pick(i),
    author: 'Nom, Prénom de l’auteur',
    callNumber: null,
    status: 'waiting',
    statusLabel: 'En attente',
    pickupLibrary: 'Succursale de retrait',
    pickupCode: null,
    date: null,
    dateLabel: null,
    queuePosition: i + 1,
    canChangePickup: true,
    canCancel: true,
  }));
}

export function placeholderHistory(count = 6): HistoryEntry[] {
  const today = todayIso();
  return Array.from({ length: count }, (_, i) => ({
    title: pick(i),
    author: 'Nom, Prénom de l’auteur',
    checkedOut: addDays(today, -30 * (i + 1)),
    returned: addDays(today, -30 * (i + 1) + 21),
  }));
}

export const PLACEHOLDER_FINES: Fines = {
  currentCount: 0,
  amountDue: 0,
  amountDueLabel: '0,00 $',
  accruedCount: 0,
  totalPaid: 0,
  totalPaidLabel: '0,00 $',
  headers: [],
  lines: [],
};

export const PLACEHOLDER_PROFILE: Profile = {
  fullName: 'Nom, Prénom',
  firstName: 'Prénom',
  street: '000, rue de l’adresse',
  city: 'Lévis, QC',
  postalCode: 'G0G 0G0',
  phone: '418-000-0000',
  email: 'adresse@courriel.ca',
  preferences: {
    language: 'fr_CA',
    defaultTab: 'PERSONAL',
    pickupLibrary: null,
    showCheckoutHistory: true,
  },
};
