'use client';

import { useActionState, type JSX } from 'react';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { Branch, Preferences } from '@/types';
import { preferencesAction, type PreferencesState } from '@/app/compte/actions';

const INITIAL: PreferencesState = { status: 'idle', message: '' };

const selectClass =
  'h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

interface PreferencesFormProps {
  preferences: Preferences;
  branches: readonly Branch[];
}

export function PreferencesForm({ preferences, branches }: PreferencesFormProps): JSX.Element {
  const [state, formAction, pending] = useActionState(preferencesAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        Succursale de retrait par défaut
        <select
          name="pickupLibrary"
          defaultValue={preferences.pickupLibrary ?? ''}
          className={selectClass}
        >
          {branches.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        Langue des communications
        <select name="language" defaultValue={preferences.language} className={selectClass}>
          <option value="fr_CA">Français</option>
          <option value="en_US">English</option>
        </select>
      </label>

      {/* Préférence du portail officiel, conservée telle quelle. */}
      <input type="hidden" name="defaultTab" value={preferences.defaultTab} />

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
        <input
          type="checkbox"
          name="showCheckoutHistory"
          defaultChecked={preferences.showCheckoutHistory}
          className="mt-0.5 h-5 w-5 rounded accent-[#d4a853]"
        />
        <span className="text-sm">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            Conserver l’historique de mes emprunts
          </span>
          <span className="block text-zinc-500">
            Désactivé, la bibliothèque ne garde plus la liste de vos anciens emprunts.
          </span>
        </span>
      </label>

      <div aria-live="polite">
        {state.status !== 'idle' && (
          <p
            role="status"
            className={`flex items-center gap-2 text-sm font-medium ${
              state.status === 'success'
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {state.status === 'success' ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            ) : (
              <AlertTriangle className="h-4 w-4" aria-hidden />
            )}
            {state.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 self-start rounded-xl bg-[#d4a853] px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-[#b88f42] disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Enregistrer
      </button>
    </form>
  );
}
