import type { JSX } from 'react';
import { SkeletonScope } from '@/components/ui/Skeleton';

/** Fiche d'une œuvre en attente du catalogue (coquille statique, servie tout de suite). */
export default function Loading(): JSX.Element {
  return (
    <SkeletonScope label="Chargement de la fiche…">
      <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <div
          data-skeleton-block=""
          className="mx-auto aspect-[2/3] w-44 rounded-xl sm:mx-0 sm:w-full"
        />
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-3xl font-extrabold sm:text-4xl">Titre de l’œuvre</p>
          <p>de Nom de l’auteur</p>
          <p className="text-sm">Publication 2024 · Format Livre · Éditions 2</p>
          <p className="max-w-prose leading-relaxed">
            Résumé de l’œuvre en cours de chargement, sur quelques lignes pour donner sa forme au
            bloc de texte qui suit le titre.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-5 sm:col-span-2 lg:col-span-1 dark:border-zinc-800">
          <p className="font-bold">Disponibilité</p>
          <p className="text-lg font-bold">Disponible dans 3 succursales</p>
          <p className="text-sm">Bibliothèque de la succursale</p>
          <p className="text-sm">Bibliothèque de la succursale</p>
        </div>
      </div>
    </SkeletonScope>
  );
}
