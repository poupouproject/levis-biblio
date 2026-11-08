// Retour après la connexion (`?suite=…`) : seules des pages connues du dossier sont acceptées,
// jamais une adresse reprise telle quelle (redirection ouverte vers un autre site).

/** Pages où l'on revient après la connexion : le récapitulatif de l'année, partagé par lien. */
const ALLOWED = /^\/compte\/mon-annee(?:\/\d{4})?$/;

export type ReturnPath = `/compte/${string}`;

export function returnPath(value: unknown): ReturnPath | null {
  return typeof value === 'string' && ALLOWED.test(value) ? (value as ReturnPath) : null;
}

/** Ajoute `suite` à une adresse interne, s'il y a lieu. */
export function withReturn<P extends `/${string}`>(path: P, suite: ReturnPath | null): P {
  if (!suite) return path;
  return `${path}${path.includes('?') ? '&' : '?'}suite=${encodeURIComponent(suite)}` as P;
}
