import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '@/components/search/SearchBar';

describe('SearchBar', () => {
  it('renders search input with placeholder', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('Titre, auteur, ISBN…')).toBeInTheDocument();
  });

  it('renders all quick filter chips', () => {
    render(<SearchBar />);
    expect(screen.getByRole('button', { name: 'Tout' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Romans' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jeunesse' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BD & Manga' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Non-fiction' })).toBeInTheDocument();
  });

  it('has "Tout" selected by default', () => {
    render(<SearchBar />);
    expect(screen.getByRole('button', { name: 'Tout' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSearch when typing in search input', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Titre, auteur, ISBN…');
    await user.type(input, 'Lévis');
    expect(onSearch).toHaveBeenCalled();
  });

  it('calls onFilterChange when clicking a filter chip', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onFilterChange={onFilterChange} />);

    await user.click(screen.getByRole('button', { name: 'Romans' }));
    expect(onFilterChange).toHaveBeenCalledWith('Romans');
  });

  it('updates active filter on click', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const romansBtn = screen.getByRole('button', { name: 'Romans' });
    await user.click(romansBtn);
    expect(romansBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tout' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('has accessible label on search input', () => {
    render(<SearchBar />);
    expect(
      screen.getByLabelText('Rechercher un livre par titre, auteur ou ISBN'),
    ).toBeInTheDocument();
  });
});
