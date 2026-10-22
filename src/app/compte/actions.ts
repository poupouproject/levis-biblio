'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ActionItemResult, ActionResult, ActionResultParts, Profile } from '@/types';
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
import {
  demoChangePickup,
  demoHoldAction,
  demoRenew,
  demoUpdatePreferences,
  type DemoState,
} from '@/lib/account/demo';
import { addDays, todayIso } from '@/lib/account/format';
import { LOGIN_PATH } from '@/lib/account/dal';
import { PICKUP, RESERVATION, describe } from '@/lib/account/summary';

/** Valeur texte d'un champ de formulaire (les fichiers sont ignorés). */
function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

// Connexion : route /compte/connexion/ouvrir. Déconnexion : route /compte/deconnexion.
// (Envois de formulaire classiques : voir les routes pour les raisons.)

// ─── Actions sur le dossier ──────────────────────────────────────────────────

const SESSION_EXPIRED = 'session_expiree';

/** Une action sur le portail et son équivalent sur le dossier fictif (mode démonstration). */
interface AccountAction {
  portal: (client: LevisClient) => Promise<ActionItemResult[]>;
  demo: (state: DemoState) => ActionItemResult[];
}

/** Exécute une action avec la session de l'usager, puis renouvelle le cookie scellé. */
async function withSession(
  run: AccountAction,
  describeResult: (items: ActionItemResult[]) => { message: string; parts?: ActionResultParts },
): Promise<ActionResult> {
  const session = await getAccountSession();
  const { levis, demo } = session;
  if (!levis && !demo) return { status: 'error', message: SESSION_EXPIRED, items: [] };
  try {
    let items: ActionItemResult[] = [];
    if (demo) {
      items = run.demo(demo);
    } else if (levis) {
      const client = new LevisClient(levis);
      items = await run.portal(client);
      session.levis = client.toState();
    }
    await session.save();
    revalidatePath('/compte', 'layout');
    const failed = items.filter((i) => !i.ok).length;
    return {
      status: failed === 0 ? 'success' : failed === items.length ? 'error' : 'partial',
      ...describeResult(items),
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
    {
      portal: (client) => renewCheckouts(client, barcodes),
      demo: (state) => demoRenew(state, barcodes),
    },
    (items) => describe(items, 'renouvelé'),
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
    {
      portal: (client) => runHoldAction(client, action, keys, dates),
      demo: (state) => demoHoldAction(state, action, keys, dates),
    },
    (items) => describe(items, verb[action], RESERVATION),
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
    {
      portal: (client) => changePickupLibrary(client, keys, branchCode),
      demo: (state) => demoChangePickup(state, keys, branchCode),
    },
    (items) => describe(items, 'modifié', PICKUP),
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

  const wanted = {
    language,
    defaultTab,
    pickupLibrary,
    showCheckoutHistory: formData.get('showCheckoutHistory') === 'on',
  };
  const outcome = ({ preferences: saved }: Profile): ActionItemResult[] => {
    const ok =
      saved.language === wanted.language &&
      saved.defaultTab === wanted.defaultTab &&
      saved.pickupLibrary === wanted.pickupLibrary &&
      saved.showCheckoutHistory === wanted.showCheckoutHistory;
    return [
      {
        id: 'preferences',
        title: 'Préférences',
        ok,
        message: ok ? 'Préférences enregistrées.' : 'La bibliothèque a refusé la modification.',
      },
    ];
  };
  const result = await withSession(
    {
      portal: async (client) => outcome(await updatePreferences(client, wanted)),
      demo: (state) => outcome(demoUpdatePreferences(state, wanted)),
    },
    (items) => ({ message: items[0]?.message ?? '' }),
  );
  if (result.message === SESSION_EXPIRED) redirect(`${LOGIN_PATH}?raison=expiree`);
  // Une seule entrée (les préférences) : jamais de résultat partiel
  return { status: result.status === 'success' ? 'success' : 'error', message: result.message };
}
