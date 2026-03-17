import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookCard } from '@/components/book/BookCard';
import type { AvailabilityBadge } from '@/types';

describe('BookCard', () => {
  it('renders title and author', () => {
    render(<BookCard title="Les Chemins du Nord" author="Marie Laberge" />);
    expect(screen.getByText('Les Chemins du Nord')).toBeInTheDocument();
    expect(screen.getByText('Marie Laberge')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    const badge: AvailabilityBadge = { type: 'available', label: 'Disponible' };
    render(<BookCard title="Test" author="Author" badge={badge} />);
    expect(screen.getByText('Disponible')).toBeInTheDocument();
  });

  it('renders without badge when not provided', () => {
    const { container } = render(<BookCard title="Test" author="Author" />);
    expect(container.querySelector('span')).toBeNull();
  });

  it('renders placeholder when no coverUrl is provided', () => {
    render(<BookCard title="Test" author="Author" />);
    expect(screen.getByText('📚')).toBeInTheDocument();
  });

  it('renders as an article element', () => {
    render(<BookCard title="Test" author="Author" />);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });
});
