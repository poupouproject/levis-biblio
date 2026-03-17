import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/ui/Footer';

describe('Footer', () => {
  it('renders the citizen project disclaimer', () => {
    render(<Footer />);
    expect(
      screen.getByText('Projet citoyen open source — Indépendant de la Ville de Lévis'),
    ).toBeInTheDocument();
  });

  it('renders within a footer element', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });
});
