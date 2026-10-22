import type { ActionItemResult } from '@/types';

export interface Noun {
  one: string;
  many: string;
  feminine: boolean;
}

export const DOCUMENT: Noun = { one: 'document', many: 'documents', feminine: false };
export const RESERVATION: Noun = { one: 'réservation', many: 'réservations', feminine: true };
export const PICKUP: Noun = { one: 'lieu de retrait', many: 'lieux de retrait', feminine: false };

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Message global et titres des notifications d'un résultat d'action. */
export function describe(
  items: ActionItemResult[],
  verb: string,
  noun: Noun = DOCUMENT,
): { message: string; parts: { ok: string | null; refused: string | null } } {
  return { message: summarize(items, verb, noun), parts: summaryParts(items, verb, noun) };
}

/**
 * Titres des deux notifications d'un résultat : succès (« 2 documents renouvelés ») et refus
 * (« 1 document refusé »). `null` quand il n'y a rien à annoncer de ce côté.
 */
export function summaryParts(
  items: ActionItemResult[],
  verb: string,
  noun: Noun = DOCUMENT,
): { ok: string | null; refused: string | null } {
  const agree = (word: string, count: number): string =>
    `${word}${noun.feminine ? 'e' : ''}${count > 1 ? 's' : ''}`;
  const part = (count: number, word: string): string | null =>
    count === 0
      ? null
      : `${count === 1 ? capitalize(noun.one) : `${String(count)} ${noun.many}`} ${agree(word, count)}`;
  const ok = items.filter((i) => i.ok).length;
  return {
    ok: part(ok, verb),
    refused: part(items.length - ok, verb === 'renouvelé' ? 'non renouvelé' : 'refusé'),
  };
}

/**
 * Résumé du bandeau d'une action : « Document renouvelé. », « 2 réservations annulées. »,
 * « 1 document sur 2 renouvelé, 1 refusé. » (le détail des refus suit dans le bandeau).
 */
export function summarize(items: ActionItemResult[], verb: string, noun: Noun = DOCUMENT): string {
  const agree = (word: string, count: number): string =>
    `${word}${noun.feminine ? 'e' : ''}${count > 1 ? 's' : ''}`;
  const total = items.length;
  const ok = items.filter((i) => i.ok).length;
  if (ok === total)
    return total === 1
      ? `${capitalize(noun.one)} ${agree(verb, 1)}.`
      : `${String(ok)} ${noun.many} ${agree(verb, ok)}.`;
  if (ok === 0)
    return total === 1
      ? (items[0]?.message ?? 'Action refusée.')
      : `${noun.feminine ? 'Aucune' : 'Aucun'} ${noun.one} n’a pu être ${agree('traité', 1)}.`;
  const refused = total - ok;
  return `${String(ok)} ${ok > 1 ? noun.many : noun.one} sur ${String(total)} ${agree(verb, ok)}, ${String(refused)} ${agree('refusé', refused)}.`;
}
