'use client';

import { useState } from 'react';
import type { JSX, SyntheticEvent } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch?: (query: string, category: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Tout' },
  { id: 'fiction', label: 'Romans' },
  { id: 'youth', label: 'Jeunesse' },
  { id: 'comics', label: 'BD & Manga' },
  { id: 'non-fiction', label: 'Non-fiction' },
];

export function SearchBar({ onSearch }: SearchBarProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim(), activeCategory);
    }
  };

  const handleClear = (): void => {
    setQuery('');
    if (onSearch) { onSearch('', activeCategory); }
  };

  return (
    <div className="w-full space-y-3">
      {/* Barre de saisie */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-3 text-zinc-400">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          placeholder="Titre, auteur, série..."
          className="h-12 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-10 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-[#d4a853] focus:outline-none focus:ring-1 focus:ring-[#d4a853] dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Filtres (Chips) avec défilement horizontal sur mobile */}
      <div className="flex overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); }}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-[#d4a853] text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}