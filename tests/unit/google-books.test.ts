import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bookSummary,
  cacheTtlMs,
  descriptionParagraphs,
  resetGoogleBooksCache,
} from '@/lib/catalog/google-books';

const volume = (description?: string): unknown => ({
  items: [
    {
      volumeInfo: {
        ...(description ? { description } : {}),
        canonicalVolumeLink: 'https://books.google.com/books/about/X.html?id=abc',
      },
    },
  ],
});

/** Réponses successives de Google ; renvoie le simulacre pour compter les appels. */
function google(
  ...responses: { status?: number; body?: unknown; cacheControl?: string }[]
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  for (const r of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(r.body ?? {}), {
        status: r.status ?? 200,
        headers: {
          'Content-Type': 'application/json',
          ...(r.cacheControl ? { 'Cache-Control': r.cacheControl } : {}),
        },
      }),
    );
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('résumés Google Livres', () => {
  beforeEach(() => {
    resetGoogleBooksCache();
    vi.stubEnv('GOOGLE_BOOKS_API_KEY', 'cle-de-test');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('convertit la description HTML en paragraphes de texte', () => {
    expect(
      descriptionParagraphs(
        '<p>Harry entre en <b>sixième</b> année.</p><p>L&#39;école&nbsp;change.<br>Fin.</p>',
      ),
    ).toEqual(['Harry entre en sixième année.', 'L’école change. Fin.']);
  });

  it('décode les entités numériques, hexadécimales et nommées accentuées', () => {
    expect(
      descriptionParagraphs(
        'L&#233;cole &laquo;&nbsp;Poudlard&nbsp;&raquo; &#x2019;&hellip; &eacute;t&eacute;',
      ),
    ).toEqual(['Lécole « Poudlard » ’… été']);
    expect(descriptionParagraphs('&inconnue; &#99999999;')).toEqual(['&inconnue; &#99999999;']);
  });

  it('une erreur sur la première édition n’empêche pas d’essayer la suivante', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = google({ status: 500 }, { body: volume('<p>Un résumé.</p>') });
    await expect(bookSummary(['9782075187794', '9782070584642'])).resolves.toMatchObject({
      paragraphs: ['Un résumé.'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Courte pause ensuite : pas de nouvelle attente à chaque visite.
    await expect(bookSummary(['9782070368228'])).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });

  it('un 403 étranger au quota ne met pas le service en pause', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = google(
      { status: 403, body: { error: { errors: [{ reason: 'forbidden' }] } } },
      { body: volume('<p>Un résumé.</p>') },
    );
    await expect(bookSummary(['9782075187794', '9782070584642'])).resolves.not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });

  it('un 403 de quota met le service en pause', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = google({
      status: 403,
      body: { error: { errors: [{ reason: 'dailyLimitExceeded' }] } },
    });
    await bookSummary(['9782075187794']);
    await bookSummary(['9782070584642']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('fusionne les ISBN-10 et ISBN-13 d’une même édition et ignore les valeurs mal formées', async () => {
    const fetchMock = google({ body: volume() });
    await bookSummary(['2-07-036822-X', '9782070368228', '(br.)']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('interroge les éditions en parallèle', async () => {
    const fetchMock = google({ body: volume() }, { body: volume('<p>B</p>') });
    await bookSummary(['9782075187794', '9782070584642']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('suit l’en-tête de cache de Google', () => {
    expect(cacheTtlMs('public, max-age=600')).toBe(600_000);
    expect(cacheTtlMs('private, max-age=0, must-revalidate')).toBe(0);
    expect(cacheTtlMs('no-store, max-age=600')).toBe(0);
    expect(cacheTtlMs(null)).toBe(0);
  });

  it('sans clé : aucune requête', async () => {
    vi.stubEnv('GOOGLE_BOOKS_API_KEY', '');
    const fetchMock = google();
    await expect(bookSummary(['9782075187794'])).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('essaie l’édition suivante quand la première n’a pas de résumé', async () => {
    const fetchMock = google({ body: volume() }, { body: volume('<p>Un résumé.</p>') });
    await expect(bookSummary(['978-2-07-518779-4', '9782070584642'])).resolves.toEqual({
      paragraphs: ['Un résumé.'],
      link: 'https://books.google.com/books/about/X.html?id=abc',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('q')).toBe('isbn:9782075187794');
    expect(url.searchParams.get('key')).toBe('cle-de-test');
  });

  it('garde le résumé en cache seulement le temps permis par Google', async () => {
    const permis = google({ body: volume('<p>A</p>'), cacheControl: 'public, max-age=600' });
    await bookSummary(['1111111111']);
    await bookSummary(['1111111111']);
    expect(permis).toHaveBeenCalledTimes(1);

    resetGoogleBooksCache();
    const interdit = google(
      { body: volume('<p>A</p>'), cacheControl: 'private, max-age=0' },
      { body: volume('<p>A</p>'), cacheControl: 'private, max-age=0' },
    );
    await bookSummary(['1111111111']);
    await bookSummary(['1111111111']);
    expect(interdit).toHaveBeenCalledTimes(2);
  });

  it('se souvient d’une absence de résumé (ce n’est pas un contenu de Google)', async () => {
    const fetchMock = google({ body: volume() });
    await bookSummary(['2222222222']);
    await bookSummary(['2222222222']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('quota dépassé : rien d’affiché, et une pause avant de réessayer', async () => {
    const fetchMock = google({ status: 429 });
    await expect(bookSummary(['3333333333'])).resolves.toBeNull();
    await expect(bookSummary(['4444444444'])).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('une seule requête pour deux visites simultanées de la même œuvre', async () => {
    const fetchMock = google({ body: volume('<p>B</p>') });
    const [a, b] = await Promise.all([bookSummary(['5555555555']), bookSummary(['5555555555'])]);
    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
