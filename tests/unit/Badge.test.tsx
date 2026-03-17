import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '@/components/ui/Badge';
import type { AvailabilityBadge } from '@/types';

describe('Badge component', () => {
  it('renders available badge correctly', () => {
    const badge: AvailabilityBadge = { type: 'available', label: 'Disponible' };
    render(<Badge badge={badge} />);

    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('renders loaned badge correctly', () => {
    const badge: AvailabilityBadge = { type: 'loaned', label: 'Retour: 25 mars' };
    render(<Badge badge={badge} />);

    expect(screen.getByText('Retour: 25 mars')).toBeInTheDocument();
    expect(screen.getByText('🟡')).toBeInTheDocument();
  });

  it('renders digital_available badge correctly', () => {
    const badge: AvailabilityBadge = {
      type: 'digital_available',
      label: 'Numérique dispo',
    };
    render(<Badge badge={badge} />);

    expect(screen.getByText('Numérique dispo')).toBeInTheDocument();
    expect(screen.getByText('📱')).toBeInTheDocument();
  });

  it('renders unavailable badge correctly', () => {
    const badge: AvailabilityBadge = {
      type: 'unavailable',
      label: 'Non disponible',
    };
    render(<Badge badge={badge} />);

    expect(screen.getByText('Non disponible')).toBeInTheDocument();
    expect(screen.getByText('⭕')).toBeInTheDocument();
  });

  it('renders waitlist badge correctly', () => {
    const badge: AvailabilityBadge = { type: 'waitlist', label: '3 en attente' };
    render(<Badge badge={badge} />);

    expect(screen.getByText('3 en attente')).toBeInTheDocument();
    expect(screen.getByText('🟡')).toBeInTheDocument();
  });
});
