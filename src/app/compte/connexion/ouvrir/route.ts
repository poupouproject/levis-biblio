import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CARD_FLASH_COOKIE, attemptLogin } from '@/lib/account/login';

/**
 * Connexion par envoi de formulaire classique, suivi d'une redirection 303.
 * C'est le parcours « formulaire envoyé puis nouvelle page » que tous les gestionnaires de
 * mots de passe reconnaissent pour proposer l'enregistrement ; il marche aussi sans JavaScript.
 */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return new Response(null, { status: 403 });
  }

  const form = await request.formData();
  const field = (name: string): string => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };
  const card = field('card');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const result = await attemptLogin(card, field('pin'), ip);

  const jar = await cookies();
  if (result.ok) {
    jar.delete({ name: CARD_FLASH_COOKIE, path: '/compte/connexion' });
    return NextResponse.redirect(new URL('/compte', request.url), 303);
  }

  jar.set(CARD_FLASH_COOKIE, card.slice(0, 30), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/compte/connexion',
    maxAge: 120,
  });
  return NextResponse.redirect(
    new URL(`/compte/connexion?erreur=${result.code}`, request.url),
    303,
  );
}
