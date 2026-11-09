import { getYearLoans } from '@/lib/levis/account';
import { readAccount } from '@/lib/account/dal';
import { todayIso } from '@/lib/account/format';
import { publicOrigin } from '@/lib/account/origin';
import { buildYearRecap, isRecapOpen } from '@/lib/account/recap';
import { getAccountSession, isSignedIn } from '@/lib/account/session';
import { shareImage } from '@/lib/account/share-image';

/**
 * Image du récapitulatif à partager (`?annee=2026`, `&titres=1` pour la plume et la série).
 * Calculée à la demande, jamais stockée ; sous /compte : aucun cache partagé (next.config.ts).
 * Demandée par `fetch` : sans session, ou session expirée, un 401 plutôt qu'une redirection
 * (qui finirait sur la page de connexion, en HTML, enregistrée comme image).
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const year = Number.parseInt(url.searchParams.get('annee') ?? '', 10);
  if (!(year >= 2000)) return new Response(null, { status: 400 });
  // L'année en cours n'ouvre que le 15 novembre ; une année future, jamais
  if (!isRecapOpen(year, todayIso())) return new Response(null, { status: 404 });

  const session = await getAccountSession();
  if (!isSignedIn(session)) return new Response(null, { status: 401 });
  const loans = await readAccount(getYearLoans);
  if (!loans.ok) return new Response(null, { status: 401 });
  const { history, checkouts } = loans.value;

  return shareImage(buildYearRecap(history, checkouts, year), {
    titles: url.searchParams.get('titres') === '1',
    demo: session.demo !== undefined,
    link: `${publicOrigin(request)}/mon-annee`,
  });
}
