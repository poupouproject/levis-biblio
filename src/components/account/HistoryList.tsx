'use client';

import { useMemo, useState, type JSX } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import type { HistoryEntry } from '@/types';
import { formatDate, plural } from '@/lib/account/format';
import { LEVIS_ORIGIN, LEVIS_BASE_PATH } from '@/lib/levis/config';

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface HistoryListProps {
  entries: HistoryEntry[];
  today: string;
}

export function HistoryList({ entries, today }: HistoryListProps): JSX.Element {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = q
      ? entries.filter((e) => normalize(`${e.title} ${e.author ?? ''}`).includes(q))
      : entries;
    const byYear = new Map<string, HistoryEntry[]>();
    for (const entry of filtered) {
      const year = entry.checkedOut?.slice(0, 4) ?? 'Date inconnue';
      byYear.set(year, [...(byYear.get(year) ?? []), entry]);
    }
    return { count: filtered.length, years: [...byYear] };
  }, [entries, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Filtrer par titre ou auteur"
          aria-label="Filtrer l’historique"
          className="h-12 w-full rounded-xl border border-zinc-300 bg-white pr-4 pl-10 text-base placeholder:text-zinc-500 focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] focus:outline-none dark:border-zinc-700 dark:bg-[#1a1a1a]"
        />
      </div>
      <p className="text-sm text-zinc-500" aria-live="polite">
        {plural(groups.count, 'document')}
      </p>

      {groups.years.map(([year, items]) => (
        <section key={year} className="flex flex-col gap-2" aria-labelledby={`annee-${year}`}>
          <h2
            id={`annee-${year}`}
            className="text-sm font-semibold tracking-wider text-zinc-500 uppercase"
          >
            {year} <span className="font-normal">({items.length})</span>
          </h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-[#1a1a1a]">
            {items.map((entry, index) => (
              <li
                key={`${entry.title}-${entry.checkedOut ?? ''}-${String(index)}`}
                className="flex items-start justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="line-clamp-2 leading-snug font-medium text-zinc-900 dark:text-zinc-100">
                    {entry.title}
                  </p>
                  {entry.author && (
                    <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {entry.author}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Emprunté le {formatDate(entry.checkedOut, 'short', today)}
                    {entry.returned
                      ? ` · rendu le ${formatDate(entry.returned, 'short', today)}`
                      : ''}
                  </p>
                </div>
                <a
                  href={`${LEVIS_ORIGIN}${LEVIS_BASE_PATH}/search/results?qu=${encodeURIComponent(entry.title)}&te=ILS`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-[#b88f42] dark:hover:bg-zinc-800"
                  aria-label={`Chercher ${entry.title} au catalogue (nouvel onglet)`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
