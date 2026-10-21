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
import Image from 'next/image';
import { BookOpen, Clock, Layers, Loader2, Search, TrendingUp, User, X } from 'lucide-react';
import type { Suggestion } from '@/lib/catalog/types';
import { searchHref } from '@/lib/catalog/query';
import { fold, tokenize } from '@/lib/catalog/normalize';

const RECENT_KEY = 'lb_recherches';
const DIRECT = process.env.NEXT_PUBLIC_VERCEL_ENV !== undefined;
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
  // Repli caractère par caractère : les positions restent alignées sur le texte d'origine
  const folded = Array.from(text, (c) => fold(c).charAt(0) || ' ').join('');
  const marks = new Array<boolean>(text.length).fill(false);
  for (const t of tokens) {
    let from = 0;
    for (let at = folded.indexOf(t, from); at !== -1; at = folded.indexOf(t, from)) {
      for (let i = at; i < at + t.length && i < marks.length; i++) marks[i] = true;
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

type Option =
  { type: 'suggestion'; suggestion: Suggestion } | { type: 'query'; q: string; recent: boolean };

interface SearchBoxProps {
  defaultValue?: string;
  size?: 'hero' | 'compact';
  popular?: string[];
  autoFocus?: boolean | undefined;
}

export function SearchBox({
  defaultValue = '',
  size = 'compact',
  popular = [],
  autoFocus,
}: SearchBoxProps): JSX.Element {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [lastFetched, setLastFetched] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [navigating, startNavigation] = useTransition();

  // La valeur suit l'URL quand on navigue (retour arrière, lien de suggestion) : ajustée
  // pendant le rendu plutôt que dans un effet, sans rendu supplémentaire.
  const [syncedDefault, setSyncedDefault] = useState(defaultValue);
  if (syncedDefault !== defaultValue) {
    setSyncedDefault(defaultValue);
    setValue(defaultValue);
  }

  const key = fold(value.trim());
  const typed = key.length >= 2;
  // Réponse en mémoire si on l'a déjà ; sinon la précédente reste affichée pendant le chargement
  const suggestions = typed ? (cache.get(key) ?? lastFetched) : [];

  // « / » place le curseur dans la recherche, comme sur les grands sites
  useEffect(() => {
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
  }, []);

  // Suggestions : délai de 120 ms, requête annulée si la saisie change, réponses en mémoire
  useEffect(() => {
    if (key.length < 2 || cache.has(key)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/catalogue/suggestions?q=${encodeURIComponent(key)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? (res.json() as Promise<Suggestion[]>) : []))
        .then((list) => {
          cache.set(key, list);
          setLastFetched(list);
          setActive(-1);
        })
        .catch(() => undefined)
        .finally(() => {
          setLoading(false);
        });
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

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
  const showList = open && options.length > 0;

  const go = (href: string, q?: string): void => {
    if (q) saveRecent(q);
    setOpen(false);
    input.current?.blur();
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
      if (open) setOpen(false);
      else setValue('');
      setActive(-1);
    }
  };

  const hero = size === 'hero';
  const listId = `${id}-suggestions`;
  const optionId = (i: number): string => `${id}-option-${String(i)}`;

  return (
    <form role="search" onSubmit={onSubmit} className="relative w-full">
      <div className="relative">
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
            setRecent(readRecent());
            setOpen(true);
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

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          // Empêche la perte de focus avant le clic
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          className="absolute top-full right-0 left-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xl dark:border-zinc-800 dark:bg-[#1a1a1a]"
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
            const Icon = KIND_ICON[s.kind];
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
                <span className="relative flex h-11 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                  {s.cover ? (
                    <Image
                      src={s.cover}
                      alt=""
                      fill
                      sizes="32px"
                      unoptimized={DIRECT}
                      className="object-cover"
                    />
                  ) : (
                    <Icon className="h-4 w-4 text-zinc-400" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-900 dark:text-zinc-100">
                    <Highlight text={s.label} query={value} />
                  </span>
                  <span className="block truncate text-xs text-zinc-500">{s.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}
