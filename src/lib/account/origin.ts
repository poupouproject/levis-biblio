import 'server-only';

/**
 * Vérifie qu'un envoi de formulaire vient bien de notre site (protection CSRF d'appoint ;
 * la protection principale est le cookie de session `SameSite=Strict`).
 *
 * 1. `Sec-Fetch-Site` (navigateurs modernes, impossible à falsifier depuis une page) :
 *    seul `same-origin` est accepté. Bloque aussi les cadres « sandbox » qui envoient
 *    `Origin: null` depuis un autre site.
 * 2. Repli quand cet en-tête est absent (navigateur ancien, ou contexte non sécurisé comme
 *    HTTP sur le réseau local, où les navigateurs ne l'envoient pas) : l'hôte de `Origin`
 *    doit correspondre à l'hôte public de la requête (`x-forwarded-host` derrière un proxy,
 *    sinon `host`). `Origin: null` est refusé ; l'absence d'Origin (très vieux navigateurs)
 *    est acceptée.
 *
 * Un refus est journalisé (route, en-têtes reçus ; aucune donnée personnelle).
 */
export function isSameOrigin(request: Request, route: string): boolean {
  const site = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ?? request.headers.get('host');

  let allowed: boolean;
  if (site) {
    allowed = site === 'same-origin';
  } else if (!origin) {
    allowed = true;
  } else {
    let originHost = '';
    try {
      originHost = origin === 'null' ? '' : new URL(origin).host;
    } catch {
      originHost = '';
    }
    allowed = originHost !== '' && host?.toLowerCase() === originHost.toLowerCase();
  }

  if (!allowed) {
    console.warn('[sécurité] envoi refusé : origine différente', { route, site, origin, host });
  }
  return allowed;
}
