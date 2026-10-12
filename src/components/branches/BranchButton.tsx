'use client';

import { useState, type JSX } from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { branchByCode } from '@/lib/levis/branches';
import { Dialog } from '@/components/account/Dialog';
import { BranchDetails } from './BranchDetails';

interface BranchButtonProps {
  /** Code de succursale (ex. « AMF »). Inconnu : simple texte, sans fiche. */
  code: string | null;
  /** Texte affiché (souvent le nom tel que fourni par le portail). */
  label: string;
  variant?: 'chip' | 'link';
}

/** Nom de succursale cliquable qui ouvre sa fiche : adresse, heures, itinéraire, appel. */
export function BranchButton({ code, label, variant = 'chip' }: BranchButtonProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const branch = branchByCode(code);

  if (!branch) {
    return variant === 'chip' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
    ) : (
      <span>{label}</span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className={
          variant === 'chip'
            ? 'inline-flex items-center gap-1 rounded-full bg-zinc-100 py-0.5 pr-1.5 pl-2 text-xs font-medium text-zinc-700 underline decoration-zinc-400 decoration-dotted underline-offset-2 hover:bg-[#d4a853]/15 hover:text-[#8a6a2c] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-[#e2c07a]'
            : 'font-medium text-[#b88f42] underline decoration-dotted underline-offset-2 hover:decoration-solid'
        }
      >
        {variant === 'chip' && <MapPin className="h-3.5 w-3.5" aria-hidden />}
        {label}
        {variant === 'chip' && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden />}
        <span className="sr-only"> : adresse, heures et itinéraire</span>
      </button>
      <Dialog
        open={open}
        title={branch.title}
        onClose={() => {
          setOpen(false);
        }}
      >
        <BranchDetails branch={branch} />
      </Dialog>
    </>
  );
}
