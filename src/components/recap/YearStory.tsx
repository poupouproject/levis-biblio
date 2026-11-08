'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type PointerEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, Pause, Play, X } from 'lucide-react';
import type { YearRecap } from '@/lib/account/recap';
import {
  AuthorSlide,
  FinalSlide,
  IntroSlide,
  MonthsSlide,
  PaceSlide,
  SeriesSlide,
  StreakSlide,
  TotalSlide,
} from './RecapSlides';

export interface SeriesExtras {
  /** Derniers tomes empruntés, d'après le catalogue. */
  covers: { title: string; cover: string | null }[];
  next: { volume: number; title: string; href: string; cover: string | null } | null;
}

interface YearStoryProps {
  recap: YearRecap;
  firstName: string;
  demo: boolean;
  /** Années qui ont des emprunts, pour passer de l'une à l'autre. */
  years: number[];
  series: SeriesExtras | null;
}

/** Durée d'un écran avant de passer au suivant. */
const SLIDE_MS = 6500;
/** Appui plus long : met le récit en pause tant que le doigt reste posé. */
const HOLD_MS = 250;
/** Glisser vers le bas de plus de 90 px : fermer. */
const SWIPE_CLOSE_PX = 90;

interface Slide {
  id: string;
  /** Annoncé au lecteur d'écran à chaque changement. */
  label: string;
  background: string;
  render: () => JSX.Element;
}

function subscribeMedia(callback: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  return () => {
    query.removeEventListener('change', callback);
  };
}

function subscribeVisibility(callback: () => void): () => void {
  document.addEventListener('visibilitychange', callback);
  return () => {
    document.removeEventListener('visibilitychange', callback);
  };
}

/** Animations réduites (réglage du système) : ni animation, ni avance automatique. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMedia,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

function usePageHidden(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  );
}

/**
 * Récapitulatif en mode story : un écran par statistique, avance automatique, barres de
 * progression. Toucher à droite ou à gauche, appui long pour suspendre, glisser vers le bas pour
 * fermer ; au clavier, flèches, Espace et Échap. Le bouton pause reste toujours visible.
 */
export function YearStory({ recap, firstName, demo, years, series }: YearStoryProps): JSX.Element {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const reduced = useReducedMotion();
  const hidden = usePageHidden();

  const slides = useMemo((): Slide[] => {
    const list: Slide[] = [
      {
        id: 'intro',
        label: `Votre année ${String(recap.year)} à la bibliothèque`,
        background: 'from-[#3d2c5e] to-[#5b2333]',
        render: () => <IntroSlide recap={recap} firstName={firstName} />,
      },
      {
        id: 'total',
        label: 'Vos emprunts de l’année',
        background: 'from-[#1e3a5f] to-[#14505c]',
        render: () => <TotalSlide recap={recap} />,
      },
    ];
    if (recap.topMonth) {
      list.push({
        id: 'mois',
        label: 'Votre mois le plus occupé',
        background: 'from-[#264d3b] to-[#14505c]',
        render: () => <MonthsSlide recap={recap} />,
      });
    }
    if (recap.topAuthor) {
      const author = recap.topAuthor;
      list.push({
        id: 'plume',
        label: 'Votre plume de l’année',
        background: 'from-[#5b2333] to-[#3d2c5e]',
        render: () => <AuthorSlide author={author} />,
      });
    }
    if (recap.topSeries) {
      const top = recap.topSeries;
      list.push({
        id: 'serie',
        label: 'Votre série de l’année',
        background: 'from-[#14505c] to-[#1e3a5f]',
        render: () => <SeriesSlide series={top} extras={series} />,
      });
    }
    if (recap.pace) {
      const pace = recap.pace;
      list.push({
        id: 'rythme',
        label: 'Votre rythme',
        background: 'from-[#7a3e14] to-[#5b2333]',
        render: () => <PaceSlide pace={pace} />,
      });
    }
    if (recap.streak >= 2) {
      list.push({
        id: 'regularite',
        label: 'Votre régularité',
        background: 'from-[#264d3b] to-[#1e3a5f]',
        render: () => <StreakSlide recap={recap} />,
      });
    }
    list.push({
      id: 'bilan',
      label: 'Votre année en bref, à partager',
      background: 'from-[#2f2f2f] to-[#1e3a5f]',
      render: () => (
        <FinalSlide
          recap={recap}
          demo={demo}
          years={years}
          onReplay={() => {
            setIndex(0);
          }}
        />
      ),
    });
    return list;
  }, [recap, firstName, demo, years, series]);

  const last = slides.length - 1;
  const slide = slides[Math.min(index, last)] ?? slides[0];
  const halted = paused || held || hidden;
  // Pas d'avance automatique sur le dernier écran (partage), ni si les animations sont réduites
  const autoplay = !reduced && index < last;

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(last, Math.max(0, i + delta)));
    },
    [last],
  );
  const close = useCallback(() => {
    router.push('/compte');
  }, [router]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const onControl = Boolean(target?.closest('a, button, input, label, select, textarea'));
      if (event.key === 'ArrowRight') go(1);
      else if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === 'Escape') close();
      else if (event.key === ' ' && !onControl) {
        event.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [go, close]);

  // Toucher : un appui bref navigue, un appui long suspend, un glissé vers le bas ferme.
  const press = useRef<{ y: number; held: boolean; timer: number } | null>(null);
  const skipClick = useRef(false);

  const onPointerDown = (event: PointerEvent): void => {
    const state = { y: event.clientY, held: false, timer: 0 };
    state.timer = window.setTimeout(() => {
      state.held = true;
      setHeld(true);
    }, HOLD_MS);
    press.current = state;
  };
  const endPress = (event: PointerEvent | null): void => {
    const state = press.current;
    press.current = null;
    if (!state) return;
    window.clearTimeout(state.timer);
    setHeld(false);
    if (event && event.clientY - state.y > SWIPE_CLOSE_PX) {
      skipClick.current = true;
      close();
    } else if (state.held) {
      skipClick.current = true;
    }
  };
  const onTap = (delta: number): void => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    go(delta);
  };

  const tapZone =
    'h-full touch-none outline-none select-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset';

  return (
    <div
      data-recap=""
      data-paused={halted ? '' : undefined}
      role="region"
      aria-roledescription="récit"
      aria-label={`Votre année ${String(recap.year)} à la bibliothèque`}
      className="fixed inset-0 z-[60] flex justify-center bg-black text-white"
    >
      <div
        className={`relative flex h-full w-full max-w-md flex-col overflow-hidden bg-linear-to-br ${slide?.background ?? ''}`}
      >
        <div className="relative z-30 flex flex-col gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1" aria-hidden>
            {slides.map((s, i) => (
              <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                {i < index && <div className="h-full bg-white" />}
                {i === index && (
                  <div
                    key={`${s.id}-${String(index)}`}
                    className="h-full origin-left bg-white"
                    style={
                      autoplay
                        ? { animation: `recap-progress ${String(SLIDE_MS)}ms linear both` }
                        : {}
                    }
                    onAnimationEnd={() => {
                      if (autoplay) go(1);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-white/85 uppercase">
              LévisBiblio · {recap.year}
              {demo && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 normal-case">
                  <FlaskConical className="h-3 w-3" aria-hidden />
                  Dossier fictif
                </span>
              )}
            </p>
            <div className="flex items-center gap-1">
              {autoplay && (
                <button
                  type="button"
                  onClick={() => {
                    setPaused((p) => !p);
                  }}
                  aria-pressed={paused}
                  aria-label={paused ? 'Reprendre le récit' : 'Mettre le récit en pause'}
                  className="rounded-full p-2 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Fermer le récapitulatif"
                className="rounded-full p-2 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {index < last && (
          <div
            className="absolute inset-0 z-10 flex"
            onPointerDown={onPointerDown}
            onPointerUp={endPress}
            onPointerCancel={() => {
              endPress(null);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
            }}
          >
            <button
              type="button"
              aria-label="Écran précédent"
              className={`w-1/3 ${tapZone}`}
              onClick={() => {
                onTap(-1);
              }}
            />
            <button
              type="button"
              aria-label="Écran suivant"
              className={`w-2/3 ${tapZone}`}
              onClick={() => {
                onTap(1);
              }}
            />
          </div>
        )}

        <div
          key={slide?.id}
          className={`relative z-20 flex min-h-0 flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
            index < last ? 'pointer-events-none' : 'overflow-y-auto'
          }`}
        >
          {slide?.render()}
        </div>

        <p className="sr-only" aria-live="polite">
          {`Écran ${String(index + 1)} sur ${String(slides.length)} : ${slide?.label ?? ''}${
            paused ? ', en pause' : ''
          }`}
        </p>
      </div>
    </div>
  );
}
