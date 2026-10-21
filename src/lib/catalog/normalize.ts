// Nettoyage des notices brutes du catalogue (titres, auteurs, formats). Fonctions pures, testées.

/** Minuscules, sans accents ni ponctuation : sert à comparer et à chercher. */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Mots de la requête, sans les mots vides trop courts pour discriminer. */
export function tokenize(query: string): string[] {
  return fold(query)
    .split(' ')
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
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
  if (seriesMatch?.[1] && seriesMatch[2]) {
    series = seriesMatch[1].trim();
    volume = Number.parseInt(seriesMatch[2], 10);
    text = (seriesMatch[3] ?? '').trim();
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
