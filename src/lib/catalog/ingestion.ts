// Injection d'une notice découverte par le site (portail de la Ville). Le site l'analyse :
// série, tome, clé de regroupement en œuvre, auteur. Postgres calcule le reste par ses
// déclencheurs : agrégats de l'œuvre, de la série et de l'auteur, clés repliées, vecteurs de
// recherche (supabase/migrations/20261027060000_normalisation_sql.sql).
// Le chargement complet du catalogue passe plutôt par scripts/structurer-catalogue.mjs.
import { simulateAvailability } from './availability';
import { findExistingAuthor, parseAuthorForm, type AuthorCandidate } from './auteurs';
import { groupKey } from './engine';
import { fold, parseAuthor, parseTitle, slugify } from './normalize';
import type { ClientBase } from 'pg';
import type { RawEdition } from './types';

/** Une connexion Postgres (client du pool), dans une transaction ouverte par l'appelant. */
export type Queryable = Pick<ClientBase, 'query'>;

export interface NoticeAnalysis {
  title: string;
  subtitle: string | null;
  series: { name: string; cle: string; slug: string } | null;
  volume: number | null;
  /** Nom de famille replié de l'auteur, s'il y en a un. */
  authorKey: string | null;
  /** Clé de regroupement en œuvre (même règle que le moteur). */
  key: string;
  /** Partie série et tome de la clé, sans l'auteur. */
  tome: string | null;
}

/** Analyse d'une notice, sans base : ce que le site sait en déduire. */
export function analyzeNotice(raw: Pick<RawEdition, 'title' | 'author'>): NoticeAnalysis | null {
  if (!raw.title.trim()) return null;
  const parsed = parseTitle(raw.title);
  const authorKey = parseAuthor(raw.author)?.key ?? null;
  const { key, tome } = groupKey(parsed, authorKey);
  return {
    title: parsed.title,
    subtitle: parsed.subtitle,
    series: parsed.series
      ? { name: parsed.series, cle: fold(parsed.series), slug: slugify(parsed.series) }
      : null,
    volume: parsed.volume,
    authorKey,
    key,
    tome,
  };
}

export type InjectionResult =
  | { statut: 'connue' }
  | { statut: 'ignoree'; raison: string }
  | { statut: 'ajoutee'; oeuvreId: string; oeuvreCreee: boolean; auteurId: string | null };

async function authorFor(db: Queryable, forme: string): Promise<string | null> {
  const { rows: known } = await db.query<{ auteur_id: string }>(
    'select auteur_id from auteurs_variantes where forme = $1',
    [forme],
  );
  if (known[0]) return known[0].auteur_id;
  const form = parseAuthorForm(forme);
  if (!form) return null;
  const { rows: candidates } = await db.query<AuthorCandidate>(
    'select id, prenom, naissance from auteurs where nom_famille = $1',
    [form.nomFamille],
  );
  let id = findExistingAuthor(form, candidates);
  if (!id) {
    const cle = `${form.nomFamille}|${form.prenom ?? ''}|${form.naissance === null ? '' : String(form.naissance)}`;
    const { rows } = await db.query<{ id: string }>(
      `insert into auteurs (nom, nom_famille, prenom, naissance, deces, cle)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (cle) do update set cle = excluded.cle returning id`,
      [form.nom, form.nomFamille, form.prenom, form.naissance, form.deces, cle],
    );
    id = rows[0]?.id ?? null;
  }
  if (id) {
    await db.query(
      'insert into auteurs_variantes (forme, auteur_id) values ($1, $2) on conflict do nothing',
      [forme, id],
    );
  }
  return id;
}

async function workFor(
  db: Queryable,
  raw: RawEdition,
  analysis: NoticeAnalysis,
): Promise<{ id: string; created: boolean }> {
  // Un tome sans auteur rejoint le seul tome de même numéro qui en a un
  let key = analysis.key;
  if (analysis.tome && !analysis.authorKey) {
    const { rows } = await db.query<{ cle: string }>(
      `select cle_regroupement as cle from oeuvres
        where cle_regroupement like $1 || '|%' and cle_regroupement <> $1 || '|'`,
      [analysis.tome],
    );
    if (rows.length === 1 && rows[0]) key = rows[0].cle;
  }
  const { rows: existing } = await db.query<{ id: string }>(
    'select id from oeuvres where cle_regroupement = $1',
    [key],
  );
  if (existing[0]) return { id: existing[0].id, created: false };

  let serieId: string | null = null;
  if (analysis.series) {
    // Lire d'abord : réécrire une série existante réveillerait ses déclencheurs pour rien
    await db.query(
      'insert into series (nom, cle, slug) values ($1, $2, $3) on conflict do nothing',
      [analysis.series.name, analysis.series.cle, analysis.series.slug],
    );
    const { rows } = await db.query<{ id: string }>('select id from series where cle = $1', [
      analysis.series.cle,
    ]);
    serieId = rows[0]?.id ?? null;
  }
  // Identifiant des URL : le title_id de la notice, ou son ISBN s'il est déjà pris
  const { rows: taken } = await db.query<{ ref: string }>(
    'select title_id_reference as ref from oeuvres where title_id_reference = any($1::text[])',
    [[raw.titleId, raw.isbn].filter(Boolean)],
  );
  const ref = [raw.titleId, raw.isbn].find((r) => r && !taken.some((t) => t.ref === r));
  if (!ref) throw new Error(`Notice ${raw.titleId ?? '?'} : identifiant d'œuvre déjà pris.`);
  const availability = simulateAvailability(ref);
  const { rows: created } = await db.query<{ id: string }>(
    `insert into oeuvres (titre, sous_titre, serie_id, tome, title_id_reference, cle_regroupement,
                          succursales, succursales_dispo, version_regles, langue)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 1, null)
     on conflict (cle_regroupement) do nothing returning id`,
    [
      analysis.title,
      analysis.subtitle,
      serieId,
      analysis.volume,
      ref,
      key,
      availability.branches.map((b) => b.code),
      availability.branches.filter((b) => b.available > 0).map((b) => b.code),
    ],
  );
  if (created[0]) return { id: created[0].id, created: true };
  // Créée entre-temps par une autre injection
  const { rows } = await db.query<{ id: string }>(
    'select id from oeuvres where cle_regroupement = $1',
    [key],
  );
  if (!rows[0]) throw new Error(`Œuvre introuvable pour la clé ${key}.`);
  return { id: rows[0].id, created: false };
}

/**
 * Ajoute une notice et la rattache à son œuvre (créée au besoin), à sa série et à son auteur.
 * Idempotente : une notice déjà connue (même ISBN, ou même title_id sans ISBN) est laissée.
 * À appeler dans une transaction : en cas d'erreur, l'appelant annule tout.
 */
export async function injectNotice(db: Queryable, raw: RawEdition): Promise<InjectionResult> {
  const analysis = analyzeNotice(raw);
  if (!analysis) return { statut: 'ignoree', raison: 'notice sans titre' };
  const { rows: known } = await db.query<{ id: string }>(
    `select id from editions
      where ($1::text is not null and isbn = $1) or ($1::text is null and title_id = $2) limit 1`,
    [raw.isbn, raw.titleId],
  );
  if (known[0]) return { statut: 'connue' };

  const auteurId = raw.author ? await authorFor(db, raw.author) : null;
  const work = await workFor(db, raw, analysis);
  // L'insertion déclenche le recalcul de l'œuvre, puis de sa série et de ses auteurs
  await db.query(
    `insert into editions (isbn, title_id, titre_brut, auteur_brut, editeur, annee_publication,
                           format, nb_pages, image_couverture, oeuvre_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      raw.isbn,
      raw.titleId,
      raw.title,
      raw.author,
      raw.publisher,
      raw.year,
      raw.format,
      raw.pages,
      raw.cover,
      work.id,
    ],
  );
  if (auteurId) {
    await db.query(
      'insert into oeuvres_auteurs (oeuvre_id, auteur_id) values ($1, $2) on conflict do nothing',
      [work.id, auteurId],
    );
  }
  return { statut: 'ajoutee', oeuvreId: work.id, oeuvreCreee: work.created, auteurId };
}
