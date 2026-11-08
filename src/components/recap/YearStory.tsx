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
import { FlaskConical, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import type { YearRecap } from '@/lib/account/recap';
import {
  MUSIC_VOLUME,
  RECAP_MUSIC,
  musicVolume,
  readSoundPreference,
  writeSoundPreference,
} from '@/lib/account/recap-sound';
import {
  AuthorSlide,
  FinalSlide,
  GlimpseBackdrop,
  IntroSlide,
  type GlimpseCover,
  MonthsSlide,
  PaceSlide,
  ProfileSlide,
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
  /** Documents de l'année, pour le fond flou de l'écran d'ouverture. */
  glimpse: GlimpseCover[];
}

/** Durée d'un écran avant de passer au suivant. */
const SLIDE_MS = 6500;
/** Passage d'un volume à l'autre (écran de partage). */
const FADE_MS = 1200;
/** Appui plus long : met le récit en pause tant que le doigt reste posé. */
const HOLD_MS = 250;
/** Glisser vers le bas de plus de 90 px : fermer. */
const SWIPE_CLOSE_PX = 90;

interface Slide {
  id: string;
  /** Annoncé au lecteur d'écran à chaque changement. */
  label: string;
  background: string;
  /** Fond plein cadre, sous l'en-tête et le contenu. */
  backdrop?: (() => JSX.Element | null) | undefined;
  render: () => JSX.Element;
}

/** Stockage du navigateur ; refusé (navigation privée, réglages) : aucun. */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
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
export function YearStory({
  recap,
  firstName,
  demo,
  years,
  series,
  glimpse,
}: YearStoryProps): JSX.Element {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  // Musique : décidée au geste « C'est parti », d'après le choix retenu dans le navigateur
  const [sound, setSound] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const reduced = useReducedMotion();
  const hidden = usePageHidden();

  /**
   * Lever de rideau. La musique ne peut partir que dans le geste lui-même : arriver sur la page
   * par un lien ne suffit pas (code QR, lien ouvert depuis une autre application, Safari).
   */
  const start = useCallback(() => {
    const on = readSoundPreference(browserStorage());
    setSound(on);
    setPaused(false);
    setIndex(1);
    const element = audio.current;
    if (on && element) {
      element.currentTime = 0;
      element.volume = MUSIC_VOLUME;
      void element.play().catch(() => undefined);
    }
  }, []);

  const slides = useMemo((): Slide[] => {
    const list: Slide[] = [
      {
        id: 'intro',
        label: `Votre année ${String(recap.year)} à la bibliothèque`,
        background: 'from-[#3d2c5e] to-[#5b2333]',
        backdrop: () => <GlimpseBackdrop glimpse={glimpse} />,
        render: () => <IntroSlide recap={recap} firstName={firstName} onStart={start} />,
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
      id: 'profil',
      label: 'Votre profil de lecture',
      background: 'from-[#1a1a1a] to-[#3d2c5e]',
      render: () => <ProfileSlide recap={recap} />,
    });
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
  }, [recap, firstName, demo, years, series, glimpse, start]);

  const last = slides.length - 1;
  const slide = slides[Math.min(index, last)] ?? slides[0];
  const halted = paused || held || hidden;
  // Pas d'avance automatique sur l'écran d'ouverture (le rideau attend le geste), ni sur le
  // dernier (partage), ni si les animations sont réduites
  const autoplay = !reduced && index > 0 && index < last;
  const playing = sound && index > 0 && !halted;
  const volume = musicVolume(index, last);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(last, Math.max(0, i + delta)));
    },
    [last],
  );
  /** Avancer ; depuis l'écran d'ouverture, c'est lever le rideau. */
  const next = useCallback(() => {
    if (index === 0) start();
    else go(1);
  }, [index, start, go]);
  const close = useCallback(() => {
    router.push('/compte');
  }, [router]);

  const toggleSound = (): void => {
    const on = !sound;
    setSound(on);
    writeSoundPreference(browserStorage(), on);
    const element = audio.current;
    // Dans le geste, pour Safari ; l'effet ci-dessous s'occupe ensuite de la pause
    if (on && element && !halted) {
      element.volume = volume;
      void element.play().catch(() => undefined);
    }
  };

  // La musique suit le récit : pause, appui long, onglet caché, retour au rideau
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    if (!playing) element.pause();
    else if (element.paused) void element.play().catch(() => undefined);
  }, [playing]);

  // Fondu vers le volume de l'écran (plus bas sur l'écran de partage). Sans effet sur iPhone,
  // où le volume ne se règle pas par la page.
  useEffect(() => {
    const element = audio.current;
    if (!element || volume === 0) return;
    const from = element.volume;
    const begin = performance.now();
    let frame = 0;
    const step = (now: number): void => {
      const progress = Math.min(1, (now - begin) / FADE_MS);
      element.volume = from + (volume - from) * progress;
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [volume]);

  // Musique coupée par l'usager : rien à précharger
  useEffect(() => {
    const element = audio.current;
    if (element && readSoundPreference(browserStorage())) element.preload = 'auto';
    return () => {
      element?.pause();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const onControl = Boolean(target?.closest('a, button, input, label, select, textarea'));
      if (event.key === 'ArrowRight') next();
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
  }, [next, go, close]);

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
    if (delta > 0) next();
    else go(delta);
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
        {/* Fichier chargé seulement si la musique n'a pas été coupée ; jamais lancé sans geste */}
        <audio ref={audio} src={RECAP_MUSIC} preload="none" loop />
        {slide?.backdrop && (
          <div key={`fond-${slide.id}`} className="absolute inset-0 z-0">
            {slide.backdrop()}
          </div>
        )}
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
              {index > 0 && (
                <button
                  type="button"
                  onClick={toggleSound}
                  aria-pressed={!sound}
                  aria-label={sound ? 'Couper la musique' : 'Remettre la musique'}
                  className="rounded-full p-2 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
              )}
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
