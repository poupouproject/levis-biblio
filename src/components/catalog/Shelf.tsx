'use client';

import { useCallback, useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ShelfProps {
  title: string;
  subtitle?: string | undefined;
  href?: string | undefined;
  /** Largeur d'un élément (classe Tailwind). */
  itemWidth?: string;
  children: ReactNode[];
}

/**
 * Étagère horizontale : défilement au doigt avec aimantation sur mobile, flèches sur ordinateur.
 * Les cartes restent des composants serveur, passées en enfants.
 */
export function Shelf({
  title,
  subtitle,
  href,
  itemWidth = 'w-32 sm:w-36 lg:w-40',
  children,
}: ShelfProps): JSX.Element {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [update]);

  const scroll = (direction: 1 | -1): void => {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-100">
            {title}
          </h2>
          {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {href && (
            <Link
              href={href}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-[#8a6a2c] hover:bg-[#d4a853]/10 dark:text-[#e2c07a]"
            >
              Tout voir
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              scroll(-1);
            }}
            disabled={edges.start}
            aria-label={`Défiler ${title} vers la gauche`}
            className="hidden rounded-full border border-zinc-200 p-1.5 text-zinc-600 transition-opacity hover:bg-zinc-100 disabled:opacity-30 sm:block dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              scroll(1);
            }}
            disabled={edges.end}
            aria-label={`Défiler ${title} vers la droite`}
            className="hidden rounded-full border border-zinc-200 p-1.5 text-zinc-600 transition-opacity hover:bg-zinc-100 disabled:opacity-30 sm:block dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <ul
        ref={track}
        onScroll={update}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pt-1 pb-2 sm:mx-0 sm:px-0"
      >
        {children.map((child, i) => (
          <li key={i} className={`flex-shrink-0 snap-start ${itemWidth}`}>
            {child}
          </li>
        ))}
      </ul>
    </section>
  );
}
