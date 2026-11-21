import type { HistoryEntry, WorkStatus } from '@/types';
import type { AccountLoans } from '@/lib/levis/account';
import { groupKey } from '@/lib/catalog/engine';
import { parseAuthor, parseTitle } from '@/lib/catalog/normalize';
import type { CatalogWork } from '@/lib/catalog/types';
import { isCancelledHold } from './recap';

/** Ce qui identifie une œuvre : ses éditions (ID exacts) et ses clés de regroupement. */
export interface WorkIdentity {
  titleIds: Set<string>;
  /** Clés de `groupKey` : même tome (ou même titre) et même auteur. */
  keys: Set<string>;
  /** Tomes sans auteur : un document sans auteur au même tome correspond aussi. */
  tomes: Set<string>;
}

export function workIdentity(work: Pick<CatalogWork, 'id' | 'authors' | 'editions'>): WorkIdentity {
  const authorKey = parseAuthor(work.authors[0])?.key ?? null;
  const identity: WorkIdentity = {
    titleIds: new Set([work.id]),
    keys: new Set(),
    tomes: new Set(),
  };
  for (const edition of work.editions) {
    identity.titleIds.add(edition.titleId);
    const { key, tome } = groupKey(parseTitle(edition.title), authorKey);
    identity.keys.add(key);
    if (tome) identity.tomes.add(tome);
  }
  return identity;
}

/**
 * L'historique du portail n'a pas toujours l'ID du titre : à défaut, le titre et l'auteur, comparés
 * comme le catalogue regroupe ses éditions (une autre édition du même tome compte aussi).
 */
function inHistory(entry: HistoryEntry, identity: WorkIdentity): boolean {
  if (entry.titleId) return identity.titleIds.has(entry.titleId);
  const authorKey = parseAuthor(entry.author)?.key ?? null;
  const { key, tome } = groupKey(parseTitle(entry.title), authorKey);
  if (identity.keys.has(key)) return true;
  return authorKey === null && tome !== null && identity.tomes.has(tome);
}

/** État personnel d'une œuvre : en main, sinon réservée, sinon déjà empruntée (ou `null`). */
export function workStatus(
  loans: AccountLoans,
  identity: WorkIdentity,
  today: string,
): WorkStatus | null {
  const has = (titleId: string | null): boolean =>
    titleId !== null && identity.titleIds.has(titleId);

  const checkout = loans.checkouts.find((c) => has(c.titleId));
  if (checkout) {
    return {
      kind: 'checkout',
      dueDate: checkout.dueDate,
      overdue: checkout.dueDate !== null && checkout.dueDate < today,
    };
  }

  // Les réservations sont déjà triées : prête, en transit, en attente, suspendue
  const hold = loans.holds.find((h) => has(h.titleId));
  if (hold) {
    return {
      kind: 'hold',
      status: hold.status,
      queuePosition: hold.queuePosition,
      pickupLibrary: hold.pickupLibrary,
      date: hold.date,
    };
  }

  const past = loans.history.filter((e) => !isCancelledHold(e) && inHistory(e, identity));
  if (past.length === 0) return null;
  const last = past.reduce<string | null>(
    (latest, e) => (e.checkedOut && (!latest || e.checkedOut > latest) ? e.checkedOut : latest),
    null,
  );
  return { kind: 'history', lastCheckedOut: last, count: past.length };
}
