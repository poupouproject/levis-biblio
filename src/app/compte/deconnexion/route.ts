import { NextResponse } from 'next/server';
import { logout } from '@/lib/levis/auth';
import { getAccountSession } from '@/lib/account/session';

/**
 * Déconnexion. Route plutôt que Server Action : le formulaire du menu de l'en-tête peut être
 * envoyé depuis n'importe quelle page, et ce chemin sous `/compte` garantit que le cookie de
 * session accompagne la requête (pour fermer aussi la session du portail).
 * Le rechargement complet qui suit vide l'état côté navigateur (couvertures en mémoire).
 */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return new Response(null, { status: 403 });
  }

  const session = await getAccountSession();
  if (session.levis) await logout(session.levis);
  session.destroy();
  return NextResponse.redirect(new URL('/compte/connexion?raison=deconnecte', request.url), 303);
}
