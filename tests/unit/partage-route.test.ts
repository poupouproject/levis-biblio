import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeSession {
  levis?: object;
  demo?: object;
}
const session = vi.hoisted(() => {
  const value: FakeSession = {};
  return { value };
});
vi.mock('@/lib/account/session', () => ({
  getAccountSession: () => Promise.resolve(session.value),
  isSignedIn: (s: FakeSession) => Boolean(s.levis ?? s.demo),
}));
const readAccount = vi.hoisted(() => vi.fn());
vi.mock('@/lib/account/dal', () => ({ readAccount }));
const shareImage = vi.hoisted(() => vi.fn(() => new Response('png', { status: 200 })));
vi.mock('@/lib/account/share-image', () => ({ shareImage }));
vi.mock('@/lib/levis/account', () => ({ getYearLoans: vi.fn() }));

const { GET } = await import('@/app/compte/mon-annee/partage/route');

const get = (query: string, headers: Record<string, string> = {}): Promise<Response> =>
  GET(new Request(`http://localhost:3000/compte/mon-annee/partage?${query}`, { headers }));

const LOANS = { ok: true, value: { history: [], checkouts: [] } };

describe('route de l’image à partager', () => {
  beforeEach(() => {
    session.value = { levis: {} };
    readAccount.mockReset();
    readAccount.mockResolvedValue(LOANS);
    shareImage.mockClear();
  });

  it('année absente ou illisible : 400 ; année pas encore ouverte : 404', async () => {
    expect((await get('')).status).toBe(400);
    expect((await get('annee=abc')).status).toBe(400);
    expect((await get('annee=2099')).status).toBe(404);
    expect(readAccount).not.toHaveBeenCalled();
  });

  it('sans session : 401, sans lire le portail', async () => {
    session.value = {};
    expect((await get('annee=2025')).status).toBe(401);
    expect(readAccount).not.toHaveBeenCalled();
  });

  it('session expirée côté Ville : 401, pas une redirection vers la page de connexion', async () => {
    readAccount.mockResolvedValue({ ok: false, reason: 'expiree' });
    const response = await get('annee=2025');
    expect(response.status).toBe(401);
    expect(response.headers.get('location')).toBeNull();
    expect(shareImage).not.toHaveBeenCalled();
  });

  it('plume et série seulement avec titres=1 ; lien public d’après le proxy', async () => {
    await get('annee=2025', {
      'x-forwarded-host': 'levisbiblio.ca, interne:3000',
      'x-forwarded-proto': 'https,http',
    });
    expect(shareImage).toHaveBeenLastCalledWith(expect.anything(), {
      titles: false,
      demo: false,
      link: 'https://levisbiblio.ca/mon-annee',
    });
    await get('annee=2025&titres=1');
    expect(shareImage).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ titles: true, link: 'http://localhost:3000/mon-annee' }),
    );
  });
});
