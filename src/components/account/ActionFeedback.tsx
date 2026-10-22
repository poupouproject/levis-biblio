'use client';

import type { JSX } from 'react';
import { toast } from 'react-toastify';
import type { ActionItemResult, ActionResult } from '@/types';

/** Contenu d'une notification : titre et, s'il y a lieu, un document par ligne avec son message. */
function Content({
  title,
  items = [],
}: {
  title: string;
  items?: ActionItemResult[];
}): JSX.Element {
  return (
    <div className="text-sm">
      <p className="font-semibold">{title}</p>
      {items.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <span className="font-semibold">{item.title}</span> : {item.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Notifications d'un résultat d'action, 10 s chacune avec une barre de temps restant (voir
 * Toaster). Résultat mixte : deux notifications, une pour les documents traités, une pour les
 * refus avec leur motif.
 */
export function notifyResult(result: ActionResult): void {
  const ok = result.items.filter((i) => i.ok);
  const refused = result.items.filter((i) => !i.ok);
  if (result.items.length === 0) {
    const content = <Content title={result.message} />;
    if (result.status === 'success') toast.success(content);
    else toast.error(content);
    return;
  }
  if (ok.length > 0)
    toast.success(<Content title={result.parts?.ok ?? result.message} items={ok} />);
  if (refused.length > 0) {
    toast.error(<Content title={result.parts?.refused ?? result.message} items={refused} />);
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
