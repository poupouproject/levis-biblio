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
        let res: ActionResult;
        try {
          res = await action();
        } catch {
          // Réseau coupé ou nouvelle version déployée : message en ligne plutôt que la page d'erreur.
          res = {
            status: 'error',
            message: 'La demande n’a pas abouti. Vérifiez votre connexion, puis réessayez.',
            items: [],
          };
        }
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
