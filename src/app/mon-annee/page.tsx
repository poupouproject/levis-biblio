import type { JSX } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Sparkles } from 'lucide-react';

const TITLE = 'Votre année à la bibliothèque | LévisBiblio';
const DESCRIPTION =
  'Combien de livres cette année, votre mois le plus occupé, votre série préférée : découvrez votre récapitulatif des bibliothèques de Lévis.';

// Aperçu de lien générique (opengraph-image.tsx) : le lien ne contient les données de personne.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website', locale: 'fr_CA' },
};

/**
 * Adresse courte à partager (lien, code QR), la même pour tout le monde.
 *
 * Pas une simple redirection : le cookie de session est `SameSite=Strict`, donc absent quand le
 * lien est ouvert depuis une autre application (Messenger, appareil photo). Le bouton, lui,
 * navigue depuis notre site : le cookie suit, et une personne déjà connectée arrive directement
 * sur son année ; sinon, la connexion la ramène au récapitulatif.
 */
export default function ShareLandingPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-4 sm:pt-10">
      <div className="flex flex-col gap-5 rounded-3xl bg-linear-to-br from-[#3d2c5e] to-[#5b2333] p-7 text-white shadow-lg">
        <p className="text-sm font-semibold tracking-[0.2em] text-white/80 uppercase">
          LévisBiblio
        </p>
        <h1 className="text-4xl leading-tight font-black tracking-tight">
          Votre année à la <span className="text-[#f0c987]">bibliothèque</span>
        </h1>
        <p className="text-base leading-relaxed text-white/90">
          Le nombre de documents empruntés, votre mois le plus occupé, votre plume et votre série de
          l’année, en story à faire défiler.
        </p>
        <Link
          href="/compte/mon-annee"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f0c987] px-5 py-3.5 text-lg font-bold text-[#2f2f2f] hover:bg-[#fde2b8] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          Voir mon année
        </Link>
      </div>
      <p className="flex gap-3 rounded-xl bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        <ShieldCheck className="h-5 w-5 flex-shrink-0 text-[#d4a853]" aria-hidden />
        Connectez-vous avec votre carte de bibliothèque. Le récapitulatif est calculé à partir de
        votre dossier au moment où vous l’ouvrez : rien n’est conservé, et personne d’autre ne le
        voit à moins que vous le partagiez.
      </p>
    </div>
  );
}
