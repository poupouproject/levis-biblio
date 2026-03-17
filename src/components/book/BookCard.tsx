import Image from 'next/image';
import type { Work, AvailabilityBadge } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface BookCardProps {
  work: Work;
  badge?: AvailabilityBadge;
}

export function BookCard({ work, badge }: BookCardProps): React.JSX.Element {
  const coverUrl = work.primaryEdition.coverKey
    ? `https://covers.openlibrary.org/b/olid/${work.primaryEdition.coverKey}-M.jpg`
    : null;

  const authorNames =
    work.authors.length > 0
      ? work.authors.map((a) => a.name).join(', ')
      : 'Auteur inconnu';

  return (
    <article className="group flex gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Book cover */}
      <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded bg-muted sm:h-36 sm:w-24">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`Couverture de ${work.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 80px, 96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground">
            📖
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="line-clamp-2 text-base font-semibold text-card-foreground group-hover:text-primary sm:text-lg">
          {work.title}
        </h2>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
          {authorNames}
        </p>

        {/* Series info */}
        {work.series && (
          <p className="mt-1 text-xs text-muted-foreground">
            {work.series.name}
            {work.series.position ? ` - Tome ${String(work.series.position)}` : ''}
          </p>
        )}

        {/* Availability badge */}
        {badge && (
          <div className="mt-auto pt-3">
            <Badge badge={badge} />
          </div>
        )}
      </div>
    </article>
  );
}
