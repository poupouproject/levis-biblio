interface SkeletonProps {
  readonly className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps): React.JSX.Element {
  return (
    <div
      className={`bg-surface animate-pulse rounded-md ${className}`}
      role="status"
      aria-label="Chargement"
    />
  );
}
