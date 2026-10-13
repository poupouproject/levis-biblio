'use client';

import type { JSX } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import type { ActionResult } from '@/types';

interface ActionFeedbackProps {
  result: ActionResult | null;
  onDismiss: () => void;
}

/** Bandeau de résultat d'une action, annoncé aux lecteurs d'écran. */
export function ActionFeedback({ result, onDismiss }: ActionFeedbackProps): JSX.Element {
  return (
    <div aria-live="polite" aria-atomic="true">
      {result && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
            result.status === 'success'
              ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
          }`}
        >
          {result.status === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          )}
          <p className="flex-grow font-medium">{result.message}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-0.5 opacity-70 hover:opacity-100"
            aria-label="Masquer le message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Message propre à un document, sous sa carte. */
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
