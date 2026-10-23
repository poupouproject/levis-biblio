/**
 * Options Sentry communes au navigateur, au serveur et à l’edge.
 * Le DSN n’est pas un secret : il est publié avec le code du navigateur.
 */
const FORBIDDEN_PARTS = ['forwarded', '-ip', 'remote-', 'via', '-user'];

export const SENTRY_DSN =
  'https://b48d9d61fabba5245e70b1be3822f237@o4512302760001536.ingest.us.sentry.io/4512302832025600';

export const sentryCommonOptions = {
  dsn: SENTRY_DSN,
  // Pas de bruit pendant le développement : on ne signale que les déploiements.
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
  // Quota du forfait gratuit : un échantillon suffit pour voir les tendances.
  tracesSampleRate: 0.1,
  // « Mon dossier » contient des données personnelles : rien qui identifie l’usager.
  dataCollection: {
    userInfo: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    httpBodies: [],
    httpHeaders: { deny: FORBIDDEN_PARTS },
    cookies: { deny: FORBIDDEN_PARTS },
    urlQueryParams: { deny: FORBIDDEN_PARTS },
  },
};
