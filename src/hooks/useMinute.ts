'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void): (() => void) => {
  const id = setInterval(onChange, 30_000);
  return () => {
    clearInterval(id);
  };
};
const getSnapshot = (): number => Math.floor(Date.now() / 60_000);
const getServerSnapshot = (): null => null;

/**
 * Minute courante (horodatage / 60 000), rafraîchie toutes les 30 s.
 * `null` côté serveur et au premier rendu : ce qui dépend de l'heure (ouvert / fermé)
 * ne s'affiche qu'une fois dans le navigateur, sans décalage d'hydratation.
 */
export function useMinute(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
