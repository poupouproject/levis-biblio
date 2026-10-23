'use client';

import { createContext, use, useRef, useState, type JSX, type ReactNode } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { SearchBox } from '@/components/search/SearchBox';

interface FloatingSearchContext {
  open: () => void;
  draft: string;
  setDraft: (value: string) => void;
}

const Context = createContext<FloatingSearchContext | null>(null);

/** Recherche affichée par la page de résultats, `null` ailleurs. */
export function pageQuery(location: Pick<Location, 'pathname' | 'search'>): string | null {
  if (location.pathname !== '/recherche') return null;
  return new URLSearchParams(location.search).get('q') ?? '';
}

function useFloatingSearch(): FloatingSearchContext {
  const context = use(Context);
  if (!context) throw new Error('FloatingSearchProvider manquant');
  return context;
}

/**
 * Recherche flottante : panneau en haut de l'écran (élément <dialog> natif), ouvert par la loupe
 * de l'en-tête ou, sur écran tactile, par la barre de l'accueil. Le champ en haut, le clavier
 * mobile ne cache plus les suggestions. La saisie est conservée à la fermeture et partagée
 * avec la barre de l'accueil.
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
  const close = (): void => {
    dialog.current?.close();
  };
  const open = (): void => {
    // Sur la page de résultats, le panneau reprend la recherche affichée plutôt que la dernière
    // saisie du panneau
    const shown = pageQuery(window.location);
    if (shown !== null) setDraft(shown);
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
        // max-h-none : la liste limite déjà sa hauteur, le <dialog> ne défile pas en plus
        className="m-0 max-h-none w-full max-w-none bg-transparent p-0 text-zinc-900 backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:mx-auto sm:mt-20 sm:max-w-2xl dark:text-zinc-100"
      >
        <div className="rounded-b-3xl bg-white p-3 shadow-2xl sm:rounded-3xl dark:bg-[#1a1a1a]">
          <SearchBox
            floating
            popular={popular}
            value={draft}
            onValueChange={setDraft}
            onNavigate={close}
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
