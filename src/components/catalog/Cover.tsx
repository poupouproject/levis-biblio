'use client';

import { useState, type JSX } from 'react';
import Image from 'next/image';

const PALETTES = [
  ['#1e3a5f', '#d4a853'],
  ['#5b2333', '#f0c987'],
  ['#264d3b', '#e9d8a6'],
  ['#3d2c5e', '#f2b5d4'],
  ['#7a3e14', '#fde2b8'],
  ['#14505c', '#b8f2e6'],
  ['#2f2f2f', '#d4a853'],
] as const;

function paletteFor(title: string): (typeof PALETTES)[number] {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length] ?? PALETTES[0];
}

interface CoverProps {
  src: string | null;
  title: string;
  author?: string | null | undefined;
  sizes: string;
  priority?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Couverture au format livre (2:3). Sans image (ou si elle ne se charge pas), une couverture
 * typographique est générée à partir du titre : la grille garde son rythme.
 */
export function Cover({
  src,
  title,
  author,
  sizes,
  priority,
  className = '',
}: CoverProps): JSX.Element {
  const [failed, setFailed] = useState(false);
  const [bg, fg] = paletteFor(title);
  const showImage = src !== null && !failed;

  return (
    <div
      className={`[container-type:inline-size] relative aspect-[2/3] overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${className}`}
      style={showImage ? undefined : { backgroundColor: bg }}
    >
      {showImage ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          priority={priority ?? false}
          className="bg-zinc-100 object-cover dark:bg-zinc-800"
          onError={() => {
            setFailed(true);
          }}
          onLoad={(e) => {
            // Le portail renvoie parfois une image vide plutôt qu'une erreur
            if (e.currentTarget.naturalWidth < 20) setFailed(true);
          }}
        />
      ) : (
        <div
          className="flex h-full flex-col justify-between p-[9%]"
          style={{ color: fg }}
          aria-hidden
        >
          <span className="line-clamp-5 font-serif text-[clamp(0.6rem,11cqw,1.25rem)] leading-tight font-bold">
            {title}
          </span>
          {author && (
            <span className="line-clamp-2 text-[0.6rem] leading-tight opacity-80">{author}</span>
          )}
        </div>
      )}
    </div>
  );
}
