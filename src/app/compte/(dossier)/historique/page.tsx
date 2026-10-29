import { Suspense, type JSX } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import type { HistoryEntry } from '@/types';
import { getHistory } from '@/lib/levis/account';
import { withAccount } from '@/lib/account/dal';
import { todayIso } from '@/lib/account/format';
import { PLACEHOLDER_TODAY, placeholderHistory } from '@/lib/account/placeholders';
import { HistoryList } from '@/components/account/HistoryList';
import { EmptyState, PageHeader } from '@/components/account/PageParts';
import { SkeletonScope } from '@/components/ui/Skeleton';

export default function HistoryPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Historique" subtitle="Les documents que vous avez empruntés." />
      <Suspense
        fallback={
          <SkeletonScope label="Chargement de votre historique…">
            <HistoryContent entries={placeholderHistory(6)} today={PLACEHOLDER_TODAY} />
          </SkeletonScope>
        }
      >
        <HistorySection />
      </Suspense>
    </>
  );
}

async function HistorySection(): Promise<JSX.Element> {
  const entries = await withAccount(getHistory);
  return <HistoryContent entries={entries} today={todayIso()} />;
}

function HistoryContent({
  entries,
  today,
}: {
  entries: HistoryEntry[];
  today: string;
}): JSX.Element {
  if (entries.length === 0) {
    return (
      <EmptyState icon={History} title="Aucun historique">
        L’historique est peut-être désactivé.{' '}
        <Link href="/compte/profil" className="font-medium text-[#b88f42] hover:underline">
          Vérifier mes préférences
        </Link>
      </EmptyState>
    );
  }
  return <HistoryList entries={entries} today={today} />;
}
