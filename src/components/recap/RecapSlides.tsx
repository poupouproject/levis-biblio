'use client';

import type { CSSProperties, JSX, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import {
  LOAN_DAYS,
  MONTHS,
  MONTHS_SHORT,
  PERIOD_MONTHS,
  comparisonText,
  daysText,
  periodText,
  readerProfile,
  volumeRanges,
  type RecapSeries,
  type YearRecap,
} from '@/lib/account/recap';
import { formatDate, plural } from '@/lib/account/format';
import { Cover } from '@/components/catalog/Cover';
import { ShareRecap } from './ShareRecap';
import type { SeriesExtras } from './YearStory';

/** Animation d'entrée : l'état final est celui du style, l'image clé ne donne que le départ. */
function enter(name: string, delayMs = 0, durationMs = 700): CSSProperties {
  return {
    animation: `${name} ${String(durationMs)}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${String(delayMs)}ms both`,
  };
}

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/** Nombre qui compte jusqu'à sa valeur ; le lecteur d'écran lit la valeur finale. */
function CountUp({ value, className = '' }: { value: number; className?: string }): JSX.Element {
  return (
    <span className={className}>
      <span
        aria-hidden
        className="recap-count tabular-nums"
        style={{ ['--recap-count' as string]: value, ...enter('recap-count', 300, 1600) }}
      />
      <span className="sr-only">{value}</span>
    </span>
  );
}

function Kicker({ children, delay = 0 }: { children: ReactNode; delay?: number }): JSX.Element {
  return (
    <p
      className="text-sm font-semibold tracking-[0.2em] text-white/80 uppercase"
      style={enter('recap-rise', delay)}
    >
      {children}
    </p>
  );
}

function Centered({ children }: { children: ReactNode }): JSX.Element {
  return <div className="flex flex-1 flex-col justify-center gap-5">{children}</div>;
}

/** Un document de l'année pour le fond flou ; sans image, une couverture typographique. */
export interface GlimpseCover {
  title: string;
  author: string | null;
  cover: string | null;
}

/** Assez de couvertures pour couvrir l'écran incliné ; on répète celles de l'année au besoin. */
const BACKDROP_TILES = 20;

/**
 * Avant-goût de l'écran d'ouverture : les couvertures de l'année, floues, qui se précisent un
 * peu sans jamais devenir lisibles. On devine ses livres ; le récit les dévoilera.
 */
export function GlimpseBackdrop({ glimpse }: { glimpse: GlimpseCover[] }): JSX.Element | null {
  if (glimpse.length === 0) return null;
  const tiles = Array.from({ length: BACKDROP_TILES }, (_, i) => ({
    key: String(i),
    book: glimpse[i % glimpse.length] ?? glimpse[0],
  }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -inset-1/4 -rotate-12 opacity-60 blur-[7px]"
        style={enter('recap-unblur', 0, 4500)}
      >
        <div className="recap-drift grid grid-cols-4 gap-3">
          {tiles.map(({ key, book }, i) => (
            // Les couvertures arrivent une à une, dans un ordre dispersé
            <div key={key} style={enter('recap-tile', ((i * 7) % BACKDROP_TILES) * 60, 900)}>
              <Cover
                src={book?.cover ?? null}
                title={book?.title ?? ''}
                author={book?.author}
                sizes="120px"
              />
            </div>
          ))}
        </div>
      </div>
      {/* Voile pour que le texte reste lisible sur n'importe quelle couverture */}
      <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/50 to-black/75" />
      {/* Halos de lumière qui flottent lentement */}
      <div className="recap-orb absolute top-[5%] -left-1/3 h-[60%] w-[90%] rounded-full bg-[#f0c987]/25 mix-blend-screen blur-3xl" />
      <div
        className="recap-orb absolute -right-1/3 bottom-0 h-[55%] w-[85%] rounded-full bg-[#f2b5d4]/20 mix-blend-screen blur-3xl"
        style={{ animationDelay: '-7s' }}
      />
    </div>
  );
}

/** Texte qui arrive lettre par lettre ; le lecteur d'écran lit le mot entier. */
function Letters({ text, delay }: { text: string; delay: number }): JSX.Element {
  return (
    <>
      <span aria-hidden>
        {Array.from(text).map((letter, i) => (
          <span
            // Les lettres ne changent jamais d'ordre : l'indice suffit comme clé
            key={i}
            className="inline-block whitespace-pre"
            style={enter('recap-letter', delay + i * 55, 750)}
          >
            {letter}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}

/**
 * L'année en rouleaux de machine à sous : chaque chiffre tourne deux fois puis s'arrête, l'un
 * après l'autre. Sans animation, les chiffres sont simplement à leur place.
 */
function YearReels({ year, delay }: { year: number; delay: number }): JSX.Element {
  return (
    <span aria-hidden className="inline-flex tabular-nums">
      {String(year)
        .split('')
        .map((digit, i) => {
          const stop = 20 + Number(digit);
          return (
            <span key={i} className="inline-block h-[1em] overflow-hidden">
              <span
                className="flex flex-col"
                style={{
                  transform: `translateY(${String(-stop)}em)`,
                  animation: `recap-reel ${String(1100 + i * 150)}ms cubic-bezier(0.2, 0.9, 0.3, 1.04) ${String(delay + i * 100)}ms both`,
                }}
              >
                {Array.from({ length: stop + 1 }, (_, n) => (
                  <span key={n} className="h-[1em] leading-none">
                    {n % 10}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
    </span>
  );
}

const SPARK_COLORS = ['#f0c987', '#f2b5d4', '#b8f2e6', '#ffffff'] as const;

/** Gerbe d'étincelles et éclair de lumière, quand le dernier rouleau s'arrête. */
function Burst({ delay }: { delay: number }): JSX.Element {
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2">
      <span
        className="recap-flash absolute -top-32 -left-32 block h-64 w-64 rounded-full bg-radial from-[#f0c987]/80 to-transparent to-70%"
        style={{ animation: `recap-flash 1200ms ease-out ${String(delay)}ms both` }}
      />
      {Array.from({ length: 20 }, (_, i) => {
        const size = i % 4 === 0 ? 10 : 6;
        return (
          <span
            key={i}
            className="recap-spark absolute block rounded-full"
            style={{
              width: size,
              height: size,
              marginTop: -size / 2,
              marginLeft: -size / 2,
              backgroundColor: SPARK_COLORS[i % SPARK_COLORS.length],
              ['--spark-angle' as string]: `${String(i * 18 + (i % 2) * 7)}deg`,
              ['--spark-distance' as string]: `${String(6 + (i % 3) * 2.5)}rem`,
              animation: `recap-spark ${String(900 + (i % 3) * 250)}ms cubic-bezier(0.1, 0.7, 0.3, 1) ${String(delay)}ms both`,
            }}
          />
        );
      })}
    </span>
  );
}

/**
 * Écran d'ouverture, comme un rideau : quelques phrases qui montent une à une, l'année en grand,
 * puis « C'est parti ». Pas d'avance automatique : le récit (et la musique) part au geste.
 */
export function IntroSlide({
  recap,
  firstName,
  onStart,
}: {
  recap: YearRecap;
  firstName: string;
  onStart: () => void;
}): JSX.Element {
  const line = 'text-2xl leading-snug font-bold text-white/90';
  const discoveries = recap.topSeries ? 'des séries entamées' : 'des découvertes';
  // Le dernier rouleau de l'année s'arrête vers 5,1 s : étincelles, puis le bouton
  const reels = 3300;
  const landed = reels + 300 + 1550;
  return (
    <Centered>
      <Kicker delay={200}>LévisBiblio présente</Kicker>
      <div className="flex flex-col gap-3">
        <p className="text-5xl font-black tracking-tight">
          <Letters text={firstName ? `${firstName}.` : 'Bonjour.'} delay={400} />
        </p>
        <p className={line} style={enter('recap-focus', 1300, 900)}>
          {recap.year} a été toute une année.
        </p>
        <p className={line} style={enter('recap-focus', 2000, 900)}>
          Des pages tournées, {discoveries}, des retours à la dernière minute…
        </p>
        <p className="text-2xl leading-snug font-extrabold" style={enter('recap-focus', 2700, 900)}>
          On la redécouvre ensemble&nbsp;?
        </p>
      </div>
      <h1
        className="relative self-start text-[5.5rem] leading-none font-black tracking-tight text-[#f0c987] drop-shadow-[0_0_24px_rgba(240,201,135,0.45)]"
        style={enter('recap-rise', reels, 500)}
      >
        <Burst delay={landed} />
        <YearReels year={recap.year} delay={reels} />
        <span className="sr-only">{recap.year} : votre année à la bibliothèque</span>
      </h1>
      <div className="self-start" style={enter('recap-pop', landed + 300, 700)}>
        <button
          type="button"
          onClick={onStart}
          className="recap-breathe pointer-events-auto relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#f0c987] px-7 py-3.5 text-lg font-extrabold text-[#2f2f2f] shadow-lg hover:bg-[#fde2b8] focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
        >
          {/* Reflet qui balaie le bouton de temps en temps */}
          <span
            aria-hidden
            className="recap-shine absolute inset-y-0 -left-1/2 w-1/3 bg-white/60"
          />
          <Sparkles className="relative h-5 w-5" aria-hidden />
          <span className="relative">C’est parti</span>
        </button>
      </div>
      {/* Indice du geste, sans texte : la suite est à droite */}
      <div
        aria-hidden
        className="absolute top-1/2 right-1 -translate-y-1/2 text-white/60"
        style={enter('recap-rise', landed + 800, 600)}
      >
        <ChevronRight className="recap-nudge h-8 w-8" />
      </div>
    </Centered>
  );
}

export function TotalSlide({ recap }: { recap: YearRecap }): JSX.Element {
  return (
    <Centered>
      <Kicker>Cette année, vous avez emprunté</Kicker>
      <p className="flex flex-col" style={enter('recap-pop', 100, 900)}>
        <CountUp value={recap.total} className="text-[7rem] leading-none font-black" />
        <span className="text-3xl font-extrabold">
          {recap.total > 1 ? 'documents' : 'document'}
        </span>
        <span className="mt-2 text-sm font-semibold text-white/75">
          {capitalize(periodText(recap.year))}
        </span>
      </p>
      <p className="text-xl font-semibold text-[#b8f2e6]" style={enter('recap-rise', 1800)}>
        {comparisonText(recap)}
      </p>
      {recap.inProgress > 0 && (
        <p className="text-base text-white/80" style={enter('recap-rise', 2300)}>
          Dont {plural(recap.inProgress, 'emprunt')} encore à la maison.
        </p>
      )}
    </Centered>
  );
}

export function MonthsSlide({ recap }: { recap: YearRecap }): JSX.Element {
  const top = recap.topMonth;
  const max = Math.max(1, ...recap.months);
  return (
    <Centered>
      <Kicker>Votre mois le plus occupé</Kicker>
      {top && (
        <div style={enter('recap-pop', 1500, 800)}>
          <p className="text-6xl font-black">{capitalize(MONTHS[top.month] ?? '')}</p>
          <p className="mt-1 text-xl font-semibold text-[#e9d8a6]">
            {plural(top.count, 'document emprunté', 'documents empruntés')}
          </p>
        </div>
      )}
      <div className="flex h-44 gap-1.5" aria-hidden>
        {recap.months.map((count, position) => {
          const month = PERIOD_MONTHS[position] ?? 0;
          return (
            <div key={MONTHS[month]} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full origin-bottom rounded-t-md ${
                    month === top?.month ? 'bg-[#f0c987]' : 'bg-white/40'
                  }`}
                  style={{
                    height: `${String(Math.max(4, (count / max) * 100))}%`,
                    ...enter('recap-grow', 100 + position * 90, 600),
                  }}
                />
              </div>
              <span className="text-[0.65rem] font-semibold text-white/75 uppercase">
                {MONTHS[month]?.charAt(0)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="sr-only">
        Mois par mois, {periodText(recap.year)} :{' '}
        {recap.months
          .map(
            (count, position) => `${MONTHS[PERIOD_MONTHS[position] ?? 0] ?? ''} ${String(count)}`,
          )
          .join(', ')}
        .
      </p>
    </Centered>
  );
}

export function AuthorSlide({ author }: { author: { name: string; count: number } }): JSX.Element {
  const letters = Array.from(author.name);
  return (
    <Centered>
      <Kicker>Votre plume de l’année</Kicker>
      <p className="text-5xl leading-tight font-black break-words">
        <span aria-hidden>
          {letters.map((letter, i) => (
            <span
              // Les lettres ne changent jamais d'ordre : l'indice suffit comme clé
              key={i}
              className="inline-block whitespace-pre"
              style={enter('recap-rise', 200 + i * 60, 500)}
            >
              {letter}
            </span>
          ))}
        </span>
        <span className="sr-only">{author.name}</span>
      </p>
      <p
        className="text-xl font-semibold text-[#f2b5d4]"
        style={enter('recap-rise', 400 + letters.length * 60)}
      >
        {plural(author.count, 'document')} de cette plume cette année.
      </p>
    </Centered>
  );
}

export function SeriesSlide({
  series,
  extras,
}: {
  series: RecapSeries;
  extras: SeriesExtras | null;
}): JSX.Element {
  const covers = extras?.covers ?? [];
  const next = extras?.next ?? null;
  return (
    <Centered>
      <Kicker>Votre série de l’année</Kicker>
      {covers.length > 0 && (
        <div className="relative mx-auto h-48 w-full max-w-xs" aria-hidden>
          {covers.map((c, i) => {
            const tilt = (i - (covers.length - 1) / 2) * 7;
            return (
              <div
                key={c.title}
                className="absolute top-0 left-1/2 w-28"
                style={{
                  marginLeft: `${String(-56 + (i - (covers.length - 1) / 2) * 34)}px`,
                  transform: `rotate(${String(tilt)}deg)`,
                  ['--recap-tilt' as string]: `${String(tilt)}deg`,
                  ...enter('recap-drop', 200 + i * 220, 700),
                }}
              >
                <Cover src={c.cover} title={c.title} sizes="112px" className="shadow-xl" />
              </div>
            );
          })}
        </div>
      )}
      <div style={enter('recap-rise', 400 + covers.length * 220)}>
        <p className="text-5xl leading-tight font-black">{series.name}</p>
        <p className="mt-2 text-lg font-semibold text-[#b8f2e6]">
          {plural(series.volumes.length, 'tome')} : {volumeRanges(series.volumes)}
        </p>
      </div>
      {next?.kind === 'suivant' && (
        <Link
          href={next.href}
          className="pointer-events-auto flex items-center gap-3 self-start rounded-2xl bg-white/15 p-3 pr-5 backdrop-blur hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          style={enter('recap-rise', 900 + covers.length * 220)}
        >
          <div className="w-12 flex-shrink-0">
            <Cover src={next.cover} title={next.title} sizes="48px" />
          </div>
          <span>
            <span className="block text-xs font-semibold tracking-wide text-white/80 uppercase">
              À emprunter ensuite
            </span>
            <span className="block text-lg font-bold">Tome {next.volume}</span>
          </span>
        </Link>
      )}
      {next?.kind === 'a-jour' && (
        <p
          className="flex items-center gap-3 self-start rounded-2xl bg-white/15 p-3 pr-5 backdrop-blur"
          style={enter('recap-rise', 900 + covers.length * 220)}
        >
          <Trophy className="h-8 w-8 flex-shrink-0 text-[#f0c987]" aria-hidden />
          <span>
            <span className="block text-xs font-semibold tracking-wide text-white/80 uppercase">
              Vous êtes à jour
            </span>
            <span className="block text-lg font-bold">
              Tome {next.last} : le dernier à la bibliothèque
            </span>
          </span>
        </p>
      )}
    </Centered>
  );
}

export function PaceSlide({ pace }: { pace: NonNullable<YearRecap['pace']> }): JSX.Element {
  const ratio = Math.min(1, pace.averageDays / LOAN_DAYS);
  return (
    <Centered>
      <Kicker>Votre rythme</Kicker>
      <p style={enter('recap-pop', 100, 900)}>
        <span className="block text-2xl font-bold">En moyenne, vous gardez un document</span>
        <CountUp value={pace.averageDays} className="text-8xl leading-none font-black" />
        <span className="ml-2 text-3xl font-extrabold">jours</span>
      </p>
      <div aria-hidden>
        <div className="h-3 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full origin-left rounded-full bg-[#fde2b8]"
            style={{ width: `${String(ratio * 100)}%`, ...enter('recap-fill', 600, 1400) }}
          />
        </div>
        <p className="mt-1.5 text-xs text-white/75">Sur un prêt de {LOAN_DAYS} jours</p>
      </div>
      <ul className="flex flex-col gap-2 text-lg">
        <li style={enter('recap-rise', 1600)}>
          <span className="font-semibold text-[#fde2b8]">Dévoré le plus vite : </span>
          {pace.fastest.title}, {daysText(pace.fastest.days)}.
        </li>
        {pace.longest.title !== pace.fastest.title && (
          <li style={enter('recap-rise', 2100)}>
            <span className="font-semibold text-[#fde2b8]">Savouré le plus longtemps : </span>
            {pace.longest.title}, {plural(pace.longest.days, 'jour')}.
          </li>
        )}
      </ul>
    </Centered>
  );
}

/** Le profil de lecture, en ruban comme sur l'image à partager. */
export function ProfileSlide({ recap }: { recap: YearRecap }): JSX.Element {
  // À l'écran, la personne voit ses propres titres
  const profile = readerProfile(recap, true);
  return (
    <Centered>
      <Kicker>Votre profil de lecture</Kicker>
      <p className="self-start" style={enter('recap-pop', 300, 900)}>
        <span className="inline-block -rotate-3 rounded-full bg-[#f0c987] px-6 py-3 text-4xl leading-tight font-black text-[#1a1a1a] uppercase">
          {profile.label}
        </span>
      </p>
      <p className="text-xl font-semibold text-[#f0c987]" style={enter('recap-rise', 1200)}>
        {profile.reason}
      </p>
    </Centered>
  );
}

export function StreakSlide({ recap }: { recap: YearRecap }): JSX.Element {
  return (
    <Centered>
      <Kicker>Votre régularité</Kicker>
      <p style={enter('recap-pop', 100, 900)}>
        <CountUp value={recap.streak} className="text-8xl leading-none font-black" />
        <span className="ml-3 text-3xl font-extrabold">mois de suite</span>
      </p>
      <p className="text-xl font-semibold text-[#e9d8a6]" style={enter('recap-rise', 1500)}>
        avec au moins un emprunt chaque mois.
      </p>
      <div className="grid grid-cols-6 gap-3" aria-hidden>
        {recap.months.map((count, position) => {
          const month = PERIOD_MONTHS[position] ?? 0;
          return (
            <div key={MONTHS[month]} className="flex flex-col items-center gap-1">
              <div
                className={`h-9 w-9 rounded-full ${count > 0 ? 'bg-[#e9d8a6]' : 'bg-white/15'}`}
                style={count > 0 ? enter('recap-light', 300 + position * 110, 500) : undefined}
              />
              <span className="text-[0.65rem] font-semibold text-white/75 uppercase">
                {MONTHS_SHORT[month]}
              </span>
            </div>
          );
        })}
      </div>
    </Centered>
  );
}

interface FinalSlideProps {
  recap: YearRecap;
  demo: boolean;
  years: number[];
  onReplay: () => void;
}

export function FinalSlide({ recap, demo, years, onReplay }: FinalSlideProps): JSX.Element {
  const facts = [
    { label: 'Documents', value: String(recap.total) },
    recap.topMonth && {
      label: 'Mois le plus occupé',
      value: capitalize(MONTHS[recap.topMonth.month] ?? ''),
    },
    recap.topAuthor && { label: 'Plume de l’année', value: recap.topAuthor.name },
    recap.topSeries && { label: 'Série de l’année', value: recap.topSeries.name },
  ].filter((f): f is { label: string; value: string } => Boolean(f));
  const otherYears = years.filter((y) => y !== recap.year).slice(0, 4);

  return (
    <div className="flex flex-col gap-5 pt-6">
      <div style={enter('recap-rise')}>
        <h2 className="text-3xl font-black">Votre année {recap.year} en bref</h2>
        <p className="mt-1 text-sm font-semibold text-white/75">
          {capitalize(periodText(recap.year))}
        </p>
      </div>
      {/* L'aperçu de l'image montre le bilan ; le lecteur d'écran en lit le texte */}
      <dl className="sr-only">
        {facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>

      <div style={enter('recap-pop', 150, 700)}>
        <ShareRecap year={recap.year} demo={demo} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 px-3 py-2 font-semibold hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Revoir
        </button>
        {otherYears.map((y) => (
          <Link
            key={y}
            href={`/compte/mon-annee/${String(y)}`}
            className="rounded-xl border border-white/30 px-3 py-2 font-semibold hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            {y}
          </Link>
        ))}
        <Link
          href="/compte"
          className="ml-auto rounded-xl px-3 py-2 font-semibold text-white/85 underline-offset-2 hover:underline"
        >
          Mon dossier
        </Link>
      </div>

      {recap.since && (
        <p className="text-xs leading-relaxed text-white/70">
          D’après votre historique, tenu depuis le {formatDate(recap.since)}. Les emprunts en cours
          y sont ajoutés, à une date d’emprunt estimée. Rien n’est conservé : ce bilan est calculé à
          chaque visite.
        </p>
      )}
    </div>
  );
}
