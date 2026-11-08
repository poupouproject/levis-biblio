-- Recherche dans Postgres : une ligne de recherche par œuvre, série et auteur.
-- Remplies par scripts/structurer-catalogue.mjs (la normalisation reste en TypeScript :
-- titres, séries, auteurs, formats sont déjà repliés). Requêtes : src/lib/catalog/postgres.ts.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Mots simples, sans accents : pas de radical français, les titres sont en plusieurs langues.
create text search configuration public.catalogue (copy = pg_catalog.simple);
alter text search configuration public.catalogue
  alter mapping for hword, hword_part, word with extensions.unaccent, simple;

create table public.oeuvres_recherche (
  oeuvre_id uuid primary key references public.oeuvres (id) on delete cascade,
  -- Identifiant des URL /oeuvre/<ref> (plus petit title_id de l'œuvre)
  ref text not null unique,
  titre text not null,
  sous_titre text,
  serie_id uuid references public.series (id) on delete set null,
  serie_nom text,
  serie_slug text,
  tome integer,
  auteurs text[] not null default '{}',
  auteur_ids uuid[] not null default '{}',
  editeur text,
  annee smallint,
  formats text[] not null default '{}',
  couverture text,
  nb_editions integer not null,
  popularite integer not null,
  -- ISBN de toutes les éditions, sous leurs formes 10 et 13 chiffres
  isbns text[] not null default '{}',
  -- Formes repliées (minuscules, sans accents ni ponctuation), comme le moteur
  titre_cle text not null,
  serie_cle text,
  auteurs_cle text not null default '',
  -- Disponibilité SIMULÉE (src/lib/catalog/availability.ts) : codes de succursale
  succursales text[] not null default '{}',
  succursales_dispo text[] not null default '{}',
  document tsvector generated always as (
    setweight(to_tsvector('public.catalogue', titre_cle), 'A') ||
    setweight(to_tsvector('public.catalogue', coalesce(serie_cle, '')), 'A') ||
    setweight(to_tsvector('public.catalogue', replace(auteurs_cle, '|', ' ')), 'B') ||
    setweight(to_tsvector('public.catalogue', coalesce(sous_titre, '')), 'C') ||
    setweight(to_tsvector('public.catalogue', coalesce(editeur, '')), 'D')
  ) stored
);
create index oeuvres_recherche_document_idx on public.oeuvres_recherche using gin (document);
create index oeuvres_recherche_titre_trgm_idx
  on public.oeuvres_recherche using gin (titre_cle extensions.gin_trgm_ops);
create index oeuvres_recherche_isbns_idx on public.oeuvres_recherche using gin (isbns);
create index oeuvres_recherche_auteurs_idx on public.oeuvres_recherche using gin (auteur_ids);
create index oeuvres_recherche_serie_idx on public.oeuvres_recherche (serie_id, tome);
-- Ordre de base, sans requête : couverture d'abord, puis les plus récents, puis les populaires
create index oeuvres_recherche_base_idx on public.oeuvres_recherche
  ((couverture is not null) desc, annee desc nulls last, popularite desc, ref);

create table public.series_recherche (
  serie_id uuid primary key references public.series (id) on delete cascade,
  nom text not null,
  slug text not null unique,
  cle text not null,
  nb_tomes integer not null,
  couvertures text[] not null default '{}',
  annee_max smallint,
  auteurs text[] not null default '{}',
  -- Popularité : éditions et couvertures de tous les tomes
  poids integer not null,
  document tsvector generated always as (to_tsvector('public.catalogue', cle)) stored
);
create index series_recherche_document_idx on public.series_recherche using gin (document);

create table public.auteurs_recherche (
  auteur_id uuid primary key references public.auteurs (id) on delete cascade,
  nom text not null,
  nom_cle text not null,
  nb_oeuvres integer not null,
  document tsvector generated always as (to_tsvector('public.catalogue', nom_cle)) stored
);
create index auteurs_recherche_document_idx on public.auteurs_recherche using gin (document);
create index auteurs_recherche_nom_cle_idx on public.auteurs_recherche (nom_cle);

-- Lecture par le serveur seulement (connexion Postgres) : rien d'exposé à la clé anon.
alter table public.oeuvres_recherche enable row level security;
alter table public.series_recherche enable row level security;
alter table public.auteurs_recherche enable row level security;
