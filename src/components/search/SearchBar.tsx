'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';

const QUICK_FILTERS = ['Tout', 'Romans', 'Jeunesse', 'BD & Manga', 'Non-fiction'] as const;

type QuickFilter = (typeof QUICK_FILTERS)[number];

interface SearchBarProps {
  readonly onSearch?: (query: string) => void;
  readonly onFilterChange?: (filter: QuickFilter) => void;
}

export function SearchBar({ onSearch, onFilterChange }: SearchBarProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('Tout');

  function handleInputChange(e: ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    setQuery(value);
    onSearch?.(value);
  }

  function handleFilterClick(filter: QuickFilter): void {
    setActiveFilter(filter);
    onFilterChange?.(filter);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="bg-surface border-border flex items-center gap-2.5 rounded-[14px] border-[1.5px] px-4 py-3.5 transition-colors focus-within:border-primary">
        <span className="text-muted text-[17px]" aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          value={query}
          onChange={handleInputChange}
          placeholder="Titre, auteur, ISBN…"
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted"
          aria-label="Rechercher un livre par titre, auteur ou ISBN"
        />
      </div>

      {/* Quick filter chips */}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 scrollbar-none"
        role="group"
        aria-label="Filtres rapides"
      >
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => {
              handleFilterClick(filter);
            }}
            className={`min-h-[36px] shrink-0 cursor-pointer whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              activeFilter === filter
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-surface text-muted hover:border-primary/50'
            }`}
            aria-pressed={activeFilter === filter}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}
