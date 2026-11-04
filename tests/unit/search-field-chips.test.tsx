import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FloatingSearchProvider } from '@/components/search/FloatingSearch';
import { ResultsSearch, SearchFieldChips, SearchShell } from '@/components/search/Filters';
import { EMPTY_QUERY } from '@/lib/catalog/engine';
import type { SearchQuery } from '@/lib/catalog/types';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

function renderPage(query: SearchQuery): void {
  render(
    <FloatingSearchProvider popular={[]}>
      <SearchShell query={query}>
        <ResultsSearch popular={[]} />
        <SearchFieldChips />
      </SearchShell>
    </FloatingSearchProvider>,
  );
}

/** La barre de la page : le premier champ, avant celui du panneau flottant. */
function pageBar(): HTMLElement {
  const [bar] = screen.getAllByRole('combobox', { hidden: true });
  if (!bar) throw new Error('barre de la page absente');
  return bar;
}

/** Les puces de la page, pas celles du panneau flottant (masqué). */
function chip(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

describe('puces de champ de la page de résultats', () => {
  afterEach(() => {
    replace.mockClear();
  });

  it('relancent la recherche avec le texte saisi, même pas encore envoyé', () => {
    renderPage({ ...EMPTY_QUERY, q: 'tintin' });
    fireEvent.change(pageBar(), { target: { value: 'hergé' } });
    fireEvent.click(chip('Auteur'));
    expect(replace).toHaveBeenCalledOnce();
    const href = String(replace.mock.calls[0]?.[0]);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('q')).toBe('hergé');
    expect(params.get('champ')).toBe('auteur');
  });

  it('sans texte, choisissent le champ de la prochaine recherche sans rien relancer', () => {
    renderPage(EMPTY_QUERY);
    fireEvent.click(chip('Série'));
    expect(replace).not.toHaveBeenCalled();
    expect(chip('Série')).toHaveAttribute('aria-pressed', 'true');
    expect(pageBar()).toHaveAttribute('placeholder', 'Nom de la série…');
  });
});
