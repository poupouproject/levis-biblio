import 'server-only';
import { login } from '@/lib/levis/auth';
import { InvalidCredentialsError, LevisError } from '@/lib/levis/errors';
import { allowLoginAttempt, clearCardAttempts } from './rate-limit';
import { getAccountSession } from './session';

/** Numéro de carte gardé 2 minutes pour préremplir le formulaire après une erreur (jamais dans l'URL). */
export const CARD_FLASH_COOKIE = 'lb_carte';

export type LoginErrorCode =
  'carte' | 'nip' | 'tentatives' | 'identifiants' | 'portail' | 'inattendu' | 'origine';

/** Messages affichés selon le code d'erreur passé dans l'URL (`?erreur=…`). */
export const LOGIN_ERRORS: Record<LoginErrorCode, string> = {
  carte: 'Entrez votre numéro de carte ou votre identifiant d’usager.',
  nip: 'Entrez votre NIP.',
  tentatives: 'Trop de tentatives. Patientez 15 minutes avant de réessayer.',
  identifiants: 'Numéro de carte ou NIP invalide.',
  portail: 'Le portail des bibliothèques ne répond pas. Réessayez dans un instant.',
  inattendu: 'Connexion impossible pour le moment. Réessayez dans un instant.',
  origine: 'La demande a été refusée par sécurité. Rechargez la page, puis réessayez.',
};

export function isLoginErrorCode(value: string | undefined): value is LoginErrorCode {
  return value !== undefined && value in LOGIN_ERRORS;
}

/**
 * Valide, limite les tentatives, ouvre la session sur le portail et la scelle dans le cookie.
 * Le NIP ne quitte pas cette fonction : ni conservé ni journalisé.
 */
export async function attemptLogin(
  rawCard: string,
  pin: string,
  ip: string,
): Promise<{ ok: true } | { ok: false; code: LoginErrorCode }> {
  const card = rawCard.replace(/\s+/g, '');
  // Numéro de carte (code-barres) ou identifiant d'usager alphanumérique
  if (!/^[A-Za-z0-9]{4,30}$/.test(card)) return { ok: false, code: 'carte' };
  if (pin.length === 0 || pin.length > 30) return { ok: false, code: 'nip' };
  if (!allowLoginAttempt(ip, card)) return { ok: false, code: 'tentatives' };

  try {
    const result = await login(card, pin);
    clearCardAttempts(card);
    const session = await getAccountSession();
    session.levis = result.state;
    session.firstName = result.firstName;
    await session.save();
    return { ok: true };
  } catch (error) {
    if (error instanceof InvalidCredentialsError) return { ok: false, code: 'identifiants' };
    if (error instanceof LevisError) return { ok: false, code: 'portail' };
    return { ok: false, code: 'inattendu' };
  }
}
