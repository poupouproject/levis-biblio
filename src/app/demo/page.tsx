import { BookCard } from '@/components/book/BookCard';
import type { Work, AggregatedAvailability, Edition } from '@/types';

export default function DemoPage(): React.JSX.Element {
  // Création d'une édition factice propre pour satisfaire TypeScript sans utiliser 'any'
  const mockDummyEdition: Edition = {
    editionId: 'ED_MOCK',
    isbn13: null,
    isbn10: null,
    language: 'fr', // Respecte le type 'fr' | 'en' | 'other'
    publishYear: null,
    publisher: null,
    pageCount: null,
    coverKey: null,
  };

  // Données factices (Mock) respectant tes contrats d'interfaces stricts
  const mockWork: Work = {
    workId: 'OL1234W',
    title: 'Harry Potter et la Coupe de Feu',
    authors: [{ authorId: 'OL123A', name: 'J.K. Rowling' }],
    primaryEdition: {
      editionId: 'ED123',
      isbn13: '9782070543589',
      isbn10: null,
      language: 'fr',
      publishYear: 2001,
      publisher: 'Gallimard',
      pageCount: 768,
      coverKey: '10521270', 
    },
    // On injecte nos vrais faux objets au lieu de 'any'
    allEditions: [
      mockDummyEdition,
      { ...mockDummyEdition, editionId: 'ED_MOCK2' },
      { ...mockDummyEdition, editionId: 'ED_MOCK3' },
      { ...mockDummyEdition, editionId: 'ED_MOCK4' },
    ],
    allIsbns: ['9782070543589', '9782070543596', '9782070543602', '9782070543619'],
    metadata: {
      description:
        "La quatrième année à l'école de sorcellerie Poudlard est marquée par le Tournoi des Trois Sorciers. Les participants sont choisis par la fameuse Coupe de Feu qui est à l'origine d'un scandale. Elle sélectionne Harry Potter alors qu'il n'a pas l'âge légal requis !",
      subjects: ['Fantasy', 'Magie'],
      firstPublishYear: 2000,
    },
    series: { name: 'Harry Potter', position: 4, siblingWorkIds: [] },
  };

  const mockAvailability: AggregatedAvailability = {
    workId: 'OL1234W',
    physical: {
      status: 'loaned',
      branches: [],
      totalCopies: 3,
      availableCopies: 0,
      nextReturnDate: new Date('2026-03-20'),
    },
    digital: {
      status: 'available',
      loansCount: 2,
      holdsCount: 0,
      copiesCount: 5,
      cantookUrl: null,
    },
    badge: { type: 'loaned', label: 'Retour prévu le 20 mars' },
    recommendedAction: { type: 'notify_when_available' },
    fetchedAt: new Date(),
  };

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8 dark:bg-black">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Laboratoire de design UI
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Composant isolé : <code className="text-[#d4a853]">BookCard</code>
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
            Exemple : Physique prêté + Numérique dispo
          </h2>
          <BookCard work={mockWork} availability={mockAvailability} />
        </div>

        <div className="space-y-4 pt-8">
          <h2 className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
            Exemple : En cours de chargement (Asynchrone)
          </h2>
          <BookCard
            work={{
              ...mockWork,
              title: 'Dune',
              primaryEdition: { ...mockWork.primaryEdition, coverKey: '12735703' },
            }}
          />
        </div>
      </div>
    </main>
  );
}