// Couvertures et ISBN de Mon dossier : d'abord le catalogue (instantané, par title_id), puis le
// portail pour ce qui manque (recherche lente). Aucune donnée d'usager n'est gardée.
import type { EditionCover, RawEdition } from '@/lib/catalog/types';
import type { CoverMap, CoverStreams } from '@/types';

export interface CoverRequest {
  /** Identifiant de l'élément dans la page (code-barres d'un emprunt, numéro de réservation). */
  id: string;
  titleId: string | null;
  /** Titre et auteur tels que le portail les affiche, pour ajouter une notice absente. */
  notice?: { title: string; author: string | null } | undefined;
}

/** Couvertures déjà résolues : toutes connues, rien à attendre du portail (démo, squelettes). */
export function readyCovers(covers: CoverMap): CoverStreams {
  return { known: Promise.resolve(covers), late: Promise.resolve({}) };
}

/** Au-delà, une base en veille ne retarde plus le portail : on fait comme si elle était en panne. */
export const CATALOGUE_TIMEOUT_MS = 1_500;

function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      resolve(null);
    }, ms);
  });
  return Promise.race([promise.catch(() => null), late]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * `known` : ce que le catalogue sait, tout de suite. `late` : le portail, appelé une seule fois et
 * seulement s'il manque au catalogue une notice, sa couverture ou son ISBN (nouveauté, par
 * exemple). Le catalogue en panne ou trop lent (`timeoutMs`) n'empêche rien : tout vient alors du
 * portail. `newNotices` : documents absents du catalogue et décrits par le portail, à y ajouter
 * (notice partielle). Vide si le catalogue n'a pas répondu : on ne saurait pas ce qui y manque.
 * `portal` ne doit jamais échouer.
 */
export function resolveCovers(
  items: CoverRequest[],
  lookup: (titleIds: string[]) => Promise<Record<string, EditionCover>>,
  portal: () => Promise<CoverMap>,
  { timeoutMs = CATALOGUE_TIMEOUT_MS }: { timeoutMs?: number } = {},
): CoverStreams & { newNotices: Promise<RawEdition[]> } {
  const titleIds = [...new Set(items.flatMap((i) => (i.titleId ? [i.titleId] : [])))];
  const catalogue: Promise<Record<string, EditionCover> | null> =
    titleIds.length > 0 ? within(lookup(titleIds), timeoutMs) : Promise.resolve({});
  const editionOf = (
    known: Record<string, EditionCover> | null,
    item: CoverRequest,
  ): EditionCover | undefined => (item.titleId ? known?.[item.titleId] : undefined);
  const complete = (edition: EditionCover | undefined): boolean =>
    Boolean(edition?.cover && edition.isbn);

  const known = catalogue.then((editions) => {
    const covers: CoverMap = {};
    for (const item of items) {
      const edition = editionOf(editions, item);
      if (edition?.cover && edition.isbn)
        covers[item.id] = { url: edition.cover, isbn: edition.isbn };
    }
    return covers;
  });

  const fromPortal = catalogue.then(async (editions) => {
    const missing = items.filter((item) => !complete(editionOf(editions, item)));
    return { editions, missing, answer: missing.length > 0 ? await portal() : {} };
  });

  const late = fromPortal.then(({ editions, missing, answer }) => {
    const covers: CoverMap = {};
    for (const item of missing) {
      const info = answer[item.id];
      const edition = editionOf(editions, item);
      const url = info?.url ?? edition?.cover ?? null;
      const isbn = info?.isbn ?? edition?.isbn ?? null;
      if (url || isbn) covers[item.id] = { url, isbn };
    }
    return covers;
  });

  const newNotices = fromPortal.then(({ editions, missing, answer }) => {
    if (!editions) return [];
    const notices = new Map<string, RawEdition>();
    for (const item of missing) {
      const info = answer[item.id];
      // Sans réponse du portail (en panne, trop lent), rien à ajouter : on réessaiera
      if (!item.titleId || !item.notice || editions[item.titleId] || !info) continue;
      // Deux exemplaires du même titre : chacun complète ce que l'autre n'a pas
      const seen = notices.get(item.titleId);
      notices.set(item.titleId, {
        isbn: seen?.isbn ?? info.isbn ?? null,
        titleId: item.titleId,
        title: seen?.title ?? item.notice.title,
        author: seen?.author ?? item.notice.author,
        publisher: null,
        year: null,
        format: null,
        pages: null,
        cover: seen?.cover ?? info.url ?? null,
        summary: null,
        subjects: null,
      });
    }
    return [...notices.values()];
  });

  return { known, late, newNotices };
}
