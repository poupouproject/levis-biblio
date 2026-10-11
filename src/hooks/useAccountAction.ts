'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/types';

interface AccountAction {
  pending: boolean;
  result: ActionResult | null;
  run: (action: () => Promise<ActionResult>, onDone?: (result: ActionResult) => void) => void;
  clear: () => void;
}

/** Exécute une Server Action du dossier et gère l'expiration de session. */
export function useAccountAction(): AccountAction {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = useCallback<AccountAction['run']>(
    (action, onDone) => {
      startTransition(async () => {
        const res = await action();
        if (res.status === 'error' && res.message === 'session_expiree') {
          router.push('/compte/connexion?raison=expiree');
          return;
        }
        setResult(res);
        onDone?.(res);
      });
    },
    [router],
  );

  const clear = useCallback((): void => {
    setResult(null);
  }, []);

  return { pending, result, run, clear };
}
