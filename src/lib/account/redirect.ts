/**
 * Redirection 303 relative (`Location: /compte…`).
 *
 * Ne pas construire l'URL à partir de `request.url` : en dev, Next y met l'adresse du serveur
 * (`localhost`), pas celle du navigateur. Un téléphone sur le réseau local serait renvoyé vers
 * son propre localhost (ERR_CONNECTION_REFUSED). Une adresse relative est appliquée par le
 * navigateur sur l'hôte qu'il utilise déjà (localhost, adresse réseau, domaine, proxy).
 */
export function seeOther(path: `/${string}`): Response {
  return new Response(null, { status: 303, headers: { Location: path } });
}
