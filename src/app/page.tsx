import type { JSX } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Disc3,
  Film,
  Headphones,
  Library,
  MonitorSmartphone,
  Package,
  Type,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { getCatalog } from '@/lib/catalog/source';
import { AUTEURS_DICI, RECHERCHES_POPULAIRES } from '@/lib/catalog/curation';
import { searchHref } from '@/lib/catalog/query';
import type { FormatGroup } from '@/lib/catalog/normalize';
import { HeroSearch } from '@/components/search/FloatingSearch';
import { Shelf } from '@/components/catalog/Shelf';
import { SeriesCard, WorkCard } from '@/components/catalog/WorkCard';
import { Cover } from '@/components/catalog/Cover';
import { OpenBranches } from '@/components/branches/OpenBranches';

// Données publiques : page régénérée toutes les heures plutôt qu'à chaque visite.
export const revalidate = 3600;

const FORMAT_ICONS: Record<FormatGroup, LucideIcon> = {
  livre: BookOpen,
  'gros-caracteres': Type,
  audio: Headphones,
  musique: Disc3,
  video: Film,
  trousse: Package,
  numerique: MonitorSmartphone,
  autre: Library,
};

export default async function Home(): Promise<JSX.Element> {
  const { catalog, source, totalEditions } = await getCatalog();
  const newest = catalog.newest(18);
  const series = catalog.topSeries(10);
  const local = catalog.byAuthors(AUTEURS_DICI, 18);
  const formats = catalog.formatCounts();
  const heroCovers = newest.slice(0, 5);

  return (
    <div className="flex flex-col gap-12 pb-4 sm:gap-14">
      {/* En-tête : la recherche d'abord */}
      <section className="relative z-10 -mx-4 -mt-4 bg-gradient-to-br from-[#fbf6ea] via-white to-[#f4ead2] px-4 pt-10 pb-12 sm:-mx-6 sm:-mt-6 sm:rounded-b-[2.5rem] sm:px-10 sm:pt-16 sm:pb-16 dark:from-[#1f1a10] dark:via-[#121212] dark:to-[#1a1408]">
        <div className="relative z-10 flex max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold tracking-widest text-[#8a6a2c] uppercase dark:text-[#e2c07a]">
              Bibliothèques de Lévis
            </p>
            <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-zinc-900 sm:text-6xl dark:text-zinc-50">
              Que lirez-vous ensuite?
            </h1>
            <p className="max-w-xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
              {totalEditions.toLocaleString('fr-CA')} documents dans 10 bibliothèques. Les séries
              réunies, les éditions regroupées, des suggestions dès la première lettre.
            </p>
            {source === 'demo' && (
              <p className="w-fit rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400">
                Démonstration : la recherche porte sur un échantillon de{' '}
                {catalog.stats.editions.toLocaleString('fr-CA')} documents.
              </p>
            )}
          </div>
          <HeroSearch popular={RECHERCHES_POPULAIRES} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500">Populaires :</span>
            {RECHERCHES_POPULAIRES.map((q) => (
              <Link
                key={q}
                href={searchHref({ q })}
                className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-sm font-medium text-zinc-700 backdrop-blur hover:border-[#d4a853] hover:text-[#8a6a2c] dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:text-[#e2c07a]"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
        {/* Éventail de nouveautés, décoratif. Rogné dans son propre calque : la section ne l'est pas,
            pour que les suggestions de la recherche puissent déborder dessous. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:rounded-b-[2.5rem] lg:block"
        >
          <div className="absolute top-1/2 right-[-4rem] w-[26rem] -translate-y-1/2 xl:right-0">
            {heroCovers.map((w, i) => (
              <div
                key={w.id}
                className="absolute w-36 shadow-2xl"
                style={{
                  top: `${String(-120 + i * 18)}px`,
                  left: `${String(i * 58)}px`,
                  transform: `rotate(${String(-12 + i * 6)}deg)`,
                  zIndex: i === 2 ? 10 : 5 - Math.abs(i - 2),
                }}
              >
                <Cover src={w.cover} title={w.title} sizes="144px" priority={i === 2} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Shelf
        title="Nouveautés"
        subtitle="Arrivées récemment dans les rayons"
        href={searchHref({ period: 'recent' })}
      >
        {newest.map((w, i) => (
          <WorkCard key={w.id} work={w} priority={i < 4} />
        ))}
      </Shelf>

      <Shelf
        title="Séries à dévorer"
        subtitle="Tous les tomes réunis, du premier au dernier"
        itemWidth="w-44 sm:w-48"
      >
        {series.map((s) => (
          <SeriesCard key={s.slug} series={s} />
        ))}
      </Shelf>

      {local.length > 0 && (
        <Shelf
          title="Auteurs d’ici"
          subtitle="Des plumes québécoises à emprunter près de chez vous"
        >
          {local.map((w) => (
            <WorkCard key={w.id} work={w} />
          ))}
        </Shelf>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-100">
          Parcourir
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {formats.map((f) => {
            const Icon = FORMAT_ICONS[f.id];
            return (
              <li key={f.id}>
                <Link
                  href={searchHref({ formats: [f.id] })}
                  className="group flex h-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-[#d4a853]/60 dark:border-zinc-800 dark:bg-[#1a1a1a]"
                >
                  <span className="rounded-xl bg-[#d4a853]/15 p-2.5 text-[#8a6a2c] dark:text-[#e2c07a]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-zinc-900 group-hover:text-[#8a6a2c] dark:text-zinc-100 dark:group-hover:text-[#e2c07a]">
                      {f.label}
                    </span>
                    <span className="block text-xs text-zinc-500 tabular-nums">
                      {f.count.toLocaleString('fr-CA')}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#1a1a1a]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Vos bibliothèques
            </h2>
            <Link
              href="/bibliotheques"
              className="text-sm font-semibold text-[#8a6a2c] hover:underline dark:text-[#e2c07a]"
            >
              Toutes
            </Link>
          </div>
          <OpenBranches />
        </div>
        <div className="flex flex-col justify-between gap-6 rounded-3xl bg-zinc-900 p-6 text-white dark:bg-[#d4a853]/10">
          <div className="flex flex-col gap-2">
            <span className="w-fit rounded-xl bg-white/10 p-2.5 text-[#e2c07a]">
              <UserRound className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight">Mon dossier</h2>
            <p className="text-white/70">
              Vos emprunts et leurs échéances, vos réservations et votre rang dans la file, un livre
              prêt à récupérer : tout au même endroit, en un coup d’œil.
            </p>
          </div>
          <Link
            href="/compte"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#d4a853] px-4 py-2.5 font-semibold text-white hover:bg-[#b88f42]"
          >
            Ouvrir mon dossier
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
