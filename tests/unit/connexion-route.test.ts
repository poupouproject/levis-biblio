import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve(jar) }));
vi.mock('@/lib/account/origin', () => ({ isSameOrigin: () => true }));
const attemptLogin = vi.hoisted(() => vi.fn());
vi.mock('@/lib/account/login', () => ({ CARD_FLASH_COOKIE: 'lb_carte', attemptLogin }));

const { POST } = await import('@/app/compte/connexion/ouvrir/route');

function post(fields: Record<string, string>): Promise<Response> {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, value);
  return POST(new Request('http://localhost/compte/connexion/ouvrir', { method: 'POST', body }));
}

describe('route de connexion : refus', () => {
  beforeEach(() => {
    jar.set.mockClear();
    attemptLogin.mockReset();
  });

  it('dossier fictif retiré : message dédié, sans cookie de carte', async () => {
    attemptLogin.mockResolvedValue({ ok: false, code: 'demo' });
    const response = await post({ demo: '1' });
    expect(response.headers.get('location')).toContain('erreur=demo');
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('vraie connexion refusée : la carte est gardée pour préremplir le formulaire', async () => {
    attemptLogin.mockResolvedValue({ ok: false, code: 'identifiants' });
    const response = await post({ card: '1234', pin: 'nip' });
    expect(response.headers.get('location')).toContain('erreur=identifiants');
    expect(jar.set).toHaveBeenCalledWith('lb_carte', '1234', expect.anything());
  });
});

describe('route de connexion : retour au récapitulatif', () => {
  beforeEach(() => {
    attemptLogin.mockReset();
  });

  it('connexion réussie : retour à la page demandée', async () => {
    attemptLogin.mockResolvedValue({ ok: true });
    const response = await post({ card: '1234', pin: 'nip', suite: '/compte/mon-annee/2025' });
    expect(response.headers.get('location')).toBe('/compte/mon-annee/2025');
  });

  it('adresse non permise : le dossier, jamais un autre site', async () => {
    attemptLogin.mockResolvedValue({ ok: true });
    const response = await post({ card: '1234', pin: 'nip', suite: 'https://exemple.com' });
    expect(response.headers.get('location')).toBe('/compte');
  });

  it('connexion refusée : la page demandée est gardée pour le prochain essai', async () => {
    attemptLogin.mockResolvedValue({ ok: false, code: 'nip' });
    const response = await post({ card: '1234', suite: '/compte/mon-annee' });
    expect(response.headers.get('location')).toBe(
      '/compte/connexion?erreur=nip&suite=%2Fcompte%2Fmon-annee',
    );
  });
});
