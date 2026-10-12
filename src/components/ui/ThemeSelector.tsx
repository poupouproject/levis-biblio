'use client';

import { useEffect, useSyncExternalStore, type JSX } from 'react';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { THEME_STORAGE_KEY, isThemePreference, type ThemePreference } from '@/lib/theme';

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'Auto', icon: Monitor },
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
];

const CHANGE_EVENT = 'lb-theme-change';

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function writePreference(value: ThemePreference): void {
  try {
    if (value === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Stockage bloqué : le choix s'applique quand même jusqu'au rechargement.
  }
}

const systemQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(value: ThemePreference): void {
  const dark = value === 'dark' || (value === 'system' && systemQuery().matches);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

// Préférence courante, partagée par tous les sélecteurs et synchronisée entre onglets.
let current: ThemePreference | null = null;
const subscribe = (onChange: () => void): (() => void) => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === THEME_STORAGE_KEY) {
      current = readPreference();
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
};
const getSnapshot = (): ThemePreference => (current ??= readPreference());
const getServerSnapshot = (): null => null;

/** Enregistre le choix et prévient tous les sélecteurs affichés. */
function choosePreference(value: ThemePreference): void {
  current = value;
  writePreference(value);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Sélecteur Auto / Clair / Sombre. Le choix est gardé sur l'appareil (localStorage). */
export function ThemeSelector(): JSX.Element {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Applique le thème choisi et, en mode Auto, suit les changements du système.
  useEffect(() => {
    if (preference === null) return;
    applyTheme(preference);
    if (preference !== 'system') return;
    const query = systemQuery();
    const onSystemChange = (): void => {
      applyTheme('system');
    };
    query.addEventListener('change', onSystemChange);
    return () => {
      query.removeEventListener('change', onSystemChange);
    };
  }, [preference]);

  return (
    <div
      role="radiogroup"
      aria-label="Apparence"
      className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              choosePreference(value);
            }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selected
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${selected ? 'text-[#d4a853]' : ''}`} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
