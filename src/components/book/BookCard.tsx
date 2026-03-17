import Image from 'next/image';
import type { AvailabilityBadge } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface BookCardProps {
  readonly title: string;
  readonly author: string;
  readonly coverUrl?: string;
  readonly badge?: AvailabilityBadge;
}

export function BookCard({ title, author, coverUrl, badge }: BookCardProps): React.JSX.Element {
  return (
    <article className="bg-surface border-border group flex gap-3.5 rounded-[10px] border-[1.5px] p-3.5 transition-colors hover:border-primary/50 hover:bg-surface2">
      {/* Cover */}
      <div className="relative h-[82px] w-[58px] shrink-0 overflow-hidden rounded-[7px] shadow-md">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`Couverture de ${title}`}
            fill
            sizes="58px"
            className="object-cover"
          />
        ) : (
          <div className="bg-surface2 flex h-full w-full items-center justify-center text-2xl">
            📚
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate font-bold text-[15px] leading-snug">{title}</h3>
        <p className="text-muted mb-2 truncate text-xs">{author}</p>
        {badge ? <Badge badge={badge} /> : null}
      </div>
    </article>
  );
}
