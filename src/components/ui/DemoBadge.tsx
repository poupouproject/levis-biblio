'use client';

import { useEffect, type JSX } from 'react';
import { toast } from 'react-toastify';

const REPO_URL = 'https://github.com/poupouproject/levis-biblio';
const DEMO_TOAST_ID = 'mode-demo';

/** Plus long que les autres notifications : le message s’adresse au visiteur, pas à une action. */
const DEMO_TOAST_DURATION_MS = 20_000;

function showDemoToast(): void {
  // `toastId` : un second clic (ou le double effet de React en développement) ne l’empile pas.
  toast.info(
    <div className="text-sm">
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
    { toastId: DEMO_TOAST_ID, autoClose: DEMO_TOAST_DURATION_MS },
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
      className="cursor-pointer rounded-full border border-sky-500/60 bg-sky-500/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-sky-800 uppercase hover:bg-sky-500/20 dark:text-sky-300"
    >
      Démo
    </button>
  );
}
