'use client';

import { useEffect, useRef, useState, type JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookMarked,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutGrid,
  Receipt,
  UserRound,
} from 'lucide-react';

const TABS = [
  { href: '/compte', label: 'Sommaire', icon: LayoutGrid },
  { href: '/compte/emprunts', label: 'Emprunts', icon: BookOpen },
  { href: '/compte/reservations', label: 'Réservations', icon: BookMarked },
  { href: '/compte/historique', label: 'Historique', icon: History },
  { href: '/compte/amendes', label: 'Amendes', icon: Receipt },
  { href: '/compte/profil', label: 'Profil', icon: UserRound },
] as const;

/**
 * Onglets du dossier. Sur mobile, ils débordent : un dégradé avec flèche signale qu'on peut
 * faire défiler (et défile au toucher), et l'onglet actif est centré à chaque navigation,
 * y compris quand on arrive depuis le menu de l'en-tête.
 */
export function AccountNav(): JSX.Element {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const firstRender = useRef(true);
  const [edges, setEdges] = useState({ start: false, end: false });

  // Dégradés : visibles seulement s'il reste des onglets cachés de ce côté.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = (): void => {
      const max = list.scrollWidth - list.clientWidth;
      setEdges({ start: list.scrollLeft > 4, end: list.scrollLeft < max - 4 });
    };
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.addEventListener('scroll', update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      list.removeEventListener('scroll', update);
    };
  }, []);

  // Centre l'onglet actif (sans animation au premier affichage).
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !active) return;
    const left = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollTo({ left, behavior: firstRender.current ? 'instant' : 'smooth' });
    firstRender.current = false;
  }, [pathname]);

  const scrollBy = (direction: 1 | -1): void => {
    const list = listRef.current;
    if (list) list.scrollBy({ left: direction * list.clientWidth * 0.6, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Sections de mon dossier"
      className="sticky top-14 z-40 -mx-4 border-b border-zinc-200 bg-zinc-50/90 px-4 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:px-2 dark:border-zinc-800 dark:bg-[#0f0f0f]/90"
    >
      <ul ref={listRef} className="scrollbar-hide flex gap-1 overflow-x-auto">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === '/compte' ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-shrink-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'border-[#d4a853] text-zinc-900 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-[#d4a853]' : ''}`} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <EdgeButton
        side="start"
        visible={edges.start}
        onClick={() => {
          scrollBy(-1);
        }}
      />
      <EdgeButton
        side="end"
        visible={edges.end}
        onClick={() => {
          scrollBy(1);
        }}
      />
    </nav>
  );
}

function EdgeButton({
  side,
  visible,
  onClick,
}: {
  side: 'start' | 'end';
  visible: boolean;
  onClick: () => void;
}): JSX.Element {
  const Icon = side === 'start' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-hidden="true"
      className={`absolute inset-y-0 flex w-12 items-center transition-opacity duration-200 ${
        side === 'start'
          ? 'left-0 justify-start bg-gradient-to-r pl-1 sm:rounded-l-xl'
          : 'right-0 justify-end bg-gradient-to-l pr-1 sm:rounded-r-xl'
      } from-zinc-50 via-zinc-50/90 to-transparent dark:from-[#0f0f0f] dark:via-[#0f0f0f]/90 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <Icon className="h-5 w-5 text-[#d4a853]" />
    </button>
  );
}
