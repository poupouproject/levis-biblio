/** Espaces normalisés (dont les insécables) et bords rognés. */
export function cleanText(value: string | undefined | null): string {
  return (value ?? '').replace(/[\s ]+/g, ' ').trim();
}

export function textOrNull(value: string | undefined | null): string | null {
  const text = cleanText(value);
  return text === '' ? null : text;
}

/** Dates du portail au format `AA-MM-JJ` (ex. « 26-10-25 ») → ISO `2026-10-25`. */
export function parsePortalDate(value: string | undefined | null): string | null {
  const match = /(\d{2,4})-(\d{1,2})-(\d{1,2})/.exec(cleanText(value));
  if (!match) return null;
  const [, y = '', m = '', d = ''] = match;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function parseIntOrNull(value: string | undefined | null): number | null {
  const match = /-?\d+/.exec(cleanText(value));
  return match ? Number.parseInt(match[0], 10) : null;
}

/** Montants « 12,50 $ » → 12.5 */
export function parseMoney(value: string | undefined | null): number {
  const match = /(-?\d[\d\s ]*)(?:[,.](\d{1,2}))?/.exec(cleanText(value));
  if (!match) return 0;
  const units = (match[1] ?? '0').replace(/[\s ]/g, '');
  return Number.parseFloat(`${units}.${match[2] ?? '0'}`);
}

/** Nombre qui suit un libellé dans un bloc de texte (« Documents en retard : 3 »). */
export function numberAfter(text: string, label: RegExp): number {
  const match = new RegExp(`${label.source}\\s*:?\\s*(\\d+)`, 'i').exec(text);
  return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}

/** ID du titre dans une URL ou valeur `ent://SD_ILS/0/SD_ILS:<id>` (ou sa forme encodée Tapestry). */
export function titleIdFrom(value: string | undefined | null): string | null {
  return /SD_ILS:(\d+)/.exec(value ?? '')?.[1] ?? null;
}

/** Décode un courriel masqué par Cloudflare (`data-cfemail`, XOR avec le premier octet). */
export function decodeCfEmail(encoded: string | undefined): string | null {
  if (!encoded || encoded.length < 4 || encoded.length % 2 !== 0) return null;
  const key = Number.parseInt(encoded.slice(0, 2), 16);
  let email = '';
  for (let i = 2; i < encoded.length; i += 2) {
    email += String.fromCharCode(Number.parseInt(encoded.slice(i, i + 2), 16) ^ key);
  }
  return email.includes('@') ? email : null;
}

/** Les URL de couverture du portail arrivent parfois en majuscules (« LEVI.ent… »). */
export function normalizeCoverUrl(url: string | undefined | null): string | null {
  if (!url || url.includes('no_image')) return null;
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.protocol = 'https:';
    return parsed.toString();
  } catch {
    return null;
  }
}

/** « Tremblay, Marie » → « Marie » */
export function firstNameFrom(fullName: string): string {
  const [last = '', first] = fullName.split(',').map((part) => part.trim());
  return first && first.length > 0 ? first : last;
}

export interface ExtrasItem {
  identifier: string;
  image: string | null;
  isbn: string | null;
  itemId: string | null;
}

/** ISBN contenu dans l'adresse d'une couverture (`…/btlffile/{ISBN}/cover`). */
export function isbnFromCoverUrl(url: string | null | undefined): string | null {
  return /\/btlffile\/(\d{9}[\dX]|\d{13})\/cover/i.exec(url ?? '')?.[1]?.toUpperCase() ?? null;
}

/** Réponse JSON de `loadcheckoutsextras` / `loadholdsextras` : couvertures, ISBN et codes-barres. */
export function parseExtras(text: string): ExtrasItem[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  const array = (json as { array?: unknown } | null)?.array;
  if (!Array.isArray(array)) return [];
  const items: ExtrasItem[] = [];
  for (const entry of array) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { identifier, image, itemID } = entry as Record<string, unknown>;
    if (typeof identifier !== 'string' && typeof identifier !== 'number') continue;
    const rawImage = typeof image === 'string' ? image : null;
    items.push({
      identifier: String(identifier),
      image: normalizeCoverUrl(rawImage),
      isbn: isbnFromCoverUrl(rawImage),
      itemId: typeof itemID === 'string' ? itemID : null,
    });
  }
  return items;
}
