import { Suspense, type JSX } from 'react';
import { BookMarked } from 'lucide-react';
import { getHolds, type HoldsResult } from '@/lib/levis/account';
import { BRANCHES } from '@/lib/levis/config';
import { withAccount } from '@/lib/account/dal';
import { plural, todayIso } from '@/lib/account/format';
import { NO_COVERS, PLACEHOLDER_TODAY, placeholderHolds } from '@/lib/account/placeholders';
import { HoldsList } from '@/components/account/HoldsList';
import { EmptyState, PageHeader } from '@/components/account/PageParts';
import { SkeletonScope } from '@/components/ui/Skeleton';

export default function HoldsPage(): JSX.Element {
  const holds = placeholderHolds(3);
  return (
    <Suspense
      fallback={
        <SkeletonScope label="Chargement de vos réservations…">
          <HoldsContent
            holds={holds}
            summary={{ total: holds.length, ready: 0 }}
            covers={NO_COVERS}
            today={PLACEHOLDER_TODAY}
          />
        </SkeletonScope>
      }
    >
      <HoldsSection />
    </Suspense>
  );
}

async function HoldsSection(): Promise<JSX.Element> {
  const data = await withAccount(getHolds);
  return <HoldsContent {...data} today={todayIso()} />;
}

function HoldsContent({
  holds,
  summary,
  covers,
  today,
}: HoldsResult & { today: string }): JSX.Element {
  const subtitle =
    summary.ready > 0
      ? `${plural(summary.total, 'réservation')} · ${plural(summary.ready, 'prête', 'prêtes')} à récupérer`
      : plural(summary.total, 'réservation');

  return (
    <>
      <PageHeader title="Mes réservations" subtitle={subtitle} />
      {holds.length === 0 ? (
        <EmptyState icon={BookMarked} title="Aucune réservation">
          Réservez un document depuis le catalogue : il apparaîtra ici avec votre rang dans la file.
        </EmptyState>
      ) : (
        <HoldsList holds={holds} covers={covers} branches={BRANCHES} today={today} />
      )}
    </>
  );
}
