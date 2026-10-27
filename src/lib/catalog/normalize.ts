// Nettoyage des notices brutes du catalogue (titres, auteurs, formats). Fonctions pures, testées.

// Lettres sans forme décomposée, translittérées comme le fait `unaccent` dans Postgres
// (public.replier) : « Guðmundsson » → « gudmundsson », pas « gu mundsson ».
const LETTERS: Record<string, string> = {
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ß: 'ss',
  ı: 'i',
  ħ: 'h',
};

/** Minuscules, sans accents ni ponctuation : sert à comparer et à chercher. */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/[øłđðþßıħ]/g, (letter) => LETTERS[letter] ?? letter)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Mots de la requête, sans les mots vides trop courts pour discriminer.
 * Une requête faite seulement de mots vides (« Les », « La ») les garde : sinon elle ne
 * chercherait rien et renverrait tout le catalogue.
 */
export function tokenize(query: string): string[] {
  const words = fold(query).split(' ').filter(Boolean);
  const meaningful = words.filter((t) => !STOP_WORDS.has(t));
  return meaningful.length > 0 ? meaningful : words;
}

/** Somme des chiffres pondérés (clé de contrôle ISBN). */
function weightedSum(digits: string, weight: (index: number) => number): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += Number(digits.charAt(i)) * weight(i);
  return sum;
}

/** ISBN nettoyé (chiffres et « x » minuscule), ou null si la saisie n'en est pas un. */
export function normalizeIsbn(value: string): string | null {
  const clean = value.replace(/[\s-]/g, '').toLowerCase();
  return /^(\d{9}[\dx]|\d{13})$/.test(clean) ? clean : null;
}

/**
 * Formes d'un ISBN sous lesquelles le retrouver : la forme nettoyée et, pour les livres
 * en 978, l'équivalent ISBN-10 ↔ ISBN-13 (le catalogue mélange les deux).
 */
export function isbnForms(value: string | null | undefined): string[] {
  const isbn = value ? normalizeIsbn(value) : null;
  if (!isbn) return [];
  if (isbn.length === 10) {
    const body = `978${isbn.slice(0, 9)}`;
    const sum = weightedSum(body, (i) => (i % 2 === 0 ? 1 : 3));
    return [isbn, `${body}${String((10 - (sum % 10)) % 10)}`];
  }
  if (isbn.startsWith('978')) {
    const body = isbn.slice(3, 12);
    const sum = weightedSum(body, (i) => 10 - i);
    const check = (11 - (sum % 11)) % 11;
    return [isbn, `${body}${check === 10 ? 'x' : String(check)}`];
  }
  return [isbn];
}

const STOP_WORDS = new Set(['le', 'la', 'les', 'l', 'de', 'des', 'du', 'd', 'un', 'une', 'et']);

// Mentions de genre ajoutées au titre par le catalogue (« : roman », « : [théâtre] »).
const GENRE_SUFFIX =
  /\s*:\s*\[?(roman|romans|nouvelles?|récits?|recit|poésie|poesie|poèmes?|théâtre|theatre|album|conte|bande dessinée|bd|essai|thriller|polar|manga)\]?\s*$/i;

export interface ParsedTitle {
  /** Titre affiché, sans la série ni la mention de genre. */
  title: string;
  subtitle: string | null;
  series: string | null;
  volume: number | null;
}

// Autres écritures du tome dans les notices, essayées si « Série. N » ne convient pas :
// « Titre. [2], Sous-titre », « Titre : 7 », « Titre : tome 3 », « Titre! 15 ».
// Un nombre suivi d'un mot (« Salades : 500 recettes ») n'est jamais un tome.
const VOLUME_PATTERNS: RegExp[] = [
  /^(.+?)\.?\s+\[(\d{1,3})\](?:\s*[,.:]\s*(.*))?$/,
  /^(.+?)\s:\s\[?(\d{1,3})\]?(?:\s:\s(.*))?$/,
  /^(.+?)[\s,:.]+(?:tome|t\.|vol\.|volume|vol|intégrale|integrale)\s*\.?\s*(\d{1,3})\s*$/i,
  /^(.+?[!?])\s+(\d{1,3})$/,
];

function matchVolume(text: string): { series: string; volume: number; rest: string } | null {
  for (const pattern of VOLUME_PATTERNS) {
    const match = pattern.exec(text);
    const series = match?.[1]
      ?.replace(GENRE_SUFFIX, '')
      .replace(/[\s,.;:]+$/, '')
      .trim();
    const volume = match?.[2];
    if (series && volume) {
      return { series, volume: Number.parseInt(volume, 10), rest: (match[3] ?? '').trim() };
    }
  }
  return null;
}

/**
 * « One Piece. 25, L'homme qui valait cent millions » → série One Piece, tome 25.
 * « Shaman King. 23 » → série Shaman King, tome 23, titre « Shaman King, tome 23 ».
 * « Les années perdues : roman » → titre « Les années perdues ».
 */
export function parseTitle(raw: string): ParsedTitle {
  let text = raw.replace(/\s+/g, ' ').trim();
  text = text.replace(/^\[(.+)\]$/, '$1');
  let series: string | null = null;
  let volume: number | null = null;

  const seriesMatch = /^(.+?)\.\s+(\d{1,4})(?:\s*[,.:]\s*(.*))?$/.exec(text);
  // « Histoire du Québec. 1960, … » : une année, pas un tome
  const isYear = /^(1[0-9]|20)\d{2}$/.test(seriesMatch?.[2] ?? '');
  if (seriesMatch?.[1] && seriesMatch[2] && !isYear) {
    series = seriesMatch[1].trim();
    volume = Number.parseInt(seriesMatch[2], 10);
    text = (seriesMatch[3] ?? '').trim();
  } else {
    const other = matchVolume(text);
    if (other) {
      series = other.series;
      volume = other.volume;
      text = other.rest;
    }
  }

  text = text.replace(GENRE_SUFFIX, '').replace(/[\s,.;:/]+$/, '');
  let subtitle: string | null = null;
  const colon = text.indexOf(' : ');
  if (colon > 0) {
    subtitle =
      text
        .slice(colon + 3)
        .replace(GENRE_SUFFIX, '')
        .trim() || null;
    text = text.slice(0, colon).trim();
  }
  if (!text) text = series && volume !== null ? `${series}, tome ${String(volume)}` : raw.trim();
  return { title: capitalize(text), subtitle, series, volume };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Fonctions ajoutées après le nom (« auteur, illustrateur. »).
const ROLES =
  /\b(auteur|auteure|autrice|illustrateur|illustratrice|artiste|traducteur|traductrice|éditeur|editeur|scénariste|scenariste|dessinateur|dessinatrice|coloriste|narrateur|narratrice|interprète|compositeur|adaptateur|préfacier|directeur de publication)s?\b[\s,.]*/gi;

export interface ParsedAuthor {
  /** « Tui Sutherland » */
  display: string;
  /** « Sutherland » : clé de regroupement des éditions d'une même œuvre. */
  key: string;
}

/**
 * « Sutherland, Tui, 1978- » → Tui Sutherland. « Rowling, J. K. (Joanne Kathleen), 1965- » → J. K. Rowling.
 * « Walt Disney Company. » → Walt Disney Company.
 */
export function parseAuthor(raw: string | null | undefined): ParsedAuthor | null {
  if (!raw) return null;
  let text = raw
    .replace(/\([^)]*\)/g, ' ')
    // Après les dates, le catalogue ajoute des fonctions ou un titre : « Oda, Eiichirô, 1975- One Piece. »
    .replace(/,?\s*\d{3,4}\s*-.*$/, '')
    .replace(ROLES, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[\s,.;]+$/, '')
    .trim();
  if (!text) return null;
  const comma = text.indexOf(',');
  if (comma > 0) {
    const last = text.slice(0, comma).trim();
    const first = text
      .slice(comma + 1)
      .split(',')[0]
      ?.trim()
      // « J. K » → « J. K. » : le point final de l'initiale a été retiré avec la ponctuation
      .replace(/(^|\s)(\p{Lu})$/u, '$1$2.');
    text = first ? `${first} ${last}` : last;
    return { display: text, key: fold(last) };
  }
  const words = fold(text).split(' ');
  return { display: text, key: words.at(-1) ?? fold(text) };
}

export type FormatGroup =
  'livre' | 'gros-caracteres' | 'audio' | 'musique' | 'video' | 'trousse' | 'numerique' | 'autre';

export const FORMAT_LABELS: Record<FormatGroup, string> = {
  livre: 'Livres',
  'gros-caracteres': 'Gros caractères',
  audio: 'Livres audio',
  musique: 'Musique',
  video: 'Films',
  trousse: 'Trousses',
  numerique: 'Numérique',
  autre: 'Autres',
};

/** Format SirsiDynix (« Caractères d'imprimerie ordinaires », « Disque vidéo »…) → groupe affiché. */
export function formatGroup(raw: string | null | undefined): FormatGroup {
  const text = fold(raw ?? '');
  if (text.includes('gros caracteres')) return 'gros-caracteres';
  if (text.includes('musique') || text.includes('musical')) return 'musique';
  if (text.includes('sonore') || text.includes('audio')) return 'audio';
  if (text.includes('video') || text.includes('film')) return 'video';
  if (text.includes('trousse')) return 'trousse';
  if (text.includes('electronique') || text.includes('informatique') || text.includes('numerique'))
    return 'numerique';
  if (
    text === '' ||
    text.includes('livre') ||
    text.includes('imprimerie') ||
    text.includes('atlas')
  )
    return 'livre';
  return 'autre';
}

/** Année plausible, sinon null (le catalogue contient des valeurs comme 9782). */
export function plausibleYear(year: number | null | undefined, now = new Date()): number | null {
  if (year === null || year === undefined || !Number.isFinite(year)) return null;
  return year >= 1450 && year <= now.getFullYear() + 1 ? year : null;
}

/** Identifiant d'URL lisible : « One Piece » → « one-piece ». */
export function slugify(value: string): string {
  return fold(value).replace(/ /g, '-');
}
