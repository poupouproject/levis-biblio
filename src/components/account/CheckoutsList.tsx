'use client';

import { useState, type JSX } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { Checkout, CoverMap } from '@/types';
import { renewAction } from '@/app/compte/actions';
import { useAccountAction } from '@/hooks/useAccountAction';
import { plural } from '@/lib/account/format';
import { StreamedCover } from './StreamedCover';
import { DueBadge } from './DueBadge';
import { ActionFeedback, ItemMessage } from './ActionFeedback';

interface CheckoutsListProps {
  checkouts: Checkout[];
  covers: Promise<CoverMap>;
  today: string;
}

export function CheckoutsList({ checkouts, covers, today }: CheckoutsListProps): JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { pending, result, run, clear } = useAccountAction();
  const allSelected = selected.size === checkouts.length && checkouts.length > 0;

  const toggle = (barcode: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(barcode)) next.delete(barcode);
      else next.add(barcode);
      return next;
    });
  };

  const renew = (barcodes: string[]): void => {
    run(
      () => renewAction(barcodes),
      () => {
        setSelected(new Set());
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-24 sm:pb-0">
      <ActionFeedback result={result} onDismiss={clear} />

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => {
              setSelected(allSelected ? new Set() : new Set(checkouts.map((c) => c.barcode)));
            }}
            className="h-5 w-5 rounded accent-[#d4a853]"
          />
          Tout sélectionner
        </label>
        <span className="text-sm text-zinc-500">{plural(checkouts.length, 'document')}</span>
      </div>

      <ul className="flex flex-col gap-3">
        {checkouts.map((checkout) => {
          const isSelected = selected.has(checkout.barcode);
          return (
            <li
              key={checkout.barcode}
              className={`rounded-xl border bg-white p-3 shadow-sm transition-colors sm:p-4 dark:bg-[#1a1a1a] ${
                isSelected
                  ? 'border-[#d4a853] ring-1 ring-[#d4a853]'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex gap-3">
                <label className="flex items-start pt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      toggle(checkout.barcode);
                    }}
                    className="h-5 w-5 rounded accent-[#d4a853]"
                    aria-label={`Sélectionner ${checkout.title}`}
                  />
                </label>
                <StreamedCover covers={covers} id={checkout.barcode} title={checkout.title} />
                <div className="flex min-w-0 flex-grow flex-col gap-1.5">
                  <h3 className="line-clamp-2 leading-snug font-semibold text-zinc-900 dark:text-zinc-100">
                    {checkout.title}
                  </h3>
                  {checkout.author && (
                    <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {checkout.author}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <DueBadge dueDate={checkout.dueDate} today={today} />
                    {checkout.renewals > 0 && (
                      <span className="text-xs text-zinc-500">
                        Renouvelé {plural(checkout.renewals, 'fois', 'fois')}
                      </span>
                    )}
                  </div>
                  {checkout.alert && (
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">
                      {checkout.alert}
                    </p>
                  )}
                  <ItemMessage result={result} id={checkout.barcode} />
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {checkout.callNumber ? (
                      <span className="truncate rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs whitespace-nowrap text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {checkout.callNumber}
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        renew([checkout.barcode]);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-[#d4a853] hover:text-[#b88f42] disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      Renouveler
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:rounded-xl sm:border dark:border-zinc-800 dark:bg-[#1a1a1a]/95">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              renew([...selected]);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4a853] px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#b88f42] disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-5 w-5" aria-hidden />
            )}
            {pending
              ? 'Renouvellement en cours…'
              : `Renouveler la sélection (${String(selected.size)})`}
          </button>
        </div>
      )}
      {pending && selected.size === 0 && (
        <p className="flex items-center justify-center gap-2 text-sm text-zinc-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Communication avec la
          bibliothèque…
        </p>
      )}
    </div>
  );
}
