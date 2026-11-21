// Libellés de l'état personnel d'une œuvre, sur sa fiche. Sans dépendance serveur.
import type { WorkStatus } from '@/types';
import { formatDate } from './format';

export type WorkStatusTone = 'ok' | 'ready' | 'warning' | 'neutral';

export interface WorkStatusLabel {
  title: string;
  detail: string | null;
  href: string;
  linkLabel: string;
  tone: WorkStatusTone;
}

const CHECKOUTS = { href: '/compte/emprunts', linkLabel: 'Mes emprunts' };
const HOLDS = { href: '/compte/reservations', linkLabel: 'Mes réservations' };

export function workStatusLabel(status: WorkStatus, today?: string): WorkStatusLabel {
  const date = (iso: string | null): string => formatDate(iso, 'long', today);

  if (status.kind === 'checkout') {
    if (status.overdue) {
      return {
        ...CHECKOUTS,
        title: 'Vous l’avez en main, en retard',
        detail: `À rapporter depuis le ${date(status.dueDate)}`,
        tone: 'warning',
      };
    }
    return {
      ...CHECKOUTS,
      title: 'Vous l’avez en main',
      detail: status.dueDate ? `À rapporter d’ici le ${date(status.dueDate)}` : null,
      tone: 'ok',
    };
  }

  if (status.kind === 'hold') {
    const where = status.pickupLibrary || null;
    switch (status.status) {
      case 'ready':
        return {
          ...HOLDS,
          title: 'Votre réservation est prête',
          detail:
            [where && `À récupérer à ${where}`, status.date && `avant le ${date(status.date)}`]
              .filter(Boolean)
              .join(' ') || null,
          tone: 'ready',
        };
      case 'in_transit':
        return {
          ...HOLDS,
          title: 'Votre réservation est en route',
          detail: where ? `Vers ${where}` : null,
          tone: 'ok',
        };
      case 'suspended':
        return {
          ...HOLDS,
          title: 'Votre réservation est suspendue',
          detail: status.date ? `Jusqu’au ${date(status.date)}` : null,
          tone: 'neutral',
        };
      case 'waiting':
      case 'other':
        return {
          ...HOLDS,
          title: 'Vous l’avez réservé',
          detail:
            status.queuePosition !== null
              ? `Rang dans la file d’attente : ${String(status.queuePosition)}`
              : null,
          tone: 'ok',
        };
    }
  }

  const when = status.lastCheckedOut ? date(status.lastCheckedOut) : null;
  return {
    href: '/compte/historique',
    linkLabel: 'Mon historique',
    title: 'Vous l’avez déjà emprunté',
    detail:
      status.count > 1
        ? `${String(status.count)} fois${when ? `, la dernière le ${when}` : ''}`
        : when
          ? `Le ${when}`
          : null,
    tone: 'neutral',
  };
}
