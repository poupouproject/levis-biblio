'use client';

import { createContext, use, useRef, useState, type JSX, type ReactNode } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { SearchBox } from '@/components/search/SearchBox';
import { FieldChips } from '@/components/search/FieldChips';
import { parseField } from '@/lib/catalog/query';
import type { SearchField } from '@/lib/catalog/types';

interface FloatingSearchContext {
  /** `field` : le champ choisi par la page qui ouvre le panneau. */
  open: (field?: SearchField) => void;
  draft: string;
  setDraft: (value: string) => void;
}

const Context = createContext<FloatingSearchContext | null>(null);

/** Recherche affichée par la page de résultats, `null` ailleurs. */
export function pageQuery(location: Pick<Location, 'pathname' | 'search'>): string | null {
  if (location.pathname !== '/recherche') return null;
  return new URLSearchParams(location.search).get('q') ?? '';
}

/** Champ de la page de résultats, `null` ailleurs. */
export function pageField(location: Pick<Location, 'pathname' | 'search'>): SearchField | null {
  if (location.pathname !== '/recherche') return null;
  return parseField(new URLSearchParams(location.search).get('champ') ?? '');
}

/**
 * Champ du panneau à son ouverture : celui de la page de résultats (ou donné par la page),
 * sinon celui choisi sur cette même page, sinon « Tout ».
 */
export function openingField(
  location: Pick<Location, 'pathname' | 'search'>,
  chosen: { field: SearchField; page: string | null },
  fromPage?: SearchField,
): SearchField {
  const shown = fromPage ?? pageField(location);
  if (shown !== null) return shown;
  return chosen.page === location.pathname ? chosen.field : 'tout';
}

function useFloatingSearch(): FloatingSearchContext {
  const context = use(Context);
  if (!context) throw new Error('FloatingSearchProvider manquant');
  return context;
}

/**
 * Recherche flottante : panneau en haut de l'écran (élément <dialog> natif), ouvert par la loupe
 * de l'en-tête ou, sur écran tactile, par la barre de l'accueil. Le champ en haut, le clavier
 * mobile ne cache plus les suggestions. La saisie est conservée à la fermeture et partagée avec
 * la barre de l'accueil ; le champ choisi, seulement tant qu'on reste sur la même page.
 */
export function FloatingSearchProvider({
  popular,
  children,
}: {
  popular: string[];
  children: ReactNode;
}): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState('');
  const [field, setField] = useState<SearchField>('tout');
  // Page où le champ a été choisi : ailleurs, le panneau repart de « Tout »
  const fieldPage = useRef<string | null>(null);
  const chooseField = (value: SearchField): void => {
    setField(value);
    fieldPage.current = window.location.pathname;
  };
  const close = (): void => {
    dialog.current?.close();
  };
  const open = (fromPage?: SearchField): void => {
    // Sur la page de résultats, le panneau reprend la recherche affichée plutôt que la dernière
    // saisie du panneau
    const shown = pageQuery(window.location);
    if (shown !== null) setDraft(shown);
    chooseField(openingField(window.location, { field, page: fieldPage.current }, fromPage));
    dialog.current?.showModal();
    // Dans le geste de l'utilisateur : sans quoi le clavier mobile ne s'ouvre pas
    dialog.current?.querySelector('input')?.focus();
  };

  return (
    <Context value={{ open, draft, setDraft }}>
      {children}
      <dialog
        ref={dialog}
        aria-label="Rechercher dans le catalogue"
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        // max-h-none : la liste limite déjà sa hauteur, le <dialog> ne défile pas en plus.
        // Collé en haut sur écran tactile, même large (tablette à l'horizontale, où le clavier
        // laisse peu de hauteur) ; carte décalée vers le bas seulement avec une souris.
        className="m-0 max-h-none w-full max-w-none bg-transparent p-0 text-zinc-900 backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:mx-auto sm:max-w-2xl dark:text-zinc-100 sm:pointer-fine:mt-20"
      >
        <div className="rounded-b-3xl bg-white p-3 shadow-2xl dark:bg-[#1a1a1a] sm:pointer-fine:rounded-3xl">
          <SearchBox
            floating
            popular={popular}
            value={draft}
            onValueChange={setDraft}
            onNavigate={() => {
              close();
              // Recherche lancée : le champ vaut pour elle, pas pour la page qu'on quitte
              fieldPage.current = null;
            }}
            field={field}
            below={
              <div className="mt-2">
                <FieldChips value={field} onChange={chooseField} />
              </div>
            }
            trailing={
              <button
                type="button"
                onClick={close}
                className="h-12 shrink-0 rounded-xl px-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Annuler
              </button>
            }
          />
        </div>
      </dialog>
    </Context>
  );
}

/**
 * Loupe de l'en-tête : un vrai lien vers le catalogue (avant l'hydratation, sans JavaScript,
 * dans un nouvel onglet), qui ouvre le panneau pour un clic simple.
 */
export function HeaderSearchButton(): JSX.Element {
  const { open } = useFloatingSearch();
  return (
    <Link
      href="/recherche"
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open();
      }}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      <Search className="h-4 w-4" aria-hidden />
      <span className="sr-only sm:not-sr-only">Rechercher</span>
    </Link>
  );
}

/** Grande barre de l'accueil : sur écran tactile, elle ouvre la recherche flottante. */
export function HeroSearch({ popular }: { popular: string[] }): JSX.Element {
  const { open, draft, setDraft } = useFloatingSearch();
  return (
    <SearchBox
      size="hero"
      popular={popular}
      value={draft}
      onValueChange={setDraft}
      onTouchFocus={open}
    />
  );
}

/**
 * Barre de la page de résultats : comme celle de l'accueil, elle ouvre la recherche flottante
 * sur écran tactile, avec le champ choisi. Saisie contrôlée : les puces de la page la reprennent.
 */
export function PageSearch({
  value,
  onValueChange,
  popular,
  field,
}: {
  value: string;
  onValueChange: (value: string) => void;
  popular: string[];
  field: SearchField;
}): JSX.Element {
  const { open } = useFloatingSearch();
  return (
    <SearchBox
      value={value}
      onValueChange={onValueChange}
      popular={popular}
      field={field}
      onTouchFocus={() => {
        open(field);
      }}
    />
  );
}
