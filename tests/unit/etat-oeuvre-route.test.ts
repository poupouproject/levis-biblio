import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkStatusResponse } from '@/types';

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
vi.mock('@/lib/levis/account', () => ({ getAccountLoans: vi.fn() }));
const getWork = vi.hoisted(() => vi.fn());
vi.mock('@/lib/catalog/source', () => ({
  getCatalog: () => Promise.resolve({ catalog: { getWork } }),
}));

const { GET } = await import('@/app/compte/etat-oeuvre/route');

const WORK = {
  id: '321022',
  authors: ['Eiichirô Oda'],
  editions: [{ titleId: '321022', title: 'One Piece. 22, Espoir' }],
};

const get = async (
  query: string,
): Promise<{ status: number; body: WorkStatusResponse; cache: string | null }> => {
  const response = await GET(new Request(`http://localhost:3000/compte/etat-oeuvre?${query}`));
  return {
    status: response.status,
    body: (await response.json()) as WorkStatusResponse,
    cache: response.headers.get('cache-control'),
  };
};

describe('route de l’état d’une œuvre', () => {
  beforeEach(() => {
    session.value = { levis: {} };
    readAccount.mockReset();
    getWork.mockReset();
    getWork.mockResolvedValue(WORK);
  });

  it('sans session ou avec un identifiant illisible : rien, sans lire le portail', async () => {
    session.value = {};
    expect((await get('oeuvre=321022')).body).toEqual({ status: null });
    session.value = { levis: {} };
    expect((await get('oeuvre=../x')).body).toEqual({ status: null });
    expect((await get('')).body).toEqual({ status: null });
    expect(readAccount).not.toHaveBeenCalled();
  });

  it('œuvre inconnue du catalogue : rien', async () => {
    getWork.mockResolvedValue(null);
    expect((await get('oeuvre=999')).body).toEqual({ status: null });
    expect(readAccount).not.toHaveBeenCalled();
  });

  it('renvoie seulement l’état de l’œuvre, jamais en cache partagé', async () => {
    readAccount.mockResolvedValue({
      ok: true,
      value: {
        checkouts: [],
        holds: [
          {
            titleId: '321022',
            status: 'waiting',
            queuePosition: 4,
            pickupLibrary: 'La Clé (Breakeyville)',
            date: null,
          },
        ],
        history: [],
      },
    });
    const { status, body, cache } = await get('oeuvre=321022');
    expect(status).toBe(200);
    expect(cache).toBe('private, no-store');
    expect(body).toEqual({
      status: {
        kind: 'hold',
        status: 'waiting',
        queuePosition: 4,
        pickupLibrary: 'La Clé (Breakeyville)',
        date: null,
      },
    });
  });

  it('session expirée ou portail injoignable : rien, sans erreur', async () => {
    readAccount.mockResolvedValue({ ok: false, reason: 'expiree' });
    expect((await get('oeuvre=321022')).body).toEqual({ status: null });
    readAccount.mockRejectedValue(new Error('portail'));
    const { status, body } = await get('oeuvre=321022');
    expect(status).toBe(200);
    expect(body).toEqual({ status: null });
  });
});
