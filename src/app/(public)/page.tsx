import type { Work, AvailabilityBadge } from '@/types';
import { SearchBar } from '@/components/search/SearchBar';
import { BookCard } from '@/components/book/BookCard';
import { SkeletonCard } from '@/components/ui/Skeleton';

// Sample data for demonstration - will be replaced with real API data
const SAMPLE_WORKS: { work: Work; badge: AvailabilityBadge }[] = [
  {
    work: {
      workId: 'OL12345W',
      title: "L'Étranger",
      authors: [{ authorId: 'OL1234A', name: 'Albert Camus' }],
      primaryEdition: {
        editionId: 'OL1234M',
        isbn13: '9782070360024',
        isbn10: '2070360024',
        language: 'fr',
        publishYear: 1942,
        publisher: 'Gallimard',
        pageCount: 186,
        coverKey: null,
      },
      allEditions: [],
      allIsbns: ['9782070360024'],
      metadata: {
        subjects: ['Roman', 'Existentialisme'],
        firstPublishYear: 1942,
        description: "Le récit de Meursault, un homme qui tue un Arabe.",
      },
      series: null,
    },
    badge: { type: 'available', label: 'Disponible' },
  },
  {
    work: {
      workId: 'OL67890W',
      title: 'Le Petit Prince',
      authors: [{ authorId: 'OL5678A', name: 'Antoine de Saint-Exupéry' }],
      primaryEdition: {
        editionId: 'OL5678M',
        isbn13: '9782070612758',
        isbn10: '2070612759',
        language: 'fr',
        publishYear: 1943,
        publisher: 'Gallimard Jeunesse',
        pageCount: 96,
        coverKey: null,
      },
      allEditions: [],
      allIsbns: ['9782070612758'],
      metadata: {
        subjects: ['Conte', 'Jeunesse'],
        firstPublishYear: 1943,
        description: "Un aviateur rencontre un petit prince venu d'une autre planète.",
      },
      series: null,
    },
    badge: { type: 'loaned', label: 'Retour: 25 mars' },
  },
  {
    work: {
      workId: 'OL11111W',
      title: 'Astérix le Gaulois',
      authors: [
        { authorId: 'OL1111A', name: 'René Goscinny' },
        { authorId: 'OL2222A', name: 'Albert Uderzo' },
      ],
      primaryEdition: {
        editionId: 'OL1111M',
        isbn13: '9782012100015',
        isbn10: null,
        language: 'fr',
        publishYear: 1961,
        publisher: 'Hachette',
        pageCount: 48,
        coverKey: null,
      },
      allEditions: [],
      allIsbns: ['9782012100015'],
      metadata: {
        subjects: ['BD', 'Humour'],
        firstPublishYear: 1961,
        description: "Les aventures d'Astérix et Obélix.",
      },
      series: { name: 'Astérix', position: 1, siblingWorkIds: [] },
    },
    badge: { type: 'digital_available', label: 'Numérique dispo' },
  },
];

export default function Home(): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Hero section */}
      <section className="mb-8 text-center sm:mb-12">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
          Bienvenue sur{' '}
          <span className="text-primary">LévisBiblio</span>
        </h1>
        <p className="mt-3 text-muted-foreground sm:mt-4 sm:text-lg">
          Découvrez et réservez des livres dans les bibliothèques de Lévis
        </p>
      </section>

      {/* Search section */}
      <section className="mb-8 sm:mb-12">
        <SearchBar />
      </section>

      {/* Results section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground sm:mb-6 sm:text-xl">
          Suggestions
        </h2>
        <div className="flex flex-col gap-4">
          {SAMPLE_WORKS.map(({ work, badge }) => (
            <BookCard key={work.workId} work={work} badge={badge} />
          ))}
        </div>
      </section>

      {/* Loading skeleton example (hidden by default, for reference) */}
      <section className="mt-8 hidden">
        <h2 className="mb-4 text-lg font-semibold text-foreground sm:mb-6 sm:text-xl">
          Chargement...
        </h2>
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </div>
  );
}
