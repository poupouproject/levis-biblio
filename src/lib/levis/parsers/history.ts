import { load } from 'cheerio';
import type { HistoryEntry } from '@/types';
import { cleanText, parsePortalDate, textOrNull } from './common';

/** Historique des emprunts, à partir du HTML de la zone `checkoutHistoryAjax`. */
export function parseHistory(html: string): HistoryEntry[] {
  const $ = load(html);
  const entries: HistoryEntry[] = [];
  $('#checkoutsHistoryList_table tbody tr').each((_, el) => {
    const cells = $(el).find('td');
    const title = cleanText(cells.eq(0).text());
    if (!title) return;
    entries.push({
      title,
      author: textOrNull(cells.eq(1).text()),
      checkedOut: parsePortalDate(cells.eq(2).text()),
      returned: parsePortalDate(cells.eq(3).text()),
    });
  });
  return entries.sort((a, b) => (b.checkedOut ?? '').localeCompare(a.checkedOut ?? ''));
}
