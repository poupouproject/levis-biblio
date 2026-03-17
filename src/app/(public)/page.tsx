import type { AvailabilityBadge } from '@/types';
import { SearchBar } from '@/components/search/SearchBar';
import { BookCard } from '@/components/book/BookCard';

const SAMPLE_BOOKS: {
  title: string;
  author: string;
  badge: AvailabilityBadge;
}[] = [
  {
    title: 'Les Chemins du Nord',
    author: 'Marie Laberge',
    badge: { type: 'available', label: 'Disponible' },
  },
  {
    title: "L'Herbier Sauvage",
    author: 'Nicolas Dickner',
    badge: { type: 'loaned', label: 'Retour 8 jan.' },
  },
  {
    title: 'Boréal',
    author: 'Kim Thúy',
    badge: { type: 'loaned', label: 'Retour 3 jan.' },
  },
  {
    title: 'Le Monde selon Garp',
    author: 'John Irving · 1978',
    badge: { type: 'available', label: 'Disponible' },
  },
  {
    title: 'Nuit Blanche',
    author: 'Éric Dupont',
    badge: { type: 'digital_available', label: 'Numérique dispo' },
  },
];

export default function HomePage(): React.JSX.Element {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 pb-8 pt-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-[22px] font-black tracking-tight">
          Lévis<span className="text-primary">Biblio</span>
        </h1>
      </header>

      {/* Greeting */}
      <section className="mb-5" aria-label="Bienvenue">
        <p className="text-muted mb-0.5 text-[13px]">Bienvenue 👋</p>
        <h2 className="text-[26px] leading-tight font-bold">
          Que cherches-tu
          <br />
          <span className="text-primary">aujourd&apos;hui&nbsp;?</span>
        </h2>
      </section>

      {/* Search */}
      <section className="mb-6" aria-label="Recherche">
        <SearchBar />
      </section>

      {/* Results section */}
      <section aria-label="Résultats">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Nouveautés à Lévis</h2>
          <span className="text-primary cursor-pointer text-xs font-medium">Voir tout →</span>
        </div>

        <div className="flex flex-col gap-3">
          {SAMPLE_BOOKS.map((book) => (
            <BookCard
              key={book.title}
              title={book.title}
              author={book.author}
              badge={book.badge}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
