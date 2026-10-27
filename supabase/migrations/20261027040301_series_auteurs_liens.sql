-- Séries, auteurs et liens externes ; œuvres rattachées à leur série et à leurs auteurs.
-- Remplissage : scripts/structurer-catalogue.mjs (regroupement du moteur, src/lib/catalog).

-- Séries : `cle` (nom replié) regroupe, `nom` s'affiche.
create table public.series (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  cle text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auteurs : une personne. `cle` = nom de famille | prénom | année de naissance (repliés).
create table public.auteurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  nom_famille text not null,
  prenom text,
  naissance smallint,
  deces smallint,
  cle text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index auteurs_nom_famille_idx on public.auteurs (nom_famille);

-- Chaque forme brute du catalogue (« Greg, 1931- . ») pointe vers un seul auteur :
-- une forme déjà connue ne peut pas recréer d'auteur.
create table public.auteurs_variantes (
  forme text primary key,
  auteur_id uuid not null references public.auteurs (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index auteurs_variantes_auteur_idx on public.auteurs_variantes (auteur_id);

alter table public.oeuvres
  add column sous_titre text,
  add column serie_id uuid references public.series (id) on delete set null,
  add column tome integer,
  -- Plus petit title_id de l'œuvre : l'identifiant des URL actuelles (/oeuvre/<title_id>)
  add column title_id_reference text unique,
  add column version_regles smallint;
create index oeuvres_serie_idx on public.oeuvres (serie_id, tome);

create table public.oeuvres_auteurs (
  oeuvre_id uuid not null references public.oeuvres (id) on delete cascade,
  auteur_id uuid not null references public.auteurs (id) on delete cascade,
  role text not null default 'auteur',
  primary key (oeuvre_id, auteur_id, role)
);
create index oeuvres_auteurs_auteur_idx on public.oeuvres_auteurs (auteur_id);

-- Identifiants externes : plusieurs par œuvre, série ou auteur (Open Library a des doublons).
create table public.liens_externes (
  id uuid primary key default gen_random_uuid(),
  oeuvre_id uuid references public.oeuvres (id) on delete cascade,
  serie_id uuid references public.series (id) on delete cascade,
  auteur_id uuid references public.auteurs (id) on delete cascade,
  source text not null check (source in ('openlibrary', 'wikidata', 'bnf', 'banq')),
  identifiant text not null,
  relation text not null default 'meme' check (relation in ('meme', 'traduction_de')),
  methode text not null check (methode in ('isbn', 'titre_auteur', 'manuel', 'import')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(oeuvre_id, serie_id, auteur_id) = 1)
);
create unique index liens_externes_unique
  on public.liens_externes (coalesce(oeuvre_id, serie_id, auteur_id), source, identifiant, relation);
create index liens_externes_source_idx on public.liens_externes (source, identifiant);

-- Les identifiants déjà rapprochés passent dans liens_externes ; plus d'unicité sur l'œuvre.
insert into public.liens_externes (oeuvre_id, source, identifiant, methode)
select id, 'openlibrary', ol_work_id, 'import' from public.oeuvres where ol_work_id is not null;
insert into public.liens_externes (oeuvre_id, source, identifiant, methode)
select id, 'bnf', bnf_ark, 'import' from public.oeuvres where bnf_ark is not null;
alter table public.oeuvres
  drop constraint oeuvres_ol_work_id_key,
  drop constraint oeuvres_bnf_ark_key;
comment on column public.oeuvres.ol_work_id is 'Obsolète : voir liens_externes.';
comment on column public.oeuvres.bnf_ark is 'Obsolète : voir liens_externes.';

-- Supprimer une œuvre ne supprime plus ses éditions.
alter table public.editions
  drop constraint editions_oeuvre_id_fkey,
  add constraint editions_oeuvre_id_fkey
    foreign key (oeuvre_id) references public.oeuvres (id) on delete set null;

-- Lecture par le serveur seulement (connexion Postgres) : rien d'exposé à la clé anon.
alter table public.series enable row level security;
alter table public.auteurs enable row level security;
alter table public.auteurs_variantes enable row level security;
alter table public.oeuvres_auteurs enable row level security;
alter table public.liens_externes enable row level security;
