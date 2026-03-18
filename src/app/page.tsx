import type { JSX } from 'react';
import { SearchBar } from '@/components/search/SearchBar';
import { BookCard } from '@/components/book/BookCard';
import type { Work, AggregatedAvailability, Edition } from '@/types';
import Link from 'next/link';

export default function Home(): JSX.Element {

  const mockDummyEdition: Edition = {
    editionId: 'ED_MOCK',
    isbn13: null,
    isbn10: null,
    language: 'fr',
    publishYear: null,
    publisher: null,
    pageCount: null,
    coverKey: null,
  };

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
    allEditions: [
      mockDummyEdition,
      { ...mockDummyEdition, editionId: 'ED_MOCK2' },
      { ...mockDummyEdition, editionId: 'ED_MOCK3' },
      { ...mockDummyEdition, editionId: 'ED_MOCK4' },
    ],
    allIsbns: ['9782070543589', '9782070543596', '9782070543602', '9782070543619'],
    metadata: {
      description:
        "La quatrième année à l'école de sorcellerie Poudlard est marquée par le Tournoi des Trois Sorciers.",
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
    <div className="flex flex-col gap-6 sm:gap-8 pt-2">
      
      {/* En-tête de la page */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Trouvez votre prochaine lecture.
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
          Recherchez parmi les livres imprimés et numériques de Lévis en un seul endroit.
        </p>
      </div>

      {/* Barre de recherche interactive */}
      {/* (Ici on lui passe un onSearch vide pour l'instant, puisqu'on est en Server Component statique pour la démo) */}
      <div className="sticky top-14 z-40 bg-zinc-50/90 dark:bg-[#0f0f0f]/90 py-2 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:bg-transparent sm:py-0">
        <SearchBar />
      </div>

      {/* Zone des résultats */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          Résultats populaires (Démo)
        </h2>
        
        {/* On affiche nos belles cartes */}
        <div className="grid grid-cols-1 gap-4">
          <Link href={`/book/${mockWork.workId}`} className="block outline-none focus:ring-2 focus:ring-[#d4a853] rounded-xl">
          <BookCard work={mockWork} availability={mockAvailability} priority />
          </Link>
          
          <BookCard 
            work={{
              ...mockWork, 
              title: 'Dune', 
              primaryEdition: { ...mockWork.primaryEdition, coverKey: '12735703' }
            }} 
            // Pas de disponibilité pour simuler le Skeleton
          />
        </div>
      </div>

    </div>
  );
}