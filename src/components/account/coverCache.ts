'use client';

import type { CoverInfo, CoverMap } from '@/types';

/**
 * Couvertures et ISBN déjà reçus pendant cette visite (id → infos, ou null si le portail n'a rien).
 * Vit dans l'onglet seulement : effacé au rechargement (connexion, déconnexion), jamais persisté.
 * N'est écrit que depuis des effets, donc jamais côté serveur, où le module est partagé entre usagers.
 */
const known = new Map<string, CoverInfo | null>();

export function knownCover(id: string): CoverInfo | null | undefined {
  return known.get(id);
}

/**
 * Mémorise toute la réponse reçue, pas seulement l'élément affiché : le sommaire reçoit les
 * couvertures de tous les emprunts et réservations, que les autres onglets réutilisent aussitôt.
 */
export function rememberCovers(map: CoverMap, requestedId: string): void {
  for (const [id, info] of Object.entries(map)) known.set(id, info);
  if (!(requestedId in map)) known.set(requestedId, null);
}
