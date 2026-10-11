'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ActionItemResult, ActionResult } from '@/types';
import { LevisClient } from '@/lib/levis/client';
import {
  changePickupLibrary,
  renewCheckouts,
  runHoldAction,
  updatePreferences,
  type HoldAction,
} from '@/lib/levis/account';
import { BRANCHES } from '@/lib/levis/config';
import { LevisError, SessionExpiredError } from '@/lib/levis/errors';
import { getAccountSession } from '@/lib/account/session';
import { addDays, todayIso } from '@/lib/account/format';
import { LOGIN_PATH } from '@/lib/account/dal';

/** Valeur texte d'un champ de formulaire (les fichiers sont ignorés). */
function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

// Connexion : route /compte/connexion/ouvrir. Déconnexion : route /compte/deconnexion.
// (Envois de formulaire classiques : voir les routes pour les raisons.)

// ─── Actions sur le dossier ──────────────────────────────────────────────────

const SESSION_EXPIRED = 'session_expiree';

/** Exécute une action avec la session de l'usager, puis renouvelle le cookie scellé. */
async function withSession(
  run: (client: LevisClient) => Promise<ActionItemResult[]>,
  successMessage: (items: ActionItemResult[]) => string,
): Promise<ActionResult> {
  const session = await getAccountSession();
  if (!session.levis) return { status: 'error', message: SESSION_EXPIRED, items: [] };
  const client = new LevisClient(session.levis);
  try {
    const items = await run(client);
    session.levis = client.toState();
    await session.save();
    revalidatePath('/compte', 'layout');
    const failed = items.filter((i) => !i.ok).length;
    return {
      status: failed === items.length ? 'error' : 'success',
      message: successMessage(items),
      items,
    };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return { status: 'error', message: SESSION_EXPIRED, items: [] };
    }
    if (error instanceof LevisError) return { status: 'error', message: error.message, items: [] };
    return {
      status: 'error',
      message: 'Une erreur inattendue est survenue. Réessayez.',
      items: [],
    };
  }
}

function summarize(items: ActionItemResult[], verb: string): string {
  const ok = items.filter((i) => i.ok).length;
  if (ok === items.length)
    return items.length === 1 ? `Document ${verb}.` : `${String(ok)} documents ${verb}s.`;
  if (ok === 0)
    return items.length === 1
      ? (items[0]?.message ?? 'Action refusée.')
      : 'Aucun document n’a pu être traité.';
  return `${String(ok)} sur ${String(items.length)} documents ${verb}s.`;
}

const isStringArray = (value: unknown, pattern: RegExp): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.length <= 50 &&
  value.every((v) => typeof v === 'string' && pattern.test(v));

const BARCODE = /^\d{4,20}$/;
const HOLD_KEY = /^ent:\/\/SD_ILS\/0\/SD_ILS:\d+\|\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function renewAction(barcodes: string[]): Promise<ActionResult> {
  if (!isStringArray(barcodes, BARCODE))
    return { status: 'error', message: 'Sélection invalide.', items: [] };
  return withSession(
    (client) => renewCheckouts(client, barcodes),
    (items) => summarize(items, 'renouvelé'),
  );
}

export async function holdAction(
  action: HoldAction,
  keys: string[],
  dates?: { start: string; end: string },
): Promise<ActionResult> {
  if (!['cancel', 'suspend', 'resume'].includes(action) || !isStringArray(keys, HOLD_KEY)) {
    return { status: 'error', message: 'Sélection invalide.', items: [] };
  }
  if (action === 'suspend') {
    const today = todayIso();
    if (!dates || !ISO_DATE.test(dates.start) || !ISO_DATE.test(dates.end)) {
      return { status: 'error', message: 'Choisissez les dates de suspension.', items: [] };
    }
    if (dates.start < today)
      return {
        status: 'error',
        message: 'La suspension ne peut pas commencer dans le passé.',
        items: [],
      };
    if (dates.end <= dates.start)
      return {
        status: 'error',
        message: 'La date de fin doit suivre la date de début.',
        items: [],
      };
    if (dates.end > addDays(today, 366))
      return { status: 'error', message: 'La suspension est limitée à un an.', items: [] };
  }
  const verb: Record<HoldAction, string> = {
    cancel: 'annulé',
    suspend: 'suspendu',
    resume: 'réactivé',
  };
  return withSession(
    (client) => runHoldAction(client, action, keys, dates),
    (items) =>
      summarize(items, verb[action])
        .replace('Document', 'Réservation')
        .replace('documents', 'réservations'),
  );
}

export async function changePickupAction(
  keys: string[],
  branchCode: string,
): Promise<ActionResult> {
  if (!isStringArray(keys, HOLD_KEY) || !BRANCHES.some((b) => b.code === branchCode)) {
    return { status: 'error', message: 'Sélection invalide.', items: [] };
  }
  return withSession(
    (client) => changePickupLibrary(client, keys, branchCode),
    (items) =>
      summarize(items, 'modifié')
        .replace('Document', 'Lieu de retrait')
        .replace('documents', 'réservations'),
  );
}

// ─── Préférences ─────────────────────────────────────────────────────────────

export interface PreferencesState {
  status: 'idle' | 'success' | 'error';
  message: string;
}

export async function preferencesAction(
  _prev: PreferencesState,
  formData: FormData,
): Promise<PreferencesState> {
  const language = field(formData, 'language');
  const defaultTab = field(formData, 'defaultTab');
  const pickupLibrary = field(formData, 'pickupLibrary');
  if (
    !['fr_CA', 'en_US'].includes(language) ||
    !['PERSONAL', 'CHECKOUTS', 'HOLDS', 'FINES'].includes(defaultTab) ||
    !BRANCHES.some((b) => b.code === pickupLibrary)
  ) {
    return { status: 'error', message: 'Préférences invalides.' };
  }

  const result = await withSession(
    async (client) => {
      const profile = await updatePreferences(client, {
        language,
        defaultTab,
        pickupLibrary,
        showCheckoutHistory: formData.get('showCheckoutHistory') === 'on',
      });
      const ok = profile.preferences.pickupLibrary === pickupLibrary;
      return [
        {
          id: 'preferences',
          title: 'Préférences',
          ok,
          message: ok ? 'Préférences enregistrées.' : 'La bibliothèque a refusé la modification.',
        },
      ];
    },
    (items) => items[0]?.message ?? '',
  );
  if (result.message === SESSION_EXPIRED) redirect(`${LOGIN_PATH}?raison=expiree`);
  return { status: result.status, message: result.message };
}
