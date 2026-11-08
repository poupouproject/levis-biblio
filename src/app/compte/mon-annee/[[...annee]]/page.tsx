import type { JSX } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarClock, History } from 'lucide-react';
import { getYearLoans } from '@/lib/levis/account';
import { requireAccount, withAccount } from '@/lib/account/dal';
import { todayIso } from '@/lib/account/format';
import {
  buildYearRecap,
  defaultRecapYear,
  isRecapOpen,
  recapYears,
  type RecapSeries,
} from '@/lib/account/recap';
import { returnPath } from '@/lib/account/return-path';
import { getCatalog } from '@/lib/catalog/source';
import { YearStory, type SeriesExtras } from '@/components/recap/YearStory';

export const metadata: Metadata = {
  title: 'Votre année à la bibliothèque | LévisBiblio',
  robots: { index: false, follow: false },
};

/**
 * `/compte/mon-annee` : l'année en cours (en janvier, celle qui vient de finir) ;
 * `/compte/mon-annee/2025` : une année précise.
 */
function yearParam(segments: string[] | undefined, today: string): number {
  if (!segments) return defaultRecapYear(today);
  const [value, ...rest] = segments;
  const year = /^\d{4}$/.test(value ?? '') ? Number.parseInt(value ?? '', 10) : Number.NaN;
  if (rest.length > 0 || !(year >= 2000 && year <= Number.parseInt(today.slice(0, 4), 10))) {
    notFound();
  }
  return year;
}

/**
 * Récapitulatif de l'année, en mode story. Calculé à chaque visite à partir du portail (ou du
 * dossier fictif) : rien n'est préparé à l'avance ni enregistré.
 */
export default async function YearPage({
  params,
}: {
  params: Promise<{ annee?: string[] }>;
}): Promise<JSX.Element> {
  const { annee } = await params;
  const today = todayIso();
  const year = yearParam(annee, today);
  // Avant le 15 novembre, l'année en cours n'est pas prête : pas même besoin du dossier
  if (!isRecapOpen(year, today)) return <ComingSoon year={year} />;
  const suite = returnPath(annee ? `/compte/mon-annee/${String(year)}` : '/compte/mon-annee');

  const { firstName, demo } = await requireAccount(suite);
  const { history, checkouts } = await withAccount(getYearLoans, suite);
  const recap = buildYearRecap(history, checkouts, year);
  const years = recapYears(history, checkouts).filter((y) => isRecapOpen(y, today));

  if (recap.total === 0) return <NoRecap year={year} years={years} />;

  return (
    <YearStory
      recap={recap}
      firstName={firstName}
      demo={demo}
      years={years}
      series={recap.topSeries ? await seriesExtras(recap.topSeries) : null}
    />
  );
}

/** Couvertures des tomes empruntés et premier tome manquant, d'après le catalogue. */
async function seriesExtras(series: RecapSeries): Promise<SeriesExtras | null> {
  const { catalog } = await getCatalog();
  const found = await catalog.getSeries(series.slug);
  if (!found) return null;
  const byVolume = new Map(
    found.works.flatMap((w) =>
      w.series?.volume !== null && w.series?.volume !== undefined ? [[w.series.volume, w]] : [],
    ),
  );
  const read = new Set(series.volumes);
  const first = series.volumes[0] ?? 1;
  const nextVolume = [...byVolume.keys()]
    .filter((v) => v > first && !read.has(v))
    .sort((a, b) => a - b)[0];
  const next = nextVolume === undefined ? undefined : byVolume.get(nextVolume);
  return {
    // Les derniers tomes empruntés, pour la pile de couvertures
    covers: series.volumes.slice(-5).flatMap((v) => {
      const work = byVolume.get(v);
      return work ? [{ title: work.title, cover: work.cover }] : [];
    }),
    next:
      next && nextVolume !== undefined
        ? { volume: nextVolume, title: next.title, href: `/oeuvre/${next.id}`, cover: next.cover }
        : null,
  };
}

/** Année en cours avant le 15 novembre : le lien partagé reste valable, le bilan viendra. */
function ComingSoon({ year }: { year: number }): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-4 sm:pt-10">
      <div className="flex flex-col gap-4 rounded-3xl bg-linear-to-br from-[#3d2c5e] to-[#5b2333] p-7 text-white shadow-lg">
        <CalendarClock className="h-9 w-9 text-[#f0c987]" aria-hidden />
        <h1 className="text-3xl leading-tight font-black tracking-tight">
          Votre année {year} se prépare
        </h1>
        <p className="text-base leading-relaxed text-white/90">
          Revenez à la fin de l’année : votre récapitulatif sera prêt à partir du 15 novembre. D’ici
          là, chaque emprunt compte!
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/compte/mon-annee/${String(year - 1)}`}
            className="rounded-xl bg-[#f0c987] px-4 py-2.5 font-bold text-[#2f2f2f] hover:bg-[#fde2b8] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            Revoir {year - 1}
          </Link>
          <Link
            href="/compte"
            className="rounded-xl border border-white/40 px-4 py-2.5 font-semibold hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            Mon dossier
          </Link>
        </div>
      </div>
    </div>
  );
}

function NoRecap({ year, years }: { year: number; years: number[] }): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 pt-10 text-center">
      <div className="rounded-2xl bg-[#d4a853]/15 p-3 text-[#d4a853]">
        <History className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight">Rien à raconter pour {year}</h1>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Votre historique ne contient aucun emprunt cette année. Le portail ne tient l’historique que
        si l’option « Conserver l’historique » est cochée dans vos préférences.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/compte/profil"
          className="rounded-xl bg-[#d4a853] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b88f42]"
        >
          Vérifier mes préférences
        </Link>
        {years
          .filter((y) => y !== year)
          .slice(0, 3)
          .map((y) => (
            <Link
              key={y}
              href={`/compte/mon-annee/${String(y)}`}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Voir {y}
            </Link>
          ))}
      </div>
    </div>
  );
}
