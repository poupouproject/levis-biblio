'use client';

import {
  createContext,
  use,
  useId,
  useOptimistic,
  useRef,
  useTransition,
  type JSX,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import type { FormatGroup } from '@/lib/catalog/normalize';
import type { FacetCount, Period, SearchQuery, SortOrder } from '@/lib/catalog/types';
import { searchHref } from '@/lib/catalog/query';

interface BranchOption {
  code: string;
  name: string;
}

interface SearchContextValue {
  query: SearchQuery;
  update: (patch: Partial<SearchQuery>) => void;
  pending: boolean;
}

const SearchContext = createContext<SearchContextValue | null>(null);

function useSearch(): SearchContextValue {
  const value = use(SearchContext);
  if (!value) throw new Error('Filtres hors de <SearchShell>.');
  return value;
}

/**
 * Enveloppe de la page de résultats : chaque filtre remplace l'URL dans une transition.
 * Les résultats (composants serveur, passés en enfants) s'estompent pendant le chargement
 * au lieu de disparaître.
 */
export function SearchShell({
  query,
  children,
}: {
  query: SearchQuery;
  children: ReactNode;
}): JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Les filtres changent tout de suite à l'écran ; l'URL et les résultats suivent dans la transition
  const [optimistic, setOptimistic] = useOptimistic(query);
  const update = (patch: Partial<SearchQuery>): void => {
    // Un nouveau filtre repart de la première page
    const next = { ...optimistic, limit: 0, ...patch };
    startTransition(() => {
      setOptimistic(next);
      router.replace(searchHref(next), { scroll: false });
    });
  };
  return (
    <SearchContext value={{ query: optimistic, update, pending }}>
      <div data-pending={pending || undefined} className="group/search">
        {children}
      </div>
    </SearchContext>
  );
}

/** Zone qui s'estompe pendant une transition de recherche. */
export function PendingArea({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="transition-opacity duration-200 group-data-pending/search:pointer-events-none group-data-pending/search:opacity-50">
      {children}
    </div>
  );
}

interface FiltersProps {
  formats: FacetCount<FormatGroup>[];
  periods: FacetCount<Period>[];
  branches: BranchOption[];
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-bold tracking-wide text-zinc-500 uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

const optionClass =
  'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 has-[:checked]:font-semibold has-[:checked]:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:has-[:checked]:text-zinc-100';

function FilterPanel({ formats, periods, branches }: FiltersProps): JSX.Element {
  const { query, update } = useSearch();
  const periodGroup = useId(); // Panneau latéral et feuille mobile : deux groupes distincts
  const toggleFormat = (id: FormatGroup): void => {
    const set = new Set(query.formats);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    update({ formats: [...set] });
  };
  return (
    <div className="flex flex-col gap-6">
      <Section title="Type de document">
        {formats.map((f) => (
          <label key={f.id} className={optionClass}>
            <span className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={query.formats.includes(f.id)}
                onChange={() => {
                  toggleFormat(f.id);
                }}
                className="h-4 w-4 rounded accent-[#d4a853]"
              />
              {f.label}
            </span>
            <span className="text-xs text-zinc-400 tabular-nums">
              {f.count.toLocaleString('fr-CA')}
            </span>
          </label>
        ))}
      </Section>

      <Section title="Année de publication">
        {[{ id: null, label: 'Toutes', count: null }, ...periods].map((p) => (
          <label key={p.id ?? 'all'} className={optionClass}>
            <span className="flex items-center gap-2.5">
              <input
                type="radio"
                name={periodGroup}
                checked={query.period === p.id}
                onChange={() => {
                  update({ period: p.id });
                }}
                className="h-4 w-4 accent-[#d4a853]"
              />
              {p.label}
            </span>
            {p.count !== null && (
              <span className="text-xs text-zinc-400 tabular-nums">
                {p.count.toLocaleString('fr-CA')}
              </span>
            )}
          </label>
        ))}
      </Section>

      <Section title="Disponibilité">
        <label className={optionClass}>
          <span className="flex items-center gap-2.5">
            <input
              type="checkbox"
              role="switch"
              checked={query.available}
              onChange={(e) => {
                update({ available: e.target.checked });
              }}
              className="h-4 w-4 rounded accent-[#d4a853]"
            />
            Disponible maintenant
          </span>
        </label>
        <select
          value={query.branch ?? ''}
          onChange={(e) => {
            update({ branch: e.target.value || null });
          }}
          aria-label="Succursale"
          className="mt-1 h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-800 focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] focus:outline-none dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-zinc-200"
        >
          <option value="">Toutes les succursales</option>
          {branches.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
        <p className="px-1 text-xs text-zinc-500">Disponibilités simulées (démo).</p>
      </Section>
    </div>
  );
}

/** Panneau latéral sur grand écran. */
export function FilterSidebar(props: FiltersProps): JSX.Element {
  return (
    <aside aria-label="Filtres" className="hidden lg:block">
      <div className="sticky top-20">
        <FilterPanel {...props} />
      </div>
    </aside>
  );
}

/** Bouton « Filtres » et feuille du bas sur mobile (élément <dialog> natif). */
export function FilterSheet(props: FiltersProps): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const { query } = useSearch();
  const count =
    query.formats.length +
    (query.period ? 1 : 0) +
    (query.available ? 1 : 0) +
    (query.branch ? 1 : 0);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-300 bg-white px-3.5 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-zinc-200"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Filtres
        {count > 0 && (
          <span className="rounded-full bg-[#d4a853] px-1.5 text-xs text-white tabular-nums">
            {count}
          </span>
        )}
      </button>
      <dialog
        ref={dialog}
        aria-label="Filtres"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
        className="m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-3xl bg-white p-0 text-zinc-900 backdrop:bg-black/40 dark:bg-[#1a1a1a] dark:text-zinc-100"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-inherit px-5 py-3 dark:border-zinc-800">
          <h2 className="text-base font-bold">Filtres</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Fermer"
            className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="px-5 pt-4 pb-8">
          <FilterPanel {...props} />
        </div>
      </dialog>
    </div>
  );
}

const SORTS: { id: SortOrder; label: string }[] = [
  { id: 'pertinence', label: 'Pertinence' },
  { id: 'recent', label: 'Plus récents' },
  { id: 'titre', label: 'Titre (A à Z)' },
];

export function SortSelect(): JSX.Element {
  const { query, update } = useSearch();
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="hidden sm:inline">Trier par</span>
      <select
        value={query.sort}
        onChange={(e) => {
          update({ sort: e.target.value as SortOrder });
        }}
        className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm font-medium text-zinc-800 focus:border-[#d4a853] focus:outline-none dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-zinc-200"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Pastilles des filtres actifs, chacune retirable. */
export function ActiveFilters({
  labels,
}: {
  labels: {
    formats: Record<string, string>;
    periods: Record<string, string>;
    branches: Record<string, string>;
  };
}): JSX.Element | null {
  const { query, update } = useSearch();
  const pills: { key: string; label: string; remove: () => void }[] = [
    ...(query.author
      ? [
          {
            key: 'a',
            label: `Auteur : ${query.author}`,
            remove: () => {
              update({ author: null });
            },
          },
        ]
      : []),
    ...query.formats.map((f) => ({
      key: `f-${f}`,
      label: labels.formats[f] ?? f,
      remove: () => {
        update({ formats: query.formats.filter((x) => x !== f) });
      },
    })),
    ...(query.period
      ? [
          {
            key: 'p',
            label: labels.periods[query.period] ?? query.period,
            remove: () => {
              update({ period: null });
            },
          },
        ]
      : []),
    ...(query.available
      ? [
          {
            key: 'd',
            label: 'Disponible maintenant',
            remove: () => {
              update({ available: false });
            },
          },
        ]
      : []),
    ...(query.branch
      ? [
          {
            key: 'b',
            label: labels.branches[query.branch] ?? query.branch,
            remove: () => {
              update({ branch: null });
            },
          },
        ]
      : []),
  ];
  if (pills.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={p.remove}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#d4a853]/15 px-3 py-1 text-sm font-medium text-[#8a6a2c] hover:bg-[#d4a853]/25 dark:text-[#e2c07a]"
        >
          {p.label}
          <X className="h-3.5 w-3.5" aria-label="Retirer" />
        </button>
      ))}
      {pills.length > 1 && (
        <button
          type="button"
          onClick={() => {
            update({ author: null, formats: [], period: null, available: false, branch: null });
          }}
          className="text-sm font-medium text-zinc-500 underline-offset-2 hover:underline"
        >
          Tout effacer
        </button>
      )}
    </div>
  );
}
