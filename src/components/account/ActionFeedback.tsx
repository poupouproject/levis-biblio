'use client';

import type { JSX } from 'react';
import { toast } from 'sonner';
import type { ActionItemResult, ActionResult } from '@/types';

function Details({ items }: { items: ActionItemResult[] }): JSX.Element {
  return (
    <ul className="mt-1 flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.id}>
          <span className="font-semibold">{item.title}</span> : {item.message}
        </li>
      ))}
    </ul>
  );
}

/**
 * Notifications d'un résultat d'action. Résultat mixte : deux notifications, une pour les
 * documents traités (disparaît seule), une pour les refus (reste jusqu'à fermeture, puisqu'il
 * faut agir : rapporter le livre).
 */
export function notifyResult(result: ActionResult): void {
  const ok = result.items.filter((i) => i.ok);
  const refused = result.items.filter((i) => !i.ok);
  if (result.items.length === 0) {
    if (result.status === 'success') toast.success(result.message);
    else toast.error(result.message, { duration: Infinity });
    return;
  }
  if (ok.length > 0) {
    toast.success(result.parts?.ok ?? result.message, {
      description: <Details items={ok} />,
      duration: 6000,
    });
  }
  if (refused.length > 0) {
    toast.error(result.parts?.refused ?? result.message, {
      description: <Details items={refused} />,
      duration: Infinity,
    });
  }
}

/** Message propre à un document, sous sa carte : reste visible après les notifications. */
export function ItemMessage({
  result,
  id,
}: {
  result: ActionResult | null;
  id: string;
}): JSX.Element | null {
  const item = result?.items.find((i) => i.id === id);
  if (!item) return null;
  return (
    <p
      className={`text-xs font-medium ${item.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
    >
      {item.message}
    </p>
  );
}
