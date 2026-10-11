import type { JSX } from 'react';
import { BookOpen } from 'lucide-react';
import { getCheckouts } from '@/lib/levis/account';
import { withAccount } from '@/lib/account/dal';
import { plural, todayIso } from '@/lib/account/format';
import { CheckoutsList } from '@/components/account/CheckoutsList';
import { EmptyState, PageHeader } from '@/components/account/PageParts';

export default async function CheckoutsPage(): Promise<JSX.Element> {
  const { checkouts, summary, covers } = await withAccount(getCheckouts);
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
        <CheckoutsList checkouts={checkouts} covers={covers} today={todayIso()} />
      )}
    </>
  );
}
