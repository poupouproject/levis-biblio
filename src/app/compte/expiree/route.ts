import { getAccountSession } from '@/lib/account/session';
import { seeOther } from '@/lib/account/redirect';

/**
 * Session du portail expirée. Une page (Server Component) ne peut pas modifier les cookies :
 * elle redirige ici pour supprimer le cookie devenu inutile, sinon la page de connexion
 * le croirait valide et renverrait vers le dossier, en boucle.
 * GET sans danger : SameSite=Strict empêche un autre site de déclencher la suppression.
 */
export async function GET(): Promise<Response> {
  const session = await getAccountSession();
  session.destroy();
  return seeOther('/compte/connexion?raison=expiree');
}
