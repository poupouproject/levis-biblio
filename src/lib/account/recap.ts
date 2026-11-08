// Récapitulatif « Votre année à la bibliothèque » : calculé à chaque visite, à partir de
// l'historique (documents rendus) et des emprunts en cours. Rien n'est conservé. Fonctions pures.
import type { Checkout, HistoryEntry } from '@/types';
import { fold, parseAuthor, parseTitle, slugify } from '@/lib/catalog/normalize';
import { addDays, daysUntil } from './format';

/** Durée d'un prêt (et d'un renouvellement) aux bibliothèques de Lévis. */
export const LOAN_DAYS = 21;

export const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/** Abréviations sans ambiguïté (juin, juil.), pour les petits graphiques. */
export const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
] as const;

/** Un emprunt de l'année : rendu (historique) ou en cours, avec une date d'emprunt estimée. */
interface Loan {
  title: string;
  author: string | null;
  start: string;
  returned: string | null;
}

export interface RecapBook {
  title: string;
  days: number;
}

export interface RecapSeries {
  name: string;
  slug: string;
  /** Tomes empruntés dans l'année, en ordre croissant. */
  volumes: number[];
}

export interface YearRecap {
  year: number;
  /** Plus ancien emprunt de l'historique : le bilan ne remonte pas plus loin. */
  since: string | null;
  total: number;
  /** Emprunts en cours comptés dans le total (absents de l'historique). */
  inProgress: number;
  /** Total de l'année précédente ; nul si l'historique ne la couvre pas. */
  previousTotal: number | null;
  /** Nombre d'emprunts par mois, de janvier à décembre. */
  months: number[];
  topMonth: { month: number; count: number } | null;
  topAuthor: { name: string; count: number } | null;
  topSeries: RecapSeries | null;
  /** Documents rendus seulement : la date d'emprunt d'un document en cours est estimée. */
  pace: { averageDays: number; longest: RecapBook; fastest: RecapBook } | null;
  /** Plus longue suite de mois consécutifs avec au moins un emprunt. */
  streak: number;
}

/** « One Piece. 26, À l'aventure en terre divine » → « One Piece, tome 26 ». */
export function bookTitle(raw: string): string {
  const parsed = parseTitle(raw);
  return parsed.series && parsed.volume !== null
    ? `${parsed.series}, tome ${String(parsed.volume)}`
    : parsed.title;
}

/**
 * Date d'emprunt d'un document en cours, que le portail ne donne pas : l'échéance moins le prêt
 * et ses renouvellements.
 */
export function estimatedStart(checkout: Pick<Checkout, 'dueDate' | 'renewals'>): string | null {
  return checkout.dueDate ? addDays(checkout.dueDate, -(checkout.renewals + 1) * LOAN_DAYS) : null;
}

function loansOf(history: HistoryEntry[], checkouts: Checkout[]): Loan[] {
  const loans: Loan[] = [];
  for (const e of history) {
    if (e.checkedOut) {
      loans.push({ title: e.title, author: e.author, start: e.checkedOut, returned: e.returned });
    }
  }
  for (const c of checkouts) {
    const start = estimatedStart(c);
    if (start) loans.push({ title: c.title, author: c.author, start, returned: null });
  }
  return loans;
}

const yearOf = (iso: string): number => Number.parseInt(iso.slice(0, 4), 10);

/** Années qui ont au moins un emprunt, de la plus récente à la plus ancienne. */
export function recapYears(history: HistoryEntry[], checkouts: Checkout[]): number[] {
  const years = new Set(loansOf(history, checkouts).map((l) => yearOf(l.start)));
  return [...years].sort((a, b) => b - a);
}

/** Entrée la plus fréquente ; à égalité, la première rencontrée. */
function mostFrequent<T>(items: T[], key: (item: T) => string | null): [T, number] | null {
  const counts = new Map<string, [T, number]>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    const seen = counts.get(k);
    counts.set(k, [seen?.[0] ?? item, (seen?.[1] ?? 0) + 1]);
  }
  let best: [T, number] | null = null;
  for (const entry of counts.values()) if (!best || entry[1] > best[1]) best = entry;
  return best;
}

function topSeriesOf(loans: Loan[]): RecapSeries | null {
  const bySeries = new Map<string, { name: string; volumes: Set<number> }>();
  for (const loan of loans) {
    const { series, volume } = parseTitle(loan.title);
    if (!series || volume === null) continue;
    const key = fold(series);
    const entry = bySeries.get(key) ?? { name: series, volumes: new Set<number>() };
    entry.volumes.add(volume);
    bySeries.set(key, entry);
  }
  let best: { name: string; volumes: Set<number> } | null = null;
  for (const entry of bySeries.values()) {
    if (entry.volumes.size >= 2 && (!best || entry.volumes.size > best.volumes.size)) best = entry;
  }
  if (!best) return null;
  return {
    name: best.name,
    slug: slugify(best.name),
    volumes: [...best.volumes].sort((a, b) => a - b),
  };
}

function paceOf(loans: Loan[]): YearRecap['pace'] {
  const books: RecapBook[] = [];
  for (const loan of loans) {
    if (!loan.returned) continue;
    const days = daysUntil(loan.returned, loan.start);
    if (days >= 0) books.push({ title: bookTitle(loan.title), days });
  }
  if (books.length === 0) return null;
  const sorted = [...books].sort((a, b) => a.days - b.days);
  const fastest = sorted[0];
  const longest = sorted.at(-1);
  if (!fastest || !longest) return null;
  const average = books.reduce((sum, b) => sum + b.days, 0) / books.length;
  return { averageDays: Math.round(average), longest, fastest };
}

function longestStreak(months: number[]): number {
  let best = 0;
  let run = 0;
  for (const count of months) {
    run = count > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Liste française : « a », « a et b », « a, b et c ». */
function joinFrench(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} et ${parts.at(-1) ?? ''}`;
}

/** Tomes 1, 2, 3, 5, 7, 8 → « 1 à 3, 5, 7 et 8 » (deux tomes qui se suivent restent séparés). */
export function volumeRanges(volumes: number[]): string {
  const sorted = [...new Set(volumes)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let end = start;
  for (const v of [...sorted.slice(1), Number.NaN]) {
    if (start === undefined || end === undefined) break;
    if (v === end + 1) {
      end = v;
      continue;
    }
    if (end - start >= 2) parts.push(`${String(start)} à ${String(end)}`);
    else for (let n = start; n <= end; n++) parts.push(String(n));
    start = v;
    end = v;
  }
  return joinFrench(parts);
}

/** Phrase de comparaison avec l'année précédente. */
export function comparisonText(recap: Pick<YearRecap, 'year' | 'total' | 'previousTotal'>): string {
  const { year, total, previousTotal } = recap;
  const previous = String(year - 1);
  if (previousTotal === null) return 'Votre première année dans l’historique de la bibliothèque.';
  if (previousTotal === 0) return `Rien en ${previous} : quelle reprise!`;
  const diff = total - previousTotal;
  if (diff === 0) return `Autant qu’en ${previous}.`;
  if (diff < 0) return `${String(previousTotal)} en ${previous}.`;
  if (total >= previousTotal * 2) {
    const ratio = Math.floor(total / previousTotal);
    return ratio === 2
      ? `Deux fois plus qu’en ${previous}!`
      : `${String(ratio)} fois plus qu’en ${previous}!`;
  }
  return `${String(diff)} de plus qu’en ${previous}!`;
}

/** « le jour même », « en 1 jour », « en 12 jours ». */
export function daysText(days: number): string {
  if (days === 0) return 'le jour même';
  return days === 1 ? 'en 1 jour' : `en ${String(days)} jours`;
}

/** Bilan d'une année civile. Les emprunts en cours y comptent, à leur date d'emprunt estimée. */
export function buildYearRecap(
  history: HistoryEntry[],
  checkouts: Checkout[],
  year: number,
): YearRecap {
  const all = loansOf(history, checkouts);
  const loans = all.filter((l) => yearOf(l.start) === year);
  const since =
    history
      .map((e) => e.checkedOut)
      .filter((d): d is string => d !== null)
      .sort()[0] ?? null;

  const months = MONTHS.map(() => 0);
  for (const loan of loans) {
    const month = Number.parseInt(loan.start.slice(5, 7), 10) - 1;
    months[month] = (months[month] ?? 0) + 1;
  }
  let topMonth: YearRecap['topMonth'] = null;
  for (const [month, count] of months.entries()) {
    if (count > 0 && (!topMonth || count > topMonth.count)) topMonth = { month, count };
  }

  const author = mostFrequent(
    loans.map((l) => parseAuthor(l.author)),
    (a) => (a ? fold(a.display) : null),
  );

  return {
    year,
    since,
    total: loans.length,
    inProgress: loans.filter((l) => !l.returned).length,
    previousTotal: all.some((l) => yearOf(l.start) < year)
      ? all.filter((l) => yearOf(l.start) === year - 1).length
      : null,
    months,
    topMonth,
    topAuthor: author?.[0] && author[1] >= 2 ? { name: author[0].display, count: author[1] } : null,
    topSeries: topSeriesOf(loans),
    pace: paceOf(loans),
    streak: longestStreak(months),
  };
}
