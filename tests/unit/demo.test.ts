import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import {
  demoChangePickup,
  demoHoldAction,
  demoRead,
  demoRenew,
  demoUpdatePreferences,
  newDemoState,
} from '@/lib/account/demo';
import {
  getCheckouts,
  getFines,
  getHistory,
  getHolds,
  getOverview,
  getProfile,
  type CheckoutsResult,
  type HoldsResult,
} from '@/lib/levis/account';
import type { LevisClient } from '@/lib/levis/client';
import { todayIso } from '@/lib/account/format';

const holdsOf = (state = newDemoState()): HoldsResult => demoRead(getHolds, state);
const checkoutsOf = (state = newDemoState()): CheckoutsResult => demoRead(getCheckouts, state);

describe('mode démonstration : lectures', () => {
  it('répond à chaque lecture de Mon dossier', () => {
    const state = newDemoState();
    const reads: ((client: LevisClient) => Promise<unknown>)[] = [
      getCheckouts,
      getHolds,
      getHistory,
      getFines,
      getProfile,
      getOverview,
    ];
    for (const read of reads) {
      expect(demoRead(read, state)).toBeTruthy();
    }
  });

  it('montre une réservation prête à récupérer dans la semaine, en tête de liste', () => {
    const { holds, summary } = holdsOf();
    expect(summary).toEqual({ total: holds.length, ready: 1 });
    expect(holds[0]).toMatchObject({ status: 'ready', canCancel: false, canChangePickup: false });
    expect(holds[0]?.date && holds[0].date > todayIso()).toBe(true);
  });

  it('a une couverture servie localement pour chaque document', async () => {
    const { holds, covers: holdCovers } = holdsOf();
    const { checkouts, covers: checkoutCovers } = checkoutsOf();
    const covers = { ...(await holdCovers), ...(await checkoutCovers) };
    for (const id of [...holds.map((h) => h.holdId), ...checkouts.map((c) => c.barcode)]) {
      const url = covers[id]?.url ?? '';
      expect(url).toMatch(/^\/maquette\/couvertures\//);
      expect(existsSync(`public${url}`)).toBe(true);
    }
  });

  it('trie les emprunts par date de retour', () => {
    const dates = checkoutsOf().checkouts.map((c) => c.dueDate ?? '');
    expect(dates).toEqual([...dates].sort());
  });
});

describe('mode démonstration : actions', () => {
  it('renouvelle jusqu’à la limite', () => {
    const state = newDemoState();
    const [first] = checkoutsOf(state).checkouts;
    const barcode = first?.barcode ?? '';
    for (let i = 0; i < 3; i++) expect(demoRenew(state, [barcode])[0]?.ok).toBe(true);
    expect(demoRenew(state, [barcode])[0]).toMatchObject({ ok: false });
    expect(checkoutsOf(state).checkouts.find((c) => c.barcode === barcode)?.renewals).toBe(3);
  });

  it('annule, suspend, réactive et déplace une réservation', () => {
    const state = newDemoState();
    const waiting = holdsOf(state).holds.filter((h) => h.status === 'waiting');
    const [a, b] = waiting;
    if (!a || !b) throw new Error('réservations attendues');

    demoHoldAction(state, 'cancel', [a.key]);
    expect(holdsOf(state).holds.some((h) => h.key === a.key)).toBe(false);

    demoHoldAction(state, 'suspend', [b.key], { start: '2026-11-01', end: '2026-12-01' });
    expect(holdsOf(state).holds.find((h) => h.key === b.key)).toMatchObject({
      status: 'suspended',
      date: '2026-12-01',
    });
    demoHoldAction(state, 'resume', [b.key]);
    expect(holdsOf(state).holds.find((h) => h.key === b.key)?.status).toBe('waiting');

    expect(demoChangePickup(state, [b.key], 'JG')[0]?.ok).toBe(true);
    expect(holdsOf(state).holds.find((h) => h.key === b.key)?.pickupCode).toBe('JG');
  });

  it('refuse d’annuler une réservation prête', () => {
    const state = newDemoState();
    const ready = holdsOf(state).holds.find((h) => h.status === 'ready');
    expect(() => demoHoldAction(state, 'cancel', [ready?.key ?? ''])).toThrow();
  });

  it('enregistre les préférences', () => {
    const state = newDemoState();
    const prefs = {
      language: 'en_US',
      defaultTab: 'HOLDS',
      pickupLibrary: 'JG',
      showCheckoutHistory: false,
    };
    expect(demoUpdatePreferences(state, prefs).preferences).toEqual(prefs);
    expect(demoRead(getProfile, state).preferences).toEqual(prefs);
  });
});
