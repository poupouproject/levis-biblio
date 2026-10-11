import type { JSX, ReactNode } from 'react';

interface SkeletonScopeProps {
  children: ReactNode;
  /** `false` affiche le composant normalement : on peut garder le même arbre et basculer. */
  loading?: boolean;
  /** Annoncé aux lecteurs d'écran. À omettre pour les petits éléments répétés (vignettes…). */
  label?: string;
}

/**
 * Transforme n'importe quel composant en squelette de chargement, sans gabarit dédié :
 * le texte devient des barres animées, les icônes, champs et images des blocs
 * (règles `[data-skeleton]` dans globals.css).
 *
 * - `data-skeleton-ignore` sur un élément le garde visible (ex. un titre déjà connu).
 * - `data-skeleton-block` sur un élément en fait un seul bloc plein (ex. une vignette).
 *
 * Le contenu est inerte (ni clic ni focus) et masqué aux technologies d'assistance.
 */
export function SkeletonScope({
  children,
  loading = true,
  label,
}: SkeletonScopeProps): JSX.Element {
  if (!loading) return <>{children}</>;
  return (
    <>
      {label && (
        <span role="status" className="sr-only">
          {label}
        </span>
      )}
      <div data-skeleton="" inert aria-hidden="true" className="contents">
        {children}
      </div>
    </>
  );
}

/** Bloc de squelette simple, pour les cas où aucun composant réel ne convient. */
export function Skeleton({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`rounded-md bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800 ${className}`}
    />
  );
}
