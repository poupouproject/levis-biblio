import 'server-only';
import type { Pool } from 'pg';
import { databaseConfig } from './connexion';
import { injectNotice } from './ingestion';
import type { RawEdition } from './types';

/**
 * Ajout au catalogue des notices découvertes dans Mon dossier (absentes du relevé). Connexion
 * distincte, au rôle limité `levisbiblio_injection` (lire, ajouter, mettre à jour ; jamais
 * supprimer) : migration 20261030000000_injection_mon_dossier.sql. Sans
 * DATABASE_INJECTION_URL, rien n'est ajouté.
 */
export function injectionEnabled(): boolean {
  return Boolean(process.env.DATABASE_INJECTION_URL);
}

const store = globalThis as typeof globalThis & {
  __levisInjection?: { url: string; pool: Pool } | undefined;
};

async function pool(): Promise<Pool | null> {
  const url = process.env.DATABASE_INJECTION_URL;
  if (!url) return null;
  if (store.__levisInjection?.url !== url) {
    void store.__levisInjection?.pool.end();
    const { Pool } = await import('pg');
    const created = new Pool({
      ...databaseConfig(url),
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 8_000,
      query_timeout: 10_000,
      application_name: 'levisbiblio-injection',
    });
    created.on('error', (error) => {
      console.warn(`[catalogue] Connexion d'injection perdue : ${error.message}`);
    });
    store.__levisInjection = { url, pool: created };
  }
  return store.__levisInjection.pool;
}

/**
 * Une transaction par notice : une notice refusée n'empêche pas les autres. Ne lève jamais.
 * Les journaux ne nomment jamais le document (il viendrait du dossier d'un usager).
 */
export async function injectNotices(notices: RawEdition[]): Promise<void> {
  if (notices.length === 0) return;
  const db = await pool();
  if (!db) return;
  for (const raw of notices) {
    let client;
    try {
      client = await db.connect();
      await client.query('begin');
      await injectNotice(client, raw, { partielle: true });
      await client.query('commit');
    } catch (error) {
      await client?.query('rollback').catch(() => undefined);
      const code = (error as { code?: unknown }).code;
      console.warn(
        `[catalogue] Notice non ajoutée (${typeof code === 'string' ? code : 'erreur'}).`,
      );
    } finally {
      client?.release();
    }
  }
}
