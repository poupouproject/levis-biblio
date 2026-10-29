import { Suspense, type JSX, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { FlaskConical } from 'lucide-react';
import { AccountNav } from '@/components/account/AccountNav';
import { requireAccount } from '@/lib/account/dal';

export const metadata: Metadata = {
  title: 'Mon dossier | LévisBiblio',
  robots: { index: false, follow: false },
};

// L'identité et la déconnexion sont dans le menu de compte de l'en-tête (AccountMenu).
// Onglets et titres sont dans la coquille statique ; la session se lit à la requête : ici (sans
// session, renvoi à la connexion) et dans chaque section de page (withAccount).
export default function AccountLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Suspense fallback={null}>
        <DemoNotice />
      </Suspense>
      <AccountNav />
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

async function DemoNotice(): Promise<JSX.Element | null> {
  const { demo } = await requireAccount();
  if (!demo) return null;
  return (
    <p className="flex items-center gap-2 rounded-xl border border-[#d4a853]/40 bg-[#d4a853]/10 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
      <FlaskConical className="h-4 w-4 flex-shrink-0 text-[#d4a853]" aria-hidden />
      Démonstration : dossier fictif, rien n’est envoyé aux bibliothèques.
    </p>
  );
}
