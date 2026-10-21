import type { JSX } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { getCatalog } from '@/lib/catalog/source';
import { MAX_LIMIT, PAGE_SIZE, parseSearchParams, searchHref } from '@/lib/catalog/query';
import { PERIOD_LABELS } from '@/lib/catalog/engine';
import { FORMAT_LABELS } from '@/lib/catalog/normalize';
import { RECHERCHES_POPULAIRES } from '@/lib/catalog/curation';
import { BRANCHES } from '@/lib/levis/branches';
import { SearchBox } from '@/components/search/SearchBox';
import {
  ActiveFilters,
  FilterSheet,
  FilterSidebar,
  PendingArea,
  SearchShell,
  SortSelect,
} from '@/components/search/Filters';
import { SeriesCard, WorkRow } from '@/components/catalog/WorkCard';

type Params = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Params;
}): Promise<Metadata> {
  const query = parseSearchParams(await searchParams);
  const subject = query.q || query.author;
  return { title: subject ? `${subject} — Recherche | LévisBiblio` : 'Catalogue | LévisBiblio' };
}

const BRANCH_OPTIONS = [...BRANCHES]
  .map((b) => ({ code: b.code, name: b.title.replace('Bibliothèque ', '') }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Params;
}): Promise<JSX.Element> {
  const query = parseSearchParams(await searchParams);
  const { catalog } = await getCatalog();
  const result = catalog.search(query);
  const filtered =
    query.formats.length > 0 || query.period !== null || query.available || query.branch !== null;

  const heading = query.q
    ? `Résultats pour « ${query.q} »`
    : query.author
      ? `Œuvres de ${query.author}`
      : 'Parcourir le catalogue';

  return (
    <SearchShell query={query}>
      <div className="flex flex-col gap-5">
        <div className="sticky top-14 z-40 -mx-4 bg-zinc-50/90 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 dark:bg-[#0f0f0f]/90">
          <SearchBox defaultValue={query.q} popular={RECHERCHES_POPULAIRES} />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
            {heading}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
              <strong className="text-zinc-900 dark:text-zinc-100">
                {result.total.toLocaleString('fr-CA')}
              </strong>{' '}
              œuvre{result.total > 1 ? 's' : ''}
              <span className="text-zinc-400">
                {' '}
                · {(result.tookMs / 1000).toLocaleString('fr-CA', { maximumFractionDigits: 2 })} s
              </span>
            </p>
            <div className="flex items-center gap-2">
              <FilterSheet
                formats={result.facets.formats}
                periods={result.facets.periods}
                branches={BRANCH_OPTIONS}
              />
              <SortSelect />
            </div>
          </div>
          <ActiveFilters
            labels={{
              formats: FORMAT_LABELS,
              periods: PERIOD_LABELS,
              branches: Object.fromEntries(BRANCH_OPTIONS.map((b) => [b.code, b.name])),
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <FilterSidebar
            formats={result.facets.formats}
            periods={result.facets.periods}
            branches={BRANCH_OPTIONS}
          />

          <PendingArea>
            <div className="flex flex-col gap-6">
              {result.series.length > 0 && !filtered && (
                <section aria-label="Séries correspondantes" className="flex flex-col gap-3">
                  <h2 className="text-sm font-bold tracking-wide text-zinc-500 uppercase">
                    Séries
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {result.series.map((s) => (
                      <SeriesCard key={s.slug} series={s} />
                    ))}
                  </div>
                </section>
              )}

              {result.works.length > 0 ? (
                <section aria-label="Œuvres" className="flex flex-col gap-3">
                  {result.series.length > 0 && !filtered && (
                    <h2 className="text-sm font-bold tracking-wide text-zinc-500 uppercase">
                      Œuvres
                    </h2>
                  )}
                  <ol className="flex flex-col gap-3">
                    {result.works.map((w, i) => (
                      <li key={w.id}>
                        <WorkRow work={w} priority={i < 3} />
                      </li>
                    ))}
                  </ol>
                  {result.total > result.works.length &&
                    (query.limit < MAX_LIMIT ? (
                      <Link
                        href={searchHref({ ...query, limit: query.limit + PAGE_SIZE })}
                        scroll={false}
                        className="mx-auto mt-2 rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:border-[#d4a853] dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-zinc-200"
                      >
                        Afficher plus (
                        {(result.total - result.works.length).toLocaleString('fr-CA')} autres)
                      </Link>
                    ) : (
                      // Plafond atteint : le lien ne ferait que réafficher les mêmes résultats
                      <p className="mx-auto mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
                        {(result.total - result.works.length).toLocaleString('fr-CA')} autres
                        résultats. Précisez la recherche ou ajoutez un filtre pour les voir.
                      </p>
                    ))}
                </section>
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
                  <SearchX className="h-10 w-10 text-zinc-400" aria-hidden />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Aucune œuvre trouvée
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {filtered
                        ? 'Retirez un filtre, ou vérifiez l’orthographe.'
                        : 'Essayez un autre mot : titre, auteur, série ou ISBN.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {RECHERCHES_POPULAIRES.slice(0, 4).map((q) => (
                      <Link
                        key={q}
                        href={searchHref({ q })}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700 hover:border-[#d4a853] dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-zinc-300"
                      >
                        {q}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PendingArea>
        </div>
      </div>
    </SearchShell>
  );
}
