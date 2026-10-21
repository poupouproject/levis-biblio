import type { JSX } from 'react';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import type { CatalogWork, SeriesSummary } from '@/lib/catalog/types';
import { FORMAT_LABELS } from '@/lib/catalog/normalize';
import { Cover } from './Cover';
import { AvailabilityChip } from './Availability';

/** Carte verticale (étagères, grilles). */
export function WorkCard({
  work,
  priority,
  showVolume,
}: {
  work: CatalogWork;
  priority?: boolean | undefined;
  showVolume?: boolean | undefined;
}): JSX.Element {
  return (
    <Link
      href={`/oeuvre/${work.id}`}
      className="group flex flex-col gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#d4a853] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0f0f0f]"
    >
      <div className="relative transition-transform duration-200 group-hover:-translate-y-1">
        <Cover
          src={work.cover}
          title={work.title}
          author={work.authors[0]}
          sizes="(min-width: 1024px) 180px, 40vw"
          priority={priority}
          className="group-hover:shadow-lg"
        />
        {showVolume !== false &&
          work.series?.volume !== null &&
          work.series?.volume !== undefined && (
            <span className="absolute top-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[0.7rem] font-bold text-white backdrop-blur-sm">
              T. {work.series.volume}
            </span>
          )}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="line-clamp-2 text-sm leading-snug font-semibold text-zinc-900 group-hover:text-[#8a6a2c] dark:text-zinc-100 dark:group-hover:text-[#e2c07a]">
          {work.title}
        </p>
        {work.authors[0] && (
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {work.authors[0]}
          </p>
        )}
        <div className="mt-1">
          <AvailabilityChip workId={work.id} compact />
        </div>
      </div>
    </Link>
  );
}

/** Ligne de résultat de recherche. */
export function WorkRow({
  work,
  priority,
}: {
  work: CatalogWork;
  priority?: boolean | undefined;
}): JSX.Element {
  const formats = work.formats.filter((f) => f !== 'livre').map((f) => FORMAT_LABELS[f]);
  return (
    <Link
      href={`/oeuvre/${work.id}`}
      className="group flex gap-4 rounded-2xl border border-zinc-200 bg-white p-3 transition-colors outline-none hover:border-[#d4a853]/60 focus-visible:ring-2 focus-visible:ring-[#d4a853] sm:p-4 dark:border-zinc-800 dark:bg-[#1a1a1a] dark:hover:border-[#d4a853]/50"
    >
      <Cover
        src={work.cover}
        title={work.title}
        author={work.authors[0]}
        sizes="96px"
        priority={priority}
        className="w-16 flex-shrink-0 self-start sm:w-20"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {work.series && (
          <p className="truncate text-xs font-semibold tracking-wide text-[#8a6a2c] uppercase dark:text-[#e2c07a]">
            {work.series.name}
            {work.series.volume !== null && ` · Tome ${String(work.series.volume)}`}
          </p>
        )}
        <h3 className="line-clamp-2 text-base leading-snug font-bold text-zinc-900 group-hover:text-[#8a6a2c] dark:text-zinc-100 dark:group-hover:text-[#e2c07a]">
          {work.title}
        </h3>
        {work.subtitle && (
          <p className="line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">{work.subtitle}</p>
        )}
        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
          {[work.authors.join(', '), work.year].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <AvailabilityChip workId={work.id} />
          {work.editions.length > 1 && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {work.editions.length} éditions
            </span>
          )}
          {formats.map((f) => (
            <span
              key={f}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

/** Carte de série : pile de couvertures, nombre de tomes. */
export function SeriesCard({ series }: { series: SeriesSummary }): JSX.Element {
  const covers = series.covers.slice(0, 3);
  return (
    <Link
      href={`/serie/${series.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition-colors outline-none hover:border-[#d4a853]/60 focus-visible:ring-2 focus-visible:ring-[#d4a853] dark:border-zinc-800 dark:bg-[#1a1a1a]"
    >
      <div className="relative mx-auto h-36 w-32">
        {covers.map((src, i) => (
          <div
            key={src}
            className="absolute top-0 w-20 transition-transform duration-300"
            style={{
              left: `${String(i * 22)}px`,
              zIndex: 3 - i,
              transform: `rotate(${String((i - 1) * 5)}deg) translateY(${String(i * 4)}px)`,
            }}
          >
            <Cover src={src} title={series.name} sizes="80px" />
          </div>
        ))}
      </div>
      <div className="min-w-0 text-center">
        <p className="line-clamp-2 text-sm font-bold text-zinc-900 group-hover:text-[#8a6a2c] dark:text-zinc-100 dark:group-hover:text-[#e2c07a]">
          {series.name}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {series.count} tome{series.count > 1 ? 's' : ''}
          {series.authors[0] ? ` · ${series.authors[0]}` : ''}
        </p>
      </div>
    </Link>
  );
}
