import 'server-only';
import { redirect } from 'next/navigation';
import { LevisClient } from '@/lib/levis/client';
import { SessionExpiredError } from '@/lib/levis/errors';
import { getAccountSession } from './session';

export const LOGIN_PATH = '/compte/connexion';

/** Supprime le cookie périmé puis renvoie à la connexion (voir src/app/compte/expiree/route.ts). */
export const EXPIRED_PATH = '/compte/expiree';

/** Prénom de l'usager connecté, ou redirection vers la connexion. */
export async function requireAccount(): Promise<{ firstName: string }> {
  const session = await getAccountSession();
  if (!session.levis) redirect(LOGIN_PATH);
  return { firstName: session.firstName ?? '' };
}

/**
 * Exécute une lecture sur le portail avec la session de l'usager.
 * Session absente → connexion. Session expirée côté Ville → suppression du cookie, puis connexion.
 */
export async function withAccount<T>(read: (client: LevisClient) => Promise<T>): Promise<T> {
  const session = await getAccountSession();
  if (!session.levis) redirect(LOGIN_PATH);
  try {
    return await read(new LevisClient(session.levis));
  } catch (error) {
    if (error instanceof SessionExpiredError) redirect(EXPIRED_PATH);
    throw error;
  }
}
