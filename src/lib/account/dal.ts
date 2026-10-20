import 'server-only';
import { redirect } from 'next/navigation';
import { LevisClient } from '@/lib/levis/client';
import { SessionExpiredError } from '@/lib/levis/errors';
import { demoRead } from './demo';
import { getAccountSession, isSignedIn } from './session';

export const LOGIN_PATH = '/compte/connexion';

/** Supprime le cookie périmé puis renvoie à la connexion (voir src/app/compte/expiree/route.ts). */
export const EXPIRED_PATH = '/compte/expiree';

/** Prénom de l'usager connecté, ou redirection vers la connexion. */
export async function requireAccount(): Promise<{ firstName: string; demo: boolean }> {
  const session = await getAccountSession();
  if (!isSignedIn(session)) redirect(LOGIN_PATH);
  return { firstName: session.firstName ?? '', demo: session.demo !== undefined };
}

/**
 * Exécute une lecture sur le portail avec la session de l'usager (ou sur le dossier fictif en démo).
 * Session absente → connexion. Session expirée côté Ville → suppression du cookie, puis connexion.
 */
export async function withAccount<T>(read: (client: LevisClient) => Promise<T>): Promise<T> {
  const session = await getAccountSession();
  if (session.demo) return demoRead(read, session.demo);
  if (!session.levis) redirect(LOGIN_PATH);
  try {
    return await read(new LevisClient(session.levis));
  } catch (error) {
    if (error instanceof SessionExpiredError) redirect(EXPIRED_PATH);
    throw error;
  }
}
