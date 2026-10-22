'use client';

import { useSyncExternalStore, type JSX } from 'react';
import { Toaster as Sonner } from 'sonner';

// Le thème suit la classe `dark` de <html> (sélecteur Auto / Clair / Sombre), pas seulement le système.
const subscribe = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => {
    observer.disconnect();
  };
};
const isDark = (): boolean => document.documentElement.classList.contains('dark');

/**
 * Notifications de l'application (bibliothèque Sonner). En haut au centre : le bas de l'écran
 * est occupé, sur mobile, par les barres d'action (« Renouveler la sélection »).
 */
export function Toaster(): JSX.Element {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <Sonner
      position="top-center"
      offset={72}
      mobileOffset={{ top: 64 }}
      theme={dark ? 'dark' : 'light'}
      richColors
      expand
      closeButton
      visibleToasts={4}
      toastOptions={{ className: 'text-sm' }}
    />
  );
}
