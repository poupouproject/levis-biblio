'use client';

import { useEffect, useId, useRef, useState, type JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookMarked,
  BookOpen,
  ChevronDown,
  LayoutGrid,
  LogOut,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { SessionStatus } from '@/types';

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/compte', label: 'Mon dossier', icon: LayoutGrid },
  { href: '/compte/emprunts', label: 'Mes emprunts', icon: BookOpen },
  { href: '/compte/reservations', label: 'Mes réservations', icon: BookMarked },
  { href: '/compte/profil', label: 'Profil', icon: UserRound },
];

const TRIGGER =
  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

/** Lien vers le dossier, sans session connue (aussi dans la coquille statique). */
export function AccountLink(): JSX.Element {
  return (
    <Link href="/compte" className={TRIGGER}>
      <UserRound className="h-4 w-4" aria-hidden />
      Mon dossier
    </Link>
  );
}

/**
 * Menu de compte de l'en-tête. Connecté : initiale et prénom, avec les liens du dossier
 * et la déconnexion. Sinon : simple lien vers la connexion.
 * L'état est relu à chaque changement de page (connexion, déconnexion, expiration).
 */
export function AccountMenu(): JSX.Element {
  const pathname = usePathname();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    const controller = new AbortController();
    fetch('/compte/session', { cache: 'no-store', signal: controller.signal })
      .then((res) => res.json() as Promise<SessionStatus>)
      .then((status) => {
        setFirstName(status.firstName);
      })
      .catch(() => {
        // Requête annulée ou hors ligne : on garde l'état connu.
      });
    return () => {
      controller.abort();
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (firstName === null) return <AccountLink />;

  const name = firstName || 'Mon compte';
  const close = (): void => {
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-controls={menuId}
        className={TRIGGER}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d4a853] text-xs font-bold text-white"
          aria-hidden
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[8rem] truncate">{name}</span>
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
        <span className="sr-only">, menu du compte</span>
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute top-full right-0 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-[#1a1a1a]"
        >
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Connecté en tant que</p>
            <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{name}</p>
          </div>
          <nav aria-label="Mon compte" className="py-1">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
                    active
                      ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? 'text-[#d4a853]' : 'text-zinc-400'}`}
                    aria-hidden
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
          {/* Envoi classique vers /compte/deconnexion : voir la route pour la raison. */}
          <form
            action="/compte/deconnexion"
            method="post"
            className="border-t border-zinc-100 py-1 dark:border-zinc-800"
          >
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
