import type { AvailabilityBadge } from '@/types';

interface BadgeProps {
  badge: AvailabilityBadge;
}

const badgeStyles = {
  available: 'bg-status-available text-status-available-text',
  loaned: 'bg-status-loaned text-status-loaned-text',
  digital_available: 'bg-status-digital text-status-digital-text',
  waitlist: 'bg-status-loaned text-status-loaned-text',
  unavailable: 'bg-status-unavailable text-status-unavailable-text',
} as const;

const badgeIcons = {
  available: '✅',
  loaned: '🟡',
  digital_available: '📱',
  waitlist: '🟡',
  unavailable: '⭕',
} as const;

export function Badge({ badge }: BadgeProps): React.JSX.Element {
  const style = badgeStyles[badge.type];
  const icon = badgeIcons[badge.type];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{badge.label}</span>
    </span>
  );
}
