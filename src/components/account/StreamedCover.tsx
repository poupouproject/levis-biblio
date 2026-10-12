'use client';

import { Suspense, use, useEffect, type JSX } from 'react';
import type { CoverMap } from '@/types';
import { SkeletonScope } from '@/components/ui/Skeleton';
import { CoverThumb, type CoverSize } from './CoverThumb';
import { ZoomableCover } from './ZoomableCover';
import { MetaChip } from './DocumentCard';
import { knownCover, rememberCovers } from './coverCache';

interface StreamedProps {
  covers: Promise<CoverMap>;
  id: string;
}

/**
 * Couverture qui arrive après la page : le portail met plusieurs secondes à les fournir,
 * on affiche donc la liste tout de suite avec une vignette en squelette, remplacée dès réception.
 * Au retour sur une page, la couverture déjà connue s'affiche sans attendre le portail.
 */
export function StreamedCover({
  covers,
  id,
  title,
  size = 'md',
}: StreamedProps & { title: string; size?: CoverSize }): JSX.Element {
  const cached = knownCover(id);
  if (cached !== undefined)
    return <ZoomableCover src={cached?.url ?? null} title={title} size={size} />;
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

function ResolvedCover({
  covers,
  id,
  title,
  size,
}: StreamedProps & { title: string; size: CoverSize }): JSX.Element {
  const map = use(covers);
  useEffect(() => {
    rememberCovers(map, id);
  }, [map, id]);
  return <ZoomableCover src={map[id]?.url ?? null} title={title} size={size} />;
}

/** Pastille ISBN : même source et même cache que les couvertures (le portail ne le donne pas ailleurs). */
export function StreamedIsbn({ covers, id }: StreamedProps): JSX.Element | null {
  const cached = knownCover(id);
  if (cached !== undefined) return <IsbnChip isbn={cached?.isbn ?? null} />;
  return (
    <Suspense
      fallback={
        <SkeletonScope>
          <MetaChip mono>ISBN 9780000000000</MetaChip>
        </SkeletonScope>
      }
    >
      <ResolvedIsbn covers={covers} id={id} />
    </Suspense>
  );
}

function ResolvedIsbn({ covers, id }: StreamedProps): JSX.Element | null {
  const map = use(covers);
  useEffect(() => {
    rememberCovers(map, id);
  }, [map, id]);
  return <IsbnChip isbn={map[id]?.isbn ?? null} />;
}

function IsbnChip({ isbn }: { isbn: string | null }): JSX.Element | null {
  if (!isbn) return null;
  return (
    <MetaChip mono>
      <span className="font-sans font-medium">ISBN</span> {isbn}
    </MetaChip>
  );
}
