import type { JSX } from 'react';
import { AlertTriangle, CalendarClock, CalendarCheck } from 'lucide-react';
import { dueTone, formatDate, relativeDue } from '@/lib/account/format';

const STYLES = {
  overdue:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  soon: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  ok: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
} as const;

export function DueBadge({
  dueDate,
  today,
}: {
  dueDate: string | null;
  today: string;
}): JSX.Element | null {
  if (!dueDate) return null;
  const tone = dueTone(dueDate, today);
  const Icon = tone === 'overdue' ? AlertTriangle : tone === 'soon' ? CalendarClock : CalendarCheck;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[tone]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>
        {relativeDue(dueDate, today)}
        <span className="opacity-70"> · {formatDate(dueDate, 'short', today)}</span>
      </span>
    </span>
  );
}
