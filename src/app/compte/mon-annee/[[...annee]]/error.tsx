'use client';

import type { JSX } from 'react';
import { PortalUnavailable } from '@/components/account/PortalUnavailable';

/**
 * Récapitulatif hors du groupe `(dossier)` (plein écran) : sans ce fichier, une panne du
 * portail afficherait l'écran d'erreur générique de Next, en anglais et sans issue.
 */
export default function YearError({ retry }: { error: unknown; retry: () => void }): JSX.Element {
  return (
    <div className="mx-auto w-full max-w-md pt-4 sm:pt-10">
      <PortalUnavailable onRetry={retry} />
    </div>
  );
}
