import type { JSX } from 'react';
import { SkeletonScope } from '@/components/ui/Skeleton';

/** Premier chargement de la recherche (le catalogue se charge en mémoire au démarrage). */
export default function Loading(): JSX.Element {
  return (
    <SkeletonScope label="Recherche en cours…">
      <div className="flex flex-col gap-5">
        <div className="h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800" />
        <p className="text-3xl font-extrabold">Résultats de recherche</p>
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <li
              key={i}
              className="flex gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div data-skeleton-block="" className="aspect-[2/3] w-20 rounded-lg" />
              <div className="flex flex-col gap-2">
                <p className="font-bold">Titre de l’œuvre recherchée</p>
                <p className="text-sm">Auteur · 2024</p>
                <p className="text-xs">Disponible · 2 succursales</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SkeletonScope>
  );
}
