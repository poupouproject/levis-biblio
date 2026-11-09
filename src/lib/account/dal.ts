import 'server-only';
import { redirect } from 'next/navigation';
import { LevisClient } from '@/lib/levis/client';
import { SessionExpiredError } from '@/lib/levis/errors';
import { demoRead } from './demo';
import { withReturn, type ReturnPath } from './return-path';
import { getAccountSession, isSignedIn } from './session';

export const LOGIN_PATH = '/compte/connexion';

/** Supprime le cookie périmé puis renvoie à la connexion (voir src/app/compte/expiree/route.ts). */
export const EXPIRED_PATH = '/compte/expiree';

/**
 * Prénom de l'usager connecté, ou redirection vers la connexion.
 * `suite` : page où revenir après la connexion (voir return-path.ts).
 */
export async function requireAccount(
  suite: ReturnPath | null = null,
): Promise<{ firstName: string; demo: boolean }> {
  const session = await getAccountSession();
  if (!isSignedIn(session)) redirect(withReturn(LOGIN_PATH, suite));
  return { firstName: session.firstName ?? '', demo: session.demo !== undefined };
}

export type AccountRead<T> =
  { ok: true; value: T } | { ok: false; reason: 'connexion' | 'expiree' };

/**
 * Comme `withAccount`, mais sans redirection : pour une route qui répond à un `fetch` (une
 * redirection y mènerait à la page de connexion, en HTML, avec un statut 200). Session expirée :
 * le cookie est supprimé ici, une route pouvant modifier les cookies.
 */
export async function readAccount<T>(
  read: (client: LevisClient) => Promise<T>,
): Promise<AccountRead<T>> {
  const session = await getAccountSession();
  if (session.demo) return { ok: true, value: await demoRead(read, session.demo) };
  if (!session.levis) return { ok: false, reason: 'connexion' };
  try {
    return { ok: true, value: await read(new LevisClient(session.levis)) };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      session.destroy();
      return { ok: false, reason: 'expiree' };
    }
    throw error;
  }
}

/**
 * Exécute une lecture sur le portail avec la session de l'usager (ou sur le dossier fictif en démo).
 * Session absente → connexion. Session expirée côté Ville → suppression du cookie, puis connexion.
 */
export async function withAccount<T>(
  read: (client: LevisClient) => Promise<T>,
  suite: ReturnPath | null = null,
): Promise<T> {
  const session = await getAccountSession();
  if (session.demo) return demoRead(read, session.demo);
  if (!session.levis) redirect(withReturn(LOGIN_PATH, suite));
  try {
    return await read(new LevisClient(session.levis));
  } catch (error) {
    if (error instanceof SessionExpiredError) redirect(withReturn(EXPIRED_PATH, suite));
    throw error;
  }
}
