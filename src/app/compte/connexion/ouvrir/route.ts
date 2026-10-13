import { cookies } from 'next/headers';
import { CARD_FLASH_COOKIE, attemptLogin } from '@/lib/account/login';
import { isSameOrigin } from '@/lib/account/origin';
import { seeOther } from '@/lib/account/redirect';

/**
 * Connexion par envoi de formulaire classique, suivi d'une redirection 303.
 * C'est le parcours « formulaire envoyé puis nouvelle page » que tous les gestionnaires de
 * mots de passe reconnaissent pour proposer l'enregistrement ; il marche aussi sans JavaScript.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request, 'connexion')) {
    return seeOther('/compte/connexion?erreur=origine');
  }

  const form = await request.formData();
  const field = (name: string): string => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };
  const card = field('card');
  // `x-real-ip` (posé par Vercel), sinon la dernière entrée de X-Forwarded-For : celle ajoutée
  // par notre proxy. La première entrée vient du client et peut être inventée.
  const ip =
    [
      request.headers.get('x-real-ip')?.trim(),
      request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim(),
    ].find(Boolean) ?? 'local';
  const result = await attemptLogin(card, field('pin'), ip);

  const jar = await cookies();
  if (result.ok) {
    jar.delete({ name: CARD_FLASH_COOKIE, path: '/compte/connexion' });
    return seeOther('/compte');
  }

  jar.set(CARD_FLASH_COOKIE, card.slice(0, 30), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/compte/connexion',
    maxAge: 120,
  });
  return seeOther(`/compte/connexion?erreur=${result.code}`);
}
