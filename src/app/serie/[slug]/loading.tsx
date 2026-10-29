import type { JSX } from 'react';
import { SkeletonScope } from '@/components/ui/Skeleton';

/** Page d'une série en attente du catalogue (coquille statique, servie tout de suite). */
export default function Loading(): JSX.Element {
  return (
    <SkeletonScope label="Chargement de la série…">
      <div className="flex flex-col gap-8 pt-2">
        <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 p-6 sm:p-8 dark:border-zinc-800">
          <p className="text-xs font-bold uppercase">Série</p>
          <p className="text-3xl font-extrabold sm:text-4xl">Nom de la série</p>
          <p>de Nom de l’auteur</p>
          <p className="text-sm">12 tomes au catalogue · 8 disponibles maintenant</p>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} data-skeleton-block="" className="aspect-[2/3] rounded-xl" />
          ))}
        </ul>
      </div>
    </SkeletonScope>
  );
}
