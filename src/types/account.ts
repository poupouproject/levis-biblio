// Types du domaine « Mon dossier » (compte usager SirsiDynix de la Ville de Lévis).
// Les dates sont des chaînes ISO `AAAA-MM-JJ` pour rester sérialisables entre serveur et client.

/** Plage d'ouverture d'une journée, heures locales `HH:MM`. */
export interface OpeningHours {
  open: string;
  close: string;
}

export interface Branch {
  code: string; // Code interne SirsiDynix (ex. « AMF »)
  name: string; // Nom tel qu'affiché par le portail (ex. « Anne-Marie-Filteau (St-Nicolas) »)
  title: string; // Nom usuel (ex. « Bibliothèque Anne-Marie-Filteau »)
  sector: string; // Secteur de Lévis
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  url: string; // Fiche officielle sur levis.ca
  /** Horaire régulier, index 0 = dimanche ; `null` = fermé. */
  hours: readonly (OpeningHours | null)[];
}

export interface Checkout {
  barcode: string; // Code-barres de l'exemplaire, identifiant stable d'un emprunt
  titleId: string | null; // ID du titre dans le catalogue (même ID que le flux RSS)
  title: string;
  author: string | null;
  callNumber: string | null;
  dueDate: string | null;
  renewals: number;
  alert: string | null; // Texte d'alerte affiché par la ville (retard, avis…)
}

export interface CheckoutsSummary {
  total: number;
  overdue: number;
}

export type HoldStatus = 'ready' | 'waiting' | 'suspended' | 'in_transit' | 'other';

export interface Hold {
  key: string; // « ent://SD_ILS/0/SD_ILS:<titre>|<réservation> »
  holdId: string;
  titleId: string | null;
  title: string;
  author: string | null;
  callNumber: string | null;
  status: HoldStatus;
  statusLabel: string; // Texte brut de la ville
  pickupLibrary: string;
  pickupCode: string | null;
  date: string | null; // Échéance / disponible jusqu'au
  dateLabel: string | null; // Texte brut si la date n'est pas interprétable
  queuePosition: number | null;
  canChangePickup: boolean;
  canCancel: boolean; // Faux quand le portail n'offre pas de case à cocher (réservation prête)
}

export interface HoldsSummary {
  total: number;
  ready: number;
}

export interface HistoryEntry {
  title: string;
  author: string | null;
  checkedOut: string | null;
  returned: string | null;
}

export interface FineLine {
  cells: string[];
}

export interface Fines {
  currentCount: number;
  amountDue: number; // En dollars
  amountDueLabel: string;
  accruedCount: number;
  totalPaid: number;
  totalPaidLabel: string;
  headers: string[];
  lines: FineLine[];
}

export interface Preferences {
  language: string; // « fr_CA » | « en_US »
  defaultTab: string; // PERSONAL | CHECKOUTS | HOLDS | FINES
  pickupLibrary: string | null; // Code de succursale
  showCheckoutHistory: boolean;
}

export interface Profile {
  fullName: string;
  firstName: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  preferences: Preferences;
}

/** Couvertures indexées par code-barres (emprunts) ou numéro de réservation. Chargées en différé. */
export interface CoverInfo {
  url: string | null;
  /** ISBN tiré de l'adresse de la couverture : le portail ne le donne nulle part ailleurs. */
  isbn: string | null;
}

export type CoverMap = Record<string, CoverInfo>;

export interface ActionItemResult {
  id: string;
  title: string;
  ok: boolean;
  message: string;
}

export type ActionResult =
  | { status: 'success'; message: string; items: ActionItemResult[] }
  | { status: 'error'; message: string; items: ActionItemResult[] };

/** État de connexion exposé à l'en-tête (`GET /compte/session`). `null` : personne n'est connecté. */
export interface SessionStatus {
  firstName: string | null;
}
