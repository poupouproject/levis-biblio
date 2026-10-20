import { NextResponse } from 'next/server';
import type { SessionStatus } from '@/types';
import { getAccountSession, isSignedIn } from '@/lib/account/session';

/**
 * État de connexion pour le menu de l'en-tête. Le cookie de session n'est envoyé que
 * sous `/compte`, d'où cette route : les autres pages restent statiques.
 * Ne renvoie que le prénom, jamais d'autre donnée du dossier.
 */
export async function GET(): Promise<NextResponse<SessionStatus>> {
  const session = await getAccountSession();
  return NextResponse.json(
    { firstName: isSignedIn(session) ? (session.firstName ?? '') : null },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
