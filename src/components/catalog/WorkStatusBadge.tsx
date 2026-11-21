'use client';

import { useEffect, useState, type JSX } from 'react';
import Link from 'next/link';
import { BookMarked, BookOpen, ChevronRight, History, type LucideIcon } from 'lucide-react';
import type { WorkStatus, WorkStatusResponse } from '@/types';
import { workStatusLabel, type WorkStatusTone } from '@/lib/account/work-status-label';

const TONES: Record<WorkStatusTone, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  ready:
    'border-[#d4a853] bg-[#d4a853]/15 text-[#6b5122] dark:border-[#d4a853]/60 dark:text-[#e2c07a]',
  warning:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  neutral:
    'border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200',
};

const ICONS: Record<WorkStatus['kind'], LucideIcon> = {
  checkout: BookOpen,
  hold: BookMarked,
  history: History,
};

/**
 * Ce que l'usager connecté a de cette œuvre : en main, réservée (rang dans la file), déjà
 * empruntée. Demandé après l'affichage, la fiche restant la même pour tous ; rien hors connexion.
 */
export function WorkStatusBadge({ workId }: { workId: string }): JSX.Element | null {
  const [status, setStatus] = useState<WorkStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/compte/etat-oeuvre?oeuvre=${encodeURIComponent(workId)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<WorkStatusResponse>) : { status: null }))
      .then((body) => {
        setStatus(body.status);
      })
      .catch(() => {
        // Requête annulée ou hors ligne : la fiche reste sans état personnel
      });
    return () => {
      controller.abort();
    };
  }, [workId]);

  if (!status) return null;
  const label = workStatusLabel(status);
  const Icon = ICONS[status.kind];
  return (
    <div
      role="status"
      className={`flex w-fit max-w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm ${TONES[label.tone]}`}
    >
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">{label.title}</p>
        {label.detail && <p className="opacity-90">{label.detail}</p>}
        <Link
          href={label.href}
          className="mt-1 inline-flex items-center gap-0.5 font-medium underline-offset-4 hover:underline"
        >
          {label.linkLabel}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
