import { Suspense, type JSX } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  History,
  MapPin,
  PackageCheck,
  Receipt,
} from 'lucide-react';
import { getOverview, type CheckoutsResult, type HoldsResult } from '@/lib/levis/account';
import { requireAccount, withAccount } from '@/lib/account/dal';
import { daysUntil, formatDate, plural, relativeDue, todayIso } from '@/lib/account/format';
import {
  NO_COVERS,
  PLACEHOLDER_FINES,
  PLACEHOLDER_TODAY,
  placeholderCheckouts,
  placeholderHolds,
} from '@/lib/account/placeholders';
import type { Fines } from '@/types';
import { Card, PageHeader, StatCard } from '@/components/account/PageParts';
import { StreamedCover } from '@/components/account/StreamedCover';
import { DueBadge } from '@/components/account/DueBadge';
import { BranchButton } from '@/components/branches/BranchButton';
import { SkeletonScope } from '@/components/ui/Skeleton';

export default function OverviewPage(): JSX.Element {
  const placeholderHoldList = placeholderHolds(2);
  return (
    <>
      <Suspense fallback={<PageHeader title="Bonjour" subtitle="" />}>
        <Greeting />
      </Suspense>
      <Suspense
        fallback={
          <SkeletonScope label="Chargement de votre dossier…">
            <OverviewContent
              checkouts={{ ...placeholderCheckouts(3), covers: NO_COVERS }}
              holds={{
                holds: placeholderHoldList,
                summary: { total: placeholderHoldList.length, ready: 0 },
                covers: NO_COVERS,
              }}
              fines={PLACEHOLDER_FINES}
              today={PLACEHOLDER_TODAY}
            />
          </SkeletonScope>
        }
      >
        <OverviewSection />
      </Suspense>
    </>
  );
}

/** Prénom et date du jour : propres à la requête, hors de la coquille statique. */
async function Greeting(): Promise<JSX.Element> {
  const { firstName } = await requireAccount();
  return (
    <PageHeader
      title={firstName ? `Bonjour ${firstName}` : 'Bonjour'}
      subtitle={new Date().toLocaleDateString('fr-CA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Toronto',
      })}
    />
  );
}

async function OverviewSection(): Promise<JSX.Element> {
  const data = await withAccount(getOverview);
  return <OverviewContent {...data} today={todayIso()} />;
}

interface OverviewContentProps {
  checkouts: CheckoutsResult;
  holds: HoldsResult;
  fines: Fines;
  today: string;
}

function OverviewContent({
  checkouts: c,
  holds: h,
  fines,
  today,
}: OverviewContentProps): JSX.Element {
  const { checkouts } = c;
  const { holds } = h;
  const overdue = checkouts.filter((x) => x.dueDate && daysUntil(x.dueDate, today) < 0);
  const ready = holds.filter((x) => x.status === 'ready');
  const nextDue = checkouts.find((x) => x.dueDate)?.dueDate ?? null;
  const upcoming = checkouts.slice(0, 3);

  return (
    <>
      {overdue.length > 0 && (
        <Link
          href="/compte/emprunts"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
          <span>
            <strong className="block">
              {plural(overdue.length, 'document en retard', 'documents en retard')}
            </strong>
            <span className="text-sm">Rapportez-les ou renouvelez-les dès que possible.</span>
          </span>
        </Link>
      )}

      {ready.length > 0 && (
        <Link
          href="/compte/reservations"
          className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200"
        >
          <PackageCheck className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
          <span>
            <strong className="block">
              {plural(ready.length, 'réservation prête', 'réservations prêtes')} à récupérer
            </strong>
            <span className="flex items-center gap-1 text-sm">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {[...new Set(ready.map((x) => x.pickupLibrary))].join(', ')}
            </span>
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          href="/compte/emprunts"
          icon={BookOpen}
          label="Emprunts"
          value={String(c.summary.total)}
          {...(nextDue
            ? { detail: `Prochain retour : ${relativeDue(nextDue, today).toLowerCase()}` }
            : {})}
          tone={overdue.length > 0 ? 'alert' : 'default'}
        />
        <StatCard
          href="/compte/reservations"
          icon={BookMarked}
          label="Réservations"
          value={String(h.summary.total)}
          detail={
            ready.length > 0 ? `${String(ready.length)} prête(s)` : 'Aucune prête pour l’instant'
          }
          tone={ready.length > 0 ? 'success' : 'default'}
        />
        <StatCard
          href="/compte/amendes"
          icon={Receipt}
          label="Amendes"
          value={fines.amountDueLabel}
          detail={fines.amountDue > 0 ? 'À régler' : 'Aucun montant dû'}
          tone={fines.amountDue > 0 ? 'alert' : 'default'}
        />
        <StatCard
          href="/compte/historique"
          icon={History}
          label="Historique"
          value="Voir"
          detail="Vos lectures passées"
        />
      </div>

      {upcoming.length > 0 && (
        <Card
          title="Prochains retours"
          icon={BookOpen}
          action={
            <Link
              href="/compte/emprunts"
              className="text-sm font-medium text-[#b88f42] hover:underline"
            >
              Tout voir
            </Link>
          }
        >
          <ul className="flex flex-col gap-3">
            {upcoming.map((x) => (
              <li key={x.barcode} className="flex items-center gap-3">
                <StreamedCover covers={c.covers} id={x.barcode} title={x.title} size="sm" />
                <div className="flex min-w-0 flex-grow flex-col gap-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {x.title}
                  </p>
                  <DueBadge dueDate={x.dueDate} today={today} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {ready.length > 0 && (
        <Card title="À récupérer" icon={PackageCheck}>
          <ul className="flex flex-col gap-3">
            {ready.map((x) => (
              <li key={x.key} className="flex items-center gap-3">
                <StreamedCover covers={h.covers} id={x.holdId} title={x.title} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {x.title}
                  </p>
                  <div className="text-xs text-zinc-500">
                    <BranchButton code={x.pickupCode} label={x.pickupLibrary} variant="link" />
                    {x.date ? ` · avant le ${formatDate(x.date, 'short', today)}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
