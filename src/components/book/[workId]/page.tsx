import type { JSX } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Smartphone, MapPin, Calendar, Building2 } from 'lucide-react';
import type { Work, AggregatedAvailability, Edition } from '@/types';
import { Badge } from '@/components/ui/Badge';

// Types simulés pour les succursales (si non définis complètement dans ton index.ts)
interface MockBranch {
  id: string;
  name: string;
  status: 'available' | 'loaned';
  returnDate?: Date;
}

export default function BookDetailPage(): JSX.Element {
  // --- MOCK DATA ---
  // Dans la vraie vie, on ferait un `await fetchWork(params.workId)` ici
  const mockDummyEdition: Edition = {
    editionId: 'ED_MOCK', isbn13: null, isbn10: null, language: 'fr',
    publishYear: null, publisher: null, pageCount: null, coverKey: null,
  };

  const work: Work = {
    workId: 'OL1234W',
    title: 'Harry Potter et la Coupe de Feu',
    authors: [{ authorId: 'OL123A', name: 'J.K. Rowling' }],
    primaryEdition: {
      editionId: 'ED123', isbn13: '9782070543589', isbn10: null, language: 'fr',
      publishYear: 2001, publisher: 'Gallimard', pageCount: 768, coverKey: '10521270',
    },
    allEditions: [mockDummyEdition, { ...mockDummyEdition, editionId: 'ED_MOCK2' }],
    allIsbns: ['9782070543589', '9782070543596'],
    metadata: {
      description: "La quatrième année à l'école de sorcellerie Poudlard est marquée par le Tournoi des Trois Sorciers. Les participants sont choisis par la fameuse Coupe de Feu qui est à l'origine d'un scandale. Elle sélectionne Harry Potter alors qu'il n'a pas l'âge légal requis !",
      subjects: ['Fantasy', 'Magie', 'Aventure', 'Sorciers'],
      firstPublishYear: 2000,
    },
    series: { name: 'Harry Potter', position: 4, siblingWorkIds: [] },
  };

  const availability: AggregatedAvailability = {
    workId: 'OL1234W',
    physical: {
      status: 'available',
      branches: [], // On utilise le tableau détaillé ci-dessous pour l'UI
      totalCopies: 4,
      availableCopies: 1,
      nextReturnDate: null,
    },
    digital: {
      status: 'available', loansCount: 2, holdsCount: 0, copiesCount: 5, cantookUrl: null,
    },
    badge: { type: 'available', label: 'Disponible' },
    recommendedAction: { type: 'reserve_physical', branchOptions: [] },
    fetchedAt: new Date(),
  };

  // Fausses succursales de Lévis pour démontrer l'UI
  const branches: MockBranch[] = [
    { id: 'b1', name: 'Pierre-Georges-Roy (Vieux-Lévis)', status: 'available' },
    { id: 'b2', name: 'Jean-Gosselin (Charny)', status: 'loaned', returnDate: new Date('2026-03-22') },
    { id: 'b3', name: 'Albert-Rousseau (St-Étienne)', status: 'loaned', returnDate: new Date('2026-03-25') },
    { id: 'b4', name: 'Francine-McKenzie (St-Jean-Chrysostome)', status: 'loaned', returnDate: new Date('2026-04-02') },
  ];

  const coverUrl = work.primaryEdition.coverKey 
    ? `https://covers.openlibrary.org/b/id/${work.primaryEdition.coverKey}-L.jpg` // -L pour une meilleure résolution
    : '/placeholder-cover.png';

  return (
    <div className="flex flex-col min-h-screen pb-20 sm:pb-8">
      
      {/* 1. Navigation (Bouton Retour) */}
      <div className="sticky top-0 z-10 bg-zinc-50/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md py-3 -mx-4 px-4 sm:mx-0 sm:px-0 mb-4 sm:mb-6 border-b border-zinc-200 dark:border-zinc-800 sm:border-none">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#d4a853] dark:hover:text-[#d4a853] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Retour aux résultats
        </Link>
      </div>

      <div className="flex flex-col gap-8 sm:gap-10">
        
        {/* 2. En-tête : Couverture et Infos de base */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          {/* Couverture plus grande */}
          <div className="relative w-32 sm:w-48 flex-shrink-0 aspect-[2/3] mx-auto sm:mx-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-md">
            <Image 
              src={coverUrl}
              alt={`Couverture de ${work.title}`}
              fill
              sizes="(max-width: 640px) 128px, 192px"
              className="object-contain"
              priority
            />
          </div>

          {/* Titre et Métadonnées */}
          <div className="flex flex-col text-center sm:text-left">
            {work.series && (
              <span className="text-sm font-bold text-[#d4a853] mb-1 uppercase tracking-wider">
                Série {work.series.name} • Tome {work.series.position}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">
              {work.title}
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-300 mt-2 font-medium">
              {work.authors.map(a => a.name).join(', ')}
            </p>
            
            {/* Pilules de métadonnées (Année, Pages, ISBN) */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
              {work.primaryEdition.publishYear && (
                <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md">
                  <Calendar className="w-4 h-4 mr-1.5" /> {work.primaryEdition.publishYear}
                </div>
              )}
              {work.primaryEdition.pageCount && (
                <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md">
                  <BookOpen className="w-4 h-4 mr-1.5" /> {work.primaryEdition.pageCount} p.
                </div>
              )}
              {work.primaryEdition.isbn13 && (
                <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md font-mono">
                  ISBN {work.primaryEdition.isbn13}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Boutons d'Action (Fixes en bas sur mobile, normaux sur desktop) */}
        <div className="fixed bottom-0 left-0 w-full p-4 bg-white dark:bg-[#1a1a1a] border-t border-zinc-200 dark:border-zinc-800 sm:static sm:bg-transparent sm:border-none sm:p-0 z-40 flex flex-col sm:flex-row gap-3">
          <button className="flex-1 bg-[#d4a853] hover:bg-[#b88f42] text-white font-semibold py-3 sm:py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center">
            <MapPin className="w-5 h-5 mr-2" />
            Réserver en succursale
          </button>
          
          {availability.digital && (
            <button className="flex-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-semibold py-3 sm:py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Emprunter en numérique
            </button>
          )}
        </div>

        {/* 4. Résumé et Sujets */}
        <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">À propos de l&apos;œuvre</h2>
          {work.metadata.description && (
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
              {work.metadata.description}
            </p>
          )}
          {work.metadata.subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {work.metadata.subjects.map(sub => (
                <span key={sub} className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs rounded-full border border-zinc-200 dark:border-zinc-700">
                  {sub}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 5. Liste des Succursales (L'état du réseau) */}
        <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-[#d4a853]" />
              Réseau des bibliothèques
            </h2>
            <span className="text-sm font-medium text-zinc-500">
              {availability.physical.availableCopies} copie(s) disponible(s)
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {branches.map(branch => (
              <div key={branch.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {branch.name}
                </span>
                
                {branch.status === 'available' ? (
                  <Badge badge={{ type: 'available', label: 'Disponible' }} />
                ) : (
                  <Badge badge={{ 
                    type: 'loaned', 
                    label: branch.returnDate 
                      ? `Retour prévu le ${branch.returnDate.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}`
                      : 'Prêté' 
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}