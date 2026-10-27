// Moteur de recherche en mémoire : regroupe les éditions en œuvres et en séries, puis cherche,
// filtre, trie et suggère. Indépendant de la source (base locale ou jeu de démo) : testable seul.
import { simulateAvailability } from './availability';
import {
  FORMAT_LABELS,
  fold,
  formatGroup,
  isbnForms,
  normalizeIsbn,
  parseAuthor,
  parseTitle,
  plausibleYear,
  slugify,
  tokenize,
  type FormatGroup,
} from './normalize';
import type {
  CatalogEdition,
  CatalogWork,
  FacetCount,
  Period,
  RawEdition,
  SearchQuery,
  SearchResult,
  SeriesSummary,
  Suggestion,
} from './types';

export const PERIOD_LABELS: Record<Period, string> = {
  recent: 'Nouveautés',
  '2010': '2010 à aujourd’hui',
  '2000': '2000 à 2009',
  older: 'Avant 2000',
};

interface IndexedWork {
  work: CatalogWork;
  hay: string; // Titre, sous-titre, série, auteurs, éditeur
  titleFold: string;
  seriesFold: string;
  authorFolds: string[];
  popularity: number;
}

interface AuthorEntry {
  name: string;
  fold: string;
  count: number;
  cover: string | null;
}

export interface SeriesEntry {
  summary: SeriesSummary;
  works: CatalogWork[];
  fold: string;
  /** Popularité : éditions et couvertures de tous les tomes. */
  weight: number;
}

export interface CatalogStats {
  editions: number;
  works: number;
  series: number;
  authors: number;
}

export class Catalog {
  private readonly indexed: IndexedWork[];
  private readonly byId = new Map<string, IndexedWork>();
  private readonly seriesBySlug = new Map<string, SeriesEntry>();
  private readonly authors: AuthorEntry[];
  private readonly authorAliases = new Map<string, string[]>();
  private readonly recentYear: number;
  readonly stats: CatalogStats;

  constructor(rows: RawEdition[], now = new Date()) {
    this.recentYear = now.getFullYear() - 1;
    // Une œuvre = même titre (ou même tome de série) ET même auteur : deux « Coeur. 1 »
    // d'auteurs différents restent distincts.
    interface Group {
      raw: RawEdition[];
      parsed: ReturnType<typeof parseTitle>;
    }
    const groups = new Map<string, Group>();
    const orphanTomes: { row: RawEdition; parsed: Group['parsed']; tome: string }[] = [];
    const tomeAuthors = new Map<string, string[]>(); // tome → clés des groupes avec auteur
    for (const row of rows) {
      if (!row.title) continue;
      const parsed = parseTitle(row.title);
      const author = parseAuthor(row.author);
      const { key, tome } = groupKey(parsed, author?.key ?? null);
      if (tome && !author) {
        orphanTomes.push({ row, parsed, tome });
        continue;
      }
      const group = groups.get(key);
      if (group) group.raw.push(row);
      else {
        groups.set(key, { raw: [row], parsed });
        if (tome) tomeAuthors.set(tome, [...(tomeAuthors.get(tome) ?? []), key]);
      }
    }
    // Un tome sans auteur rejoint le tome de même numéro s'il n'y en a qu'un
    for (const { row, parsed, tome } of orphanTomes) {
      const candidates = tomeAuthors.get(tome) ?? [];
      const key = candidates.length === 1 ? (candidates[0] ?? tome) : `${tome}|`;
      const group = groups.get(key);
      if (group) group.raw.push(row);
      else groups.set(key, { raw: [row], parsed });
    }

    this.indexed = [];
    const authorMap = new Map<string, AuthorEntry>();
    for (const { raw, parsed } of groups.values()) {
      const item = buildWork(raw, parsed, now);
      if (!item) continue;
      this.indexed.push(item);
      for (const edition of raw) {
        const id = edition.titleId ?? edition.isbn;
        if (id) this.byId.set(id, item);
      }
      for (const name of item.work.authors) {
        const f = fold(name);
        const entry = authorMap.get(f);
        if (entry) {
          entry.count++;
          entry.cover ??= item.work.cover;
          // « René » plutôt que « Rene » : on garde la graphie la plus accentuée
          if (accents(name) > accents(entry.name)) entry.name = name;
        } else authorMap.set(f, { name, fold: f, count: 1, cover: item.work.cover });
      }
    }
    // Ordre de base (sans requête) : récents avec couverture d'abord.
    this.indexed.sort(
      (a, b) =>
        Number(b.work.cover !== null) - Number(a.work.cover !== null) ||
        (b.work.year ?? 0) - (a.work.year ?? 0) ||
        b.popularity - a.popularity,
    );
    this.mergeAuthorAliases(authorMap);
    this.authors = [...authorMap.values()].sort((a, b) => b.count - a.count);
    this.buildSeries();
    this.stats = {
      editions: rows.length,
      works: this.indexed.length,
      series: this.seriesBySlug.size,
      authors: this.authors.length,
    };
  }

  /**
   * Un nom seul (« Goscinny ») est la même personne que le nom complet (« René Goscinny »)
   * quand ce dernier domine ce nom de famille (au moins 75 % des œuvres signées d'un nom
   * complet : René plutôt qu'Anne Goscinny). Les deux formes deviennent des alias :
   * le filtre auteur les accepte toutes, la suggestion n'en garde qu'une avec le total.
   * (« J. K. Rowling » et « J.K. Rowling » sont déjà identiques une fois repliés.)
   */
  private mergeAuthorAliases(authorMap: Map<string, AuthorEntry>): void {
    const bySurname = new Map<string, AuthorEntry[]>();
    for (const entry of authorMap.values()) {
      const surname = entry.fold.split(' ').at(-1) ?? entry.fold;
      bySurname.set(surname, [...(bySurname.get(surname) ?? []), entry]);
    }
    for (const entries of bySurname.values()) {
      const full = entries.filter((e) => e.fold.includes(' ')).sort((a, b) => b.count - a.count);
      const bare = entries.filter((e) => !e.fold.includes(' '));
      const canonical = full[0];
      const fullTotal = full.reduce((n, e) => n + e.count, 0);
      // Nom complet dominant (≥ 75 % des formes complètes) : « René » face à « Anne » Goscinny
      if (bare.length === 0 || !canonical || canonical.count < fullTotal * 0.75) continue;
      const group = [canonical.fold, ...bare.map((b) => b.fold)];
      for (const b of bare) {
        canonical.count += b.count;
        canonical.cover ??= b.cover;
        authorMap.delete(b.fold);
      }
      for (const f of group) this.authorAliases.set(f, group);
    }
  }

  private buildSeries(): void {
    const groups = new Map<string, CatalogWork[]>();
    for (const { work } of this.indexed) {
      if (!work.series) continue;
      const list = groups.get(work.series.slug);
      if (list) list.push(work);
      else groups.set(work.series.slug, [work]);
    }
    for (const [slug, works] of groups) {
      works.sort((a, b) => (a.series?.volume ?? 0) - (b.series?.volume ?? 0));
      const authorCounts = new Map<string, number>();
      for (const w of works)
        for (const a of w.authors) authorCounts.set(a, (authorCounts.get(a) ?? 0) + 1);
      const authors = [...authorCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name]) => name);
      this.seriesBySlug.set(slug, {
        works,
        fold: fold(works[0]?.series?.name ?? slug),
        weight: works.reduce((n, w) => n + w.editions.length + (w.cover ? 2 : 0), 0),
        summary: {
          name: works[0]?.series?.name ?? slug,
          slug,
          authors,
          count: works.length,
          covers: works
            .map((w) => w.cover)
            .filter((c): c is string => c !== null)
            .slice(0, 3),
          latestYear: works.reduce<number | null>(
            (max, w) => (w.year !== null && (max === null || w.year > max) ? w.year : max),
            null,
          ),
        },
      });
    }
  }

  getWork(id: string): CatalogWork | null {
    return this.byId.get(id)?.work ?? null;
  }

  /** Séries dont le nom contient tous les mots : nom exact d'abord, puis les plus populaires. */
  private matchSeries(tokens: string[], limit: number): SeriesEntry[] {
    const phrase = tokens.join(' ');
    const out: SeriesEntry[] = [];
    for (const entry of this.seriesBySlug.values()) {
      if (tokens.every((t) => entry.fold.includes(t))) out.push(entry);
    }
    const rank = (e: SeriesEntry): number =>
      e.weight + (e.fold === phrase ? 10_000 : e.fold.startsWith(phrase) ? 20 : 0);
    return out.sort((a, b) => rank(b) - rank(a)).slice(0, limit);
  }

  getSeries(slug: string): SeriesEntry | null {
    return this.seriesBySlug.get(slug) ?? null;
  }

  /** Autres œuvres des mêmes auteurs (hors série de l'œuvre). */
  related(work: CatalogWork, limit = 12): CatalogWork[] {
    const authors = new Set(work.authors.map(fold));
    if (authors.size === 0) return [];
    const out: CatalogWork[] = [];
    const seenSeries = new Set<string>(work.series ? [work.series.slug] : []);
    for (const item of this.indexed) {
      if (item.work.id === work.id || !item.authorFolds.some((a) => authors.has(a))) continue;
      if (item.work.series) {
        if (seenSeries.has(item.work.series.slug)) continue;
        seenSeries.add(item.work.series.slug);
      }
      out.push(item.work);
      if (out.length >= limit) break;
    }
    return out;
  }

  search(query: SearchQuery): SearchResult {
    const started = performance.now();
    // ISBN avec ou sans tirets, « X » final compris. L'index contient chaque ISBN sous ses
    // formes 10 et 13 chiffres : un ISBN-10 retrouve un livre enregistré en 978…
    const isbn = normalizeIsbn(query.q.trim());
    const tokens = isbn ? [isbn] : tokenize(query.q);
    const phrase = tokens.join(' ');
    // Filtre auteur : le nom demandé et ses alias (« Goscinny » ↔ « René Goscinny »)
    const authorFold = query.author ? fold(query.author) : null;
    const authorSet = authorFold
      ? new Set(this.authorAliases.get(authorFold) ?? [authorFold])
      : null;

    // 1. Correspondance texte + auteur (avant les filtres, pour les compteurs de facettes)
    const matched: { item: IndexedWork; score: number }[] = [];
    for (const item of this.indexed) {
      if (authorSet && !item.authorFolds.some((a) => authorSet.has(a))) continue;
      if (tokens.length > 0 && !tokens.every((t) => item.hay.includes(t))) continue;
      matched.push({ item, score: tokens.length > 0 ? score(item, tokens, phrase) : 0 });
    }

    // 2. Filtres ; chaque facette compte les résultats en ignorant son propre filtre
    const formatSet = new Set(query.formats);
    const inFormat = (w: CatalogWork): boolean =>
      formatSet.size === 0 || w.formats.some((f) => formatSet.has(f));
    const inPeriod = (w: CatalogWork): boolean =>
      query.period === null || periodOf(w.year, this.recentYear) === query.period;
    const now = new Date(); // une seule date pour toute la recherche
    const inAvailability = (w: CatalogWork): boolean => {
      if (!query.available && !query.branch) return true;
      return simulateAvailability(w.id, now).branches.some(
        (b) =>
          (query.branch === null || b.code === query.branch) &&
          (!query.available || b.available > 0),
      );
    };

    const formatCounts = new Map<FormatGroup, number>();
    const periodCounts = new Map<Period, number>();
    const results: { item: IndexedWork; score: number }[] = [];
    for (const m of matched) {
      const w = m.item.work;
      const okAvailability = inAvailability(w);
      if (!okAvailability) continue;
      const okFormat = inFormat(w);
      const okPeriod = inPeriod(w);
      if (okPeriod) for (const f of w.formats) formatCounts.set(f, (formatCounts.get(f) ?? 0) + 1);
      if (okFormat) {
        const p = periodOf(w.year, this.recentYear);
        periodCounts.set(p, (periodCounts.get(p) ?? 0) + 1);
      }
      if (okFormat && okPeriod) results.push(m);
    }

    // 3. Tri (sans requête, « pertinence » garde l'ordre de base : récents avec couverture)
    if (query.sort === 'titre') {
      results.sort((a, b) => a.item.titleFold.localeCompare(b.item.titleFold));
    } else if (query.sort === 'recent') {
      results.sort((a, b) => (b.item.work.year ?? 0) - (a.item.work.year ?? 0));
    } else if (tokens.length > 0) {
      results.sort((a, b) => b.score - a.score);
    }

    // 4. Séries correspondant à la requête (affichées en tête)
    const series = tokens.length === 0 ? [] : this.matchSeries(tokens, 3).map((s) => s.summary);

    return {
      total: results.length,
      works: results.slice(0, query.limit).map((r) => r.item.work),
      series,
      facets: {
        formats: (Object.keys(FORMAT_LABELS) as FormatGroup[])
          .map((id) => ({ id, label: FORMAT_LABELS[id], count: formatCounts.get(id) ?? 0 }))
          .filter((f) => f.count > 0 || formatSet.has(f.id)),
        periods: (Object.keys(PERIOD_LABELS) as Period[]).map((id) => ({
          id,
          label: PERIOD_LABELS[id],
          count: periodCounts.get(id) ?? 0,
        })),
      },
      tookMs: Math.round(performance.now() - started),
    };
  }

  /** Suggestions de saisie : séries, auteurs, puis œuvres. */
  suggest(q: string, limit = 8): Suggestion[] {
    const tokens = tokenize(q);
    if (tokens.length === 0 || fold(q).length < 2) return [];
    const out: Suggestion[] = [];

    for (const { summary } of this.matchSeries(tokens, 2)) {
      out.push({
        kind: 'serie',
        label: summary.name,
        detail: `Série · ${String(summary.count)} tome${summary.count > 1 ? 's' : ''}`,
        href: `/serie/${summary.slug}`,
        cover: summary.covers[0] ?? null,
      });
    }

    let authors = 0;
    for (const a of this.authors) {
      if (authors >= 2) break;
      if (a.count < 2 || !tokens.every((t) => a.fold.includes(t))) continue;
      authors++;
      out.push({
        kind: 'auteur',
        label: a.name,
        detail: `Auteur · ${String(a.count)} œuvre${a.count > 1 ? 's' : ''}`,
        href: `/recherche?auteur=${encodeURIComponent(a.name)}`,
        cover: null,
      });
    }

    const works = this.search({ ...EMPTY_QUERY, q, limit: limit - out.length }).works;
    for (const w of works) {
      out.push({
        kind: 'oeuvre',
        label: w.series?.volume
          ? `${w.series.name} ${String(w.series.volume)} · ${w.title}`
          : w.title,
        detail: [w.authors[0], w.year].filter(Boolean).join(' · '),
        href: `/oeuvre/${w.id}`,
        cover: w.cover,
      });
    }
    return out.slice(0, limit);
  }

  /** Nouveautés avec couverture, une seule par série pour varier l'étagère. */
  newest(limit = 18): CatalogWork[] {
    const out: CatalogWork[] = [];
    const seen = new Set<string>();
    for (const { work } of this.indexed) {
      if (!work.cover || (work.year ?? 0) < this.recentYear) continue;
      const key = work.series?.slug ?? work.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(work);
      if (out.length >= limit) break;
    }
    return out;
  }

  topSeries(limit = 10): SeriesSummary[] {
    return [...this.seriesBySlug.values()]
      .map((s) => s.summary)
      .filter((s) => s.count >= 4 && s.covers.length >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /** Œuvres avec couverture des auteurs donnés, une par série, en alternant les auteurs. */
  byAuthors(names: string[], limit = 18): CatalogWork[] {
    const wanted = names.map(fold);
    const buckets = wanted.map(() => [] as CatalogWork[]);
    const seen = new Set<string>();
    for (const item of this.indexed) {
      if (!item.work.cover) continue;
      const i = wanted.findIndex((a) => item.authorFolds.includes(a));
      if (i === -1) continue;
      const key = item.work.series?.slug ?? item.work.id;
      if (seen.has(key)) continue;
      seen.add(key);
      buckets[i]?.push(item.work);
    }
    const out: CatalogWork[] = [];
    for (let round = 0; out.length < limit && buckets.some((b) => b.length > round); round++) {
      for (const bucket of buckets) {
        const w = bucket[round];
        if (w && out.length < limit) out.push(w);
      }
    }
    return out;
  }

  formatCounts(): FacetCount<FormatGroup>[] {
    const counts = new Map<FormatGroup, number>();
    for (const { work } of this.indexed)
      for (const f of work.formats) counts.set(f, (counts.get(f) ?? 0) + 1);
    return (Object.keys(FORMAT_LABELS) as FormatGroup[])
      .map((id) => ({ id, label: FORMAT_LABELS[id], count: counts.get(id) ?? 0 }))
      .filter((f) => f.count > 0);
  }
}

/**
 * Clé de regroupement d'une édition en œuvre : même tome de série (ou même titre) et même
 * auteur (nom de famille replié). `tome` est la partie série et tome, sans l'auteur : un tome
 * sans auteur rejoint le seul tome de même numéro qui en a un.
 */
export function groupKey(
  parsed: ReturnType<typeof parseTitle>,
  authorKey: string | null,
): { key: string; tome: string | null } {
  const tome = parsed.series ? `s:${fold(parsed.series)}|${String(parsed.volume)}` : null;
  return {
    key: tome ? `${tome}|${authorKey ?? ''}` : `t:${fold(parsed.title)}|${authorKey ?? ''}`,
    tome,
  };
}

export const EMPTY_QUERY: SearchQuery = {
  q: '',
  formats: [],
  period: null,
  author: null,
  available: false,
  branch: null,
  sort: 'pertinence',
  limit: 24,
};

/** Nombre de caractères non ASCII (accents) : sert à préférer « René » à « Rene ». */
function accents(name: string): number {
  let n = 0;
  for (let i = 0; i < name.length; i++) if (name.charCodeAt(i) > 127) n++;
  return n;
}

function periodOf(year: number | null, recentYear: number): Period {
  if (year === null || year < 2000) return 'older';
  if (year >= recentYear) return 'recent';
  return year >= 2010 ? '2010' : '2000';
}

function score(item: IndexedWork, tokens: string[], phrase: string): number {
  // Série exacte (« one piece ») : tous ses tomes passent devant, dans l'ordre des tomes
  if (item.seriesFold === phrase) return 1000 - (item.work.series?.volume ?? 0);
  let s = 0;
  if (item.titleFold === phrase) s += 100;
  else if (item.titleFold.startsWith(phrase)) s += 60;
  if (tokens.every((t) => item.titleFold.includes(t))) s += 40;
  if (item.seriesFold && tokens.every((t) => item.seriesFold.includes(t))) {
    s += 45 - (item.work.series?.volume ?? 0) * 0.05; // tomes dans l'ordre à pertinence égale
  }
  if (item.authorFolds.some((a) => tokens.every((t) => a.includes(t)))) s += 30;
  // Mots entiers plutôt que fragments (« dune » ne doit pas préférer « dunes »)
  const words = ` ${item.titleFold} `;
  s += tokens.filter((t) => words.includes(` ${t} `)).length * 6;
  return s + item.popularity;
}

function buildWork(
  raw: RawEdition[],
  parsed: ReturnType<typeof parseTitle>,
  now: Date,
): IndexedWork | null {
  const editions: CatalogEdition[] = raw
    .map((r) => ({
      titleId: r.titleId ?? r.isbn ?? '',
      isbn: r.isbn,
      title: r.title,
      year: plausibleYear(r.year, now),
      format: formatGroup(r.format),
      formatLabel: r.format ?? 'Livre',
      publisher: r.publisher,
      pages: r.pages,
      cover: r.cover,
    }))
    .filter((e) => e.titleId !== '')
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const first = editions[0];
  if (!first) return null;

  // Un auteur par nom de famille : « René Goscinny » et « Goscinny » sont la même personne.
  const authors: string[] = [];
  const authorIndex = new Map<string, number>(); // nom de famille → position, on garde la forme la plus complète
  for (const r of raw) {
    const a = parseAuthor(r.author);
    if (!a) continue;
    const at = authorIndex.get(a.key);
    if (at === undefined) {
      if (authors.length >= 3) continue;
      authorIndex.set(a.key, authors.length);
      authors.push(a.display);
    } else if (a.display.length > (authors[at] ?? '').length) {
      authors[at] = a.display;
    }
  }
  const withCover = editions.find((e) => e.cover !== null);
  const ids = editions
    .map((e) => e.titleId)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const series = parsed.series
    ? { name: parsed.series, slug: slugify(parsed.series), volume: parsed.volume }
    : null;
  const summary = raw.find((r) => r.summary)?.summary ?? null;
  const subjects = raw.find((r) => r.subjects && r.subjects.length > 0)?.subjects ?? [];

  const work: CatalogWork = {
    id: ids[0] ?? first.titleId,
    title: parsed.title,
    subtitle: parsed.subtitle,
    authors,
    series,
    cover: withCover?.cover ?? null,
    year: editions.find((e) => e.year !== null)?.year ?? null,
    formats: [...new Set(editions.map((e) => e.format))],
    summary,
    subjects,
    editions,
  };
  const titleFold = fold(parsed.title);
  const seriesFold = series ? fold(series.name) : '';
  const authorFolds = authors.map(fold);
  return {
    work,
    titleFold,
    seriesFold,
    authorFolds,
    hay: [
      titleFold,
      fold(parsed.subtitle ?? ''),
      seriesFold,
      ...authorFolds,
      fold(first.publisher ?? ''),
      ...editions.flatMap((e) => isbnForms(e.isbn)),
    ]
      .filter(Boolean)
      .join(' '),
    popularity: Math.min(editions.length, 6) * 2 + (work.cover ? 4 : 0),
  };
}
