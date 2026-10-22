import type { JSX } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { bookSummary } from '@/lib/catalog/google-books';

/** Au-delà, la suite du résumé est repliée sous « Lire la suite ». */
const VISIBLE_CHARS = 600;

/**
 * Résumé d'une œuvre par Google Livres (composant serveur : la clé ne quitte pas le serveur).
 * Rien n'est affiché sans résumé, sans clé ou hors quota. Attribution exigée par Google :
 * logo « Powered by Google » et lien vers la fiche Google Livres.
 */
export async function BookSummary({ isbns }: { isbns: string[] }): Promise<JSX.Element | null> {
  const summary = await bookSummary(isbns);
  if (!summary) return null;

  // Paragraphes visibles jusqu'à environ VISIBLE_CHARS caractères, le reste replié
  let shown = 0;
  let split = summary.paragraphs.length;
  for (let i = 0; i < summary.paragraphs.length; i++) {
    shown += summary.paragraphs[i]?.length ?? 0;
    if (shown > VISIBLE_CHARS && i > 0) {
      split = i;
      break;
    }
  }
  const visible = summary.paragraphs.slice(0, split);
  const rest = summary.paragraphs.slice(split);

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
