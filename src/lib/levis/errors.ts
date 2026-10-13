export class LevisError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LevisError';
  }
}

/** Numéro de carte ou NIP refusé par le portail. */
export class InvalidCredentialsError extends LevisError {
  constructor(message = 'Numéro de carte ou NIP invalide.') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

/** La session du portail a expiré : l'usager doit se reconnecter. */
export class SessionExpiredError extends LevisError {
  constructor() {
    super('Votre session a expiré. Veuillez vous reconnecter.');
    this.name = 'SessionExpiredError';
  }
}

/** Le portail est injoignable, lent ou a bloqué la requête (ex. défi Cloudflare). */
export class UpstreamError extends LevisError {
  constructor(
    message = 'Le portail des bibliothèques ne répond pas. Réessayez dans un instant.',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'UpstreamError';
  }
}

/** La structure HTML du portail a changé et n'est plus reconnue. */
export class ParseError extends LevisError {
  constructor(what: string) {
    super(`Impossible de lire ${what} sur le portail des bibliothèques.`);
    this.name = 'ParseError';
  }
}
