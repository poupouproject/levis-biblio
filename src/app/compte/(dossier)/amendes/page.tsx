import { Suspense, type JSX } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, Receipt } from 'lucide-react';
import type { Fines } from '@/types';
import { getFines } from '@/lib/levis/account';
import { LEVIS_PORTAL_ACCOUNT_URL } from '@/lib/levis/config';
import { withAccount } from '@/lib/account/dal';
import { PLACEHOLDER_FINES } from '@/lib/account/placeholders';
import { Card, PageHeader } from '@/components/account/PageParts';
import { SkeletonScope } from '@/components/ui/Skeleton';

export default function FinesPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Amendes" subtitle="Frais de retard et blocages au dossier." />
      <Suspense
        fallback={
          <SkeletonScope label="Chargement de vos amendes…">
            <FinesContent fines={PLACEHOLDER_FINES} />
          </SkeletonScope>
        }
      >
        <FinesSection />
      </Suspense>
      <p className="text-xs text-zinc-500">
        Le paiement se fait sur le portail officiel des bibliothèques ou au comptoir de votre
        succursale.
      </p>
    </>
  );
}

async function FinesSection(): Promise<JSX.Element> {
  return <FinesContent fines={await withAccount(getFines)} />;
}

function FinesContent({ fines }: { fines: Fines }): JSX.Element {
  const hasDue = fines.amountDue > 0;
  return (
    <>
      <div
        className={`flex items-center gap-4 rounded-xl border p-5 ${
          hasDue
            ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
            : 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40'
        }`}
      >
        {hasDue ? (
          <Receipt className="h-8 w-8 flex-shrink-0 text-red-600 dark:text-red-400" aria-hidden />
        ) : (
          <CheckCircle2
            className="h-8 w-8 flex-shrink-0 text-green-600 dark:text-green-400"
            aria-hidden
          />
        )}
        <div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Montant à payer</p>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {fines.amountDueLabel}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {hasDue
              ? `${String(fines.currentCount)} amende(s) ou blocage(s) en cours`
              : 'Votre dossier est en règle.'}
          </p>
        </div>
      </div>

      {fines.lines.length > 0 && (
        <Card title="Détail" icon={Receipt}>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[32rem] text-left text-sm">
              {fines.headers.length > 0 && (
                <thead className="text-xs tracking-wider text-zinc-500 uppercase">
                  <tr>
                    {fines.headers.map((h) => (
                      <th key={h} scope="col" className="px-4 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {fines.lines.map((line, i) => (
                  <tr key={`${line.cells.join('|')}-${String(i)}`}>
                    {line.cells.map((cell, j) => (
                      <td
                        key={`${String(j)}-${cell}`}
                        className="px-4 py-2 text-zinc-700 dark:text-zinc-300"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#1a1a1a]">
          <p className="text-zinc-500">Amendes accumulées</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{fines.accruedCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#1a1a1a]">
          <p className="text-zinc-500">Total payé</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {fines.totalPaidLabel}
          </p>
        </div>
      </div>

      {hasDue && (
        <a
          href={LEVIS_PORTAL_ACCOUNT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#d4a853] px-4 py-3 font-semibold text-white shadow-sm hover:bg-[#b88f42]"
        >
          <CreditCard className="h-5 w-5" aria-hidden />
          Payer sur le portail des bibliothèques
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      )}
    </>
  );
}
