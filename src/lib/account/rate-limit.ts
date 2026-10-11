import 'server-only';
import { createHash } from 'node:crypto';

/**
 * Limite les tentatives de connexion pour que notre serveur ne devienne pas un relais
 * pour deviner des NIP. Mémoire locale à chaque instance : c'est une première barrière.
 * En production, compléter par une règle de limitation du pare-feu Vercel sur `/compte/connexion`.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 10;
const MAX_PER_CARD = 5;

const attempts = new Map<string, { count: number; resetAt: number }>();

function hit(key: string, max: number, now: number): boolean {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

function prune(now: number): void {
  if (attempts.size < 5000) return;
  for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
}

/** Retourne `false` si la tentative dépasse la limite. La carte n'est conservée que hachée. */
export function allowLoginAttempt(ip: string, card: string, now = Date.now()): boolean {
  prune(now);
  const cardKey = createHash('sha256').update(card).digest('hex');
  const ipOk = hit(`ip:${ip}`, MAX_PER_IP, now);
  const cardOk = hit(`card:${cardKey}`, MAX_PER_CARD, now);
  return ipOk && cardOk;
}

/** Une connexion réussie remet le compteur de la carte à zéro. */
export function clearCardAttempts(card: string): void {
  attempts.delete(`card:${createHash('sha256').update(card).digest('hex')}`);
}
