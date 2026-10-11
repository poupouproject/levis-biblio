import type { JSX, ReactNode } from 'react';
import type { Metadata } from 'next';
import { LogOut } from 'lucide-react';
import { AccountNav } from '@/components/account/AccountNav';
import { requireAccount } from '@/lib/account/dal';
import { logoutAction } from '../actions';

export const metadata: Metadata = {
  title: 'Mon dossier | LévisBiblio',
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const { firstName } = await requireAccount();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="min-w-0 truncate text-sm text-zinc-600 dark:text-zinc-400">
          Connecté
          {firstName ? (
            <>
              {' '}
              en tant que <strong className="text-zinc-900 dark:text-zinc-100">{firstName}</strong>
            </>
          ) : (
            ''
          )}
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Se déconnecter
          </button>
        </form>
      </div>
      <AccountNav />
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}
