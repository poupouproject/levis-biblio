import type { JSX } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2, Clock, ExternalLink, Library } from 'lucide-react';
import { LoginForm } from '@/components/account/LoginForm';
import { getAccountSession } from '@/lib/account/session';
import { LEVIS_ORIGIN, LEVIS_LOGIN_PATH } from '@/lib/levis/config';

export const metadata: Metadata = {
  title: 'Connexion — Mon dossier | LévisBiblio',
  robots: { index: false, follow: false },
};

const REASONS = {
  expiree: {
    icon: Clock,
    text: 'Votre session a expiré. Reconnectez-vous pour continuer.',
    tone: 'amber',
  },
  deconnecte: { icon: CheckCircle2, text: 'Vous êtes déconnecté. À bientôt!', tone: 'green' },
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ raison?: string }>;
}): Promise<JSX.Element> {
  const session = await getAccountSession();
  if (session.levis) redirect('/compte');
  const { raison } = await searchParams;
  const reason = raison === 'expiree' || raison === 'deconnecte' ? REASONS[raison] : null;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 pt-4 sm:pt-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-2xl bg-[#d4a853]/15 p-3 text-[#d4a853]">
          <Library className="h-8 w-8" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Mon dossier
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Vos emprunts, réservations et amendes, au même endroit.
          </p>
        </div>
      </div>

      {reason && (
        <p
          role="status"
          className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-medium ${
            reason.tone === 'amber'
              ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
              : 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
          }`}
        >
          <reason.icon className="h-4 w-4 flex-shrink-0" aria-hidden />
          {reason.text}
        </p>
      )}

      <LoginForm />

      <a
        href={`${LEVIS_ORIGIN}${LEVIS_LOGIN_PATH}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-[#b88f42] dark:text-zinc-400"
      >
        NIP oublié? Le récupérer sur le portail des bibliothèques
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}
