// Utilitaires pour dialoguer avec le framework Java Tapestry 5 du portail SirsiDynix.
import type { CheerioAPI } from 'cheerio';
import { ParseError } from './errors';

const TAPESTRY_SAFE = /[A-Za-z0-9\-_.:]/;

/** Équivalent de `encodeAsTapestry()` du portail : `/` → `$002f`, `$` → `$$`, vide → `$N`. */
export function encodeTapestry(input: string | null): string {
  const value = input ?? 'null';
  if (value.length === 0) return '$N';
  let encoded = '';
  for (const ch of value) {
    if (TAPESTRY_SAFE.test(ch)) encoded += ch;
    else if (ch === '$') encoded += '$$';
    else encoded += '$' + (ch.codePointAt(0) ?? 0).toString(16).padStart(4, '0');
  }
  return encoded;
}

/** Équivalent de `addPathParams()` : insère des segments de chemin avant la chaîne de requête. */
export function addPathParams(url: string, ...params: string[]): string {
  const queryIndex = url.indexOf('?');
  const path = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : url.slice(queryIndex);
  const base = path.endsWith('/') ? path.slice(0, -1) : path;
  return `${base}/${params.join('/')}${query}`;
}

export interface ZoneResponse {
  content: string;
  zones: Record<string, string>;
  inits: unknown[];
  redirectURL: string | null;
}

/** Lit la réponse JSON d'une zone AJAX Tapestry (`{ content, zones, inits, redirectURL }`). */
export function parseZoneResponse(text: string): ZoneResponse {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ParseError('la réponse du portail');
  }
  if (typeof json !== 'object' || json === null) throw new ParseError('la réponse du portail');
  const obj = json as Record<string, unknown>;
  const zones: Record<string, string> = {};
  if (typeof obj.zones === 'object' && obj.zones !== null) {
    for (const [key, value] of Object.entries(obj.zones)) {
      if (typeof value === 'string') zones[key] = value;
    }
  }
  return {
    content: typeof obj.content === 'string' ? obj.content : '',
    zones,
    inits: Array.isArray(obj.inits) ? (obj.inits as unknown[]) : [],
    redirectURL: typeof obj.redirectURL === 'string' ? obj.redirectURL : null,
  };
}

/** Tous les scripts `evalScript` d'une réponse de zone, concaténés. */
export function zoneScripts(zone: ZoneResponse): string {
  const scripts: string[] = [];
  for (const init of zone.inits) {
    if (typeof init !== 'object' || init === null) continue;
    const evalScript = (init as Record<string, unknown>).evalScript;
    if (Array.isArray(evalScript)) {
      for (const s of evalScript) if (typeof s === 'string') scripts.push(s);
    }
  }
  return scripts.join('\n');
}

/** Zone associée à un formulaire (`linkZone`), nécessaire pour le soumettre en AJAX. */
export function linkedZoneId(zone: ZoneResponse, formId: string): string | null {
  for (const init of zone.inits) {
    if (typeof init !== 'object' || init === null) continue;
    const linkZone = (init as Record<string, unknown>).linkZone;
    if (!Array.isArray(linkZone)) continue;
    for (const link of linkZone) {
      if (typeof link !== 'object' || link === null) continue;
      const { linkId, zoneId } = link as Record<string, unknown>;
      if (linkId === formId && typeof zoneId === 'string') return zoneId;
    }
  }
  return null;
}

export function extractCsrf(html: string): string | null {
  return (
    /__sdcsrf\s*=\s*"([0-9a-f-]{36})"/i.exec(html)?.[1] ??
    /name="sdcsrf"[^>]*value="([0-9a-f-]{36})"|value="([0-9a-f-]{36})"[^>]*name="sdcsrf"/i
      .exec(html)
      ?.slice(1)
      .find(Boolean) ??
    null
  );
}

export interface FormSnapshot {
  id: string;
  action: string;
  fields: URLSearchParams;
  submit: { id: string; name: string; value: string } | null;
}

/**
 * Photographie un formulaire Tapestry : action, champs cachés et texte (dont `t:formdata`,
 * l'état sérialisé côté serveur qu'il faut renvoyer tel quel), et bouton de soumission.
 * Les cases à cocher ne sont pas incluses : l'appelant coche celles qu'il veut.
 */
export function snapshotForm($: CheerioAPI, selector: string): FormSnapshot {
  const form = $(selector).first();
  const action = form.attr('action');
  const id = form.attr('id');
  if (!action || !id) throw new ParseError('le formulaire demandé');
  const fields = new URLSearchParams();
  let submit: FormSnapshot['submit'] = null;
  form.find('input, select').each((_, el) => {
    const input = $(el);
    const name = input.attr('name');
    if (!name) return;
    const type = (input.attr('type') ?? 'text').toLowerCase();
    if (type === 'checkbox' || type === 'button') return;
    if (type === 'submit') {
      submit ??= { id: input.attr('id') ?? name, name, value: input.attr('value') ?? '' };
      return;
    }
    if (el.tagName === 'select') {
      fields.set(
        name,
        input.find('option[selected]').attr('value') ??
          input.find('option').first().attr('value') ??
          '',
      );
      return;
    }
    if (!fields.has(name)) fields.set(name, input.attr('value') ?? '');
  });
  return { id, action: action.replaceAll('&amp;', '&'), fields, submit };
}
