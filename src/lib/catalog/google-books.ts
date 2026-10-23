import 'server-only';
import { isbnForms } from '@/lib/catalog/normalize';

/**
 * Résumés de livres par l'API Google Books, interrogée au moment de l'affichage.
 *
 * Conditions de Google (Google APIs Terms of Service, § 5 e) : ne pas constituer de base ni
 * de copie permanente, ni garder une copie en cache plus longtemps que l'en-tête de cache ne
 * le permet. Rien n'est donc stocké : un cache en mémoire suit l'en-tête `Cache-Control` de
 * chaque réponse (souvent `max-age=0` : alors un résumé n'est pas gardé, et seules les
 * requêtes simultanées sont partagées). Attribution obligatoire à l'affichage (logo
 * « Powered by Google » et lien vers la fiche Google Livres).
 *
 * La clé (`GOOGLE_BOOKS_API_KEY`) n'est lue que côté serveur : jamais de préfixe
 * `NEXT_PUBLIC_`, elle serait sinon livrée au navigateur.
 */

export interface BookSummary {
  /** Paragraphes, en texte brut. */
  paragraphs: string[];
  /** Fiche du livre sur Google Livres (lien d'attribution). */
  link: string;
}

const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const TIMEOUT_MS = 3000;
/** Nombre d'éditions (ISBN) essayées au plus par œuvre. */
const MAX_ISBNS = 3;
/** « Pas de résumé » n'est pas un contenu de Google : on peut s'en souvenir un jour. */
const MISS_TTL_MS = 24 * 3600 * 1000;
/** Quota dépassé ou clé refusée : pause avant de réessayer. */
const COOLDOWN_MS = 3600 * 1000;
/** Autre panne (délai, 5xx, JSON invalide) : courte pause, pour ne pas faire attendre chaque visite. */
const ERROR_PAUSE_MS = 60 * 1000;
/** Taille maximale du cache en mémoire (les plus anciennes entrées partent d'abord). */
const MAX_CACHE_ENTRIES = 500;
/** Motifs d'un 403 qui concernent le quota ou la clé (et non la requête elle-même). */
const QUOTA_REASONS = /rateLimit|dailyLimit|quota|keyInvalid|accessNotConfigured|ipRefererBlocked/i;

interface CacheEntry {
  value: BookSummary | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<BookSummary | null>>();
let pausedUntil = 0;

/** Pour les tests. */
export function resetGoogleBooksCache(): void {
  cache.clear();
  inFlight.clear();
  pausedUntil = 0;
}

/** Le service est-il configuré (clé présente) ? Point de vérification unique, pour la page aussi. */
export function googleBooksEnabled(): boolean {
  return Boolean(process.env.GOOGLE_BOOKS_API_KEY);
}

/** Durée de cache permise par l'en-tête (`max-age`), en ms ; 0 si `no-store` ou absent. */
export function cacheTtlMs(cacheControl: string | null): number {
  if (!cacheControl || /no-store|no-cache/i.test(cacheControl)) return 0;
  const maxAge = /max-age=(\d+)/i.exec(cacheControl)?.[1];
  return maxAge ? Number.parseInt(maxAge, 10) * 1000 : 0;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '’',
  nbsp: ' ',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  oelig: 'œ',
  OElig: 'Œ',
  aelig: 'æ',
  agrave: 'à',
  acirc: 'â',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  icirc: 'î',
  iuml: 'ï',
  ocirc: 'ô',
  ugrave: 'ù',
  ucirc: 'û',
  uuml: 'ü',
  Agrave: 'À',
  Eacute: 'É',
  Egrave: 'È',
  Ecirc: 'Ê',
  Ccedil: 'Ç',
};

/** Entité HTML (`amp`, `#233`, `#x2019`) → caractère ; laissée telle quelle si inconnue. */
function decodeEntity(match: string, name: string): string {
  if (!name.startsWith('#')) return ENTITIES[name] ?? match;
  const hex = /^#x/i.test(name);
  const code = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
  if (code === 39) return '’';
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : match;
}

/** Description Google (HTML simple : <p>, <br>, <b>, <i>) → paragraphes en texte brut. */
export function descriptionParagraphs(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, decodeEntity)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

interface VolumesResponse {
  items?: {
    volumeInfo?: { description?: string; infoLink?: string; canonicalVolumeLink?: string };
  }[];
}

/** Lecture du cache : une entrée expirée est supprimée. */
function cached(isbn: string): CacheEntry | undefined {
  const hit = cache.get(isbn);
  if (!hit) return undefined;
  if (hit.expires > Date.now()) return hit;
  cache.delete(isbn);
  return undefined;
}

/** Écriture dans le cache, dont la taille est bornée. */
function remember(isbn: string, entry: CacheEntry): void {
  cache.delete(isbn);
  cache.set(isbn, entry);
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Un 403 de Google concerne-t-il le quota ou la clé ? Sinon une pause serait injustifiée. */
async function isQuotaError(res: Response): Promise<boolean> {
  try {
    const body = (await res.json()) as {
      error?: { status?: string; errors?: { reason?: string }[] };
    };
    const reasons = [body.error?.status, ...(body.error?.errors ?? []).map((e) => e.reason)];
    return reasons.some((r) => r !== undefined && QUOTA_REASONS.test(r));
  } catch {
    return false;
  }
}

/** Une édition. `null` : pas de résumé ; lève une erreur si le service est indisponible. */
async function lookup(isbn: string, key: string): Promise<BookSummary | null> {
  const hit = cached(isbn);
  if (hit) return hit.value;

  const url = new URL(ENDPOINT);
  url.searchParams.set('q', `isbn:${isbn}`);
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('fields', 'items(volumeInfo(description,infoLink,canonicalVolumeLink))');
  url.searchParams.set('key', key);

  // `no-store` : pas le cache de données de Next, qui ignorerait l'en-tête de Google.
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 429 || (res.status === 403 && (await isQuotaError(res)))) {
    pausedUntil = Date.now() + COOLDOWN_MS;
    throw new Error(`Google Books : quota ou clé refusée (${String(res.status)})`);
  }
  if (!res.ok) throw new Error(`Google Books : ${String(res.status)}`);

  const info = ((await res.json()) as VolumesResponse).items?.[0]?.volumeInfo;
  const paragraphs = info?.description ? descriptionParagraphs(info.description) : [];
  const link = info?.canonicalVolumeLink ?? info?.infoLink;
  const value = paragraphs.length > 0 && link ? { paragraphs, link } : null;

  const ttl = value ? cacheTtlMs(res.headers.get('cache-control')) : MISS_TTL_MS;
  if (ttl > 0) remember(isbn, { value, expires: Date.now() + ttl });
  return value;
}

/** Éditions distinctes à essayer : ISBN valides, ISBN-10 et ISBN-13 d'un même livre fusionnés. */
function candidateIsbns(isbns: string[]): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const raw of isbns) {
    const forms = isbnForms(raw);
    const first = forms[0];
    if (!first || forms.some((f) => seen.has(f))) continue;
    for (const f of forms) seen.add(f);
    candidates.push(first);
  }
  return candidates.slice(0, MAX_ISBNS);
}

/**
 * Une édition. Les visites simultanées partagent une seule requête. Une erreur ne touche que
 * cette édition (les autres sont essayées) ; elle est journalisée et déclenche une courte pause.
 */
function lookupShared(isbn: string, key: string): Promise<BookSummary | null> {
  let pending = inFlight.get(isbn);
  if (!pending) {
    pending = lookup(isbn, key)
      .catch((error: unknown) => {
        pausedUntil = Math.max(pausedUntil, Date.now() + ERROR_PAUSE_MS);
        console.warn(error instanceof Error ? error.message : 'Google Books : erreur');
        return null;
      })
      .finally(() => inFlight.delete(isbn));
    inFlight.set(isbn, pending);
  }
  return pending;
}

/**
 * Résumé d'une œuvre : interroge ses éditions (ISBN) en parallèle et garde le premier résumé
 * dans l'ordre des éditions. Ne lève jamais : sans clé, hors quota ou en panne, l'œuvre
 * s'affiche simplement sans résumé.
 */
export async function bookSummary(isbns: string[]): Promise<BookSummary | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key || Date.now() < pausedUntil) return null;
  const results = await Promise.all(candidateIsbns(isbns).map((i) => lookupShared(i, key)));
  return results.find((r) => r !== null) ?? null;
}
