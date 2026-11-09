'use client';

import type { JSX } from 'react';
import { PortalUnavailable } from '@/components/account/PortalUnavailable';

/** `retry` relit la page sur le serveur (et donc le portail) ; `reset` ne faisait que réafficher. */
export default function AccountError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}): JSX.Element {
  return <PortalUnavailable onRetry={retry} />;
}
