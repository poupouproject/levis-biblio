'use client';

import { useEffect, type JSX } from 'react';
import { toast } from 'react-toastify';
import { TOAST_DURATION_MS } from '@/components/ui/Toaster';
import { REPO_URL } from '@/lib/site';

const DEMO_TOAST_ID = 'mode-demo';
const DEMO_TOAST_SEEN_KEY = 'lb-demo-toast-vue';

/** Plus long que les autres notifications : le message s’adresse au visiteur, pas à une action. */
const DEMO_TOAST_DURATION_MS = 2 * TOAST_DURATION_MS;

/** Une fois par session d’onglet : un rechargement ne ressert pas le message à qui l’a déjà lu. */
function demoToastAlreadySeen(): boolean {
  try {
    return sessionStorage.getItem(DEMO_TOAST_SEEN_KEY) === '1';
  } catch {
    // Stockage inaccessible (navigation privée stricte…) : on l’affiche, sans mémoire.
    return false;
  }
}

function markDemoToastSeen(): void {
  try {
    sessionStorage.setItem(DEMO_TOAST_SEEN_KEY, '1');
  } catch {
    // Voir demoToastAlreadySeen.
  }
}

function showDemoToast(): void {
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
    },
  );
}

/**
 * Pastille « Démo » de l’en-tête (mode démonstration seulement). Le message d’explication
 * s’affiche à la première visite de la session et chaque fois qu’on clique sur la pastille.
 */
export function DemoBadge(): JSX.Element {
  useEffect(() => {
    if (demoToastAlreadySeen()) return;
    // Après le montage, pas pendant : en développement, StrictMode démonte et remonte le
    // Toaster, qui emporterait une notification émise trop tôt. Marquée « vue » une fois émise.
    const timer = setTimeout(() => {
      showDemoToast();
      markDemoToastSeen();
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={showDemoToast}
      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-sky-500/60 bg-sky-500/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-sky-800 uppercase hover:bg-sky-500/20 dark:text-sky-300"
    >
      {/* Point qui pulse : rappelle qu’on est en démo même si le message a été fermé.
          Immobile si la personne a demandé de réduire les animations. */}
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-sky-500 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
      </span>
      Démo
      <span className="sr-only"> : afficher pourquoi les données sont fictives</span>
    </button>
  );
}
