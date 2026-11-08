'use client';

import { Suspense, use, useEffect, type JSX } from 'react';
import type { CoverInfo, CoverStreams } from '@/types';
import { SkeletonScope } from '@/components/ui/Skeleton';
import { CoverThumb, type CoverSize } from './CoverThumb';
import { ZoomableCover } from './ZoomableCover';
import { MetaChip } from './DocumentCard';
import { knownCover, rememberCovers } from './coverCache';

interface StreamedProps {
  covers: CoverStreams;
  id: string;
}

type Render = (info: CoverInfo | null) => JSX.Element | null;

/**
 * Infos d'un élément en deux temps : celles du catalogue dès qu'elles arrivent (quelques
 * millisecondes), sinon celles du portail, plus lent. Un élément connu du catalogue n'attend
 * jamais le portail.
 */
function Resolved({
  covers,
  id,
  fallback,
  render,
}: StreamedProps & { fallback: JSX.Element; render: Render }): JSX.Element | null {
  const known = use(covers.known);
  useEffect(() => {
    rememberCovers(known);
  }, [known]);
  const info = known[id];
  if (info) return render(info);
  return (
    <Suspense fallback={fallback}>
      <Late covers={covers} id={id} render={render} />
    </Suspense>
  );
}

function Late({ covers, id, render }: StreamedProps & { render: Render }): JSX.Element | null {
  const late = use(covers.late);
  useEffect(() => {
    rememberCovers(late, id);
  }, [late, id]);
  return render(late[id] ?? null);
}

/**
 * Couverture qui arrive après la page : on affiche la liste tout de suite avec une vignette en
 * squelette, remplacée dès réception. Au retour sur une page, la couverture déjà connue
 * s'affiche sans attendre.
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
  const fallback = (
    <SkeletonScope>
      <CoverThumb src={null} title={title} size={size} />
    </SkeletonScope>
  );
  return (
    <Suspense fallback={fallback}>
      <Resolved
        covers={covers}
        id={id}
        fallback={fallback}
        render={(info) => <ZoomableCover src={info?.url ?? null} title={title} size={size} />}
      />
    </Suspense>
  );
}

/** Pastille ISBN : même source et même cache que les couvertures (le portail ne le donne pas ailleurs). */
export function StreamedIsbn({ covers, id }: StreamedProps): JSX.Element | null {
  const cached = knownCover(id);
  if (cached !== undefined) return <IsbnChip isbn={cached?.isbn ?? null} />;
  const fallback = (
    <SkeletonScope>
      <MetaChip mono>ISBN 9780000000000</MetaChip>
    </SkeletonScope>
  );
  return (
    <Suspense fallback={fallback}>
      <Resolved
        covers={covers}
        id={id}
        fallback={fallback}
        render={(info) => <IsbnChip isbn={info?.isbn ?? null} />}
      />
    </Suspense>
  );
}

function IsbnChip({ isbn }: { isbn: string | null }): JSX.Element | null {
  if (!isbn) return null;
  return (
    <MetaChip mono>
      <span className="font-sans font-medium">ISBN</span> {isbn}
    </MetaChip>
  );
}
