import { cache, Suspense, type JSX } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
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
import { unstable_cache } from 'next/cache';
import { getCatalog, type CatalogSourceName } from '@/lib/catalog/source';
import type { CatalogStore } from '@/lib/catalog/store';
import type { CatalogWork, SeriesSummary } from '@/lib/catalog/types';
import { AUTEURS_DICI, RECHERCHES_POPULAIRES } from '@/lib/catalog/curation';
import { searchHref } from '@/lib/catalog/query';
import type { FormatGroup } from '@/lib/catalog/normalize';
import { HeroSearch } from '@/components/search/FloatingSearch';
import { Shelf } from '@/components/catalog/Shelf';
import { SeriesCard, WorkCard } from '@/components/catalog/WorkCard';
import { Cover } from '@/components/catalog/Cover';
import { OpenBranches } from '@/components/branches/OpenBranches';
import { SkeletonScope } from '@/components/ui/Skeleton';

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

interface HomeData {
  newest: CatalogWork[];
  series: SeriesSummary[];
  local: CatalogWork[];
  formats: Awaited<ReturnType<CatalogStore['formatCounts']>>;
  served: number;
}

async function loadHome(catalog: CatalogStore): Promise<HomeData> {
  const [newest, series, local, formats, served] = await Promise.all([
    catalog.newest(18),
    catalog.topSeries(10),
    catalog.byAuthors(AUTEURS_DICI, 18),
    catalog.formatCounts(),
    catalog.editionCount(),
  ]);
  return { newest, series, local, formats, served };
}

interface HomePage extends HomeData {
  source: CatalogSourceName;
  totalEditions: number;
}

async function loadHomePage(): Promise<HomePage> {
  const { catalog, source, totalEditions } = await getCatalog();
  return { ...(await loadHome(catalog)), source, totalEditions };
}

/**
 * Étagères et compteurs de la base, partagés par tous les visiteurs et toutes les instances
 * (cache de données de Next), renouvelés en arrière-plan après 1 h : personne n'attend la base,
 * sauf la toute première visite. Jamais le jeu de démo : il ne doit pas remplacer la base 1 h.
 * `unstable_cache` plutôt que `'use cache'` : sur Vercel, ce dernier garde ses entrées en
 * mémoire, instance par instance (rien de partagé), à moins de `'use cache: remote'`.
 */
const cachedHome = unstable_cache(
  async () => {
    const page = await loadHomePage();
    if (page.source !== 'postgres') throw new Error('Jeu de démo : pas de cache partagé.');
    return page;
  },
  ['accueil'],
  { revalidate: 3600 },
);

/**
 * Données de l'accueil, une seule fois par requête (trois zones les lisent). Jamais lues au
 * build : le catalogue change (notices ajoutées) et une base lente au déploiement ferait échouer
 * le build. Le reste de la page est une coquille statique.
 */
const homePage = cache(async (): Promise<HomePage> => {
  await connection();
  return cachedHome().catch(loadHomePage);
});

export default function Home(): JSX.Element {
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
            <Suspense fallback={<HeroIntro total={null} />}>
              <HeroCount />
            </Suspense>
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
            <Suspense fallback={null}>
              <HeroCovers />
            </Suspense>
          </div>
        </div>
      </section>

      <Suspense fallback={<ShelvesSkeleton />}>
        <HomeShelves />
      </Suspense>

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

function HeroIntro({ total }: { total: number | null }): JSX.Element {
  return (
    <p className="max-w-xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
      {total === null ? 'Des milliers de' : total.toLocaleString('fr-CA')} documents dans 10
      bibliothèques. Les séries réunies, les éditions regroupées, des suggestions dès la première
      lettre.
    </p>
  );
}

async function HeroCount(): Promise<JSX.Element> {
  const { source, served, totalEditions } = await homePage();
  return (
    <>
      <HeroIntro total={totalEditions} />
      {source === 'demo' && (
        <p className="w-fit rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400">
          Démonstration : la recherche porte sur un échantillon de {served.toLocaleString('fr-CA')}{' '}
          documents.
        </p>
      )}
    </>
  );
}

async function HeroCovers(): Promise<JSX.Element> {
  const { newest } = await homePage();
  return (
    <>
      {newest.slice(0, 5).map((w, i) => (
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
    </>
  );
}

async function HomeShelves(): Promise<JSX.Element> {
  const { newest, series, local, formats } = await homePage();
  return (
    <>
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

      <FormatGrid formats={formats} />
    </>
  );
}

function FormatGrid({ formats }: { formats: HomeData['formats'] }): JSX.Element {
  return (
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
  );
}

/** Étagères en attente de la base : mêmes titres, vignettes en blocs. */
function ShelvesSkeleton(): JSX.Element {
  const covers = Array.from({ length: 8 }, (_, i) => (
    <div key={i} data-skeleton-block="" className="aspect-[2/3] w-full rounded-xl" />
  ));
  return (
    <SkeletonScope label="Chargement des nouveautés…">
      <Shelf title="Nouveautés" subtitle="Arrivées récemment dans les rayons">
        {covers}
      </Shelf>
      <Shelf title="Séries à dévorer" subtitle="Tous les tomes réunis, du premier au dernier">
        {covers}
      </Shelf>
    </SkeletonScope>
  );
}
