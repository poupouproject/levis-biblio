import { load } from 'cheerio';
import type { Checkout, CheckoutsSummary } from '@/types';
import {
  cleanText,
  numberAfter,
  parseIntOrNull,
  parsePortalDate,
  textOrNull,
  titleIdFrom,
} from './common';

export const CHECKOUTS_TABLE = '#myCheckouts_checkoutslistnonmobile_table';

export interface ParsedCheckout extends Checkout {
  checkboxName: string | null; // Nom positionnel de la case (« checkbox », « checkbox_0 »…)
}

/** Emprunts en cours, à partir du HTML de la zone `libraryCheckoutsAccordion`. */
export function parseCheckouts(html: string): ParsedCheckout[] {
  const $ = load(html);
  const rows: ParsedCheckout[] = [];
  $(`${CHECKOUTS_TABLE} tbody tr`).each((_, el) => {
    const row = $(el);
    const info = row.find('td.checkoutsBookInfo');
    const link = info.find('a[onclick*="detailclick"]').first();
    const title = cleanText(link.attr('title')) || cleanText(link.text());
    if (!title) return;
    const coverId = row.find('[id^="checkoutInitialCover_"]').attr('id') ?? '';
    rows.push({
      barcode: coverId.replace('checkoutInitialCover_', ''),
      titleId: titleIdFrom(link.attr('onclick')),
      title,
      author: textOrNull(info.find('.checkouts_author').text()),
      callNumber: textOrNull(info.find('.checkouts_callNumber').text()),
      dueDate: parsePortalDate(row.find('td.checkoutsDueDate').text()),
      renewals: parseIntOrNull(row.find('td.checkoutsRenewCount').text()) ?? 0,
      alert: textOrNull(row.find('td.checkoutsAlert').text()),
      checkboxName: row.find('input.checkoutsCheckbox').attr('name') ?? null,
    });
  });
  return rows;
}

export function parseCheckoutsSummary(html: string, fallbackTotal: number): CheckoutsSummary {
  const text = cleanText(load(html).text());
  const total = numberAfter(text, /Total des documents emprunt[ée]s/);
  return {
    total: total || fallbackTotal,
    overdue: numberAfter(text, /Documents en retard/),
  };
}

/** Messages éventuels renvoyés après un renouvellement (erreurs de formulaire, avis). */
export function parseCheckoutMessages(html: string): string[] {
  const $ = load(html);
  const messages = new Set<string>();
  $(
    '.formMessage, .errorSection:not(.hidden), .t-error:not(.t-invisible), .checkoutsActionMessages, .renewMessage',
  ).each((_, el) => {
    const text = cleanText($(el).text());
    if (text) messages.add(text);
  });
  return [...messages];
}
