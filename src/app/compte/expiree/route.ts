import { getAccountSession, isSignedIn } from '@/lib/account/session';
import { seeOther } from '@/lib/account/redirect';
import { returnPath, withReturn } from '@/lib/account/return-path';

/**
 * Session du portail expirée. Une page (Server Component) ne peut pas modifier les cookies :
 * elle redirige ici pour supprimer le cookie devenu inutile, sinon la page de connexion
 * le croirait valide et renverrait vers le dossier, en boucle.
 * Suppression seulement si le cookie accompagne la requête : SameSite=Strict ne l'envoie pas
 * lors d'une navigation venue d'un autre site, qui ne peut donc pas déconnecter l'usager.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await getAccountSession();
  if (isSignedIn(session)) session.destroy();
  const suite = returnPath(new URL(request.url).searchParams.get('suite'));
  return seeOther(withReturn('/compte/connexion?raison=expiree', suite));
}
