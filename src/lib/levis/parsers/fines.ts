import { load } from 'cheerio';
import type { Fines } from '@/types';
import { cleanText, numberAfter, parseMoney } from './common';

/** Amendes, à partir des zones `finesZoneId` / `finesSummaryZone` de `paymentServiceAjax`. */
export function parseFines(finesHtml: string): Fines {
  const $ = load(finesHtml);
  const text = cleanText($.text());
  const amountDueLabel =
    /Montant total à payer\s*:?\s*([\d\s ,.]+\s*\$)/i.exec(text)?.[1]?.trim() ?? '0,00 $';
  const totalPaidLabel =
    /Total pay[ée]\s*:?\s*([\d\s ,.]+\s*\$)/i.exec(text)?.[1]?.trim() ?? '0,00 $';

  const table = $('table[id^="finesTable_"]').first();
  const headers = table
    .find('thead th')
    .map((_, th) => cleanText($(th).text()))
    .get()
    .filter(Boolean);
  const lines = table
    .find('tbody tr')
    .map((_, tr) => ({
      cells: $(tr)
        .find('td')
        .map((__, td) => cleanText($(td).text()))
        .get(),
    }))
    .get()
    .filter((line) => line.cells.some(Boolean));

  return {
    currentCount: numberAfter(text, /Amendes\/blocages en cours/),
    amountDue: parseMoney(amountDueLabel),
    amountDueLabel,
    accruedCount: numberAfter(text, /Amendes \/ Blocages accumul[ée]s/),
    totalPaid: parseMoney(totalPaidLabel),
    totalPaidLabel,
    headers,
    lines,
  };
}
