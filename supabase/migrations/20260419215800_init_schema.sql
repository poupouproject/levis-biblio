-- 1. Extension vectorielle
create extension if not exists vector;

-- 2. Table des Œuvres
create table oeuvres (
  id         uuid primary key default gen_random_uuid(),
  titre      text not null,
  auteurs    text[],
  resume     text,
  sujets     text[],
  langue     text default 'fr',
  ol_work_id text unique,
  bnf_ark    text unique,

  embedding        vector(768),
  embedding_modele text,
  embedding_at     timestamptz,

  updated_at timestamptz default now()
);

-- 3. Table des Éditions
create table editions (
  id                    uuid primary key default gen_random_uuid(),
  oeuvre_id             uuid references oeuvres(id) on delete cascade,
  isbn                  text unique,
  title_id              text,
  titre_brut            text,
  auteur_brut           text,
  statut_reconciliation text default 'non_reconcilie',
  -- Valeurs possibles :
  --   'non_reconcilie'      → pas encore traité
  --   'reconcilie_bnf'      → ARK BnF pérenne trouvé
  --   'reconcilie_bnf_temp' → ARK BnF temporaire (temp-work), à retraiter plus tard
  editeur               text,
  annee_publication     integer,
  format                text,
  nb_pages              integer,
  image_couverture      text,
  created_at            timestamptz default now()
);

-- 4. Index
create index on oeuvres using hnsw (embedding vector_cosine_ops);
create index on editions(oeuvre_id);
create index on editions(title_id);
create index on editions(statut_reconciliation);
