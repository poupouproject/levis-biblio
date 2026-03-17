interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps): React.JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard(): React.JSX.Element {
  return (
    <div className="flex gap-4 rounded-lg border border-border bg-card p-4">
      {/* Book cover skeleton */}
      <Skeleton className="h-28 w-20 flex-shrink-0 rounded sm:h-36 sm:w-24" />

      {/* Content skeleton */}
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-auto flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
