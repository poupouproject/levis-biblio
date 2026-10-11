import type { JSX } from 'react';

export default function AccountLoading(): JSX.Element {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Chargement de votre dossier">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#1a1a1a]"
        >
          <div className="aspect-[2/3] w-14 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex flex-grow flex-col gap-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-5 w-32 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
      <p className="text-center text-sm text-zinc-500">Communication avec la bibliothèque…</p>
    </div>
  );
}
