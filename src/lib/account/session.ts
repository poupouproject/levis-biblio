import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession, type IronSession, type SessionOptions } from 'iron-session';
import type { LevisSessionState } from '@/lib/levis/client';
import type { DemoState } from './demo';

/**
 * Contenu du cookie scellé (chiffré + signé, httpOnly). Aucun identifiant n'y figure :
 * seulement la session ouverte sur le portail de la Ville et le prénom pour l'accueil.
 * En mode démonstration, `demo` remplace `levis` (voir src/lib/account/demo.ts).
 */
export interface AccountSession {
  levis?: LevisSessionState;
  demo?: DemoState;
  firstName?: string;
}

/** Vrai si une session (portail ou démo) est ouverte. */
export function isSignedIn(session: AccountSession): boolean {
  return session.levis !== undefined || session.demo !== undefined;
}

/** Durée maximale d'une session, renouvelée à chaque action. */
export const SESSION_TTL_SECONDS = 30 * 60;

function sessionOptions(): SessionOptions {
  const password = process.env.LEVIS_SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error('LEVIS_SESSION_SECRET doit être défini (32 caractères minimum).');
  }
  return {
    cookieName: 'lb_dossier',
    password,
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/compte',
    },
  };
}

export async function getAccountSession(): Promise<IronSession<AccountSession>> {
  return getIronSession<AccountSession>(await cookies(), sessionOptions());
}
