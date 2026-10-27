// Connexion à la base du catalogue et repli sur le jeu de démo quand elle ne répond pas.
// Sans dépendance à pg ni à Next : testé avec des sources simulées (tests/unit/connexion.test.ts).
import type { PoolConfig } from 'pg';
import type { CatalogStore } from './store';

export type CatalogSourceName = 'postgres' | 'demo';

export interface Loaded {
  catalog: CatalogStore;
  source: CatalogSourceName;
  /** Taille du catalogue complet (le jeu de démo n'en est qu'un échantillon). */
  totalEditions: number;
}

/** Hôte de la machine elle-même : pas de TLS. */
export function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '::1' || host === '[::1]' || host.startsWith('127.');
}

/**
 * Adresse et TLS du pool. Aucun TLS en local ; ailleurs, vérification complète du certificat.
 * Supabase signe avec sa propre autorité : son certificat racine (tableau de bord → Database →
 * SSL Configuration) va dans `DATABASE_CA_CERT`, en PEM (retours à la ligne en « \n » permis).
 * Les paramètres `ssl*` de l'adresse sont retirés : pg les ferait passer avant ce réglage.
 * `DATABASE_TLS=desactive` coupe TLS hors production, pour une base dans un conteneur Docker
 * joint par son nom de service.
 */
export function databaseConfig(
  url: string,
  env: {
    DATABASE_CA_CERT?: string | undefined;
    DATABASE_TLS?: string | undefined;
    NODE_ENV?: string | undefined;
  } = process.env,
): { connectionString: string; ssl: PoolConfig['ssl'] } {
  const parsed = new URL(url);
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^ssl/i.test(key)) parsed.searchParams.delete(key);
  }
  const plain =
    isLocalHost(parsed.hostname) ||
    (env.DATABASE_TLS === 'desactive' && env.NODE_ENV !== 'production');
  const ca = env.DATABASE_CA_CERT;
  return {
    connectionString: parsed.toString(),
    ssl: plain ? false : ca ? { ca: ca.replace(/\\n/g, '\n') } : true,
  };
}

// Erreurs réseau de Node, et certificat refusé : la base est injoignable ou mal configurée
const NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
  'EPIPE',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);
// SQLSTATE : arrêt du serveur, démarrage en cours, trop de connexions
const SERVER_CODES = new Set(['57P01', '57P02', '57P03', '53300']);

/**
 * La base ne répond pas (réseau, TLS, authentification, serveur arrêté), par opposition à une
 * requête en erreur (délai dépassé, syntaxe) : seule la première fait servir le jeu de démo.
 */
export function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') {
    if (NETWORK_CODES.has(code) || SERVER_CODES.has(code)) return true;
    // Classes 08 (connexion) et 28 (authentification)
    if (/^(08|28)[0-9A-Z]{3}$/.test(code)) return true;
  }
  return /connection terminated|timeout exceeded when trying to connect|connection timeout/i.test(
    error.message,
  );
}

export interface Database {
  store: CatalogStore;
  /** Une requête minimale, pour savoir si la base répond de nouveau. */
  ping(): Promise<void>;
}

/**
 * Choisit la source à chaque requête de page :
 * - base injoignable : jeu de démo servi tout de suite, et une seule tentative à la fois, en
 *   arrière-plan, au plus toutes les `retryMs` ; la base revient dès qu'elle répond ;
 * - une erreur de connexion en cours de route marque la base injoignable et remonte : une page
 *   ne mélange jamais les deux sources ; une autre erreur remonte sans rien changer.
 */
export class CatalogSelector {
  private down = false;
  private nextTryAt = 0;
  private trying: Promise<void> | null = null;

  constructor(
    private readonly database: () => Promise<Database | null>,
    private readonly demo: () => Promise<Loaded>,
    private readonly options: {
      retryMs: number;
      now?: () => number;
      warn?: (message: string) => void;
    },
  ) {}

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  private warn(message: string): void {
    (this.options.warn ?? console.warn)(`[catalogue] ${message}`);
  }

  private markDown(error: unknown): void {
    if (!this.down) {
      this.warn(
        `Base inaccessible (${error instanceof Error ? error.message : 'erreur'}) : jeu de démo servi, nouvel essai dans ${String(this.options.retryMs / 1000)} s.`,
      );
    }
    this.down = true;
    this.nextTryAt = this.now() + this.options.retryMs;
  }

  /** Tentative en arrière-plan ; résolue quand elle est finie (pour les tests). */
  pending(): Promise<void> {
    return this.trying ?? Promise.resolve();
  }

  private tryAgain(db: Database): void {
    if (this.trying || this.now() < this.nextTryAt) return;
    this.trying = db
      .ping()
      .then(
        () => {
          this.down = false;
          this.warn('Base de nouveau accessible.');
        },
        () => {
          this.nextTryAt = this.now() + this.options.retryMs;
        },
      )
      .finally(() => {
        this.trying = null;
      });
  }

  private async watch<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (isConnectionError(error)) this.markDown(error);
      throw error;
    }
  }

  private guard(store: CatalogStore): CatalogStore {
    return {
      search: (query) => this.watch(() => store.search(query)),
      suggest: (q, limit) => this.watch(() => store.suggest(q, limit)),
      getWork: (id) => this.watch(() => store.getWork(id)),
      getSeries: (slug) => this.watch(() => store.getSeries(slug)),
      related: (work, limit) => this.watch(() => store.related(work, limit)),
      newest: (limit) => this.watch(() => store.newest(limit)),
      topSeries: (limit) => this.watch(() => store.topSeries(limit)),
      byAuthors: (names, limit) => this.watch(() => store.byAuthors(names, limit)),
      formatCounts: () => this.watch(() => store.formatCounts()),
      editionCount: () => this.watch(() => store.editionCount()),
    };
  }

  async load(): Promise<Loaded> {
    const db = await this.database();
    if (!db) return this.demo();
    if (this.down) {
      this.tryAgain(db);
      return this.demo();
    }
    try {
      const totalEditions = await db.store.editionCount();
      return { catalog: this.guard(db.store), source: 'postgres', totalEditions };
    } catch (error) {
      if (!isConnectionError(error)) throw error;
      this.markDown(error);
      return this.demo();
    }
  }
}
