import type { JSX } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';

export type CoverSize = 'sm' | 'md';

const WIDTHS: Record<CoverSize, string> = {
  sm: 'w-10',
  md: 'w-20 sm:w-24',
};

interface CoverThumbProps {
  src: string | null;
  title: string;
  size?: CoverSize;
}

/**
 * Vignette au format livre (2:3). La couverture est affichée entière (`object-contain`),
 * jamais rognée ; `self-start` empêche une rangée flexible de l'étirer en hauteur.
 */
export function CoverThumb({ src, title, size = 'md' }: CoverThumbProps): JSX.Element {
  return (
    <div
      data-skeleton-block=""
      className={`relative ${WIDTHS[size]} aspect-[2/3] flex-shrink-0 self-start overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700`}
    >
      {src ? (
        <Image
          src={src}
          alt={`Couverture de ${title}`}
          fill
          sizes={size === 'sm' ? '40px' : '96px'}
          className="object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
          <BookOpen className={size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'} aria-hidden />
        </div>
      )}
    </div>
  );
}
