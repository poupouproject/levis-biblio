'use client';

import { useState, type JSX } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { Checkout, CoverMap } from '@/types';
import { renewAction } from '@/app/compte/actions';
import { useAccountAction } from '@/hooks/useAccountAction';
import { plural } from '@/lib/account/format';
import { StreamedCover } from './StreamedCover';
import { CardAction, DocumentCard, MetaChip } from './DocumentCard';
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
            <DocumentCard
              key={checkout.barcode}
              tone={isSelected ? 'selected' : 'default'}
              cover={<StreamedCover covers={covers} id={checkout.barcode} title={checkout.title} />}
              title={checkout.title}
              author={checkout.author}
              corner={
                <label className="flex h-11 w-11 cursor-pointer items-center justify-center">
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
              }
              meta={
                <>
                  <DueBadge dueDate={checkout.dueDate} today={today} />
                  {checkout.renewals > 0 && (
                    <MetaChip>Renouvelé {plural(checkout.renewals, 'fois', 'fois')}</MetaChip>
                  )}
                  {checkout.callNumber && <MetaChip mono>{checkout.callNumber}</MetaChip>}
                </>
              }
              actions={
                <CardAction
                  disabled={pending}
                  onClick={() => {
                    renew([checkout.barcode]);
                  }}
                  icon={<RefreshCw className="h-4 w-4" aria-hidden />}
                >
                  Renouveler
                </CardAction>
              }
            >
              {checkout.alert && (
                <p className="text-xs font-medium text-red-700 dark:text-red-400">
                  {checkout.alert}
                </p>
              )}
              <ItemMessage result={result} id={checkout.barcode} />
            </DocumentCard>
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
