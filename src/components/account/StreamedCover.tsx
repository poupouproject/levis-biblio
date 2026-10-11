'use client';

import { Suspense, use, useEffect, type JSX } from 'react';
import type { CoverMap } from '@/types';
import { SkeletonScope } from '@/components/ui/Skeleton';
import { CoverThumb } from './CoverThumb';

/**
 * Couvertures déjà reçues pendant cette visite (id → URL, ou null si le portail n'en a pas).
 * Vit dans l'onglet seulement : effacée au rechargement ou à la fermeture, jamais persistée.
 * N'est écrite que dans un effet, donc jamais côté serveur (où le module est partagé entre usagers).
 */
const knownCovers = new Map<string, string | null>();

interface StreamedCoverProps {
  covers: Promise<CoverMap>;
  id: string;
  title: string;
  size?: 'sm' | 'md';
}

/**
 * Couverture qui arrive après la page : le portail met plusieurs secondes à les fournir,
 * on affiche donc la liste tout de suite avec une vignette neutre, remplacée dès réception.
 * Au retour sur une page, la couverture déjà connue s'affiche sans attendre le portail.
 */
export function StreamedCover({ covers, id, title, size = 'md' }: StreamedCoverProps): JSX.Element {
  const known = knownCovers.get(id);
  if (known !== undefined) return <CoverThumb src={known} title={title} size={size} />;
  return (
    <Suspense
      fallback={
        <SkeletonScope>
          <CoverThumb src={null} title={title} size={size} />
        </SkeletonScope>
      }
    >
      <ResolvedCover covers={covers} id={id} title={title} size={size} />
    </Suspense>
  );
}

function ResolvedCover({ covers, id, title, size }: Required<StreamedCoverProps>): JSX.Element {
  const src = use(covers)[id] ?? null;
  useEffect(() => {
    knownCovers.set(id, src);
  }, [id, src]);
  return <CoverThumb src={src} title={title} size={size} />;
}
