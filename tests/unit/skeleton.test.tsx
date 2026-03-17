import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders with role status', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    render(<Skeleton />);
    expect(screen.getByLabelText('Chargement')).toBeInTheDocument();
  });

  it('applies animate-pulse class', () => {
    render(<Skeleton />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('animate-pulse');
  });

  it('applies custom className', () => {
    render(<Skeleton className="h-10 w-full" />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('h-10');
    expect(el.className).toContain('w-full');
  });
});
