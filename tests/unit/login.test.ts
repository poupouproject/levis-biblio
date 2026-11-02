import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountSession } from '@/lib/account/session';
import type { LevisSessionState } from '@/lib/levis/client';

// Session de cookie simulée : on lit ce que la connexion y a scellé.
const session = vi.hoisted(() => ({
  current: {} as Partial<AccountSession> & { save: () => Promise<void> },
}));
vi.mock('@/lib/account/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/account/session')>()),
  getAccountSession: () => Promise.resolve(session.current),
}));
// Le portail ne doit jamais être joint pour un dossier fictif.
const portalLogin = vi.hoisted(() => vi.fn());
const portalLogout = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@/lib/levis/auth', () => ({ login: portalLogin, logout: portalLogout }));

const PORTAL_STATE = { cookies: 'fictifs', csrf: 'fictif' } as unknown as LevisSessionState;

const { attemptLogin } = await import('@/lib/account/login');

describe('connexion : dossier fictif', () => {
  beforeEach(() => {
    session.current = { save: vi.fn(() => Promise.resolve()) };
    portalLogin.mockReset();
    portalLogout.mockClear();
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

  it('est refusé sans pastille ni mode démonstration, sans tenter de vraie connexion', async () => {
    vi.stubEnv('LEVIS_DEMO', '');
    vi.stubEnv('LEVIS_BANNIERE_DEMO', '');
    expect(await attemptLogin('1234', 'nip', 'ip', true)).toEqual({ ok: false, code: 'demo' });
    expect(session.current.demo).toBeUndefined();
    expect(portalLogin).not.toHaveBeenCalled();
  });

  it('ferme et efface une vraie session déjà ouverte', async () => {
    vi.stubEnv('LEVIS_DEMO', '');
    vi.stubEnv('LEVIS_BANNIERE_DEMO', '1');
    session.current.levis = PORTAL_STATE;
    session.current.firstName = 'Vrai prénom';
    expect(await attemptLogin('', '', 'ip', true)).toEqual({ ok: true });
    expect(portalLogout).toHaveBeenCalledExactlyOnceWith(PORTAL_STATE);
    expect(session.current.levis).toBeUndefined();
    expect(session.current.demo).toBeDefined();
    expect(session.current.firstName).toBe('Camille');
  });

  it('ne contacte pas le portail quand aucune vraie session n’est ouverte', async () => {
    vi.stubEnv('LEVIS_DEMO', '');
    vi.stubEnv('LEVIS_BANNIERE_DEMO', '1');
    await attemptLogin('', '', 'ip', true);
    expect(portalLogout).not.toHaveBeenCalled();
  });

  it('est effacé par une vraie connexion', async () => {
    vi.stubEnv('LEVIS_DEMO', '');
    vi.stubEnv('LEVIS_BANNIERE_DEMO', '1');
    await attemptLogin('', '', 'ip', true);
    portalLogin.mockResolvedValue({ state: PORTAL_STATE, firstName: 'Vrai prénom' });
    // Carte propre à ce test : la limite de tentatives est gardée en mémoire entre les tests.
    expect(await attemptLogin('5678', 'nip', 'ip-vraie-connexion')).toEqual({ ok: true });
    expect(session.current.demo).toBeUndefined();
    expect(session.current.levis).toBe(PORTAL_STATE);
    expect(session.current.firstName).toBe('Vrai prénom');
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
