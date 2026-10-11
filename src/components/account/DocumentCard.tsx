import type { JSX, ReactNode } from 'react';

interface DocumentCardProps {
  cover: ReactNode;
  title: string;
  author: string | null;
  /** Pastilles d'information sous l'auteur (échéance, succursale, rang…). */
  meta?: ReactNode;
  /** Messages sous les pastilles (alertes, résultat d'une action). */
  children?: ReactNode;
  /** Élément en coin supérieur droit (case de sélection). */
  corner?: ReactNode;
  /** Boutons du pied de carte, répartis sur toute la largeur. */
  actions?: ReactNode;
  tone?: 'default' | 'selected' | 'success';
}

const TONES = {
  default: 'border-zinc-200 dark:border-zinc-800',
  selected: 'border-[#d4a853] ring-1 ring-[#d4a853]',
  success: 'border-green-300 dark:border-green-800',
} as const;

/** Carte d'un document du dossier (emprunt, réservation). */
export function DocumentCard({
  cover,
  title,
  author,
  meta,
  children,
  corner,
  actions,
  tone = 'default',
}: DocumentCardProps): JSX.Element {
  return (
    <li
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors dark:bg-[#1a1a1a] ${TONES[tone]}`}
    >
      <div className="flex gap-4 p-4">
        {cover}
        <div className={`flex min-w-0 flex-1 flex-col gap-1.5 ${corner ? 'pr-8' : ''}`}>
          <h3 className="line-clamp-3 leading-snug font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          {author && (
            <p className="line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">{author}</p>
          )}
          {meta && <div className="mt-1 flex flex-wrap items-center gap-1.5">{meta}</div>}
          {children}
        </div>
      </div>
      {corner && <div className="absolute top-2 right-2">{corner}</div>}
      {actions && (
        <div className="flex divide-x divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {actions}
        </div>
      )}
    </li>
  );
}

interface CardActionProps {
  children: string;
  icon: JSX.Element;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

/** Bouton de pied de carte : pleine hauteur, grande zone tactile. */
export function CardAction({
  children,
  icon,
  onClick,
  disabled = false,
  danger = false,
}: CardActionProps): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        danger
          ? 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
          : 'text-zinc-700 hover:bg-zinc-50 hover:text-[#b88f42] dark:text-zinc-300 dark:hover:bg-zinc-800/60'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Petite pastille d'information neutre. */
export function MetaChip({
  children,
  mono = false,
}: {
  children: ReactNode;
  mono?: boolean;
}): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ${
        mono ? 'font-mono' : 'font-medium'
      }`}
    >
      {children}
    </span>
  );
}
