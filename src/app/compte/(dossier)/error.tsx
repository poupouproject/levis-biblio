'use client';

import type { JSX } from 'react';
import { AlertTriangle, ExternalLink, RotateCw } from 'lucide-react';
import { LEVIS_PORTAL_ACCOUNT_URL } from '@/lib/levis/config';

export default function AccountError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center dark:border-zinc-800 dark:bg-[#1a1a1a]">
      <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden />
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Le portail des bibliothèques ne répond pas
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Il est peut-être en maintenance. Réessayez dans un instant ou consultez directement le
          portail officiel.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4a853] px-4 py-2.5 font-semibold text-white hover:bg-[#b88f42]"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
          Réessayer
        </button>
        <a
          href={LEVIS_PORTAL_ACCOUNT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Portail officiel
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}
