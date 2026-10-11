'use client';

import { useState, type JSX } from 'react';
import { flushSync } from 'react-dom';
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck } from 'lucide-react';

const inputClass =
  'h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] focus:outline-none dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-zinc-100';

interface LoginFormProps {
  error: string | null;
  defaultCard: string;
}

/**
 * Formulaire envoyé de façon classique (POST puis redirection) vers /compte/connexion/ouvrir :
 * c'est ce parcours que les gestionnaires de mots de passe reconnaissent pour proposer
 * d'enregistrer l'identifiant. Fonctionne aussi sans JavaScript.
 */
export function LoginForm({ error, defaultCard }: LoginFormProps): JSX.Element {
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action="/compte/connexion/ouvrir"
      method="post"
      onSubmit={() => {
        // Synchrone : le NIP redevient un champ mot de passe avant le départ de la page,
        // sinon certains gestionnaires ne le reconnaissent pas.
        flushSync(() => {
          setShowPin(false);
          setSubmitting(true);
        });
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="card" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Numéro de carte
        </label>
        <input
          id="card"
          name="card"
          autoComplete="username"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={30}
          required
          defaultValue={defaultCard}
          placeholder="Numéro sous le code-barres ou identifiant"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'login-error' : undefined}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pin" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          NIP
        </label>
        <div className="relative">
          <input
            id="pin"
            name="pin"
            type={showPin ? 'text' : 'password'}
            autoComplete="current-password"
            required
            maxLength={30}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => {
              setShowPin((v) => !v);
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={showPin ? 'Masquer le NIP' : 'Afficher le NIP'}
          >
            {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {error && (
        <p
          id="login-error"
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        aria-disabled={submitting}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#d4a853] px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#b88f42] aria-disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <LogIn className="h-5 w-5" aria-hidden />
        )}
        {submitting ? 'Connexion…' : 'Ouvrir mon dossier'}
      </button>

      <div className="flex gap-3 rounded-xl bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        <ShieldCheck className="h-5 w-5 flex-shrink-0 text-[#d4a853]" aria-hidden />
        <p>
          Votre NIP sert uniquement à ouvrir une session auprès des bibliothèques de Lévis. Il n’est
          jamais conservé ni journalisé. La session se ferme d’elle-même après 30 minutes.
        </p>
      </div>
    </form>
  );
}
