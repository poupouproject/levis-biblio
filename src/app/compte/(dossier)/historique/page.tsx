import type { JSX } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import { getHistory } from '@/lib/levis/account';
import { withAccount } from '@/lib/account/dal';
import { todayIso } from '@/lib/account/format';
import { HistoryList } from '@/components/account/HistoryList';
import { EmptyState, PageHeader } from '@/components/account/PageParts';

export default async function HistoryPage(): Promise<JSX.Element> {
  const entries = await withAccount(getHistory);
  return (
    <>
      <PageHeader title="Historique" subtitle="Les documents que vous avez empruntés." />
      {entries.length === 0 ? (
        <EmptyState icon={History} title="Aucun historique">
          L’historique est peut-être désactivé.{' '}
          <Link href="/compte/profil" className="font-medium text-[#b88f42] hover:underline">
            Vérifier mes préférences
          </Link>
        </EmptyState>
      ) : (
        <HistoryList entries={entries} today={todayIso()} />
      )}
    </>
  );
}
