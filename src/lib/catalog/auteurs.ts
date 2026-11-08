// Regroupement des formes d'auteur du catalogue en personnes, sans doublons.
// « Greg, 1931- . », « Greg, 1931-1999. » et « Greg, Michel, 1931-1999. » sont une seule personne.
import { fold, parseAuthor } from './normalize';

export interface AuthorForm {
  forme: string;
  nom: string;
  nomFamille: string;
  prenom: string | null;
  naissance: number | null;
  deces: number | null;
}

/** « Tremblay, Michel, 1942- auteur. » → Michel Tremblay, né en 1942. */
export function parseAuthorForm(forme: string): AuthorForm | null {
  const parsed = parseAuthor(forme);
  if (!parsed) return null;
  const full = fold(parsed.display);
  const prenom = full.endsWith(parsed.key) ? full.slice(0, -parsed.key.length).trim() : '';
  const dates = /(\d{4})\s*-\s*(\d{4})?/.exec(forme);
  return {
    forme,
    nom: parsed.display,
    nomFamille: parsed.key,
    prenom: prenom || null,
    naissance: dates?.[1] ? Number(dates[1]) : null,
    deces: dates?.[2] ? Number(dates[2]) : null,
  };
}

/** Prénoms compatibles : identiques, l'un inconnu, ou initiales qui concordent (« m » / « michel »). */
export function compatibleFirstNames(a: string | null, b: string | null): boolean {
  if (!a || !b || a === b) return true;
  const ta = a.split(' ');
  const tb = b.split(' ');
  if (ta.length !== tb.length) return false;
  return ta.every((word, i) => {
    const other = tb[i] ?? '';
    return (
      word === other ||
      (word.length === 1 && other.startsWith(word)) ||
      (other.length === 1 && word.startsWith(other))
    );
  });
}

/** Une personne déjà en base, de même nom de famille que la forme à rattacher. */
export interface AuthorCandidate {
  id: string;
  prenom: string | null;
  naissance: number | null;
}

/**
 * Personne déjà connue pour une forme nouvelle, à l'injection d'une notice : les règles de
 * resolveAuthors qui ne dépendent que de la forme (même année, coquille d'un an, seule personne
 * possible). La dominance et les séries portent sur tout le catalogue : elles restent au
 * chargement complet. Sans candidat sûr : null, et une nouvelle personne est créée.
 */
export function findExistingAuthor(form: AuthorForm, candidates: AuthorCandidate[]): string | null {
  const compatible = candidates.filter((c) => compatibleFirstNames(form.prenom, c.prenom));
  const only = (list: AuthorCandidate[]): string | null =>
    list.length === 1 ? (list[0]?.id ?? null) : null;
  const birth = form.naissance;
  if (birth === null) return only(compatible);
  const sameYear = compatible.filter((c) => c.naissance === birth);
  if (sameYear.length > 0) return only(sameYear);
  const first = form.prenom;
  const typo = candidates.filter(
    (c) =>
      c.naissance !== null &&
      Math.abs(c.naissance - birth) === 1 &&
      first !== null &&
      first.replace(/ /g, '').length > 2 &&
      c.prenom === first,
  );
  if (typo.length > 0) return only(typo);
  // Une personne connue sans date, seule à porter ce nom : c'est elle
  return compatible.every((c) => c.naissance === null) ? only(compatible) : null;
}

export interface AuthorEntry {
  forme: string;
  /** Nombre de notices signées de cette forme. */
  count: number;
  /** Clés des séries où cette forme apparaît. */
  series: string[];
}

export interface ResolvedAuthor {
  cle: string;
  nom: string;
  nomFamille: string;
  prenom: string | null;
  naissance: number | null;
  deces: number | null;
  formes: string[];
}

export interface ReviewItem {
  raison: 'homonymes-sans-date' | 'noms-differents-dans-une-serie';
  detail: string;
  formes: string[];
}

export interface Resolution {
  auteurs: ResolvedAuthor[];
  aRevoir: ReviewItem[];
}

/** Au-delà de cette part des notices, un candidat est retenu pour une forme sans date. */
const DOMINANCE = 0.75;

interface Cluster {
  forms: AuthorForm[];
  count: number;
  series: Set<string>;
  /** Année de naissance → nombre de notices qui la donnent. */
  births: Map<number, number>;
}

/** L'année la plus fréquente : une coquille isolée (1943 pour 1942) ne l'emporte pas. */
function birthOf(cluster: Cluster): number | null {
  let best: number | null = null;
  for (const [year, count] of cluster.births) {
    if (best === null || count > (cluster.births.get(best) ?? 0)) best = year;
  }
  return best;
}

function firstNameOf(cluster: Cluster): string | null {
  return cluster.forms.reduce<string | null>(
    (best, f) => (f.prenom && f.prenom.length > (best?.length ?? 0) ? f.prenom : best),
    null,
  );
}

function canMerge(a: Cluster, b: Cluster): boolean {
  const ba = birthOf(a);
  const bb = birthOf(b);
  return (
    (ba === null || bb === null || ba === bb) &&
    compatibleFirstNames(firstNameOf(a), firstNameOf(b))
  );
}

/** Même prénom écrit au long, un an d'écart : une coquille dans la notice, pas un homonyme. */
function nearTwin(a: Cluster, b: Cluster): boolean {
  const ba = birthOf(a);
  const bb = birthOf(b);
  const first = firstNameOf(a);
  return (
    ba !== null &&
    bb !== null &&
    Math.abs(ba - bb) === 1 &&
    first !== null &&
    first.replace(/ /g, '').length > 2 &&
    first === firstNameOf(b)
  );
}

function merge(into: Cluster, from: Cluster): void {
  into.forms.push(...from.forms);
  into.count += from.count;
  for (const s of from.series) into.series.add(s);
  for (const [year, count] of from.births)
    into.births.set(year, (into.births.get(year) ?? 0) + count);
}

/** Lettres accentuées : « René » plutôt que « Rene » pour le nom affiché. */
function accents(value: string): number {
  return value.normalize('NFD').length - value.length;
}

/**
 * Règles, de la plus sûre à la plus prudente :
 * 1. même nom de famille et même année de naissance, prénoms compatibles → même personne ;
 *    même prénom écrit au long et un an d'écart aussi (coquille), l'année la plus fréquente gagne ;
 * 2. une forme sans date rejoint l'unique personne compatible, ou celle qui signe au moins
 *    75 % des notices de ce nom ; sinon elle reste à part et va à la revue ;
 * 3. dans une même série, les formes d'un même nom de famille sont fusionnées. Des noms de
 *    famille différents (pseudonyme, changement d'auteur) vont à la revue, jamais fusionnés.
 */
export function resolveAuthors(entries: AuthorEntry[]): Resolution {
  const aRevoir: ReviewItem[] = [];
  const bySurname = new Map<string, Cluster[]>();
  for (const entry of entries) {
    const form = parseAuthorForm(entry.forme);
    if (!form) continue;
    const list = bySurname.get(form.nomFamille) ?? [];
    list.push({
      forms: [form],
      count: entry.count,
      series: new Set(entry.series),
      births: new Map(form.naissance === null ? [] : [[form.naissance, entry.count]]),
    });
    bySurname.set(form.nomFamille, list);
  }

  const resolved: Cluster[] = [];
  for (const clusters of bySurname.values()) {
    // 1. Formes datées : même année et prénoms compatibles, ou même prénom à un an près
    const dated: Cluster[] = [];
    const undated: Cluster[] = [];
    for (const cluster of clusters) {
      if (birthOf(cluster) === null) {
        const twin = undated.find((u) => firstNameOf(u) === firstNameOf(cluster));
        if (twin) merge(twin, cluster);
        else undated.push(cluster);
        continue;
      }
      const same = dated.find((d) => canMerge(d, cluster) || nearTwin(d, cluster));
      if (same) merge(same, cluster);
      else dated.push(cluster);
    }
    // 2. Formes sans date : vers l'unique candidat compatible, ou le candidat dominant
    const kept: Cluster[] = [...dated];
    for (const cluster of undated.sort(
      (a, b) => Number(a.forms[0]?.prenom === null) - Number(b.forms[0]?.prenom === null),
    )) {
      const candidates = kept.filter((k) => canMerge(k, cluster));
      const total = candidates.reduce((sum, c) => sum + c.count, 0);
      const bySeries = candidates.filter((c) => [...cluster.series].some((s) => c.series.has(s)));
      const target =
        candidates.length === 1
          ? candidates[0]
          : bySeries.length === 1
            ? bySeries[0]
            : candidates.find((c) => c.count >= DOMINANCE * total);
      if (target) merge(target, cluster);
      else {
        if (candidates.length > 1) {
          aRevoir.push({
            raison: 'homonymes-sans-date',
            detail: `${cluster.forms[0]?.nom ?? ''} : ${String(candidates.length)} personnes possibles`,
            formes: [
              ...cluster.forms.map((f) => f.forme),
              ...candidates.flatMap((c) => c.forms.map((f) => f.forme)),
            ],
          });
        }
        kept.push(cluster);
      }
    }
    resolved.push(...kept);
  }

  // 3. Validation par les séries
  const bySeries = new Map<string, Cluster[]>();
  for (const cluster of resolved) {
    for (const s of cluster.series) bySeries.set(s, [...(bySeries.get(s) ?? []), cluster]);
  }
  const absorbed = new Set<Cluster>();
  for (const [serie, members] of bySeries) {
    const alive = members.filter((m) => !absorbed.has(m));
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      if (!a || absorbed.has(a)) continue;
      for (let j = i + 1; j < alive.length; j++) {
        const b = alive[j];
        if (!b || absorbed.has(b)) continue;
        if (a.forms[0]?.nomFamille === b.forms[0]?.nomFamille && canMerge(a, b)) {
          merge(a, b);
          absorbed.add(b);
        }
      }
    }
    const surnames = new Set(
      alive.filter((m) => !absorbed.has(m)).map((m) => m.forms[0]?.nomFamille),
    );
    if (surnames.size > 1) {
      aRevoir.push({
        raison: 'noms-differents-dans-une-serie',
        detail: serie,
        formes: alive.filter((m) => !absorbed.has(m)).map((m) => m.forms[0]?.forme ?? ''),
      });
    }
  }

  const auteurs = resolved
    .filter((c) => !absorbed.has(c))
    .map((cluster): ResolvedAuthor => {
      const best = [...cluster.forms].sort(
        (a, b) =>
          (b.prenom?.length ?? 0) - (a.prenom?.length ?? 0) ||
          accents(b.nom) - accents(a.nom) ||
          a.forme.localeCompare(b.forme),
      )[0];
      const naissance = birthOf(cluster);
      const deces = cluster.forms.reduce<number | null>(
        (max, f) => (f.deces !== null && f.deces > (max ?? 0) ? f.deces : max),
        null,
      );
      const nomFamille = best?.nomFamille ?? '';
      const prenom = best?.prenom ?? null;
      return {
        cle: `${nomFamille}|${prenom ?? ''}|${naissance === null ? '' : String(naissance)}`,
        nom: best?.nom ?? '',
        nomFamille,
        prenom,
        naissance,
        deces,
        formes: cluster.forms.map((f) => f.forme),
      };
    });

  // Deux personnes au même nom, même prénom et même année : une seule
  const byKey = new Map<string, ResolvedAuthor>();
  for (const author of auteurs) {
    const twin = byKey.get(author.cle);
    if (twin) {
      twin.formes.push(...author.formes);
      twin.deces ??= author.deces;
    } else byKey.set(author.cle, author);
  }
  return { auteurs: [...byKey.values()], aRevoir };
}
