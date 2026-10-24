'use client';

import type { JSX } from 'react';
import { Slide, ToastContainer } from 'react-toastify';

/** Durée d'affichage de toutes les notifications ; une barre indique le temps restant. */
export const TOAST_DURATION_MS = 10_000;

/**
 * Notifications de l'application (React-Toastify). En haut à droite, pleine largeur sur mobile :
 * le bas de l'écran y est occupé par les barres d'action (« Renouveler la sélection »).
 * La barre de progression et la pause (survol, onglet en arrière-plan) sont celles de la librairie.
 *
 * Thème toujours « light » : le sombre vient de globals.css (classe `dark` de <html>). Un thème
 * calculé en JS ne basculait qu'après l'hydratation, trop tard pour une notification du
 * premier rendu (celle du mode démonstration).
 */
export function Toaster(): JSX.Element {
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
      theme="light"
    />
  );
}
