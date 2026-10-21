// Disponibilité SIMULÉE. Le catalogue public de la Ville (exemplaires, succursales) est protégé
// contre les requêtes automatisées : en attendant un accès officiel, chaque œuvre reçoit des
// exemplaires fictifs, stables d'une visite à l'autre (dérivés de son identifiant).
import { BRANCHES } from '@/lib/levis/branches';

export interface BranchCopies {
  code: string;
  name: string;
  total: number;
  available: number;
}

export interface SimulatedAvailability {
  total: number;
  available: number;
  branches: BranchCopies[];
  /** Retour le plus proche quand tout est prêté (ISO AAAA-MM-JJ). */
  nextReturn: string | null;
  holds: number;
}

/** Hachage FNV-1a : même identifiant → mêmes exemplaires. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function random(seed: string): () => number {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

const cache = new Map<string, SimulatedAvailability>();

export function simulateAvailability(workId: string, today = new Date()): SimulatedAvailability {
  const key = `${workId}|${today.toISOString().slice(0, 10)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const rand = random(workId);
  const branchCount = 1 + Math.floor(rand() * 4);
  // Tirage sans remise : chaque succursale reçoit une clé aléatoire, on garde les premières
  const pool = BRANCHES.map((b) => ({ b, k: rand() }))
    .sort((x, y) => x.k - y.k)
    .slice(0, branchCount)
    .map((x) => x.b);
  const popular = rand() < 0.35;
  const branches = pool
    .map((b) => {
      const total = 1 + Math.floor(rand() * 2);
      const available = popular ? 0 : Math.floor(rand() * (total + 1));
      return { code: b.code, name: b.title.replace('Bibliothèque ', ''), total, available };
    })
    .sort((a, b) => b.available - a.available || a.name.localeCompare(b.name, 'fr'));
  const total = branches.reduce((n, b) => n + b.total, 0);
  const available = branches.reduce((n, b) => n + b.available, 0);
  const returnIn = 2 + Math.floor(rand() * 19);
  const result: SimulatedAvailability = {
    total,
    available,
    branches,
    nextReturn:
      available === 0
        ? new Date(today.getTime() + returnIn * 86_400_000).toISOString().slice(0, 10)
        : null,
    holds: available === 0 ? Math.floor(rand() * 6) : 0,
  };
  if (cache.size > 50_000) cache.clear();
  cache.set(key, result);
  return result;
}
