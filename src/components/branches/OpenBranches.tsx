'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BRANCHES, openStatus } from '@/lib/levis/branches';
import { useMinute } from '@/hooks/useMinute';

/** Succursales triées : ouvertes d'abord. L'heure est lue dans le navigateur (page statique). */
export function OpenBranches({ limit = 5 }: { limit?: number }): JSX.Element {
  const minute = useMinute();
  const now = minute === null ? null : new Date(minute * 60_000);
  const rows = BRANCHES.map((b) => ({ branch: b, status: now ? openStatus(b, now) : null }))
    .sort(
      (a, b) =>
        Number(b.status?.open ?? false) - Number(a.status?.open ?? false) ||
        a.branch.title.localeCompare(b.branch.title, 'fr'),
    )
    .slice(0, limit);
  const openCount = now ? BRANCHES.filter((b) => openStatus(b, now).open).length : null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
        {openCount === null
          ? '10 succursales'
          : openCount > 0
            ? `${String(openCount)} succursale${openCount > 1 ? 's' : ''} ouverte${openCount > 1 ? 's' : ''} en ce moment`
            : 'Toutes les succursales sont fermées en ce moment'}
      </p>
      <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
        {rows.map(({ branch, status }) => (
          <li key={branch.code}>
            <Link
              href={`/bibliotheques#${branch.code}`}
              className="group flex items-center gap-3 py-2.5"
            >
              <span
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${status === null ? 'bg-zinc-300 dark:bg-zinc-700' : status.open ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900 group-hover:text-[#8a6a2c] dark:text-zinc-100 dark:group-hover:text-[#e2c07a]">
                  {branch.title.replace('Bibliothèque ', '')}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {status?.label ?? branch.sector}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
