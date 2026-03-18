import type { JSX, ReactNode } from 'react';
import { Check, Clock, Smartphone, XCircle } from 'lucide-react';
import type { AvailabilityBadge } from '@/types';

interface BadgeProps {
  badge: AvailabilityBadge;
}

export function Badge({ badge }: BadgeProps): JSX.Element {
  // Configuration des styles et icônes selon le type de badge défini dans l'architecture
  const badgeConfig: Record<AvailabilityBadge['type'], { style: string; icon: ReactNode }> = {
    available: {
      style: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
      icon: <Check className="w-3.5 h-3.5 mr-1" />,
    },
    loaned: {
      style: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      icon: <Clock className="w-3.5 h-3.5 mr-1" />,
    },
    digital_available: {
      style: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      icon: <Smartphone className="w-3.5 h-3.5 mr-1" />,
    },
    waitlist: {
      style: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      icon: <Clock className="w-3.5 h-3.5 mr-1" />,
    },
    unavailable: {
      style: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
      icon: <XCircle className="w-3.5 h-3.5 mr-1" />,
    },
  };

  const config = badgeConfig[badge.type];

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.style}`}>
      {config.icon}
      {badge.label}
    </span>
  );
}