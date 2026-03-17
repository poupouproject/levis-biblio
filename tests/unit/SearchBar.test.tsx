import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from '@/components/search/SearchBar';

describe('SearchBar component', () => {
  it('renders search input with placeholder', () => {
    render(<SearchBar />);
    expect(
      screen.getByPlaceholderText('Rechercher un livre, un auteur...')
    ).toBeInTheDocument();
  });

  it('renders all quick filter buttons', () => {
    render(<SearchBar />);
    expect(screen.getByRole('button', { name: /Romans/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Jeunesse/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /BD & Manga/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Non-fiction/ })
    ).toBeInTheDocument();
  });

  it('toggles filter on click', () => {
    render(<SearchBar />);
    const romansButton = screen.getByRole('button', { name: /Romans/ });

    // Initially not pressed
    expect(romansButton).toHaveAttribute('aria-pressed', 'false');

    // Click to activate
    fireEvent.click(romansButton);
    expect(romansButton).toHaveAttribute('aria-pressed', 'true');

    // Click again to deactivate
    fireEvent.click(romansButton);
    expect(romansButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('allows multiple filters to be active', () => {
    render(<SearchBar />);
    const romansButton = screen.getByRole('button', { name: /Romans/ });
    const jeunesseButton = screen.getByRole('button', { name: /Jeunesse/ });

    fireEvent.click(romansButton);
    fireEvent.click(jeunesseButton);

    expect(romansButton).toHaveAttribute('aria-pressed', 'true');
    expect(jeunesseButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSearch callback on form submit', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Rechercher un livre, un auteur...');
    fireEvent.change(input, { target: { value: 'Harry Potter' } });

    // Activate a filter
    fireEvent.click(screen.getByRole('button', { name: /Romans/ }));

    // Submit the form
    fireEvent.submit(input.closest('form')!);

    expect(onSearch).toHaveBeenCalledWith('Harry Potter', ['romans']);
  });

  it('accepts custom placeholder', () => {
    render(<SearchBar placeholder="Search books..." />);
    expect(screen.getByPlaceholderText('Search books...')).toBeInTheDocument();
  });
});
