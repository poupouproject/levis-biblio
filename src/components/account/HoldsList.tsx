'use client';

import { useState, type JSX } from 'react';
import {
  CalendarOff,
  CirclePlay,
  Loader2,
  MapPin,
  PackageCheck,
  Trash2,
  Truck,
  Users,
} from 'lucide-react';
import type { Branch, CoverMap, Hold, HoldStatus } from '@/types';
import { changePickupAction, holdAction } from '@/app/compte/actions';
import { useAccountAction } from '@/hooks/useAccountAction';
import { addDays, formatDate } from '@/lib/account/format';
import { StreamedCover, StreamedIsbn } from './StreamedCover';
import { CardAction, DocumentCard, MetaChip } from './DocumentCard';
import { Dialog } from './Dialog';
import { ActionFeedback, ItemMessage } from './ActionFeedback';

interface HoldsListProps {
  holds: Hold[];
  covers: Promise<CoverMap>;
  branches: readonly Branch[];
  today: string;
}

type DialogState =
  | { kind: 'pickup'; hold: Hold }
  | { kind: 'suspend'; hold: Hold }
  | { kind: 'cancel'; hold: Hold }
  | null;

const SECTIONS: { status: HoldStatus[]; title: string; icon: typeof PackageCheck; tone: string }[] =
  [
    {
      status: ['ready'],
      title: 'Prêtes à récupérer',
      icon: PackageCheck,
      tone: 'text-green-600 dark:text-green-400',
    },
    {
      status: ['in_transit'],
      title: 'En route vers votre succursale',
      icon: Truck,
      tone: 'text-blue-600 dark:text-blue-400',
    },
    {
      status: ['waiting', 'other'],
      title: 'En file d’attente',
      icon: Users,
      tone: 'text-[#d4a853]',
    },
    { status: ['suspended'], title: 'Suspendues', icon: CalendarOff, tone: 'text-zinc-500' },
  ];

const ordinal = (n: number): string => (n === 1 ? '1ʳᵉ' : `${String(n)}ᵉ`);

export function HoldsList({ holds, covers, branches, today }: HoldsListProps): JSX.Element {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [branch, setBranch] = useState('');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 14));
  const { pending, result, run, clear } = useAccountAction();
  const close = (): void => {
    setDialog(null);
  };

  const openPickup = (hold: Hold): void => {
    setBranch(hold.pickupCode ?? branches[0]?.code ?? '');
    setDialog({ kind: 'pickup', hold });
  };
  const openSuspend = (hold: Hold): void => {
    setStart(today);
    setEnd(addDays(today, 14));
    setDialog({ kind: 'suspend', hold });
  };

  return (
    <div className="flex flex-col gap-6">
      <ActionFeedback result={result} onDismiss={clear} />
      {pending && (
        <p className="flex items-center justify-center gap-2 text-sm text-zinc-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Communication avec la
          bibliothèque…
        </p>
      )}

      {SECTIONS.map(({ status, title, icon: Icon, tone }) => {
        const items = holds.filter((h) => status.includes(h.status));
        if (items.length === 0) return null;
        return (
          <section
            key={title}
            className="flex flex-col gap-3"
            aria-labelledby={`section-${status[0] ?? ''}`}
          >
            <h2
              id={`section-${status[0] ?? ''}`}
              className="flex items-center gap-2 text-sm font-semibold tracking-wider text-zinc-500 uppercase"
            >
              <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
              {title} <span className="font-normal">({items.length})</span>
            </h2>
            <ul className="flex flex-col gap-3">
              {items.map((hold) => (
                <DocumentCard
                  key={hold.key}
                  tone={hold.status === 'ready' ? 'success' : 'default'}
                  cover={<StreamedCover covers={covers} id={hold.holdId} title={hold.title} />}
                  title={hold.title}
                  author={hold.author}
                  meta={
                    <>
                      {hold.status === 'waiting' && hold.queuePosition !== null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#d4a853]/15 px-2 py-0.5 text-xs font-semibold text-[#8a6a2c] dark:text-[#e2c07a]">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {ordinal(hold.queuePosition)} en file
                        </span>
                      )}
                      <MetaChip>
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {hold.pickupLibrary}
                      </MetaChip>
                      {hold.callNumber && <MetaChip mono>{hold.callNumber}</MetaChip>}
                      <StreamedIsbn covers={covers} id={hold.holdId} />
                    </>
                  }
                  actions={
                    <>
                      {hold.canChangePickup && (
                        <CardAction
                          disabled={pending}
                          onClick={() => {
                            openPickup(hold);
                          }}
                          icon={<MapPin className="h-4 w-4" aria-hidden />}
                        >
                          Succursale
                        </CardAction>
                      )}
                      {hold.status === 'suspended' ? (
                        <CardAction
                          disabled={pending}
                          onClick={() => {
                            run(() => holdAction('resume', [hold.key]));
                          }}
                          icon={<CirclePlay className="h-4 w-4" aria-hidden />}
                        >
                          Réactiver
                        </CardAction>
                      ) : (
                        hold.status !== 'ready' && (
                          <CardAction
                            disabled={pending}
                            onClick={() => {
                              openSuspend(hold);
                            }}
                            icon={<CalendarOff className="h-4 w-4" aria-hidden />}
                          >
                            Suspendre
                          </CardAction>
                        )
                      )}
                      <CardAction
                        disabled={pending}
                        danger
                        onClick={() => {
                          setDialog({ kind: 'cancel', hold });
                        }}
                        icon={<Trash2 className="h-4 w-4" aria-hidden />}
                      >
                        Annuler
                      </CardAction>
                    </>
                  }
                >
                  {hold.status === 'ready' && (
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      {hold.date
                        ? `À récupérer avant le ${formatDate(hold.date, 'long', today)}`
                        : hold.statusLabel}
                    </p>
                  )}
                  {hold.status !== 'ready' && hold.status !== 'waiting' && (
                    <p className="text-xs text-zinc-500">
                      {hold.statusLabel}
                      {hold.dateLabel
                        ? ` · ${hold.date ? formatDate(hold.date, 'short', today) : hold.dateLabel}`
                        : ''}
                    </p>
                  )}
                  <ItemMessage result={result} id={hold.key} />
                </DocumentCard>
              ))}
            </ul>
          </section>
        );
      })}

      <Dialog open={dialog?.kind === 'pickup'} title="Changer de succursale" onClose={close}>
        {dialog?.kind === 'pickup' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => changePickupAction([dialog.hold.key], branch));
              close();
            }}
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Où voulez-vous récupérer{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">{dialog.hold.title}</strong>?
            </p>
            <fieldset className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              <legend className="sr-only">Succursale de retrait</legend>
              {branches.map((b) => (
                <label
                  key={b.code}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                    branch === b.code
                      ? 'border-[#d4a853] bg-[#d4a853]/10'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="branch"
                    value={b.code}
                    checked={branch === b.code}
                    onChange={() => {
                      setBranch(b.code);
                    }}
                    className="accent-[#d4a853]"
                  />
                  {b.name}
                </label>
              ))}
            </fieldset>
            <DialogActions
              onCancel={close}
              submitLabel="Confirmer"
              disabled={branch === dialog.hold.pickupCode}
            />
          </form>
        )}
      </Dialog>

      <Dialog open={dialog?.kind === 'suspend'} title="Suspendre la réservation" onClose={close}>
        {dialog?.kind === 'suspend' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => holdAction('suspend', [dialog.hold.key], { start, end }));
              close();
            }}
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Vous partez? Votre place dans la file est conservée pendant la suspension.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Du
                <input
                  type="date"
                  required
                  min={today}
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Au
                <input
                  type="date"
                  required
                  min={addDays(start, 1)}
                  max={addDays(today, 366)}
                  value={end}
                  onChange={(e) => {
                    setEnd(e.target.value);
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
            </div>
            <DialogActions onCancel={close} submitLabel="Suspendre" disabled={end <= start} />
          </form>
        )}
      </Dialog>

      <Dialog open={dialog?.kind === 'cancel'} title="Annuler la réservation?" onClose={close}>
        {dialog?.kind === 'cancel' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => holdAction('cancel', [dialog.hold.key]));
              close();
            }}
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-100">{dialog.hold.title}</strong> sera
              retiré de vos réservations
              {dialog.hold.status === 'waiting' ? ' et vous perdrez votre place dans la file' : ''}.
              Cette action est définitive.
            </p>
            <DialogActions
              onCancel={close}
              submitLabel="Annuler la réservation"
              cancelLabel="Garder"
              danger
            />
          </form>
        )}
      </Dialog>
    </div>
  );
}

interface DialogActionsProps {
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  disabled?: boolean;
  danger?: boolean;
}

function DialogActions({
  onCancel,
  submitLabel,
  cancelLabel = 'Retour',
  disabled = false,
  danger = false,
}: DialogActionsProps): JSX.Element {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-zinc-300 px-4 py-2.5 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={disabled}
        className={`rounded-xl px-4 py-2.5 font-semibold text-white shadow-sm disabled:opacity-50 ${
          danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#d4a853] hover:bg-[#b88f42]'
        }`}
      >
        {submitLabel}
      </button>
    </div>
  );
}
