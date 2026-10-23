'use client';

import type { JSX } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Bug, MessageSquare, type LucideIcon } from 'lucide-react';

interface FeedbackKind {
  kind: 'avis' | 'probleme';
  label: string;
  formTitle: string;
  placeholder: string;
  icon: LucideIcon;
}

const KINDS: FeedbackKind[] = [
  {
    kind: 'avis',
    label: 'Donner votre avis',
    formTitle: 'Votre avis',
    placeholder: 'Une idée, un commentaire, un coup de cœur ?',
    icon: MessageSquare,
  },
  {
    kind: 'probleme',
    label: 'Signaler un problème',
    formTitle: 'Signaler un problème',
    placeholder: 'Que s’est-il passé ? Sur quelle page ?',
    icon: Bug,
  },
];

// Ouvre le formulaire Sentry. Sans effet quand Sentry est désactivé (développement).
function openForm({ kind, formTitle, placeholder }: FeedbackKind): void {
  void Sentry.getFeedback()
    ?.createForm({ formTitle, messagePlaceholder: placeholder, tags: { type: kind } })
    .then((form) => {
      form.appendToDom();
      form.open();
    });
}

export function FeedbackButtons(): JSX.Element {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {KINDS.map((item) => (
        <button
          key={item.kind}
          type="button"
          onClick={() => {
            openForm(item);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <item.icon className="h-4 w-4" aria-hidden />
          {item.label}
        </button>
      ))}
    </div>
  );
}
