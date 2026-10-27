import { Suspense, type JSX } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookmarkPlus, ChevronLeft, ChevronRight, ExternalLink, Info, Layers } from 'lucide-react';
import { getCatalog } from '@/lib/catalog/source';
import { simulateAvailability } from '@/lib/catalog/availability';
import { searchHref } from '@/lib/catalog/query';
import { FORMAT_LABELS, isbnForms } from '@/lib/catalog/normalize';
import type { CatalogWork } from '@/lib/catalog/types';
import { branchByCode, openStatus } from '@/lib/levis/branches';
import { LEVIS_BASE_PATH, LEVIS_ORIGIN } from '@/lib/levis/config';
import { formatDate } from '@/lib/account/format';
import { Cover } from '@/components/catalog/Cover';
import { BookSummary, BookSummarySkeleton } from '@/components/catalog/BookSummary';
import { googleBooksEnabled } from '@/lib/catalog/google-books';
import { Shelf } from '@/components/catalog/Shelf';
import { WorkCard } from '@/components/catalog/WorkCard';
import { BranchButton } from '@/components/branches/BranchButton';

type Params = Promise<{ id: string }>;

async function load(id: string): Promise<CatalogWork | null> {
  if (!/^[\dXx]{1,13}$/.test(id)) return null;
  return (await getCatalog()).catalog.getWork(id);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const work = await load((await params).id);
  if (!work) return { title: 'Œuvre introuvable | LévisBiblio' };
  return {
    title: `${work.title}${work.authors[0] ? ` — ${work.authors[0]}` : ''} | LévisBiblio`,
    description: work.summary ?? `${work.title}, aux bibliothèques de Lévis.`,
  };
}

/** Fiche de l'œuvre sur le portail de la Ville (consultée par l'usager lui-même). */
function portalUrl(titleId: string): string {
  return `${LEVIS_ORIGIN}${LEVIS_BASE_PATH}/search/detailnonmodal/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:${titleId}/one`;
}

export default async function WorkPage({ params }: { params: Params }): Promise<JSX.Element> {
  const work = await load((await params).id);
  if (!work) notFound();
  const { catalog } = await getCatalog();
  const availability = simulateAvailability(work.id);
  const [series, related] = await Promise.all([
    work.series ? catalog.getSeries(work.series.slug) : null,
    catalog.related(work),
  ]);
  const index = series ? series.works.findIndex((w) => w.id === work.id) : -1;
  const previous = series && index > 0 ? series.works[index - 1] : undefined;
  const next = series && index >= 0 ? series.works[index + 1] : undefined;
  const summaryIsbns = work.editions
    .map((e) => e.isbn)
    .filter((i): i is string => isbnForms(i).length > 0);

  return (
    <article className="flex flex-col gap-10 pt-2">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <div className="mx-auto w-44 sm:mx-0 sm:w-full">
          <Cover
            src={work.cover}
            title={work.title}
            author={work.authors[0]}
            sizes="(min-width: 1024px) 260px, 200px"
            priority
            className="shadow-xl"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {work.series && (
            <Link
              href={`/serie/${work.series.slug}`}
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#d4a853]/15 px-3 py-1 text-sm font-semibold text-[#8a6a2c] hover:bg-[#d4a853]/25 dark:text-[#e2c07a]"
            >
              <Layers className="h-4 w-4" aria-hidden />
              {work.series.name}
              {work.series.volume !== null && ` · Tome ${String(work.series.volume)}`}
              {series && <span className="font-normal opacity-80">sur {series.works.length}</span>}
            </Link>
          )}
          <div>
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance text-zinc-900 sm:text-4xl dark:text-zinc-100">
              {work.title}
            </h1>
            {work.subtitle && (
              <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">{work.subtitle}</p>
            )}
          </div>
          {work.authors.length > 0 && (
            <p className="text-base text-zinc-700 dark:text-zinc-300">
              de{' '}
              {work.authors.map((a, i) => (
                <span key={a}>
                  {i > 0 && ', '}
                  <Link
                    href={searchHref({ author: a })}
                    className="font-semibold text-zinc-900 underline-offset-4 hover:text-[#8a6a2c] hover:underline dark:text-zinc-100 dark:hover:text-[#e2c07a]"
                  >
                    {a}
                  </Link>
                </span>
              ))}
            </p>
          )}
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {work.year && (
              <div>
                <dt className="text-zinc-500">Publication</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{work.year}</dd>
              </div>
            )}
            <div>
              <dt className="text-zinc-500">Format{work.formats.length > 1 ? 's' : ''}</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                {work.formats.map((f) => FORMAT_LABELS[f]).join(', ')}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Éditions</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                {work.editions.length}
              </dd>
            </div>
            {work.editions[0]?.pages && (
              <div>
                <dt className="text-zinc-500">Pages</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {work.editions[0].pages}
                </dd>
              </div>
            )}
          </dl>
          {work.summary ? (
            <p className="max-w-prose leading-relaxed text-zinc-700 dark:text-zinc-300">
              {work.summary}
            </p>
          ) : // Résumé de Google Livres, en streaming : la fiche s'affiche sans l'attendre.
          // Sans clé ni ISBN, pas de requête ni d'emplacement réservé.
          summaryIsbns.length > 0 && googleBooksEnabled() ? (
            <Suspense fallback={<BookSummarySkeleton />}>
              <BookSummary isbns={summaryIsbns} />
            </Suspense>
          ) : null}
          {work.subjects.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {work.subjects.slice(0, 8).map((s) => (
                <li
                  key={s}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}

          {(previous ?? next) && (
            <nav aria-label="Tomes voisins" className="flex flex-wrap gap-2">
              {previous && (
                <Link
                  href={`/oeuvre/${previous.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-[#d4a853] dark:border-zinc-700 dark:text-zinc-300"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Tome {previous.series?.volume}
                </Link>
              )}
              {next && (
                <Link
                  href={`/oeuvre/${next.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-[#d4a853] dark:border-zinc-700 dark:text-zinc-300"
                >
                  Tome {next.series?.volume}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Disponibilité */}
        <aside className="flex flex-col gap-3 self-start rounded-2xl border border-zinc-200 bg-white p-5 sm:col-span-2 lg:col-span-1 dark:border-zinc-800 dark:bg-[#1a1a1a]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">Disponibilité</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-zinc-500 uppercase dark:bg-zinc-800">
              Démo
            </span>
          </div>
          {availability.available > 0 ? (
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {availability.available} exemplaire{availability.available > 1 ? 's' : ''} sur{' '}
              {availability.total} en rayon
            </p>
          ) : (
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
              Tous prêtés
              {availability.nextReturn
                ? ` · retour vers le ${formatDate(availability.nextReturn, 'short')}`
                : ''}
              {availability.holds > 0 && (
                <span className="block text-sm font-medium text-zinc-500">
                  {availability.holds} réservation{availability.holds > 1 ? 's' : ''} en attente
                </span>
              )}
            </p>
          )}
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {availability.branches.map((b) => {
              const branch = branchByCode(b.code);
              const status = branch ? openStatus(branch) : null;
              return (
                <li key={b.code} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 text-sm">
                    <BranchButton code={b.code} label={b.name} variant="link" />
                    {status && (
                      <p
                        className={`text-xs ${status.open ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500'}`}
                      >
                        {status.label}
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${b.available > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}
                  >
                    {b.available}/{b.total}
                  </span>
                </li>
              );
            })}
          </ul>
          <a
            href={portalUrl(work.editions[0]?.titleId ?? work.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4a853] px-4 py-3 font-semibold text-white shadow-sm hover:bg-[#b88f42]"
          >
            <BookmarkPlus className="h-5 w-5" aria-hidden />
            Réserver sur le portail
            <ExternalLink className="h-4 w-4 opacity-80" aria-hidden />
          </a>
          <p className="flex gap-1.5 text-xs leading-relaxed text-zinc-500">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            Exemplaires simulés en attendant l’accès officiel au catalogue de la Ville. La
            réservation se fait sur le portail des bibliothèques.
          </p>
        </aside>
      </div>

      {series && series.works.length > 1 && (
        <Shelf
          title={`Toute la série ${series.summary.name}`}
          subtitle={`${String(series.works.length)} tomes`}
          href={`/serie/${series.summary.slug}`}
        >
          {series.works.map((w) => (
            <WorkCard key={w.id} work={w} />
          ))}
        </Shelf>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-100">
          Éditions ({work.editions.length})
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {work.editions.map((e) => (
            <li
              key={`${e.titleId}-${e.isbn ?? ''}`}
              className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-[#1a1a1a]"
            >
              <Cover
                src={e.cover}
                title={work.title}
                sizes="48px"
                className="w-12 flex-shrink-0 self-start"
              />
              <div className="min-w-0 text-sm">
                <p className="line-clamp-2 font-semibold text-zinc-900 dark:text-zinc-100">
                  {e.title}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {[
                    FORMAT_LABELS[e.format],
                    e.year,
                    e.publisher,
                    e.pages ? `${String(e.pages)} p.` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {e.isbn && <p className="font-mono text-xs text-zinc-500">ISBN {e.isbn}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <Shelf
          title={`Du même auteur`}
          subtitle={work.authors[0]}
          href={searchHref({ author: work.authors[0] ?? '' })}
        >
          {related.map((w) => (
            <WorkCard key={w.id} work={w} />
          ))}
        </Shelf>
      )}
    </article>
  );
}
