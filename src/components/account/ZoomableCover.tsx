'use client';

import { useState, type JSX } from 'react';
import Image from 'next/image';
import { Maximize2 } from 'lucide-react';
import { CoverThumb, type CoverSize } from './CoverThumb';
import { Dialog } from './Dialog';

interface ZoomableCoverProps {
  src: string | null;
  title: string;
  size?: CoverSize;
}

/** Vignette qui s'ouvre en grand au toucher. Sans couverture, simple vignette. */
export function ZoomableCover({ src, title, size = 'md' }: ZoomableCoverProps): JSX.Element {
  const [open, setOpen] = useState(false);
  if (!src) return <CoverThumb src={null} title={title} size={size} />;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="group relative flex-shrink-0 self-start rounded-md focus:ring-2 focus:ring-[#d4a853] focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-[#1a1a1a]"
        aria-label={`Agrandir la couverture de ${title}`}
      >
        <CoverThumb src={src} title={title} size={size} />
        {size !== 'sm' && (
          <span className="absolute right-1 bottom-1 rounded bg-black/55 p-1 text-white opacity-80 transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-3 w-3" aria-hidden />
          </span>
        )}
      </button>
      <Dialog
        open={open}
        title={title}
        onClose={() => {
          setOpen(false);
        }}
      >
        {/* Dimensions indicatives : `h-auto` laisse l'image prendre son vrai format (BD, romans…). */}
        <Image
          src={src}
          alt={`Couverture de ${title}`}
          width={600}
          height={900}
          sizes="(max-width: 640px) 90vw, 420px"
          className="mx-auto h-auto max-h-[70vh] w-full rounded-lg object-contain"
        />
      </Dialog>
    </>
  );
}
