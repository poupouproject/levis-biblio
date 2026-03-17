import type { AvailabilityBadge } from '@/types';

interface BadgeProps {
  readonly badge: AvailabilityBadge;
}

const badgeStyles: Record<AvailabilityBadge['type'], string> = {
  available:
    'bg-accent-green/15 text-accent-green',
  loaned:
    'bg-accent-red/15 text-accent-red',
  digital_available:
    'bg-accent-blue/15 text-accent-blue',
  waitlist:
    'bg-accent-blue/15 text-accent-blue',
  unavailable:
    'bg-accent-red/15 text-accent-red',
};

const badgeIcons: Record<AvailabilityBadge['type'], string> = {
  available: '✅',
  loaned: '🟡',
  digital_available: '📱',
  waitlist: '🟡',
  unavailable: '⭕',
};

export function Badge({ badge }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[badge.type]}`}
    >
      <span aria-hidden="true">{badgeIcons[badge.type]}</span>
      {badge.label}
    </span>
  );
}
