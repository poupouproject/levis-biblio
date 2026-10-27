import type { JSX } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalog } from '@/lib/catalog/source';
import type { SeriesWithWorks } from '@/lib/catalog/types';
import { simulateAvailability } from '@/lib/catalog/availability';
import { searchHref } from '@/lib/catalog/query';
import { Cover } from '@/components/catalog/Cover';
import { WorkCard } from '@/components/catalog/WorkCard';

type Params = Promise<{ slug: string }>;

async function load(slug: string): Promise<SeriesWithWorks | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  return (await getCatalog()).catalog.getSeries(slug);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const series = await load((await params).slug);
  return {
    title: series
      ? `${series.summary.name} — Série | LévisBiblio`
      : 'Série introuvable | LévisBiblio',
  };
}

export default async function SeriesPage({ params }: { params: Params }): Promise<JSX.Element> {
  const series = await load((await params).slug);
  if (!series) notFound();
  const { summary, works } = series;
  const available = works.filter((w) => simulateAvailability(w.id).available > 0).length;
  const firstAvailable = works.find((w) => simulateAvailability(w.id).available > 0);

  return (
    <div className="flex flex-col gap-8 pt-2">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b16] to-[#3a2f1d] p-6 text-white sm:p-8">
        <div className="relative z-10 flex flex-col gap-3 sm:max-w-[60%]">
          <p className="text-xs font-bold tracking-widest text-[#e2c07a] uppercase">Série</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {summary.name}
          </h1>
          {summary.authors.length > 0 && (
            <p className="text-white/80">
              de{' '}
              {summary.authors.map((a, i) => (
                <span key={a}>
                  {i > 0 && ', '}
                  <Link
                    href={searchHref({ author: a })}
                    className="font-semibold text-white hover:underline"
                  >
                    {a}
                  </Link>
                </span>
              ))}
            </p>
          )}
          <p className="text-sm text-white/70">
            {summary.count} tome{summary.count > 1 ? 's' : ''} au catalogue · {available} disponible
            {available > 1 ? 's' : ''} maintenant
            {summary.latestYear ? ` · dernier paru en ${String(summary.latestYear)}` : ''}
          </p>
          {firstAvailable && (
            <Link
              href={`/oeuvre/${firstAvailable.id}`}
              className="mt-2 w-fit rounded-xl bg-[#d4a853] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b88f42]"
            >
              Commencer par le tome {firstAvailable.series?.volume ?? 1}
            </Link>
          )}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-10 hidden w-[45%] rotate-6 grid-cols-3 gap-3 opacity-90 sm:grid"
        >
          {works
            .filter((w) => w.cover)
            .slice(0, 6)
            .map((w) => (
              <Cover key={w.id} src={w.cover} title={w.title} sizes="120px" />
            ))}
        </div>
      </header>

      <ol className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        {works.map((w, i) => (
          <li key={w.id}>
            <WorkCard work={w} priority={i < 6} />
          </li>
        ))}
      </ol>
    </div>
  );
}
