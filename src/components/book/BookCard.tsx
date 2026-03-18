import type { JSX } from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import type { Work, AggregatedAvailability } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface BookCardProps {
  work: Work;
  availability?: AggregatedAvailability;
  priority?: boolean;
}

export function BookCard({ work, availability, priority = false }: BookCardProps): JSX.Element {
  const coverUrl = work.primaryEdition.coverKey 
    ? `https://covers.openlibrary.org/b/id/${work.primaryEdition.coverKey}-M.jpg`
    : '/placeholder-cover.png';

  // Calcul du nombre total d'éditions regroupées par notre algorithme
  const editionsCount = work.allEditions.length > 0 ? work.allEditions.length : 1;
  const hasSummary = work.metadata.description && work.metadata.description.trim().length > 0;

  return (
    <div className="flex flex-col bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer">
      
      {/* SECTION HAUT : Informations bibliographiques & Sommaire */}
      <div className="flex flex-col p-4 gap-4">
        {/* Ligne image + infos */}
        <div className="flex gap-4">
          {/* Zone Image — format livre complet (object-contain, pas de recadrage) */}
          <div className="relative w-24 sm:w-28 flex-shrink-0 aspect-[2/3] bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800/50">
            <Image 
              src={coverUrl}
              alt={`Couverture de ${work.title}`}
              fill
              sizes="(max-width: 640px) 96px, 112px"
              className="object-contain"
              priority={priority}
            />
          </div>

          {/* Zone Texte (Titre, Auteurs, Année) */}
          <div className="flex flex-col flex-grow min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-3 group-hover:text-[#d4a853] transition-colors">
              {work.title}
            </h3>
            
            <div className="mt-1 space-y-0.5">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {work.authors.map(a => a.name).join(', ')}
              </p>
              {work.primaryEdition.publishYear && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Édition représentative : {work.primaryEdition.publishYear}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Description — pleine largeur, sous l'image et les infos */}
        {hasSummary && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {work.metadata.description}
          </p>
        )}
      </div>

      {/* SECTION MILIEU : Formats et Disponibilité */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 p-3 sm:px-4">
        {availability ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Livre imprimé
              </span>
              <Badge badge={availability.badge} />
            </div>

            {availability.digital && (
              <>
                <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800/60 my-0.5" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Livre numérique
                  </span>
                  {availability.digital.status === 'available' ? (
                    <Badge badge={{ type: 'digital_available', label: 'Numérique dispo' }} />
                  ) : (
                    <Badge badge={{ type: 'waitlist', label: `${String(availability.digital.holdsCount)} en attente` }} />
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-1">
             <div className="flex justify-between items-center">
               <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
               <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
             </div>
          </div>
        )}
      </div>

      {/* SECTION BAS : Appel à l'action (Détails et autres éditions) */}
      <div className="bg-zinc-100/50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 px-4 py-2.5 flex justify-between items-center">
        <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-[#d4a853] transition-colors">
          Voir les succursales et {editionsCount} éditions
        </span>
        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#d4a853] transition-colors" />
      </div>

    </div>
  );
}