import type { JSX } from 'react';
import { simulateAvailability } from '@/lib/catalog/availability';
import { formatDate } from '@/lib/account/format';

/** Pastille de disponibilité (simulée, voir src/lib/catalog/availability.ts). */
export function AvailabilityChip({
  workId,
  compact,
}: {
  workId: string;
  compact?: boolean | undefined;
}): JSX.Element {
  const a = simulateAvailability(workId);
  if (a.available > 0) {
    const where = a.branches.filter((b) => b.available > 0).length;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        {compact ? 'Disponible' : `Disponible · ${String(where)} succursale${where > 1 ? 's' : ''}`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
      {compact || !a.nextReturn ? 'Prêté' : `Retour vers le ${formatDate(a.nextReturn, 'short')}`}
    </span>
  );
}
