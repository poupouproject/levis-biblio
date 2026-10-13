import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LevisClient, type LevisSessionState } from '@/lib/levis/client';
import { login, logout } from '@/lib/levis/auth';
import { getCheckouts, getFines, getHistory, getHolds, getProfile } from '@/lib/levis/account';
import { InvalidCredentialsError } from '@/lib/levis/errors';

const card = process.env.MON_COMPTE_LEVIS ?? '';
const pin = process.env.MON_COMPTE_LEVIS_PASS ?? '';

describe.skipIf(!card || !pin)('Portail SirsiDynix (lecture seule)', () => {
  let state: LevisSessionState;

  beforeAll(async () => {
    const result = await login(card, pin);
    state = result.state;
    expect(result.firstName.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await logout(state);
  });

  it('lit les emprunts avec leurs dates et couvertures', async () => {
    const { checkouts, summary, covers } = await getCheckouts(new LevisClient(state));
    expect(summary.total).toBe(checkouts.length);
    for (const c of checkouts) {
      expect(c.barcode).toMatch(/^\d+$/);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const coverMap = await covers;
    expect(checkouts.some((c) => coverMap[c.barcode])).toBe(true);
    console.info(
      `emprunts: ${String(checkouts.length)}, avec couverture: ${String(checkouts.filter((c) => coverMap[c.barcode]).length)}`,
    );
  });

  it('lit les réservations avec statut, lieu et rang', async () => {
    const { holds, summary } = await getHolds(new LevisClient(state));
    expect(summary.total).toBe(holds.length);
    for (const h of holds) {
      expect(h.key).toMatch(/^ent:\/\/SD_ILS\/0\/SD_ILS:\d+\|\d+$/);
      expect(h.pickupCode).not.toBeNull();
      expect(h.statusLabel.length).toBeGreaterThan(0);
    }
    console.info(
      `réservations: ${String(holds.length)}, statuts: ${[...new Set(holds.map((h) => `${h.status}(${h.statusLabel})`))].join(', ')}`,
    );
  });

  it('lit l’historique, les amendes et le profil', async () => {
    const client = new LevisClient(state);
    const [history, fines, profile] = await Promise.all([
      getHistory(client),
      getFines(client),
      getProfile(client),
    ]);
    expect(history.every((e) => e.title.length > 0)).toBe(true);
    expect(fines.amountDue).toBeGreaterThanOrEqual(0);
    expect(profile.preferences.pickupLibrary).toMatch(/^[A-Z]+$/);
    console.info(
      `historique: ${String(history.length)}, amendes: ${fines.amountDueLabel}, courriel décodé: ${String(profile.email?.includes('@') ?? false)}`,
    );
  });
});

describe('Connexion refusée', () => {
  it('signale une carte invalide sans planter', async () => {
    // Carte fictive : ne touche aucun compte réel.
    await expect(login('00000000000000', '0000')).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
