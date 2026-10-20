import { load } from 'cheerio';
import type { Hold, HoldStatus, HoldsSummary } from '@/types';
import { branchCodeFromName } from '../config';
import {
  cleanText,
  numberAfter,
  parseIntOrNull,
  parsePortalDate,
  textOrNull,
  titleIdFrom,
} from './common';

export const HOLDS_TABLE = '#myHolds_holdslistnonmobile_table';

export function holdStatusFrom(label: string, classes: string): HoldStatus {
  const text = label.toLowerCase();
  if (
    classes.includes('readyHoldsCheckbox') ||
    /retrait|retirer|disponible|prêt|available/.test(text)
  )
    return 'ready';
  if (classes.includes('suspended') || text.includes('suspend')) return 'suspended';
  if (text.includes('transit')) return 'in_transit';
  if (/attente|waiting|actif|active/.test(text)) return 'waiting';
  return 'other';
}

/**
 * Réservations, à partir du HTML de la zone `libraryHoldsAccordion`.
 * Une réservation prête pour le retrait n'a pas de case à cocher (le portail ne permet plus de l'annuler) :
 * sa clé est alors reconstituée à partir du lien de détail et de l'identifiant de la couverture.
 */
export function parseHolds(html: string): Hold[] {
  const $ = load(html);
  const holds: Hold[] = [];
  $(`${HOLDS_TABLE} tbody tr`).each((_, el) => {
    const row = $(el);
    const checkbox = row.find('input[value^="ent:"]').first();
    const info = row.find('td.holdsID');
    const link = info.find('a[onclick*="detailclick"]').first();
    const titleId = titleIdFrom(checkbox.attr('value') ?? link.attr('onclick'));
    const holdId =
      checkbox.attr('value')?.split('|')[1] ??
      /^holdInitialCover_(\d+)$/.exec(row.find('[id^="holdInitialCover_"]').attr('id') ?? '')?.[1];
    if (!titleId || !holdId) return;
    const key = checkbox.attr('value') ?? `ent://SD_ILS/0/SD_ILS:${titleId}|${holdId}`;
    const statusLabel = cleanText(row.find('td.holdsStatus').text());
    const status = holdStatusFrom(statusLabel, checkbox.attr('class') ?? '');
    const pickupLibrary = cleanText(row.find('td.holdsPickup').text());
    // « Retirer avant le : 26-10-27 » : l'échéance de retrait est dans le statut, la colonne de date est vide.
    const dateText =
      cleanText(row.find('td.holdsDate').text()) || (status === 'ready' ? statusLabel : '');
    const date = parsePortalDate(dateText);
    holds.push({
      key,
      holdId,
      titleId,
      title:
        cleanText(link.attr('title')) || cleanText(link.text()) || cleanText(checkbox.attr('alt')),
      author: textOrNull(info.find('.holds_author').text()),
      callNumber: textOrNull(info.find('.holds_callNumber').text()),
      status,
      statusLabel,
      pickupLibrary,
      pickupCode: branchCodeFromName(pickupLibrary),
      date,
      dateLabel: dateText === '' ? null : dateText,
      queuePosition: parseIntOrNull(row.find('td.holdsRank').text()),
      canChangePickup: status !== 'ready',
      canCancel: checkbox.length > 0,
    });
  });
  return holds;
}

export function parseHoldsSummary(html: string, holds: Hold[]): HoldsSummary {
  const text = cleanText(load(html).text());
  return {
    total: numberAfter(text, /Documents r[ée]serv[ée]s/) || holds.length,
    ready:
      numberAfter(text, /Pr[êe]t pour le retrait/) ||
      holds.filter((h) => h.status === 'ready').length,
  };
}

/**
 * Association clé de case → clé d'action, fournie par `new HoldsList(…, {"ent://…|123": "123|null"})`.
 * Les actions (annuler, suspendre…) attendent la valeur de droite.
 */
export function parseHoldActionKeys(scripts: string): Record<string, string> {
  const start = scripts.indexOf('new HoldsList(');
  if (start === -1) return {};
  const open = scripts.indexOf('{', start);
  const close = scripts.indexOf('}', open);
  if (open === -1 || close === -1) return {};
  try {
    const map = JSON.parse(scripts.slice(open, close + 1)) as unknown;
    if (typeof map !== 'object' || map === null) return {};
    return Object.fromEntries(
      Object.entries(map).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

/** URL de l'événement `editpickuplibraries` (changement de lieu de retrait). */
export function parseEditPickupUrl(scripts: string): string | null {
  return /new HoldsList\('[^']*',[^,]*,[^,]*,'[^']*','([^']+)'/.exec(scripts)?.[1] ?? null;
}

/** URL `holditems` fournie par `PlaceHoldDialog.setup(titre, url, …)`. */
export function parseHoldItemsUrl(scripts: string): string | null {
  return /PlaceHoldDialog\.setup\('[^']*','([^']+)'/.exec(scripts)?.[1] ?? null;
}

/** Messages affichés après une action sur les réservations. */
export function parseHoldMessages(html: string): string[] {
  const $ = load(html);
  const messages = new Set<string>();
  $('.holdsActionMessages, .formMessage, .errorSection:not(.hidden)').each((_, el) => {
    const text = cleanText($(el).text());
    if (text) messages.add(text);
  });
  return [...messages];
}
