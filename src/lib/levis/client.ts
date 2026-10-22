import 'server-only';
import {
  LEVIS_ACCOUNT_PATH,
  LEVIS_ORIGIN,
  LEVIS_REQUEST_TIMEOUT_MS,
  LEVIS_USER_AGENT,
} from './config';
import { SessionExpiredError, UpstreamError } from './errors';
import { extractCsrf, parseZoneResponse, type ZoneResponse } from './tapestry';

/** État minimal d'une session du portail : ce qui est scellé dans le cookie de l'usager. */
export interface LevisSessionState {
  cookies: Record<string, string>;
  csrf: string;
}

export interface LevisResponse {
  status: number;
  url: string;
  text: string;
  contentType: string;
}

const MAX_REDIRECTS = 6;

/**
 * Client HTTP vers le portail SirsiDynix : jarre de cookies en mémoire (le temps d'une requête),
 * suivi manuel des redirections pour conserver les cookies, jeton `sdcsrf`.
 * Ne journalise jamais les corps de requête.
 */
export class LevisClient {
  private readonly jar: Map<string, string>;
  csrf: string | null;

  constructor(state?: LevisSessionState) {
    this.jar = new Map(Object.entries(state?.cookies ?? {}));
    this.csrf = state?.csrf ?? null;
  }

  toState(): LevisSessionState {
    if (!this.csrf) throw new SessionExpiredError();
    return { cookies: Object.fromEntries(this.jar), csrf: this.csrf };
  }

  async get(path: string): Promise<LevisResponse> {
    return this.request(path, { method: 'GET' });
  }

  /** Soumission classique de formulaire (navigation complète). */
  async postForm(path: string, body: URLSearchParams): Promise<LevisResponse> {
    return this.request(path, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    });
  }

  /** Requête AJAX Tapestry (zones, événements de composants). */
  async postAjax(path: string, body?: URLSearchParams): Promise<LevisResponse> {
    return this.request(path, {
      method: 'POST',
      body: body ?? new URLSearchParams(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'text/javascript, text/html, application/xml, text/xml, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Prototype-Version': '1.7',
        ...(this.csrf ? { sdcsrf: this.csrf } : {}),
      },
    });
  }

  /** Charge une zone AJAX et vérifie que la session est toujours valide. */
  async loadZone(path: string, body?: URLSearchParams): Promise<ZoneResponse> {
    const res = await this.postAjax(path, body);
    if (!res.contentType.includes('json')) throw new SessionExpiredError();
    const zone = parseZoneResponse(res.text);
    if (zone.redirectURL && !zone.content && Object.keys(zone.zones).length === 0) {
      throw new SessionExpiredError();
    }
    return zone;
  }

  /**
   * Soumet un formulaire de zone (renouveler, annuler une réservation…). Après une action, le
   * portail répond souvent `{"redirectURL": "…/search/account/1/0?"}` pour demander de recharger
   * « Mon dossier » : c'est un succès, pas une expiration. Seule une redirection hors de l'espace
   * usager (vers la connexion) signale une session expirée.
   */
  async submitZone(path: string, body: URLSearchParams): Promise<ZoneResponse> {
    const res = await this.postAjax(path, body);
    if (!res.contentType.includes('json')) throw new SessionExpiredError();
    const zone = parseZoneResponse(res.text);
    if (
      zone.redirectURL &&
      !new URL(zone.redirectURL, LEVIS_ORIGIN).pathname.startsWith(LEVIS_ACCOUNT_PATH)
    ) {
      throw new SessionExpiredError();
    }
    return zone;
  }

  /** Charge la page « Mon dossier » ; lève `SessionExpiredError` si le portail redirige ailleurs. */
  async loadAccountPage(): Promise<string> {
    const res = await this.get(LEVIS_ACCOUNT_PATH);
    if (!new URL(res.url).pathname.startsWith(LEVIS_ACCOUNT_PATH)) throw new SessionExpiredError();
    this.csrf = extractCsrf(res.text) ?? this.csrf;
    return res.text;
  }

  /** Remplace le jeton `sdcsrf` dans une URL fournie par le portail par le jeton courant. */
  withCsrf(url: string): string {
    const clean = url.replaceAll('&amp;', '&');
    if (!this.csrf) return clean;
    return clean.replace(/sdcsrf=[0-9a-f-]+/i, `sdcsrf=${this.csrf}`);
  }

  private async request(
    path: string,
    init: { method: 'GET' | 'POST'; body?: URLSearchParams; headers?: Record<string, string> },
  ): Promise<LevisResponse> {
    let url = new URL(path.replaceAll('&amp;', '&'), LEVIS_ORIGIN).toString();
    let method = init.method;
    let body = init.body;
    let headers = init.headers ?? {};

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (new URL(url).origin !== LEVIS_ORIGIN)
        throw new UpstreamError('Redirection inattendue du portail.');
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          ...(body ? { body } : {}),
          redirect: 'manual',
          cache: 'no-store',
          signal: AbortSignal.timeout(LEVIS_REQUEST_TIMEOUT_MS),
          headers: {
            'User-Agent': LEVIS_USER_AGENT,
            'Accept-Language': 'fr-CA,fr;q=0.9',
            ...(this.jar.size > 0 ? { Cookie: this.cookieHeader() } : {}),
            ...headers,
          },
        });
      } catch (error) {
        throw new UpstreamError(undefined, { cause: error });
      }
      this.storeCookies(res);

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        url = new URL(location, url).toString();
        method = 'GET';
        body = undefined;
        headers = {};
        continue;
      }

      const text = await res.text();
      if (res.status === 403 && /cf-chl|challenge-platform|Un instant/i.test(text)) {
        throw new UpstreamError(
          'Le portail a temporairement refusé la requête. Réessayez plus tard.',
        );
      }
      if (res.status >= 500) throw new UpstreamError();
      return { status: res.status, url, text, contentType: res.headers.get('content-type') ?? '' };
    }
    throw new UpstreamError('Trop de redirections du portail.');
  }

  private cookieHeader(): string {
    return [...this.jar].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  private storeCookies(res: Response): void {
    for (const cookie of res.headers.getSetCookie()) {
      const [pair = ''] = cookie.split(';');
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === '' || /max-age=0|expires=thu, 01 jan 1970/i.test(cookie)) this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }
}
