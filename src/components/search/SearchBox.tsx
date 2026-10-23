'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type SyntheticEvent,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock, Layers, Loader2, Search, TrendingUp, User, X } from 'lucide-react';
import type { Suggestion } from '@/lib/catalog/types';
import { searchHref } from '@/lib/catalog/query';
import { fold, tokenize } from '@/lib/catalog/normalize';
import { Cover } from '@/components/catalog/Cover';

const RECENT_KEY = 'lb_recherches';
/** Réponses réussies seulement : une erreur passagère ne bloque pas les essais suivants. */
const cache = new Map<string, Suggestion[]>();

function readRecent(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string').slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string): void {
  try {
    const next = [q, ...readRecent().filter((r) => fold(r) !== fold(q))].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible (navigation privée) : on s'en passe.
  }
}

/** Met en gras les parties du texte qui correspondent à la saisie (sans tenir compte des accents). */
function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  // Mêmes mots que la recherche : « de », « la »… ne sont pas mis en évidence
  const tokens = tokenize(query).filter((t) => t.length > 1);
  if (tokens.length === 0) return text;
  // Repli unité par unité, en retenant pour chaque caractère replié sa position d'origine :
  // « œ » devient « oe » (deux caractères, une position), un emoji ne décale rien.
  let folded = '';
  const origin: number[] = [];
  for (let i = 0; i < text.length; i++) {
    for (const c of fold(text.charAt(i)) || ' ') {
      folded += c;
      origin.push(i);
    }
  }
  const marks = new Array<boolean>(text.length).fill(false);
  for (const t of tokens) {
    let from = 0;
    for (let at = folded.indexOf(t, from); at !== -1; at = folded.indexOf(t, from)) {
      for (let k = at; k < at + t.length; k++) marks[origin[k] ?? 0] = true;
      from = at + t.length;
    }
  }
  const parts: ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const marked = marks[i];
    let j = i;
    while (j < text.length && marks[j] === marked) j++;
    const chunk = text.slice(i, j);
    parts.push(
      marked ? (
        <mark key={i} className="bg-transparent font-bold text-inherit">
          {chunk}
        </mark>
      ) : (
        chunk
      ),
    );
    i = j;
  }
  return parts;
}

const KIND_ICON = { serie: Layers, auteur: User, oeuvre: BookOpen } as const;

/** Contenu d'une ligne de suggestion : vignette, libellé avec mots en gras, détail. */
function SuggestionContent({ s, query }: { s: Suggestion; query: string }): JSX.Element {
  const Icon = KIND_ICON[s.kind];
  return (
    <>
      {s.cover ? (
        <Cover src={s.cover} title={s.label} sizes="32px" className="w-8 flex-shrink-0 rounded" />
      ) : (
        <span className="flex h-11 w-8 flex-shrink-0 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800">
          <Icon className="h-4 w-4 text-zinc-400" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-zinc-900 dark:text-zinc-100">
          <Highlight text={s.label} query={query} />
        </span>
        <span className="block truncate text-xs text-zinc-500">{s.detail}</span>
      </span>
    </>
  );
}

type Option =
  { type: 'suggestion'; suggestion: Suggestion } | { type: 'query'; q: string; recent: boolean };

/** Écran tactile (téléphone, tablette) : le clavier virtuel occupe une bonne part de l'écran. */
export function isTouchScreen(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Défilement qui remonte le champ juste sous l'en-tête (`top` = position actuelle du champ,
 * `margin` = sa marge de défilement). Rien quand il y est déjà, ou plus haut : un champ collant
 * reste en place au lieu de ramener la page à l'endroit qu'il occupe dans le flux.
 */
export function raiseOffset(top: number, margin: number): number {
  return Math.max(0, Math.round(top - margin));
}

interface BaseProps {
  defaultValue?: string;
  size?: 'hero' | 'compact';
  popular?: string[];
  autoFocus?: boolean | undefined;
  /** Dans la recherche flottante de l'en-tête : suggestions dans le panneau, sans raccourci « / ». */
  floating?: boolean | undefined;
  /** Appelé quand une recherche ou une suggestion est choisie. */
  onNavigate?: (() => void) | undefined;
  /** Sur écran tactile, le focus est confié à la recherche flottante plutôt qu'à ce champ. */
  onTouchFocus?: (() => void) | undefined;
  /** À droite du champ (bouton « Annuler » du panneau) : les suggestions passent dessous. */
  trailing?: ReactNode;
}

/** Saisie contrôlée de l'extérieur (partagée avec la recherche flottante) : les deux ensemble. */
type SearchBoxProps = BaseProps &
  (
    | { value: string; onValueChange: (value: string) => void }
    | { value?: undefined; onValueChange?: undefined }
  );

export function SearchBox({
  defaultValue = '',
  size = 'compact',
  popular = [],
  autoFocus,
  floating = false,
  onNavigate,
  value: controlled,
  onValueChange,
  onTouchFocus,
  trailing,
}: SearchBoxProps): JSX.Element {
  const router = useRouter();
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [ownValue, setOwnValue] = useState(defaultValue);
  const value = controlled ?? ownValue;
  const setValue = onValueChange ?? setOwnValue;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [lastFetched, setLastFetched] = useState<{ key: string; list: Suggestion[] }>({
    key: '',
    list: [],
  });
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [navigating, startNavigation] = useTransition();

  // La valeur suit l'URL quand on navigue (retour arrière, lien de suggestion) : ajustée
  // pendant le rendu plutôt que dans un effet, sans rendu supplémentaire.
  const [syncedDefault, setSyncedDefault] = useState(defaultValue);
  if (syncedDefault !== defaultValue) {
    setSyncedDefault(defaultValue);
    setOwnValue(defaultValue);
  }

  const key = fold(value.trim());
  const typed = key.length >= 2;
  // Seules les suggestions de la saisie actuelle sont sélectionnables. Pendant le chargement,
  // celles de la saisie précédente restent visibles, estompées et inertes (pas de saut d'affichage).
  const suggestions = typed ? (cache.get(key) ?? []) : [];
  const stale = typed && !cache.has(key) && lastFetched.key !== key ? lastFetched.list : [];

  // « / » place le curseur dans la recherche, comme sur les grands sites
  useEffect(() => {
    if (floating) return;
    const onKey = (e: globalThis.KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (e.key !== '/' || target?.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [floating]);

  // Suggestions : délai de 120 ms, requête annulée si la saisie change, réponses en mémoire.
  // Seul le champ actif interroge : la barre de l'accueil et le panneau flottant partagent leur
  // saisie, sans quoi chaque frappe partirait deux fois.
  useEffect(() => {
    if (!open || key.length < 2 || cache.has(key)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/catalogue/suggestions?q=${encodeURIComponent(key)}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status));
          const list = (await res.json()) as Suggestion[];
          cache.set(key, list);
          setLastFetched({ key, list });
          setActive(-1);
        })
        .catch(() => {
          // Erreur ou requête annulée : rien en mémoire, la même saisie sera réessayée.
          // L'ancienne liste disparaît plutôt que de rester affichée sous la nouvelle saisie.
          if (!controller.signal.aborted) setLastFetched({ key, list: [] });
        })
        .finally(() => {
          setLoading(false);
        });
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, open]);

  // Hauteur réellement visible, clavier déduit : iOS Safari ignore `interactive-widget` et ne
  // réduit pas `dvh` quand le clavier s'ouvre, mais met à jour le visualViewport.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return;
    const update = (): void => {
      form.current?.style.setProperty('--hauteur-visible', `${String(vv.height)}px`);
    };
    update();
    vv.addEventListener('resize', update);
    return () => {
      vv.removeEventListener('resize', update);
    };
  }, [open]);

  const options: Option[] = typed
    ? [
        { type: 'query', q: value.trim(), recent: false },
        ...suggestions.map((s) => ({ type: 'suggestion' as const, suggestion: s })),
      ]
    : [
        ...recent.map((q) => ({ type: 'query' as const, q, recent: true })),
        ...popular
          .filter((p) => !recent.some((r) => fold(r) === fold(p)))
          .slice(0, 6 - recent.length)
          .map((q) => ({ type: 'query' as const, q, recent: false })),
      ];
  const showList = open && options.length + stale.length > 0;

  // Sur téléphone et tablette (écran tactile), le clavier occupe une bonne part de l'écran :
  // le champ remonte sous l'en-tête pour laisser la place aux suggestions. Relancé quand le
  // clavier finit de s'ouvrir, car le navigateur recentre lui-même le champ à ce moment.
  const raiseOnTouch = (): void => {
    if (floating || !isTouchScreen()) return;
    const raise = (): void => {
      const el = form.current;
      if (!el) return;
      const top = raiseOffset(
        el.getBoundingClientRect().top,
        parseFloat(getComputedStyle(el).scrollMarginTop) || 0,
      );
      if (top > 0) window.scrollBy({ top, behavior: 'smooth' });
    };
    raise();
    const vv = window.visualViewport;
    if (!vv) return;
    vv.addEventListener('resize', raise, { once: true });
    setTimeout(() => {
      vv.removeEventListener('resize', raise);
    }, 1000);
  };

  const go = (href: string, q?: string): void => {
    if (q) saveRecent(q);
    setOpen(false);
    input.current?.blur();
    onNavigate?.();
    startNavigation(() => {
      router.push(href);
    });
  };

  const choose = (option: Option): void => {
    if (option.type === 'query') {
      setValue(option.q);
      go(searchHref({ q: option.q }), option.q);
    } else {
      go(option.suggestion.href, value.trim() || undefined);
    }
  };

  const onSubmit = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const chosen = active >= 0 ? options[active] : undefined;
    if (chosen) choose(chosen);
    else if (value.trim()) go(searchHref({ q: value.trim() }), value.trim());
    // Panneau de l'en-tête vide : on parcourt le catalogue, comme l'ancien lien « Catalogue »
    else if (floating) go(searchHref({}));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // -1 = le champ lui-même ; on boucle de la dernière option au champ et inversement
      setActive((i) => {
        const next = i + step;
        if (next < -1) return options.length - 1;
        return next >= options.length ? -1 : next;
      });
    } else if (e.key === 'Escape') {
      if (showList) {
        // Ferme la liste seulement : dans le panneau, le <dialog> se fermerait aussi
        e.preventDefault();
        setOpen(false);
      } else if (!floating) {
        setValue('');
      }
      // Panneau sans liste : Échap ferme le <dialog> et la saisie est conservée
      setActive(-1);
    }
  };

  const hero = size === 'hero';
  const listId = `${id}-suggestions`;
  const optionId = (i: number): string => `${id}-option-${String(i)}`;

  return (
    <form
      ref={form}
      role="search"
      onSubmit={onSubmit}
      // L'en-tête collant fait 3,5 rem : le champ remonté s'arrête juste dessous
      className="relative w-full scroll-mt-18"
    >
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className={`pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-zinc-400 ${hero ? 'h-6 w-6' : 'h-5 w-5'}`}
            aria-hidden
          />
          <input
            ref={input}
            type="search"
            name="q"
            role="combobox"
            aria-label="Rechercher dans le catalogue"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            autoFocus={autoFocus}
            enterKeyHint="search"
            value={value}
            placeholder="Titre, auteur, série, ISBN…"
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => {
              if (onTouchFocus && isTouchScreen()) {
                // Retiré d'abord : à sa fermeture, le panneau rendrait sinon le focus à ce champ
                // et se rouvrirait aussitôt.
                input.current?.blur();
                onTouchFocus();
                return;
              }
              setRecent(readRecent());
              setOpen(true);
              raiseOnTouch();
            }}
            onBlur={() => {
              setOpen(false);
            }}
            onKeyDown={onKeyDown}
            className={`w-full rounded-2xl border border-zinc-300 bg-white text-zinc-900 shadow-sm transition-shadow placeholder:text-zinc-400 focus:border-[#d4a853] focus:shadow-lg focus:ring-4 focus:ring-[#d4a853]/15 focus:outline-none dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-zinc-100 [&::-webkit-search-cancel-button]:hidden ${
              hero ? 'h-16 pr-28 pl-13 text-lg' : 'h-12 pr-24 pl-12 text-base'
            }`}
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
            {(loading || navigating) && (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" aria-hidden />
            )}
            {value && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => {
                  setValue('');
                  setActive(-1);
                  input.current?.focus();
                }}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Effacer"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
            <button
              type="submit"
              className={`rounded-xl bg-[#d4a853] font-semibold text-white transition-colors hover:bg-[#b88f42] ${hero ? 'px-4 py-2.5' : 'px-3 py-1.5 text-sm'}`}
            >
              <span className="sr-only sm:not-sr-only">Chercher</span>
              <Search className="h-4 w-4 sm:hidden" aria-hidden />
            </button>
          </div>
        </div>
        {trailing}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          // Empêche la perte de focus avant le clic
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          // Flottante : la liste s'insère dans le panneau, sous le champ placé en haut de l'écran
          className={`mt-2 overflow-y-auto overscroll-contain p-1.5 ${
            floating
              ? 'max-h-[calc(var(--hauteur-visible,100dvh)-6rem)] sm:pointer-fine:max-h-[min(70vh,calc(var(--hauteur-visible,100dvh)-10rem))]'
              : 'absolute top-full right-0 left-0 z-50 max-h-[min(70vh,calc(var(--hauteur-visible,100dvh)-10rem))] rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#1a1a1a]'
          }`}
        >
          {!typed && (
            <li
              role="presentation"
              className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase"
            >
              {recent.length > 0 ? 'Recherches récentes et populaires' : 'Recherches populaires'}
            </li>
          )}
          {options.map((option, i) => {
            const selected = i === active;
            const base = `flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left ${selected ? 'bg-[#d4a853]/15' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70'}`;
            if (option.type === 'query') {
              const Icon = option.recent ? Clock : typed ? Search : TrendingUp;
              return (
                <li
                  key={`q-${option.q}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    choose(option);
                  }}
                  onMouseEnter={() => {
                    setActive(i);
                  }}
                  className={base}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-zinc-400" aria-hidden />
                  <span className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                    {typed ? (
                      <>
                        Rechercher « <strong>{option.q}</strong> »
                      </>
                    ) : (
                      option.q
                    )}
                  </span>
                </li>
              );
            }
            const s = option.suggestion;
            return (
              <li
                key={`${s.kind}-${s.href}`}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  choose(option);
                }}
                onMouseEnter={() => {
                  setActive(i);
                }}
                className={base}
              >
                <SuggestionContent s={s} query={value} />
              </li>
            );
          })}
          {stale.map((s) => (
            <li
              key={`ancien-${s.kind}-${s.href}`}
              role="presentation"
              aria-hidden
              className="pointer-events-none flex items-center gap-3 rounded-xl px-3 py-2 opacity-40"
            >
              <SuggestionContent s={s} query={value} />
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
