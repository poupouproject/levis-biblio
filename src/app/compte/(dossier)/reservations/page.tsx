import type { JSX } from 'react';
import { BookMarked } from 'lucide-react';
import { getHolds } from '@/lib/levis/account';
import { BRANCHES } from '@/lib/levis/config';
import { withAccount } from '@/lib/account/dal';
import { plural, todayIso } from '@/lib/account/format';
import { HoldsList } from '@/components/account/HoldsList';
import { EmptyState, PageHeader } from '@/components/account/PageParts';

export default async function HoldsPage(): Promise<JSX.Element> {
  const { holds, summary, covers } = await withAccount(getHolds);
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
        <HoldsList holds={holds} covers={covers} branches={BRANCHES} today={todayIso()} />
      )}
    </>
  );
}
