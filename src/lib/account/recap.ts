// Récapitulatif « Votre année à la bibliothèque » : calculé à chaque visite, à partir de
// l'historique (documents rendus) et des emprunts en cours. Rien n'est conservé. Fonctions pures.
import type { Checkout, HistoryEntry } from '@/types';
import { fold, parseAuthor, parseTitle, slugify } from '@/lib/catalog/normalize';
import { addDays, daysUntil } from './format';

/** Durée d'un prêt (et d'un renouvellement) aux bibliothèques de Lévis. */
export const LOAN_DAYS = 21;

/**
 * Comme les bilans de fin d'année : le récapitulatif de l'année en cours ouvre le 15 novembre
 * (`MM-JJ`). Les années passées restent toujours accessibles.
 */
export const RECAP_OPENS = '11-15';

const yearOfIso = (iso: string): number => Number.parseInt(iso.slice(0, 4), 10);

export function isRecapOpen(year: number, today: string): boolean {
  const current = yearOfIso(today);
  return year < current || (year === current && today.slice(5) >= RECAP_OPENS);
}

/** Année ouverte sans précision (`/compte/mon-annee`) : en janvier, celle qui vient de finir. */
export function defaultRecapYear(today: string): number {
  const current = yearOfIso(today);
  return today.slice(5, 7) === '01' ? current - 1 : current;
}

/** Année du bouton sur le sommaire, du 15 novembre au 31 janvier ; nulle le reste de l'année. */
export function recapSeasonYear(today: string): number | null {
  const year = defaultRecapYear(today);
  return year !== yearOfIso(today) || isRecapOpen(year, today) ? year : null;
}

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

/**
 * L'année du récapitulatif va du 1er novembre au 31 octobre : « 2026 » couvre du 1er novembre
 * 2025 au 31 octobre 2026. Au 15 novembre, plus aucun emprunt n'y entre : un bilan partagé ne
 * bouge plus. Et chaque emprunt compte une fois, dans une seule année, sans trou.
 */
const PERIOD_FIRST_MONTH = 10;

/** Mois du calendrier (0 = janvier) de chaque mois de la période, dans l'ordre. */
export const PERIOD_MONTHS = Array.from({ length: 12 }, (_, i) => (PERIOD_FIRST_MONTH + i) % 12);

const monthOfIso = (iso: string): number => Number.parseInt(iso.slice(5, 7), 10) - 1;

/** Année du récapitulatif d'une date : novembre et décembre comptent pour l'année suivante. */
export function recapYearOf(iso: string): number {
  return yearOfIso(iso) + (monthOfIso(iso) >= PERIOD_FIRST_MONTH ? 1 : 0);
}

/** « du 1er novembre 2025 au 31 octobre 2026 » */
export function periodText(year: number): string {
  return `du 1er novembre ${String(year - 1)} au 31 octobre ${String(year)}`;
}

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
  /** ID du titre dans le catalogue : seulement pour un emprunt en cours. */
  titleId: string | null;
}

/** Nombre de couvertures du fond flou de l'écran d'ouverture. */
export const GLIMPSE_SIZE = 12;

/** Un document de l'année, pour l'avant-goût flou de l'écran d'ouverture. */
export interface RecapGlimpse {
  title: string;
  author: string | null;
  titleId: string | null;
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
  /** Nombre d'emprunts par mois, de novembre à octobre (mois du calendrier : `PERIOD_MONTHS`). */
  months: number[];
  /** `month` : mois du calendrier (0 = janvier). */
  topMonth: { month: number; count: number } | null;
  topAuthor: { name: string; count: number } | null;
  topSeries: RecapSeries | null;
  /** Documents rendus seulement : la date d'emprunt d'un document en cours est estimée. */
  pace: { averageDays: number; longest: RecapBook; fastest: RecapBook } | null;
  /** Plus longue suite de mois consécutifs avec au moins un emprunt. */
  streak: number;
  /** Nombre de plumes (auteurs) différentes. */
  authors: number;
  /** Derniers documents différents de l'année, du plus récent au plus ancien. */
  glimpse: RecapGlimpse[];
}

export type ReaderProfileKind = 'serie' | 'eclair' | 'exploration' | 'regularite' | 'debut';

export interface ReaderProfile {
  kind: ReaderProfileKind;
  /** Nom épicène : il décrit une façon de lire, jamais la personne au masculin ou au féminin. */
  label: string;
  /** Ce qui vaut ce profil ; sans titre d'œuvre si l'usager ne veut pas les montrer. */
  reason: string;
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

/**
 * Rendu le jour même de l'emprunt : une réservation arrivée qu'on ne voulait plus. Le portail
 * ne permet pas d'annuler une réservation arrivée ; il faut l'emprunter puis la rendre aussitôt.
 * Ce n'est pas une lecture : elle ne compte nulle part. L'historique ne donne que la date, sans
 * l'heure, donc un vrai document rendu le jour même est écarté aussi (cas rare).
 */
export function isCancelledHold(entry: Pick<HistoryEntry, 'checkedOut' | 'returned'>): boolean {
  return entry.checkedOut !== null && entry.returned === entry.checkedOut;
}

function loansOf(history: HistoryEntry[], checkouts: Checkout[]): Loan[] {
  const loans: Loan[] = [];
  for (const e of history) {
    if (e.checkedOut && !isCancelledHold(e)) {
      loans.push({
        title: e.title,
        author: e.author,
        start: e.checkedOut,
        returned: e.returned,
        titleId: null,
      });
    }
  }
  for (const c of checkouts) {
    const start = estimatedStart(c);
    if (start) {
      loans.push({ title: c.title, author: c.author, start, returned: null, titleId: c.titleId });
    }
  }
  return loans;
}

/** Derniers documents différents (un même titre emprunté deux fois ne compte qu'une fois). */
function glimpseOf(loans: Loan[]): RecapGlimpse[] {
  const seen = new Set<string>();
  const glimpse: RecapGlimpse[] = [];
  for (const loan of [...loans].sort((a, b) => b.start.localeCompare(a.start))) {
    const key = fold(loan.title);
    if (seen.has(key)) continue;
    seen.add(key);
    glimpse.push({ title: loan.title, author: loan.author, titleId: loan.titleId });
    if (glimpse.length === GLIMPSE_SIZE) break;
  }
  return glimpse;
}

/** Années qui ont au moins un emprunt, de la plus récente à la plus ancienne. */
export function recapYears(history: HistoryEntry[], checkouts: Checkout[]): number[] {
  const years = new Set(loansOf(history, checkouts).map((l) => recapYearOf(l.start)));
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

/** Tomes d'une série empruntés un jour (historique complet et emprunts en cours). */
export function seriesVolumesRead(
  history: HistoryEntry[],
  checkouts: Checkout[],
  slug: string,
): number[] {
  const volumes = new Set<number>();
  for (const loan of loansOf(history, checkouts)) {
    const { series, volume } = parseTitle(loan.title);
    if (series && volume !== null && slugify(series) === slug) volumes.add(volume);
  }
  return [...volumes].sort((a, b) => a - b);
}

/** Suite d'une série : le tome qui suit le dernier lu, ou « à jour ». */
export type SeriesNext = { kind: 'suivant'; volume: number } | { kind: 'a-jour'; last: number };

/**
 * Tome à emprunter ensuite : le premier que la bibliothèque possède **après** le plus haut lu de
 * l'année et jamais emprunté. Un trou dans la lecture (tome sauté) n'est pas proposé : on suit
 * la série vers l'avant. Rien après : l'usager est à jour avec ce que la bibliothèque possède.
 */
export function nextInSeries(
  available: number[],
  readThisYear: number[],
  readEver: number[],
): SeriesNext | null {
  const highest = Math.max(...readThisYear);
  if (!Number.isFinite(highest)) return null;
  const read = new Set([...readEver, ...readThisYear]);
  const next = [...available].sort((a, b) => a - b).find((v) => v > highest && !read.has(v));
  if (next !== undefined) return { kind: 'suivant', volume: next };
  return { kind: 'a-jour', last: Math.max(highest, ...readEver) };
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

/**
 * Profil de lecture de l'année, comme les « personnalités » des bilans de fin d'année : le premier
 * trait marquant, dans l'ordre série suivie, lecture rapide, variété, régularité.
 * `titles` : le nom de la série peut figurer dans la raison (l'usager a choisi de le montrer).
 */
export function readerProfile(recap: YearRecap, titles: boolean): ReaderProfile {
  const series = recap.topSeries;
  if (series && series.volumes.length >= 5) {
    const tomes = `${String(series.volumes.length)} tomes`;
    return {
      kind: 'serie',
      label: 'Marathon de séries',
      reason: titles
        ? `${tomes} de ${series.name} cette année`
        : `${tomes} d’une même série cette année`,
    };
  }
  if (recap.pace && recap.pace.averageDays <= 10 && recap.total >= 5) {
    return {
      kind: 'eclair',
      label: 'Lecture éclair',
      reason: `${String(recap.pace.averageDays)} jours par document, en moyenne`,
    };
  }
  if (recap.authors >= 10) {
    return {
      kind: 'exploration',
      label: 'Exploration tous azimuts',
      reason: `${String(recap.authors)} plumes différentes cette année`,
    };
  }
  if (recap.streak >= 6) {
    return {
      kind: 'regularite',
      label: 'Rat de bibliothèque',
      reason: `${String(recap.streak)} mois de suite à la bibliothèque`,
    };
  }
  return {
    kind: 'debut',
    label: 'Belle découverte',
    reason: `${String(recap.total)} ${recap.total > 1 ? 'documents' : 'document'} cette année : à suivre!`,
  };
}

/**
 * Bilan d'une année du récapitulatif (1er novembre au 31 octobre). Les emprunts en cours y
 * comptent, à leur date d'emprunt estimée.
 */
export function buildYearRecap(
  history: HistoryEntry[],
  checkouts: Checkout[],
  year: number,
): YearRecap {
  const all = loansOf(history, checkouts);
  const loans = all.filter((l) => recapYearOf(l.start) === year);
  const since =
    history
      .map((e) => e.checkedOut)
      .filter((d): d is string => d !== null)
      .sort()[0] ?? null;

  const months = PERIOD_MONTHS.map(() => 0);
  for (const loan of loans) {
    const position = PERIOD_MONTHS.indexOf(monthOfIso(loan.start));
    months[position] = (months[position] ?? 0) + 1;
  }
  let topMonth: YearRecap['topMonth'] = null;
  for (const [position, count] of months.entries()) {
    const month = PERIOD_MONTHS[position] ?? 0;
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
    previousTotal: all.some((l) => recapYearOf(l.start) < year)
      ? all.filter((l) => recapYearOf(l.start) === year - 1).length
      : null,
    months,
    topMonth,
    topAuthor: author?.[0] && author[1] >= 2 ? { name: author[0].display, count: author[1] } : null,
    topSeries: topSeriesOf(loans),
    pace: paceOf(loans),
    streak: longestStreak(months),
    authors: new Set(
      loans.flatMap((l) => {
        const a = parseAuthor(l.author);
        return a ? [fold(a.display)] : [];
      }),
    ).size,
    glimpse: glimpseOf(loans),
  };
}
