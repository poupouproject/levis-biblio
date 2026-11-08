'use client';

import type { JSX } from 'react';
import { FIELD_INFO, SEARCH_FIELDS } from '@/lib/catalog/query';
import type { SearchField } from '@/lib/catalog/types';

/**
 * Où chercher : puces « Tout · Titre · Auteur · Série · ISBN », comme les onglets de portée des
 * catalogues de bibliothèque. Un clic ne retire pas le focus du champ : la liste de suggestions
 * du panneau flottant reste ouverte et le clavier mobile ne se referme pas.
 */
export function FieldChips({
  value,
  onChange,
}: {
  value: SearchField;
  onChange: (field: SearchField) => void;
}): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Chercher dans"
      className="-mx-1 flex [scrollbar-width:none] items-center gap-1.5 overflow-x-auto px-1 py-0.5"
    >
      <span className="shrink-0 text-xs font-semibold text-zinc-500" aria-hidden>
        Chercher dans :
      </span>
      {SEARCH_FIELDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            onChange(id);
          }}
          className="h-8 shrink-0 rounded-full border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:border-[#d4a853] aria-pressed:border-[#d4a853] aria-pressed:bg-[#d4a853]/15 aria-pressed:font-semibold aria-pressed:text-[#8a6a2c] dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-zinc-300 dark:aria-pressed:text-[#e2c07a]"
        >
          {FIELD_INFO[id].label}
        </button>
      ))}
    </div>
  );
}
