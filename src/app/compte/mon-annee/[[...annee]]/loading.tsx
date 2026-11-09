import type { JSX } from 'react';
import { Loader2 } from 'lucide-react';

/** Le temps de lire le dossier : déjà plein écran, aux couleurs du récapitulatif. */
export default function Loading(): JSX.Element {
  return (
    <div
      role="status"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-linear-to-br from-[#3d2c5e] to-[#5b2333] text-white"
    >
      <Loader2 className="h-10 w-10 animate-spin motion-reduce:animate-none" aria-hidden />
      <p className="text-lg font-semibold">Préparation de votre année…</p>
    </div>
  );
}
