'use client';

import { useSyncExternalStore, type JSX } from 'react';
import { Slide, ToastContainer } from 'react-toastify';

/** Durée d'affichage de toutes les notifications ; une barre indique le temps restant. */
export const TOAST_DURATION_MS = 10_000;

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
 * Notifications de l'application (React-Toastify). En haut à droite, pleine largeur sur mobile :
 * le bas de l'écran y est occupé par les barres d'action (« Renouveler la sélection »).
 * La barre de progression et la pause (survol, onglet en arrière-plan) sont celles de la librairie.
 */
export function Toaster(): JSX.Element {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <ToastContainer
      position="top-right"
      autoClose={TOAST_DURATION_MS}
      pauseOnHover
      pauseOnFocusLoss
      closeOnClick={false}
      draggable
      newestOnTop
      limit={4}
      transition={Slide}
      theme={dark ? 'dark' : 'light'}
    />
  );
}
