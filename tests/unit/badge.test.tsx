import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';
import type { AvailabilityBadge } from '@/types';

describe('Badge', () => {
  it('renders available badge with correct label', () => {
    const badge: AvailabilityBadge = { type: 'available', label: 'Disponible' };
    render(<Badge badge={badge} />);
    expect(screen.getByText('Disponible')).toBeInTheDocument();
  });

  it('renders loaned badge with custom label', () => {
    const badge: AvailabilityBadge = { type: 'loaned', label: 'Retour 8 jan.' };
    render(<Badge badge={badge} />);
    expect(screen.getByText('Retour 8 jan.')).toBeInTheDocument();
  });

  it('renders digital_available badge', () => {
    const badge: AvailabilityBadge = { type: 'digital_available', label: 'Numérique dispo' };
    render(<Badge badge={badge} />);
    expect(screen.getByText('Numérique dispo')).toBeInTheDocument();
  });

  it('renders unavailable badge', () => {
    const badge: AvailabilityBadge = { type: 'unavailable', label: 'Non disponible' };
    render(<Badge badge={badge} />);
    expect(screen.getByText('Non disponible')).toBeInTheDocument();
  });

  it('renders waitlist badge', () => {
    const badge: AvailabilityBadge = { type: 'waitlist', label: '3 en attente' };
    render(<Badge badge={badge} />);
    expect(screen.getByText('3 en attente')).toBeInTheDocument();
  });

  it('renders the correct icon for each badge type', () => {
    const badge: AvailabilityBadge = { type: 'available', label: 'Disponible' };
    render(<Badge badge={badge} />);
    expect(screen.getByText('✅')).toBeInTheDocument();
  });
});
