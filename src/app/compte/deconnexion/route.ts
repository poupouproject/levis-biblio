import { logout } from '@/lib/levis/auth';
import { getAccountSession } from '@/lib/account/session';
import { isSameOrigin } from '@/lib/account/origin';
import { seeOther } from '@/lib/account/redirect';

/**
 * Déconnexion. Route plutôt que Server Action : le formulaire du menu de l'en-tête peut être
 * envoyé depuis n'importe quelle page, et ce chemin sous `/compte` garantit que le cookie de
 * session accompagne la requête (pour fermer aussi la session du portail).
 * Le rechargement complet qui suit vide l'état côté navigateur (couvertures en mémoire).
 */
export async function POST(request: Request): Promise<Response> {
  // Refus : on reste connecté et on revient au dossier, sans page d'erreur muette.
  if (!isSameOrigin(request, 'deconnexion')) {
    return seeOther('/compte');
  }

  const session = await getAccountSession();
  if (session.levis) await logout(session.levis); // Rien à fermer sur le portail en démo
  session.destroy();
  return seeOther('/compte/connexion?raison=deconnecte');
}
