import type { JSX } from 'react';
import type { Metadata } from 'next';
import { Library } from 'lucide-react';
import { BRANCHES } from '@/lib/levis/branches';
import { Card, PageHeader } from '@/components/account/PageParts';
import { BranchDetails } from '@/components/branches/BranchDetails';

export const metadata: Metadata = {
  title: 'Bibliothèques | LévisBiblio',
  description: 'Adresses, heures d’ouverture et itinéraires des 10 bibliothèques de Lévis.',
};

const SORTED = [...BRANCHES].sort((a, b) => a.title.localeCompare(b.title, 'fr'));

export default function BranchesPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-5 pt-2">
      <PageHeader
        title="Bibliothèques"
        subtitle="Adresses, heures d’ouverture et itinéraires des 10 succursales de Lévis."
      />
      <nav aria-label="Aller à une succursale" className="flex flex-wrap gap-2">
        {SORTED.map((b) => (
          <a
            key={b.code}
            href={`#${b.code}`}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700 hover:border-[#d4a853] hover:text-[#8a6a2c] dark:border-zinc-800 dark:bg-[#1a1a1a] dark:text-zinc-300"
          >
            {b.title.replace('Bibliothèque ', '')}
          </a>
        ))}
      </nav>
      {SORTED.map((b) => (
        <div key={b.code} id={b.code} className="scroll-mt-20">
          <Card title={b.title} icon={Library}>
            <BranchDetails branch={b} />
          </Card>
        </div>
      ))}
    </div>
  );
}
