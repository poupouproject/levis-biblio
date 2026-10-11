'use client';

import { Suspense, use, type JSX } from 'react';
import type { CoverMap } from '@/types';
import { CoverThumb } from './CoverThumb';

interface StreamedCoverProps {
  covers: Promise<CoverMap>;
  id: string;
  title: string;
  size?: 'sm' | 'md';
}

/**
 * Couverture qui arrive après la page : le portail met plusieurs secondes à les fournir,
 * on affiche donc la liste tout de suite avec une vignette neutre, remplacée dès réception.
 */
export function StreamedCover({ covers, id, title, size = 'md' }: StreamedCoverProps): JSX.Element {
  return (
    <Suspense fallback={<CoverThumb src={null} title={title} size={size} />}>
      <ResolvedCover covers={covers} id={id} title={title} size={size} />
    </Suspense>
  );
}

function ResolvedCover({ covers, id, title, size }: Required<StreamedCoverProps>): JSX.Element {
  const map = use(covers);
  return <CoverThumb src={map[id] ?? null} title={title} size={size} />;
}
