import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

describe('Skeleton component', () => {
  it('renders with default classes', () => {
    render(<Skeleton />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('rounded-md', 'bg-muted');
  });

  it('accepts custom className', () => {
    render(<Skeleton className="h-10 w-full" />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toHaveClass('h-10', 'w-full');
  });

  it('has aria-hidden attribute for accessibility', () => {
    render(<Skeleton />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SkeletonCard component', () => {
  it('renders cover and content skeletons', () => {
    render(<SkeletonCard />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    // Should have: cover (1) + title (1) + author (1) + badge (1) = 4 skeletons
    expect(skeletons.length).toBe(4);
  });

  it('has card container with border', () => {
    render(<SkeletonCard />);
    const card = document.querySelector('.border-border');
    expect(card).toBeInTheDocument();
  });
});
