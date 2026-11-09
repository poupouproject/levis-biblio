import type { JSX } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarClock, History } from 'lucide-react';
import { getYearLoans } from '@/lib/levis/account';
import { requireAccount, withAccount } from '@/lib/account/dal';
import { todayIso } from '@/lib/account/format';
import {
  bookTitle,
  buildYearRecap,
  defaultRecapYear,
  isRecapOpen,
  nextInSeries,
  recapYears,
  seriesVolumesRead,
  type RecapGlimpse,
  type RecapSeries,
} from '@/lib/account/recap';
import { returnPath } from '@/lib/account/return-path';
import { getCatalog } from '@/lib/catalog/source';
import type { EditionCover, SeriesWithWorks } from '@/lib/catalog/types';
import type { GlimpseCover } from '@/components/recap/RecapSlides';
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
  const suite = returnPath(annee ? `/compte/mon-annee/${String(year)}` : '/compte/mon-annee');
  // Connexion d'abord, comme tout le dossier, même pour annoncer que le bilan n'est pas prêt
  const { firstName, demo } = await requireAccount(suite);
  // Avant le 15 novembre, l'année en cours n'est pas prête : inutile de lire le dossier
  if (!isRecapOpen(year, today)) return <ComingSoon year={year} />;

  const { history, checkouts } = await withAccount(getYearLoans, suite);
  const recap = buildYearRecap(history, checkouts, year);
  const years = recapYears(history, checkouts).filter((y) => isRecapOpen(y, today));

  if (recap.total === 0) return <NoRecap year={year} years={years} />;

  const top = recap.topSeries;
  const [series, glimpse] = await Promise.all([
    top ? seriesExtras(top, seriesVolumesRead(history, checkouts, top.slug)) : null,
    glimpseCovers(recap.glimpse),
  ]);
  return (
    <YearStory
      recap={recap}
      firstName={firstName}
      demo={demo}
      years={years}
      series={series}
      glimpse={glimpse}
    />
  );
}

/**
 * Couvertures du fond flou de l'écran d'ouverture. Seuls les emprunts en cours ont un ID de
 * titre ; les autres (historique) prennent une couverture typographique, floue elle aussi.
 */
async function glimpseCovers(glimpse: RecapGlimpse[]): Promise<GlimpseCover[]> {
  const ids = glimpse.flatMap((g) => (g.titleId ? [g.titleId] : []));
  let covers: Record<string, EditionCover> = {};
  if (ids.length > 0) {
    try {
      const { catalog } = await getCatalog();
      covers = await catalog.editionCovers(ids);
    } catch {
      // Simple décor : sans le catalogue, les couvertures typographiques suffisent
    }
  }
  return glimpse.map((g) => ({
    title: bookTitle(g.title),
    author: g.author,
    cover: g.titleId ? (covers[g.titleId]?.cover ?? null) : null,
  }));
}

/**
 * Couvertures des tomes empruntés et suite de la série, d'après le catalogue : le tome qui suit
 * le plus haut lu (pas un tome sauté), ou « à jour » si la bibliothèque n'a rien après.
 */
async function seriesExtras(series: RecapSeries, readEver: number[]): Promise<SeriesExtras | null> {
  let found: SeriesWithWorks | null;
  try {
    const { catalog } = await getCatalog();
    found = await catalog.getSeries(series.slug);
  } catch {
    // Simple décor : sans le catalogue, l'écran de la série s'affiche sans couvertures
    return null;
  }
  if (!found) return null;
  const byVolume = new Map(
    found.works.flatMap((w) =>
      w.series?.volume !== null && w.series?.volume !== undefined ? [[w.series.volume, w]] : [],
    ),
  );
  const suite = nextInSeries([...byVolume.keys()], series.volumes, readEver);
  const work = suite?.kind === 'suivant' ? byVolume.get(suite.volume) : undefined;
  let next: SeriesExtras['next'] = null;
  if (suite?.kind === 'suivant' && work) {
    next = {
      kind: 'suivant',
      volume: suite.volume,
      title: work.title,
      href: `/oeuvre/${work.id}`,
      cover: work.cover,
    };
  } else if (suite?.kind === 'a-jour') {
    next = { kind: 'a-jour', last: suite.last };
  }
  return {
    // Les derniers tomes empruntés, pour la pile de couvertures
    covers: series.volumes.slice(-5).flatMap((v) => {
      const w = byVolume.get(v);
      return w ? [{ title: w.title, cover: w.cover }] : [];
    }),
    next,
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
