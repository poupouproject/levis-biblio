import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookSummary } from '@/components/catalog/BookSummary';
import { resetGoogleBooksCache } from '@/lib/catalog/google-books';

function googleReturns(description: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            items: [
              {
                volumeInfo: {
                  description,
                  canonicalVolumeLink: 'https://books.google.com/books/about/X.html?id=abc',
                },
              },
            ],
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    ),
  );
}

describe('<BookSummary>', () => {
  beforeEach(() => {
    resetGoogleBooksCache();
    vi.stubEnv('GOOGLE_BOOKS_API_KEY', 'cle-de-test');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('affiche le résumé avec l’attribution exigée par Google', async () => {
    googleReturns('<p>Harry entre en sixième année.</p>');
    render(<>{await BookSummary({ isbns: ['9782075187794'] })}</>);
    expect(screen.getByText('Harry entre en sixième année.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Google Livres/ })).toHaveAttribute(
      'href',
      'https://books.google.com/books/about/X.html?id=abc',
    );
    expect(screen.getByAltText('Powered by Google')).toBeInTheDocument();
  });

  it('replie la suite d’un long résumé', async () => {
    const long = Array.from(
      { length: 4 },
      (_, i) => `<p>Paragraphe ${String(i)} ${'mot '.repeat(60)}</p>`,
    ).join('');
    googleReturns(long);
    render(<>{await BookSummary({ isbns: ['9782075187794'] })}</>);
    expect(screen.getByText('Lire la suite')).toBeInTheDocument();
  });

  it('n’affiche rien sans résumé', async () => {
    googleReturns('');
    await expect(BookSummary({ isbns: ['9782075187794'] })).resolves.toBeNull();
  });
});
