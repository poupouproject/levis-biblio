import { Suspense, type JSX } from 'react';
import { BookOpen } from 'lucide-react';
import { getCheckouts, type CheckoutsResult } from '@/lib/levis/account';
import { withAccount } from '@/lib/account/dal';
import { plural, todayIso } from '@/lib/account/format';
import { NO_COVERS, PLACEHOLDER_TODAY, placeholderCheckouts } from '@/lib/account/placeholders';
import { CheckoutsList } from '@/components/account/CheckoutsList';
import { EmptyState, PageHeader } from '@/components/account/PageParts';
import { SkeletonScope } from '@/components/ui/Skeleton';

export default function CheckoutsPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <SkeletonScope label="Chargement de vos emprunts…">
          <CheckoutsContent
            {...placeholderCheckouts(3)}
            covers={NO_COVERS}
            today={PLACEHOLDER_TODAY}
          />
        </SkeletonScope>
      }
    >
      <CheckoutsSection />
    </Suspense>
  );
}

async function CheckoutsSection(): Promise<JSX.Element> {
  const data = await withAccount(getCheckouts);
  return <CheckoutsContent {...data} today={todayIso()} />;
}

function CheckoutsContent({
  checkouts,
  summary,
  covers,
  today,
}: CheckoutsResult & { today: string }): JSX.Element {
  const subtitle =
    summary.overdue > 0
      ? `${plural(summary.total, 'document')} · ${plural(summary.overdue, 'en retard', 'en retard')}`
      : 'Triés par date de retour.';

  return (
    <>
      <PageHeader title="Mes emprunts" subtitle={subtitle} />
      {checkouts.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aucun emprunt en cours">
          Les documents que vous empruntez apparaîtront ici avec leur date de retour.
        </EmptyState>
      ) : (
        <CheckoutsList checkouts={checkouts} covers={covers} today={today} />
      )}
    </>
  );
}
