'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookMarked, BookOpen, History, LayoutGrid, Receipt, UserRound } from 'lucide-react';

const TABS = [
  { href: '/compte', label: 'Sommaire', icon: LayoutGrid },
  { href: '/compte/emprunts', label: 'Emprunts', icon: BookOpen },
  { href: '/compte/reservations', label: 'Réservations', icon: BookMarked },
  { href: '/compte/historique', label: 'Historique', icon: History },
  { href: '/compte/amendes', label: 'Amendes', icon: Receipt },
  { href: '/compte/profil', label: 'Profil', icon: UserRound },
] as const;

export function AccountNav(): JSX.Element {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sections de mon dossier"
      className="sticky top-14 z-40 -mx-4 border-b border-zinc-200 bg-zinc-50/90 px-4 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:px-2 dark:border-zinc-800 dark:bg-[#0f0f0f]/90"
    >
      <ul className="scrollbar-hide flex gap-1 overflow-x-auto">
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
    </nav>
  );
}
