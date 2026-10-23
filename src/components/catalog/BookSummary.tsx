import type { JSX } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { bookSummary } from '@/lib/catalog/google-books';

/** Au-delà, la suite du résumé est repliée sous « Lire la suite ». */
const VISIBLE_CHARS = 600;

/**
 * Sépare la partie visible du reste, à environ VISIBLE_CHARS caractères : entre deux
 * paragraphes, ou dans le premier s'il dépasse seul la limite (les descriptions Google
 * arrivent souvent en un seul bloc).
 */
export function splitSummary(paragraphs: string[]): { visible: string[]; rest: string[] } {
  let shown = 0;
  for (const [i, p] of paragraphs.entries()) {
    shown += p.length;
    if (shown <= VISIBLE_CHARS) continue;
    if (i > 0) return { visible: paragraphs.slice(0, i), rest: paragraphs.slice(i) };
    // Premier paragraphe trop long : coupe à la première fin de phrase après la limite
    // (à 200 caractères près), sinon au premier espace.
    const after = p.slice(VISIBLE_CHARS);
    const sentence = /[.!?…»]\s/.exec(after);
    const cut =
      sentence && sentence.index < 200
        ? VISIBLE_CHARS + sentence.index + 1
        : p.indexOf(' ', VISIBLE_CHARS);
    if (cut <= 0) return { visible: paragraphs, rest: [] };
    return {
      visible: [p.slice(0, cut).trim()],
      rest: [p.slice(cut).trim(), ...paragraphs.slice(1)],
    };
  }
  return { visible: paragraphs, rest: [] };
}

/**
 * Résumé d'une œuvre par Google Livres (composant serveur : la clé ne quitte pas le serveur).
 * Rien n'est affiché sans résumé, sans clé ou hors quota. Attribution exigée par Google :
 * logo « Powered by Google » et lien vers la fiche Google Livres.
 */
export async function BookSummary({ isbns }: { isbns: string[] }): Promise<JSX.Element | null> {
  const summary = await bookSummary(isbns);
  if (!summary) return null;

  const { visible, rest } = splitSummary(summary.paragraphs);

  return (
    <section aria-label="Résumé" className="flex max-w-prose flex-col gap-2">
      <div className="flex flex-col gap-2 leading-relaxed text-zinc-700 dark:text-zinc-300">
        {visible.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {rest.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-[#8a6a2c] hover:underline dark:text-[#e2c07a]">
              <span className="group-open:hidden">Lire la suite</span>
              <span className="hidden group-open:inline">Réduire</span>
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {rest.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </details>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        Résumé :
        <a
          href={summary.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          voir sur Google Livres
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        {/* Logo sur fond clair, lisible aussi en mode sombre */}
        <span className="rounded bg-white px-1 py-0.5">
          <Image
            src="/google/powered-by-google.png"
            alt="Powered by Google"
            width={62}
            height={30}
            className="h-4 w-auto"
          />
        </span>
      </p>
    </section>
  );
}

/** Pendant la requête à Google : deux lignes estompées, sans décaler la page. */
export function BookSummarySkeleton(): JSX.Element {
  return (
    <div aria-hidden className="flex max-w-prose flex-col gap-2">
      <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
