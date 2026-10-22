// Formatage d'affichage, sans dépendance serveur (utilisable dans les composants clients).

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date du jour à Lévis, au format ISO `AAAA-MM-JJ`. */
export function todayIso(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}

/** Nombre de jours entre aujourd'hui et une date ISO (négatif si dépassée). */
export function daysUntil(iso: string, today = todayIso()): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

export type DueTone = 'overdue' | 'soon' | 'ok';

export function dueTone(iso: string | null, today = todayIso()): DueTone {
  if (!iso) return 'ok';
  const days = daysUntil(iso, today);
  if (days < 0) return 'overdue';
  if (days <= 3) return 'soon';
  return 'ok';
}

/** « Aujourd'hui », « Demain », « Dans 5 jours », « En retard de 2 jours »… */
export function relativeDue(iso: string, today = todayIso()): string {
  const days = daysUntil(iso, today);
  if (days < -1) return `En retard de ${String(-days)} jours`;
  if (days === -1) return 'En retard d’un jour';
  if (days === 0) return 'À rendre aujourd’hui';
  if (days === 1) return 'À rendre demain';
  return `Dans ${String(days)} jours`;
}

/** « 25 octobre 2026 » ; l'année est omise si c'est l'année courante (`short`). */
export function formatDate(
  iso: string | null,
  style: 'long' | 'short' = 'long',
  today = todayIso(),
): string {
  if (!iso) return '';
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString('fr-CA', {
    timeZone: 'UTC',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    ...(style === 'long' || !sameYear ? { year: 'numeric' } : {}),
  });
}

/**
 * Refus de renouvellement. Le portail n'en donne pas le motif ; en pratique, c'est presque
 * toujours une réservation d'un autre usager (sinon, la limite de renouvellements).
 */
export function renewalRefusedMessage(dueDate: string | null): string {
  const due = dueDate ? ` À rapporter d’ici le ${formatDate(dueDate)}.` : '';
  return `Non renouvelé : un autre usager l’a réservé (ou la limite de renouvellements est atteinte).${due}`;
}

/** Ajoute des jours à une date ISO. */
export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${String(count)} ${count > 1 ? pluralForm : singular}`;
}
