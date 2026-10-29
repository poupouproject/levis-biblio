// Couvertures et ISBN de Mon dossier : d'abord le catalogue (instantané, par title_id), puis le
// portail pour ce qui manque (recherche lente). Aucune donnée d'usager n'est gardée.
import type { EditionCover } from '@/lib/catalog/types';
import type { CoverMap, CoverStreams } from '@/types';

export interface CoverRequest {
  /** Identifiant de l'élément dans la page (code-barres d'un emprunt, numéro de réservation). */
  id: string;
  titleId: string | null;
}

/** Couvertures déjà résolues : toutes connues, rien à attendre du portail (démo, squelettes). */
export function readyCovers(covers: CoverMap): CoverStreams {
  return { known: Promise.resolve(covers), late: Promise.resolve({}) };
}

/**
 * `known` : ce que le catalogue sait, tout de suite. `late` : le portail, appelé une seule fois et
 * seulement si une notice manque au catalogue ou n'y a pas de couverture (nouveauté, par
 * exemple). Le catalogue en panne n'empêche rien : tout vient alors du portail.
 * `portal` ne doit jamais échouer.
 */
export function resolveCovers(
  items: CoverRequest[],
  lookup: (titleIds: string[]) => Promise<Record<string, EditionCover>>,
  portal: () => Promise<CoverMap>,
): CoverStreams {
  const titleIds = [...new Set(items.flatMap((i) => (i.titleId ? [i.titleId] : [])))];
  const catalogue: Promise<Record<string, EditionCover>> =
    titleIds.length > 0 ? lookup(titleIds).catch(() => ({})) : Promise.resolve({});
  const editionOf = (
    known: Record<string, EditionCover>,
    item: CoverRequest,
  ): EditionCover | undefined => (item.titleId ? known[item.titleId] : undefined);

  const known = catalogue.then((editions) => {
    const covers: CoverMap = {};
    for (const item of items) {
      const edition = editionOf(editions, item);
      if (edition?.cover) covers[item.id] = { url: edition.cover, isbn: edition.isbn };
    }
    return covers;
  });

  const late = catalogue.then(async (editions) => {
    const missing = items.filter((item) => !editionOf(editions, item)?.cover);
    if (missing.length === 0) return {};
    const fromPortal = await portal();
    const covers: CoverMap = {};
    for (const item of missing) {
      const info = fromPortal[item.id];
      const isbn = editionOf(editions, item)?.isbn ?? null;
      if (info) covers[item.id] = { url: info.url, isbn: info.isbn ?? isbn };
      else if (isbn) covers[item.id] = { url: null, isbn };
    }
    return covers;
  });

  return { known, late };
}
