'use client';

import type { JSX } from 'react';
import { Clock, ExternalLink, MapPin, Navigation, Phone } from 'lucide-react';
import type { Branch } from '@/types';
import { useMinute } from '@/hooks/useMinute';
import {
  branchLocation,
  dayName,
  directionsUrls,
  formatHours,
  levisNow,
  openStatus,
  telUrl,
} from '@/lib/levis/branches';

const WEEK = [1, 2, 3, 4, 5, 6, 0]; // lundi → dimanche

/** Statut « Ouvert · ferme à 20 h », calculé dans le navigateur à partir de l'horaire régulier. */
export function BranchStatus({ branch }: { branch: Branch }): JSX.Element | null {
  const minute = useMinute();
  if (minute === null) return null;
  const status = openStatus(branch, new Date(minute * 60_000));
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${
        status.open ? 'text-green-700 dark:text-green-400' : 'text-zinc-500 dark:text-zinc-400'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${status.open ? 'bg-green-500' : 'bg-zinc-400'}`}
        aria-hidden
      />
      {status.label}
    </span>
  );
}

/** Adresse, statut, horaire de la semaine, itinéraire et appel. */
export function BranchDetails({ branch }: { branch: Branch }): JSX.Element {
  const minute = useMinute();
  const today = minute === null ? null : levisNow(new Date(minute * 60_000)).day;
  const { google, apple } = directionsUrls(branch);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#d4a853]" aria-hidden />
          <span>
            {branch.address}
            <span className="block text-zinc-500">{branchLocation(branch)}</span>
          </span>
        </p>
        <BranchStatus branch={branch} />
      </div>

      <div>
        <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Heures d’ouverture
        </h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {WEEK.map((day) => {
            const isToday = day === today;
            return (
              <div key={day} className="contents">
                <dt
                  className={`capitalize ${isToday ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}
                >
                  {dayName(day)}
                  {isToday && <span className="sr-only"> (aujourd’hui)</span>}
                </dt>
                <dd
                  className={
                    isToday
                      ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }
                >
                  {formatHours(branch.hours[day] ?? null)}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={google}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#d4a853] px-4 py-3 font-semibold text-white shadow-sm hover:bg-[#b88f42]"
        >
          <Navigation className="h-4 w-4" aria-hidden />
          Itinéraire (Google Maps)
        </a>
        <a
          href={apple}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <MapPin className="h-4 w-4" aria-hidden />
          Apple Plans
        </a>
        <a
          href={telUrl(branch.phone)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Phone className="h-4 w-4" aria-hidden />
          {branch.phone}
        </a>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        Horaire régulier. Jours fériés et fermetures temporaires :{' '}
        <a
          href={branch.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-[#b88f42] hover:underline"
        >
          fiche officielle
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        .
      </p>
    </div>
  );
}
