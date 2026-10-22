import 'server-only';

/**
 * Résumés de livres par l'API Google Books, interrogée au moment de l'affichage.
 *
 * Conditions de Google (Google APIs Terms of Service, § 5 e) : ne pas constituer de base ni
 * de copie permanente, ni garder une copie en cache plus longtemps que l'en-tête de cache ne
 * le permet. Rien n'est donc stocké : un cache en mémoire suit l'en-tête `Cache-Control` de
 * chaque réponse. Attribution obligatoire à l'affichage (logo « Powered by Google » et lien
 * vers la fiche Google Livres).
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
  '#39': '’',
  nbsp: ' ',
};

/** Description Google (HTML simple : <p>, <br>, <b>, <i>) → paragraphes en texte brut. */
export function descriptionParagraphs(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, name: string) => ENTITIES[name] ?? m)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

interface VolumesResponse {
  items?: {
    volumeInfo?: { description?: string; infoLink?: string; canonicalVolumeLink?: string };
  }[];
}

/** Une édition. `null` : pas de résumé ; lève une erreur si le service est indisponible. */
async function lookup(isbn: string, key: string): Promise<BookSummary | null> {
  const hit = cache.get(isbn);
  if (hit && hit.expires > Date.now()) return hit.value;

  const url = new URL(ENDPOINT);
  url.searchParams.set('q', `isbn:${isbn}`);
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('fields', 'items(volumeInfo(description,infoLink,canonicalVolumeLink))');
  url.searchParams.set('key', key);

  // `no-store` : pas le cache de données de Next, qui ignorerait l'en-tête de Google.
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 429 || res.status === 403) {
    pausedUntil = Date.now() + COOLDOWN_MS;
    throw new Error(`Google Books : ${String(res.status)}`);
  }
  if (!res.ok) throw new Error(`Google Books : ${String(res.status)}`);

  const info = ((await res.json()) as VolumesResponse).items?.[0]?.volumeInfo;
  const paragraphs = info?.description ? descriptionParagraphs(info.description) : [];
  const link = info?.canonicalVolumeLink ?? info?.infoLink;
  const value = paragraphs.length > 0 && link ? { paragraphs, link } : null;

  const ttl = value ? cacheTtlMs(res.headers.get('cache-control')) : MISS_TTL_MS;
  if (ttl > 0) cache.set(isbn, { value, expires: Date.now() + ttl });
  return value;
}

/**
 * Résumé d'une œuvre : essaie ses éditions dans l'ordre (ISBN) jusqu'à en trouver un.
 * Ne lève jamais : sans clé, hors quota ou en panne, l'œuvre s'affiche simplement sans résumé.
 */
export async function bookSummary(isbns: string[]): Promise<BookSummary | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key || Date.now() < pausedUntil) return null;
  const candidates = [...new Set(isbns.map((i) => i.replace(/[\s-]/g, '')).filter(Boolean))].slice(
    0,
    MAX_ISBNS,
  );
  for (const isbn of candidates) {
    try {
      // Deux visites simultanées de la même œuvre : une seule requête.
      let pending = inFlight.get(isbn);
      if (!pending) {
        pending = lookup(isbn, key).finally(() => inFlight.delete(isbn));
        inFlight.set(isbn, pending);
      }
      const summary = await pending;
      if (summary) return summary;
    } catch {
      return null;
    }
  }
  return null;
}
