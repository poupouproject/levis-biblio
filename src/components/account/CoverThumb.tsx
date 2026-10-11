import type { JSX } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';

interface CoverThumbProps {
  src: string | null;
  title: string;
  size?: 'sm' | 'md';
}

export function CoverThumb({ src, title, size = 'md' }: CoverThumbProps): JSX.Element {
  const width = size === 'sm' ? 'w-10' : 'w-14 sm:w-16';
  return (
    <div
      className={`relative ${width} aspect-[2/3] flex-shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800`}
    >
      {src ? (
        <Image
          src={src}
          alt={`Couverture de ${title}`}
          fill
          sizes="64px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
          <BookOpen className="h-5 w-5" aria-hidden />
        </div>
      )}
    </div>
  );
}
