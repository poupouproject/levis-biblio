import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SearchBox, raiseOffset } from '@/components/search/SearchBox';
import {
  FloatingSearchProvider,
  HeaderSearchButton,
  HeroSearch,
  pageQuery,
} from '@/components/search/FloatingSearch';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function touchScreen(touch: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: touch && query === '(pointer: coarse)' })),
  );
}

function suggestionsReturn(): ReturnType<typeof vi.fn> {
  const fetch = vi.fn(() =>
    Promise.resolve(new Response('[]', { headers: { 'Content-Type': 'application/json' } })),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeEach(() => {
  vi.useFakeTimers();
  touchScreen(false);
  // jsdom n'implémente pas showModal / close
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  push.mockClear();
});

describe('raiseOffset', () => {
  it('remonte un champ placé plus bas que sa marge', () => {
    expect(raiseOffset(400, 72)).toBe(328);
  });
  it('laisse en place un champ collant déjà sous l’en-tête', () => {
    expect(raiseOffset(64, 72)).toBe(0);
  });
});

describe('pageQuery', () => {
  it('lit la recherche de la page de résultats', () => {
    expect(pageQuery({ pathname: '/recherche', search: '?q=tintin&format=livre' })).toBe('tintin');
    expect(pageQuery({ pathname: '/recherche', search: '' })).toBe('');
  });
  it('ne lit rien ailleurs', () => {
    expect(pageQuery({ pathname: '/', search: '?q=tintin' })).toBeNull();
  });
});

describe('<SearchBox>', () => {
  it('reste modifiable sans saisie contrôlée', () => {
    render(<SearchBox popular={[]} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'harry' } });
    expect(input).toHaveValue('harry');
  });

  it('Échap ferme la liste sans fermer le panneau, puis ne vide pas la saisie', () => {
    render(<SearchBox floating popular={['Astérix']} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const first = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      input.dispatchEvent(first);
    });
    expect(first.defaultPrevented).toBe(true);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'tintin' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    const second = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      input.dispatchEvent(second);
    });
    expect(second.defaultPrevented).toBe(false);
    expect(input).toHaveValue('tintin');
  });

  it('panneau vide : Chercher mène au catalogue', () => {
    render(<SearchBox floating popular={[]} />);
    fireEvent.submit(screen.getByRole('search'));
    expect(push).toHaveBeenCalledWith('/recherche');
  });
});

describe('Recherche flottante', () => {
  function page(): void {
    render(
      <FloatingSearchProvider popular={[]}>
        <HeaderSearchButton />
        <HeroSearch popular={[]} />
      </FloatingSearchProvider>,
    );
  }

  it('la loupe reste un lien vers le catalogue et ouvre le panneau au clic', () => {
    page();
    const link = screen.getByRole('link', { name: 'Rechercher' });
    expect(link).toHaveAttribute('href', '/recherche');
    fireEvent.click(link);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('open');
  });

  it('une seule requête de suggestions par saisie, malgré les deux champs', async () => {
    const fetch = suggestionsReturn();
    page();
    const [hero] = screen.getAllByRole('combobox', { hidden: true });
    if (!hero) throw new Error('barre de l’accueil absente');
    fireEvent.focus(hero);
    fireEvent.change(hero, { target: { value: 'harry' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sur écran tactile, la barre de l’accueil ouvre le panneau', () => {
    touchScreen(true);
    page();
    const [hero] = screen.getAllByRole('combobox', { hidden: true });
    if (!hero) throw new Error('barre de l’accueil absente');
    fireEvent.focus(hero);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('open');
  });
});
