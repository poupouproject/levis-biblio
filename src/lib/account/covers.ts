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

/**
 * `known` : ce que le catalogue sait, tout de suite. `late` : le portail, appelé une seule fois et
 * seulement si une notice manque au catalogue ou n'y a pas de couverture (nouveauté, par
 * exemple). Le catalogue en panne n'empêche rien : tout vient alors du portail.
 * `newNotices` : documents absents du catalogue, à y ajouter (notice partielle). Vide si le
 * catalogue n'a pas répondu : on ne saurait pas ce qui y manque.
 * `portal` ne doit jamais échouer.
 */
export function resolveCovers(
  items: CoverRequest[],
  lookup: (titleIds: string[]) => Promise<Record<string, EditionCover>>,
  portal: () => Promise<CoverMap>,
): CoverStreams & { newNotices: Promise<RawEdition[]> } {
  const titleIds = [...new Set(items.flatMap((i) => (i.titleId ? [i.titleId] : [])))];
  const catalogue: Promise<Record<string, EditionCover> | null> =
    titleIds.length > 0 ? lookup(titleIds).catch(() => null) : Promise.resolve({});
  const editionOf = (
    known: Record<string, EditionCover> | null,
    item: CoverRequest,
  ): EditionCover | undefined => (item.titleId ? known?.[item.titleId] : undefined);

  const known = catalogue.then((editions) => {
    const covers: CoverMap = {};
    for (const item of items) {
      const edition = editionOf(editions, item);
      if (edition?.cover) covers[item.id] = { url: edition.cover, isbn: edition.isbn };
    }
    return covers;
  });

  const fromPortal = catalogue.then(async (editions) => {
    const missing = items.filter((item) => !editionOf(editions, item)?.cover);
    return { editions, missing, answer: missing.length > 0 ? await portal() : {} };
  });

  const late = fromPortal.then(({ editions, missing, answer }) => {
    const covers: CoverMap = {};
    for (const item of missing) {
      const info = answer[item.id];
      const isbn = editionOf(editions, item)?.isbn ?? null;
      if (info) covers[item.id] = { url: info.url, isbn: info.isbn ?? isbn };
      else if (isbn) covers[item.id] = { url: null, isbn };
    }
    return covers;
  });

  const newNotices = fromPortal.then(({ editions, missing, answer }) => {
    if (!editions) return [];
    const notices = new Map<string, RawEdition>();
    for (const item of missing) {
      if (!item.titleId || !item.notice || editions[item.titleId]) continue;
      const info = answer[item.id];
      // Deux exemplaires du même titre : chacun complète ce que l'autre n'a pas
      const seen = notices.get(item.titleId);
      notices.set(item.titleId, {
        isbn: seen?.isbn ?? info?.isbn ?? null,
        titleId: item.titleId,
        title: seen?.title ?? item.notice.title,
        author: seen?.author ?? item.notice.author,
        publisher: null,
        year: null,
        format: null,
        pages: null,
        cover: seen?.cover ?? info?.url ?? null,
        summary: null,
        subjects: null,
      });
    }
    return [...notices.values()];
  });

  return { known, late, newNotices };
}
