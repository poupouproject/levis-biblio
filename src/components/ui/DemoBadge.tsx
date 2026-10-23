'use client';

import { useEffect, type JSX } from 'react';
import { toast } from 'react-toastify';

const REPO_URL = 'https://github.com/poupouproject/levis-biblio';
const DEMO_TOAST_ID = 'mode-demo';

/** Plus long que les autres notifications : le message s’adresse au visiteur, pas à une action. */
const DEMO_TOAST_DURATION_MS = 20_000;

function showDemoToast(): void {
  // `theme` lu ici : au premier chargement, le Toaster n’a pas encore basculé en sombre (hydratation).
  // `toastId` : un second clic (ou le double effet de React en développement) ne l’empile pas.
  toast.info(
    <div className="text-[0.8125rem] leading-snug sm:text-sm sm:leading-normal">
      <p className="font-semibold">Données fictives et partielles</p>
      <p className="mt-1">
        Nous attendons les autorisations de la Ville de Lévis pour accéder aux vraies données des
        bibliothèques. D’ici là, ce site fonctionne en mode démonstration.
      </p>
      <p className="mt-1">
        Parlez-en autour de vous : cela nous aide à obtenir les accès qui nous sont bloqués pour
        l’instant. Toute personne est la bienvenue pour contribuer au projet sur{' '}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          GitHub
        </a>
        .
      </p>
    </div>,
    {
      toastId: DEMO_TOAST_ID,
      autoClose: DEMO_TOAST_DURATION_MS,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    },
  );
}

/**
 * Pastille « Démo » de l’en-tête (mode démonstration seulement). Le message d’explication
 * s’affiche au premier chargement et chaque fois qu’on clique sur la pastille.
 */
export function DemoBadge(): JSX.Element {
  useEffect(() => {
    showDemoToast();
  }, []);

  return (
    <button
      type="button"
      onClick={showDemoToast}
      aria-label="Démo : pourquoi les données sont fictives"
      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-sky-500/60 bg-sky-500/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-sky-800 uppercase hover:bg-sky-500/20 dark:text-sky-300"
    >
      {/* Point qui pulse : rappelle qu’on est en démo même si le message a été fermé.
          Immobile si la personne a demandé de réduire les animations. */}
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-sky-500 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
      </span>
      Démo
    </button>
  );
}
