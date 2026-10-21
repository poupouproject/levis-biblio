import type { JSX, ReactNode } from 'react';
import type { Metadata } from 'next';
import { FlaskConical } from 'lucide-react';
import { AccountNav } from '@/components/account/AccountNav';
import { requireAccount } from '@/lib/account/dal';

export const metadata: Metadata = {
  title: 'Mon dossier | LévisBiblio',
  robots: { index: false, follow: false },
};

// L'identité et la déconnexion sont dans le menu de compte de l'en-tête (AccountMenu).
export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const { demo } = await requireAccount();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {demo && (
        <p className="flex items-center gap-2 rounded-xl border border-[#d4a853]/40 bg-[#d4a853]/10 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          <FlaskConical className="h-4 w-4 flex-shrink-0 text-[#d4a853]" aria-hidden />
          Démonstration : dossier fictif, rien n’est envoyé aux bibliothèques.
        </p>
      )}
      <AccountNav />
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}
