import type { JSX } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CheckCircle2, Clock, ExternalLink, FlaskConical, Library, LogIn } from 'lucide-react';
import { LoginForm } from '@/components/account/LoginForm';
import { isDemoMode } from '@/lib/account/demo';
import { getAccountSession, isSignedIn } from '@/lib/account/session';
import { CARD_FLASH_COOKIE, LOGIN_ERRORS, isLoginErrorCode } from '@/lib/account/login';
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
  searchParams: Promise<{ raison?: string; erreur?: string }>;
}): Promise<JSX.Element> {
  const { raison, erreur } = await searchParams;
  const session = await getAccountSession();
  // Après une expiration, on reste ici même si un cookie traîne : sinon, boucle avec le dossier.
  if (isSignedIn(session) && raison !== 'expiree') redirect('/compte');
  const reason = raison === 'expiree' || raison === 'deconnecte' ? REASONS[raison] : null;
  const error = isLoginErrorCode(erreur) ? LOGIN_ERRORS[erreur] : null;
  const defaultCard = error ? ((await cookies()).get(CARD_FLASH_COOKIE)?.value ?? '') : '';

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

      {isDemoMode() ? (
        <DemoLogin />
      ) : (
        <>
          <LoginForm error={error} defaultCard={defaultCard} />
          <a
            href={`${LEVIS_ORIGIN}${LEVIS_LOGIN_PATH}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-[#b88f42] dark:text-zinc-400"
          >
            NIP oublié? Le récupérer sur le portail des bibliothèques
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </>
      )}
    </div>
  );
}

/** Mode démonstration : pas de carte ni de NIP, un dossier fictif s'ouvre directement. */
function DemoLogin(): JSX.Element {
  return (
    <form action="/compte/connexion/ouvrir" method="post" className="flex flex-col gap-4">
      <div className="flex gap-3 rounded-xl border border-[#d4a853]/40 bg-[#d4a853]/10 p-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <FlaskConical className="h-5 w-5 flex-shrink-0 text-[#d4a853]" aria-hidden />
        <p>
          <strong className="font-semibold">Mode démonstration.</strong> En attendant un accès
          officiel au portail de la Ville, Mon dossier s’ouvre sur un dossier fictif : emprunts,
          réservations et historique d’exemple. Vous pouvez tout essayer, rien n’est envoyé aux
          bibliothèques.
        </p>
      </div>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#d4a853] px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#b88f42]"
      >
        <LogIn className="h-5 w-5" aria-hidden />
        Explorer le dossier de démonstration
      </button>
    </form>
  );
}
