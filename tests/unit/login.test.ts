import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountSession } from '@/lib/account/session';

// Session de cookie simulée : on lit ce que la connexion y a scellé.
const session = vi.hoisted(() => ({
  current: {} as Partial<AccountSession> & { save: () => Promise<void> },
}));
vi.mock('@/lib/account/session', () => ({
  getAccountSession: () => Promise.resolve(session.current),
}));
// Le portail ne doit jamais être joint pour un dossier fictif.
const portalLogin = vi.hoisted(() => vi.fn());
vi.mock('@/lib/levis/auth', () => ({ login: portalLogin }));

const { attemptLogin } = await import('@/lib/account/login');

describe('connexion : dossier fictif', () => {
  beforeEach(() => {
    session.current = { save: vi.fn(() => Promise.resolve()) };
    portalLogin.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('s’ouvre sur demande quand seule la pastille « Démo » est active', async () => {
    vi.stubEnv('LEVIS_DEMO', '');
    vi.stubEnv('LEVIS_BANNIERE_DEMO', '1');
    expect(await attemptLogin('', '', 'ip', true)).toEqual({ ok: true });
    expect(session.current.demo).toBeDefined();
    expect(session.current.firstName).toBe('Camille');
    expect(portalLogin).not.toHaveBeenCalled();
  });

  it('est refusé sans pastille ni mode démonstration : vrai formulaire exigé', async () => {
    vi.stubEnv('LEVIS_DEMO', '');
    vi.stubEnv('LEVIS_BANNIERE_DEMO', '');
    expect(await attemptLogin('', '', 'ip', true)).toEqual({ ok: false, code: 'carte' });
    expect(session.current.demo).toBeUndefined();
    expect(portalLogin).not.toHaveBeenCalled();
  });

  it('n’est pas ouvert sans demande, même avec la pastille', async () => {
    vi.stubEnv('LEVIS_DEMO', '');
    vi.stubEnv('LEVIS_BANNIERE_DEMO', '1');
    expect(await attemptLogin('', '', 'ip')).toEqual({ ok: false, code: 'carte' });
    expect(session.current.demo).toBeUndefined();
  });

  it('reste le seul parcours en mode démonstration', async () => {
    vi.stubEnv('LEVIS_DEMO', '1');
    expect(await attemptLogin('1234', 'nip', 'ip')).toEqual({ ok: true });
    expect(session.current.demo).toBeDefined();
    expect(portalLogin).not.toHaveBeenCalled();
  });
});
