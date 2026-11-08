import { getYearLoans } from '@/lib/levis/account';
import { withAccount } from '@/lib/account/dal';
import { todayIso } from '@/lib/account/format';
import { buildYearRecap, isRecapOpen } from '@/lib/account/recap';
import { getAccountSession, isSignedIn } from '@/lib/account/session';
import { shareImage } from '@/lib/account/share-image';

/**
 * Image du récapitulatif à partager (`?annee=2026`, `&titres=1` pour la plume et la série).
 * Calculée à la demande, jamais stockée ; sous /compte : aucun cache partagé (next.config.ts).
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const year = Number.parseInt(url.searchParams.get('annee') ?? '', 10);
  if (!(year >= 2000)) return new Response(null, { status: 400 });
  // L'année en cours n'ouvre que le 15 novembre ; une année future, jamais
  if (!isRecapOpen(year, todayIso())) return new Response(null, { status: 404 });

  const session = await getAccountSession();
  if (!isSignedIn(session)) return new Response(null, { status: 401 });
  const { history, checkouts } = await withAccount(getYearLoans);

  // Hôte vu par le navigateur (derrière Vercel ou un proxy), pas celui du serveur
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  const protocol = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  return shareImage(buildYearRecap(history, checkouts, year), {
    titles: url.searchParams.get('titres') === '1',
    demo: session.demo !== undefined,
    link: `${protocol}://${host}/mon-annee`,
  });
}
