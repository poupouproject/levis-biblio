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
let nextPruneAt = 0;

function hit(key: string, max: number, now: number): boolean {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

/** Au plus un balayage par minute, et seulement quand la table grossit. */
function prune(now: number): void {
  if (attempts.size < 5000 || now < nextPruneAt) return;
  nextPruneAt = now + 60 * 1000;
  for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
}

/** Les identifiants d'usager sont comparés sans égard à la casse : un seul compteur par carte. */
function cardKey(card: string): string {
  return `card:${createHash('sha256').update(card.toUpperCase()).digest('hex')}`;
}

/** Retourne `false` si la tentative dépasse la limite. La carte n'est conservée que hachée. */
export function allowLoginAttempt(ip: string, card: string, now = Date.now()): boolean {
  prune(now);
  const ipOk = hit(`ip:${ip}`, MAX_PER_IP, now);
  const cardOk = hit(cardKey(card), MAX_PER_CARD, now);
  return ipOk && cardOk;
}

/**
 * Une connexion réussie remet le compteur de la carte à zéro et ne compte pas contre l'adresse IP
 * (plusieurs usagers derrière le même Wi-Fi public ou le même NAT).
 */
export function recordLoginSuccess(ip: string, card: string): void {
  attempts.delete(cardKey(card));
  const entry = attempts.get(`ip:${ip}`);
  if (entry && entry.count > 0) entry.count -= 1;
}
