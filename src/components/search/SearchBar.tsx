'use client';

import { useState, type ChangeEvent, type SyntheticEvent } from 'react';

const QUICK_FILTERS = [
  { id: 'romans', label: 'Romans', emoji: '📖' },
  { id: 'jeunesse', label: 'Jeunesse', emoji: '🧒' },
  { id: 'bd-manga', label: 'BD & Manga', emoji: '🎨' },
  { id: 'non-fiction', label: 'Non-fiction', emoji: '📚' },
] as const;

type FilterId = (typeof QUICK_FILTERS)[number]['id'];

interface SearchBarProps {
  onSearch?: (query: string, filters: FilterId[]) => void;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  placeholder = 'Rechercher un livre, un auteur...',
}: SearchBarProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterId[]>([]);

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setQuery(e.target.value);
  };

  const toggleFilter = (filterId: FilterId): void => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  };

  const handleSubmit = (e: SyntheticEvent): void => {
    e.preventDefault();
    onSearch?.(query, activeFilters);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Search input */}
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={handleQueryChange}
            placeholder={placeholder}
            className="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 sm:h-14 sm:text-lg"
            aria-label="Recherche"
          />
        </div>

        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres rapides">
          {QUICK_FILTERS.map((filter) => {
            const isActive = activeFilters.includes(filter.id);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  toggleFilter(filter.id);
                }}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                aria-pressed={isActive}
              >
                <span aria-hidden="true">{filter.emoji}</span>
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </form>
    </div>
  );
}
