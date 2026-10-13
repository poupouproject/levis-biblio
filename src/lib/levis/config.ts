import { BRANCHES } from './branches';

export const LEVIS_ORIGIN = 'https://levi.ent.sirsidynix.net';
export const LEVIS_BASE_PATH = '/client/fr_CA/accueil';
export const LEVIS_ACCOUNT_PATH = `${LEVIS_BASE_PATH}/search/account`;

/** Page « Mon dossier » officielle, pour les fonctions hors de notre portée (paiement, NIP…). */
export const LEVIS_PORTAL_ACCOUNT_URL = `${LEVIS_ORIGIN}${LEVIS_ACCOUNT_PATH}`;

/** Page de connexion qui redirige vers « Mon dossier » une fois l'usager authentifié. */
export const LEVIS_LOGIN_PATH = `${LEVIS_BASE_PATH}/search/patronlogin/https:$002f$002flevi.ent.sirsidynix.net$002fclient$002ffr_CA$002faccueil$002fsearch$002faccount`;

export const LEVIS_REQUEST_TIMEOUT_MS = 15_000;

/** S'identifie honnêtement auprès du portail de la Ville. */
export const LEVIS_USER_AGENT =
  process.env.LEVIS_USER_AGENT ??
  'Mozilla/5.0 (compatible; LevisBiblio/1.0; +https://github.com/poupouproject/levis-biblio)';

/** Succursales (adresses, heures, codes de la liste `pickupLibrary`) : voir branches.ts. */
export { BRANCHES } from './branches';

export function branchCodeFromName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  return BRANCHES.find((b) => b.name.toLowerCase() === normalized)?.code ?? null;
}

export function branchName(code: string): string | null {
  return BRANCHES.find((b) => b.code === code)?.name ?? null;
}
