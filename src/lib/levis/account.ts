import 'server-only';
import { load } from 'cheerio';
import type {
  ActionItemResult,
  Checkout,
  CheckoutsSummary,
  CoverMap,
  Fines,
  HistoryEntry,
  Hold,
  HoldsSummary,
  Preferences,
  Profile,
} from '@/types';
import type { LevisClient } from './client';
import { LEVIS_ACCOUNT_PATH, branchName } from './config';
import { LevisError, ParseError } from './errors';
import {
  parseCheckoutMessages,
  parseCheckouts,
  parseCheckoutsSummary,
  type ParsedCheckout,
} from './parsers/checkouts';
import { cleanText, parseExtras } from './parsers/common';
import { parseFines } from './parsers/fines';
import { parseHistory } from './parsers/history';
import {
  parseEditPickupUrl,
  parseHoldActionKeys,
  parseHoldItemsUrl,
  parseHoldMessages,
  parseHolds,
  parseHoldsSummary,
} from './parsers/holds';
import { parseProfile } from './parsers/profile';
import {
  addPathParams,
  encodeTapestry,
  linkedZoneId,
  snapshotForm,
  zoneScripts,
  type ZoneResponse,
} from './tapestry';

const ZONE = {
  checkouts: {
    path: `${LEVIS_ACCOUNT_PATH}.accountnonmobile.checkouts.librarycheckoutsaccordion?`,
    id: 'libraryCheckoutsAccordion',
  },
  holds: {
    path: `${LEVIS_ACCOUNT_PATH}.accountnonmobile.holds.libraryholdsaccordion?`,
    id: 'libraryHoldsAccordion',
  },
  history: {
    path: `${LEVIS_ACCOUNT_PATH}.accountnonmobile.checkouts.checkouthistoryajax?`,
    id: 'checkoutHistoryAjax',
  },
  fines: {
    path: `${LEVIS_ACCOUNT_PATH}.accountnonmobile.fines.paymentserviceajax?`,
    id: 'paymentServiceAjax',
  },
} as const;

const EMPTY_CONTEXT = 'ent:$002f$002fSD_ILS$002f0$002fSD_ILS:';

async function loadZone(
  client: LevisClient,
  zone: (typeof ZONE)[keyof typeof ZONE],
): Promise<ZoneResponse> {
  return client.loadZone(zone.path, new URLSearchParams({ 't:zoneid': zone.id }));
}

function zoneHtml(zone: ZoneResponse): string {
  return [zone.content, ...Object.values(zone.zones)].join('\n');
}

/**
 * Couvertures chargées en différé par le portail (recherche ISBN lente : 2 à 5 s), indexées par identifiant.
 * Doit suivre le chargement de la zone correspondante. Ne lève jamais : les couvertures sont un plus.
 */
async function loadExtras(client: LevisClient, kind: 'checkouts' | 'holds'): Promise<CoverMap> {
  const event =
    kind === 'checkouts' ? 'checkouts.any:loadcheckoutsextras' : 'holds.any:loadholdsextras';
  try {
    const res = await client.postAjax(
      `${LEVIS_ACCOUNT_PATH}.accountnonmobile.${event}/${EMPTY_CONTEXT}?&sdcsrf=${client.csrf ?? ''}`,
    );
    const covers: CoverMap = {};
    for (const item of parseExtras(res.text)) if (item.image) covers[item.identifier] = item.image;
    return covers;
  } catch {
    return {};
  }
}

// ─── Emprunts ────────────────────────────────────────────────────────────────

interface CheckoutsData {
  checkouts: ParsedCheckout[];
  summary: CheckoutsSummary;
  zone: ZoneResponse;
}

async function loadCheckouts(client: LevisClient): Promise<CheckoutsData> {
  const zone = await loadZone(client, ZONE.checkouts);
  const checkouts = parseCheckouts(zone.content);
  checkouts.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  return { checkouts, summary: parseCheckoutsSummary(zoneHtml(zone), checkouts.length), zone };
}

/** Retire le nom de case positionnel, utile seulement côté serveur. */
const publicCheckout = (parsed: ParsedCheckout): Checkout => ({
  barcode: parsed.barcode,
  titleId: parsed.titleId,
  title: parsed.title,
  author: parsed.author,
  callNumber: parsed.callNumber,
  dueDate: parsed.dueDate,
  renewals: parsed.renewals,
  alert: parsed.alert,
});

export interface CheckoutsResult {
  checkouts: Checkout[];
  summary: CheckoutsSummary;
  /** Promesse non attendue : la page s'affiche sans attendre les couvertures. */
  covers: Promise<CoverMap>;
}

export async function getCheckouts(client: LevisClient): Promise<CheckoutsResult> {
  const { checkouts, summary } = await loadCheckouts(client);
  const covers = checkouts.length > 0 ? loadExtras(client, 'checkouts') : Promise.resolve({});
  return { checkouts: checkouts.map(publicCheckout), summary, covers };
}

/** Renouvelle les emprunts désignés par leur code-barres. */
export async function renewCheckouts(
  client: LevisClient,
  barcodes: string[],
): Promise<ActionItemResult[]> {
  const before = await loadCheckouts(client);
  const targets = before.checkouts.filter((c) => barcodes.includes(c.barcode));
  if (targets.length === 0)
    throw new LevisError('Aucun des documents sélectionnés n’est dans vos emprunts.');

  // Les cases portent des noms positionnels : on les associe à partir de la liste fraîchement chargée.
  const $ = load(before.zone.content);
  const formId = $('input.checkoutsCheckbox').first().closest('form').attr('id');
  if (!formId) throw new ParseError('le formulaire de renouvellement');
  const form = snapshotForm($, `#${formId}`);
  for (const target of targets) if (target.checkboxName) form.fields.set(target.checkboxName, 'on');
  if (form.submit) form.fields.set('t:submit', JSON.stringify([form.submit.id, form.submit.name]));

  const zoneId = linkedZoneId(before.zone, form.id);
  let messages: string[] = [];
  if (zoneId) {
    form.fields.set('t:zoneid', zoneId);
    messages = parseCheckoutMessages(zoneHtml(await client.loadZone(form.action, form.fields)));
  } else {
    await client.postForm(form.action, form.fields);
  }

  const after = await loadCheckouts(client);
  return targets.map((target) => {
    const updated = after.checkouts.find((c) => c.barcode === target.barcode);
    const renewed =
      updated !== undefined &&
      (updated.renewals > target.renewals || (updated.dueDate ?? '') > (target.dueDate ?? ''));
    return {
      id: target.barcode,
      title: target.title,
      ok: renewed,
      message: renewed
        ? `Renouvelé${updated.dueDate ? ` jusqu’au ${formatDate(updated.dueDate)}` : ''}.`
        : (updated?.alert ??
          messages[0] ??
          'Renouvellement refusé par la bibliothèque (réservé par un autre usager ou limite atteinte).'),
    };
  });
}

// ─── Réservations ────────────────────────────────────────────────────────────

interface HoldsData {
  holds: Hold[];
  summary: HoldsSummary;
  zone: ZoneResponse;
  actionKeys: Record<string, string>;
}

async function loadHolds(client: LevisClient): Promise<HoldsData> {
  const zone = await loadZone(client, ZONE.holds);
  const holds = parseHolds(zone.content);
  const order: Record<Hold['status'], number> = {
    ready: 0,
    in_transit: 1,
    waiting: 2,
    suspended: 3,
    other: 4,
  };
  holds.sort(
    (a, b) =>
      order[a.status] - order[b.status] || (a.queuePosition ?? 999) - (b.queuePosition ?? 999),
  );
  return {
    holds,
    summary: parseHoldsSummary(zoneHtml(zone), holds),
    zone,
    actionKeys: parseHoldActionKeys(zoneScripts(zone)),
  };
}

export interface HoldsResult {
  holds: Hold[];
  summary: HoldsSummary;
  covers: Promise<CoverMap>;
}

export async function getHolds(client: LevisClient): Promise<HoldsResult> {
  const { holds, summary } = await loadHolds(client);
  const covers = holds.length > 0 ? loadExtras(client, 'holds') : Promise.resolve({});
  return { holds, summary, covers };
}

export type HoldAction = 'cancel' | 'suspend' | 'resume';

const HOLD_ACTION_CODE: Record<HoldAction, string> = {
  cancel: 'DELETE',
  suspend: 'SUSPEND',
  resume: 'CANCEL_SUSPEND',
};

/** Date ISO → format attendu par le portail (`yyyy/m/d`). */
export function toPortalDate(iso: string): string {
  const [y = '', m = '', d = ''] = iso.split('-');
  return `${y}/${String(Number(m))}/${String(Number(d))}`;
}

/** Annule, suspend (entre deux dates) ou réactive des réservations. */
export async function runHoldAction(
  client: LevisClient,
  action: HoldAction,
  keys: string[],
  dates?: { start: string; end: string },
): Promise<ActionItemResult[]> {
  const before = await loadHolds(client);
  const targets = before.holds.filter((h) => keys.includes(h.key));
  if (targets.length === 0)
    throw new LevisError('Aucune des réservations sélectionnées n’a été trouvée.');

  const $ = load(before.zone.content);
  const formId = $('form[id^="HoldsSelectionForm"]').attr('id');
  if (!formId) throw new ParseError('le formulaire des réservations');
  const form = snapshotForm($, `#${formId}`);
  const prefix = 'myHolds_holdslistnonmobile';
  form.fields.set(`${prefix}_action`, HOLD_ACTION_CODE[action]);
  form.fields.set(
    `${prefix}_ids`,
    targets.map((t) => before.actionKeys[t.key] ?? `${t.holdId}|null`).join(','),
  );
  if (action === 'suspend') {
    if (!dates) throw new LevisError('Les dates de suspension sont requises.');
    form.fields.set(`${prefix}_startDate`, toPortalDate(dates.start));
    form.fields.set(`${prefix}_endDate`, toPortalDate(dates.end));
  }
  if (form.submit) form.fields.set('t:submit', JSON.stringify([form.submit.id, form.submit.name]));

  const zoneId = linkedZoneId(before.zone, form.id);
  let messages: string[] = [];
  if (zoneId) {
    form.fields.set('t:zoneid', zoneId);
    messages = parseHoldMessages(zoneHtml(await client.loadZone(form.action, form.fields)));
  } else {
    const res = await client.postForm(form.action, form.fields);
    messages = parseHoldMessages(res.text);
  }

  const after = await loadHolds(client);
  return targets.map((target) => {
    const updated = after.holds.find((h) => h.key === target.key);
    const ok =
      action === 'cancel'
        ? updated === undefined
        : action === 'suspend'
          ? updated?.status === 'suspended'
          : updated !== undefined && updated.status !== 'suspended';
    const success: Record<HoldAction, string> = {
      cancel: 'Réservation annulée.',
      suspend: `Réservation suspendue du ${formatDate(dates?.start ?? '')} au ${formatDate(dates?.end ?? '')}.`,
      resume: 'Réservation réactivée.',
    };
    return {
      id: target.key,
      title: target.title,
      ok,
      message: ok ? success[action] : (messages[0] ?? 'La bibliothèque a refusé la modification.'),
    };
  });
}

/** Change la succursale de retrait des réservations désignées. */
export async function changePickupLibrary(
  client: LevisClient,
  keys: string[],
  branchCode: string,
): Promise<ActionItemResult[]> {
  const library = branchName(branchCode);
  if (!library) throw new LevisError('Succursale inconnue.');
  const before = await loadHolds(client);
  const targets = before.holds.filter((h) => keys.includes(h.key) && h.canChangePickup);
  if (targets.length === 0)
    throw new LevisError('Ces réservations ne peuvent plus changer de lieu de retrait.');

  const editUrl = parseEditPickupUrl(zoneScripts(before.zone));
  if (!editUrl) throw new ParseError('le changement de lieu de retrait');
  const dialog = await client.loadZone(
    client.withCsrf(addPathParams(editUrl, ...targets.map((t) => encodeTapestry(t.key)))),
    new URLSearchParams({ 't:zoneid': 'placeHoldZone' }),
  );
  const $ = load(dialog.content);
  const ids = $('.holdTitle')
    .map((_, el) => $(el).attr('id') ?? '')
    .get()
    .filter(Boolean);
  if (ids.length === 0)
    throw new LevisError(cleanText($.text()) || 'Ces réservations ne peuvent pas être modifiées.');
  const holdItemsUrl = parseHoldItemsUrl(zoneScripts(dialog));
  if (!holdItemsUrl) throw new ParseError('le changement de lieu de retrait');

  // Reproduit `submitHolds(true)` : listes séparées par « ||| », encodées façon Tapestry.
  const join = (values: string[]): string => encodeTapestry(values.map((v) => `${v}|||`).join(''));
  const submitUrl = addPathParams(
    client.withCsrf(holdItemsUrl),
    'true',
    join(ids),
    join(ids.map(() => branchCode)),
    join(ids.map((id) => cleanText($(`[id="callNumberValue${id}"]`).text()) || 'null')),
    join(ids.map((id) => ($(`[id="message${id}"]`).length > 0 ? 'true' : 'false'))),
    encodeTapestry(null),
  );
  const res = await client.postAjax(submitUrl);
  const messages = parseMessagesMap(res.text);

  const after = await loadHolds(client);
  return targets.map((target) => {
    const updated = after.holds.find((h) => h.key === target.key);
    const ok = updated?.pickupCode === branchCode;
    const portalMessage = messages[target.key.split(':').pop() ?? ''];
    return {
      id: target.key,
      title: target.title,
      ok,
      message: ok
        ? `À retirer à ${library}.`
        : (portalMessage ?? 'La bibliothèque a refusé le changement.'),
    };
  });
}

function parseMessagesMap(text: string): Record<string, string> {
  try {
    const json = JSON.parse(text) as { messages?: Record<string, unknown> };
    const out: Record<string, string> = {};
    for (const [id, html] of Object.entries(json.messages ?? {})) {
      if (typeof html === 'string') out[id] = cleanText(load(html).text());
    }
    return out;
  } catch {
    return {};
  }
}

// ─── Historique, amendes, profil ─────────────────────────────────────────────

export async function getHistory(client: LevisClient): Promise<HistoryEntry[]> {
  return parseHistory((await loadZone(client, ZONE.history)).content);
}

export async function getFines(client: LevisClient): Promise<Fines> {
  return parseFines(zoneHtml(await loadZone(client, ZONE.fines)));
}

export async function getProfile(client: LevisClient): Promise<Profile> {
  return parseProfile(await client.loadAccountPage());
}

/** Met à jour les préférences du compte (succursale par défaut, langue, historique…). */
export async function updatePreferences(client: LevisClient, prefs: Preferences): Promise<Profile> {
  const $ = load(await client.loadAccountPage());
  const form = snapshotForm($, '#preferencesForm');
  form.fields.set('defaultLanguage', prefs.language);
  form.fields.set('defaultTab', prefs.defaultTab);
  if (prefs.pickupLibrary) form.fields.set('pickupLibrary', prefs.pickupLibrary);
  if (prefs.showCheckoutHistory) form.fields.set('showCheckoutHistory', 'on');
  else form.fields.delete('showCheckoutHistory');
  if (form.submit) form.fields.set(form.submit.name, form.submit.value);
  await client.postForm(form.action, form.fields);
  return getProfile(client);
}

export async function getOverview(
  client: LevisClient,
): Promise<{ checkouts: CheckoutsResult; holds: HoldsResult; fines: Fines }> {
  const [checkouts, holds, fines] = await Promise.all([
    getCheckouts(client),
    getHolds(client),
    getFines(client),
  ]);
  return { checkouts, holds, fines };
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}
