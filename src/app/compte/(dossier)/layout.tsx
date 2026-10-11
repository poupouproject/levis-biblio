import type { JSX, ReactNode } from 'react';
import type { Metadata } from 'next';
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
  await requireAccount();
  return (
    <div className="flex flex-col gap-5">
      <AccountNav />
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}
