-- Normalisation dans Postgres. Le site analyse chaque notice avant de l'injecter (série, tome,
-- œuvre, auteur : src/lib/catalog/ingestion.ts) ; Postgres calcule le reste à chaque écriture :
-- clés repliées, formats, ISBN, agrégats des œuvres, séries et auteurs, vecteurs de recherche.
-- Remplace les tables de recherche copiées par un script (oeuvres_recherche, etc.).

-- La reprise des données (fin du fichier) recalcule tout le catalogue : plus long que la limite
-- par instruction de Supabase. Levée pour cette transaction seulement.
set local statement_timeout = 0;

-- 1. Fonctions de normalisation, immuables (colonnes générées, index). Mêmes règles que
--    src/lib/catalog/normalize.ts (fold, formatGroup, plausibleYear, isbnForms).

-- Minuscules, sans accents ni ponctuation
create function public.replier(texte text) returns text
language sql immutable parallel safe
return btrim(regexp_replace(
  lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(texte, ''))),
  '[^a-z0-9]+', ' ', 'g'));

-- Format SirsiDynix → groupe affiché
create function public.groupe_format(format text) returns text
language sql immutable parallel safe
return case
  when public.replier(format) like '%gros caracteres%' then 'gros-caracteres'
  when public.replier(format) like '%musique%' or public.replier(format) like '%musical%' then 'musique'
  when public.replier(format) like '%sonore%' or public.replier(format) like '%audio%' then 'audio'
  when public.replier(format) like '%video%' or public.replier(format) like '%film%' then 'video'
  when public.replier(format) like '%trousse%' then 'trousse'
  when public.replier(format) like '%electronique%' or public.replier(format) like '%informatique%'
    or public.replier(format) like '%numerique%' then 'numerique'
  when public.replier(format) = '' or public.replier(format) like '%livre%'
    or public.replier(format) like '%imprimerie%' or public.replier(format) like '%atlas%' then 'livre'
  else 'autre' end;

-- Année plausible (le catalogue contient des valeurs comme 9782)
create function public.annee_plausible(annee integer) returns smallint
language sql immutable parallel safe
return case when annee between 1450 and 2100 then annee end;

-- Formes d'un ISBN : nettoyé, et pour les livres en 978 l'équivalent ISBN-10 ↔ ISBN-13
create function public.isbn_formes(isbn text) returns text[]
language plpgsql immutable parallel safe as $$
declare
  n text := lower(regexp_replace(coalesce(isbn, ''), '[\s-]', '', 'g'));
  corps text;
  somme integer := 0;
  cle integer;
begin
  if n !~ '^([0-9]{9}[0-9x]|[0-9]{13})$' then
    return '{}';
  end if;
  if length(n) = 10 then
    corps := '978' || left(n, 9);
    for i in 1..12 loop
      somme := somme + substr(corps, i, 1)::integer * case when i % 2 = 1 then 1 else 3 end;
    end loop;
    return array[n, corps || ((10 - somme % 10) % 10)::text];
  end if;
  if left(n, 3) = '978' then
    corps := substr(n, 4, 9);
    for i in 1..9 loop
      somme := somme + substr(corps, i, 1)::integer * (11 - i);
    end loop;
    cle := (11 - somme % 11) % 11;
    return array[n, corps || case when cle = 10 then 'x' else cle::text end];
  end if;
  return array[n];
end $$;

-- 2. Colonnes calculées par Postgres

alter table public.editions
  add column format_groupe text generated always as (public.groupe_format(format)) stored,
  add column annee smallint generated always as (public.annee_plausible(annee_publication)) stored,
  add column isbns text[] generated always as (public.isbn_formes(isbn)) stored;
create index editions_auteur_brut_idx on public.editions (auteur_brut);

alter table public.oeuvres
  -- Clé de regroupement du site (même tome de série ou même titre, même auteur)
  add column cle_regroupement text unique,
  -- Disponibilité SIMULÉE, posée par le site à la création (src/lib/catalog/availability.ts)
  add column succursales text[] not null default '{}',
  add column succursales_dispo text[] not null default '{}',
  -- Tenus à jour par les déclencheurs (éditions, auteurs, série)
  add column serie_cle text,
  add column auteur_ids uuid[] not null default '{}',
  add column auteurs_cle text not null default '',
  add column editeur text,
  add column annee smallint,
  add column formats text[] not null default '{}',
  add column couverture text,
  add column isbns text[] not null default '{}',
  add column nb_editions integer not null default 0,
  add column titre_cle text generated always as (public.replier(titre)) stored,
  add column popularite integer generated always as (
    least(nb_editions, 6) * 2 + case when couverture is null then 0 else 4 end) stored,
  -- Titre et série A, auteurs B, sous-titre C, éditeur D
  add column document tsvector generated always as (
    setweight(to_tsvector('public.catalogue', public.replier(titre)), 'A') ||
    setweight(to_tsvector('public.catalogue', coalesce(serie_cle, '')), 'A') ||
    setweight(to_tsvector('public.catalogue', replace(auteurs_cle, '|', ' ')), 'B') ||
    setweight(to_tsvector('public.catalogue', coalesce(sous_titre, '')), 'C') ||
    setweight(to_tsvector('public.catalogue', coalesce(editeur, '')), 'D')) stored;

alter table public.series
  add column nb_tomes integer not null default 0,
  add column couvertures text[] not null default '{}',
  add column annee_max smallint,
  add column auteurs text[] not null default '{}',
  add column poids integer not null default 0,
  add column document tsvector generated always as (to_tsvector('public.catalogue', cle)) stored;

alter table public.auteurs
  add column nb_oeuvres integer not null default 0,
  add column nom_cle text generated always as (public.replier(nom)) stored,
  add column document tsvector generated always as (
    to_tsvector('public.catalogue', public.replier(nom))) stored;

-- 3. Agrégats

-- Œuvres : à partir de leurs éditions (récentes d'abord) et des auteurs de ces éditions
create function public.rafraichir_oeuvres(ids uuid[]) returns void
language sql as $$
  update public.oeuvres o set
    formats = coalesce(e.formats, '{}'),
    annee = e.annee,
    couverture = e.couverture,
    editeur = e.editeur,
    isbns = coalesce(e.isbns, '{}'),
    nb_editions = coalesce(e.nb, 0),
    auteur_ids = coalesce(a.ids, '{}'),
    auteurs = coalesce(a.noms, '{}'),
    auteurs_cle = coalesce(a.cle, '')
  from unnest(ids) as cible(id)
  left join lateral (
    select array_agg(distinct ed.format_groupe) as formats,
           max(ed.annee) as annee,
           (array_agg(ed.image_couverture order by ed.annee desc nulls last, ed.title_id)
              filter (where ed.image_couverture is not null))[1] as couverture,
           (array_agg(ed.editeur order by ed.annee desc nulls last, ed.title_id))[1] as editeur,
           array(select distinct i from public.editions e2, unnest(e2.isbns) i
                  where e2.oeuvre_id = cible.id) as isbns,
           count(*)::integer as nb
      from public.editions ed where ed.oeuvre_id = cible.id) e on true
  left join lateral (
    -- Tous les auteurs pour les filtres ; les trois principaux pour l'affichage et la recherche
    select array_agg(v.auteur_id order by v.n desc, v.nom) as ids,
           (array_agg(v.nom order by v.n desc, v.nom))[1:3] as noms,
           string_agg(public.replier(v.nom), '|' order by v.n desc, v.nom)
             filter (where v.rang <= 3) as cle
      from (select va.auteur_id, au.nom, count(*) as n,
                   row_number() over (order by count(*) desc, au.nom) as rang
              from public.editions ed
              join public.auteurs_variantes va on va.forme = ed.auteur_brut
              join public.auteurs au on au.id = va.auteur_id
             where ed.oeuvre_id = cible.id
             group by va.auteur_id, au.nom) v) a on true
  where o.id = cible.id;
$$;

-- Séries : à partir de leurs tomes (œuvres qui ont au moins une édition)
create function public.rafraichir_series(ids uuid[]) returns void
language sql as $$
  update public.series s set
    nb_tomes = coalesce(t.nb, 0),
    couvertures = coalesce(t.couvertures, '{}'),
    annee_max = t.annee_max,
    poids = coalesce(t.poids, 0),
    auteurs = coalesce(array(
      select x.nom from public.oeuvres o2, unnest(o2.auteurs) as x(nom)
       where o2.serie_id = cible.id and o2.nb_editions > 0
       group by x.nom order by count(*) desc, x.nom limit 2), '{}')
  from unnest(ids) as cible(id)
  left join lateral (
    select count(*)::integer as nb,
           (array_agg(o.couverture order by coalesce(o.tome, 0), o.title_id_reference)
              filter (where o.couverture is not null))[1:3] as couvertures,
           max(o.annee) as annee_max,
           sum(o.nb_editions + case when o.couverture is null then 0 else 2 end)::integer as poids
      from public.oeuvres o where o.serie_id = cible.id and o.nb_editions > 0) t on true
  where s.id = cible.id;
$$;

create function public.rafraichir_auteurs(ids uuid[]) returns void
language sql as $$
  update public.auteurs a set nb_oeuvres = (
    select count(*) from public.oeuvres o where o.auteur_ids @> array[a.id] and o.nb_editions > 0)
  where a.id = any(ids);
$$;

-- 4. Déclencheurs, par instruction : une écriture en masse ne recalcule qu'une fois

-- Éditions → leurs œuvres (anciennes et nouvelles), si une colonne utile a changé
create function public.editions_apres_ecriture() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    perform public.rafraichir_oeuvres(array(
      select distinct oeuvre_id from nouvelles where oeuvre_id is not null));
  elsif tg_op = 'DELETE' then
    perform public.rafraichir_oeuvres(array(
      select distinct oeuvre_id from anciennes where oeuvre_id is not null));
  else
    perform public.rafraichir_oeuvres(array(
      select x.oeuvre_id
        from nouvelles n join anciennes a on a.id = n.id,
             lateral (values (n.oeuvre_id), (a.oeuvre_id)) as x(oeuvre_id)
       where x.oeuvre_id is not null
         and (n.oeuvre_id, n.format, n.annee_publication, n.isbn, n.image_couverture, n.editeur,
              n.auteur_brut, n.title_id)
             is distinct from
             (a.oeuvre_id, a.format, a.annee_publication, a.isbn, a.image_couverture, a.editeur,
              a.auteur_brut, a.title_id)
       group by x.oeuvre_id));
  end if;
  return null;
end $$;
create trigger editions_insertion after insert on public.editions
  referencing new table as nouvelles for each statement
  execute function public.editions_apres_ecriture();
create trigger editions_modification after update on public.editions
  referencing old table as anciennes new table as nouvelles for each statement
  execute function public.editions_apres_ecriture();
create trigger editions_suppression after delete on public.editions
  referencing old table as anciennes for each statement
  execute function public.editions_apres_ecriture();

-- Œuvre : clé de sa série, pour le vecteur de recherche
create function public.oeuvres_avant_ecriture() returns trigger
language plpgsql as $$
begin
  new.serie_cle := (select cle from public.series where id = new.serie_id);
  return new;
end $$;
create trigger oeuvres_serie before insert or update of serie_id on public.oeuvres
  for each row execute function public.oeuvres_avant_ecriture();

-- Œuvres → leurs séries et leurs auteurs, si une colonne utile a changé
create function public.oeuvres_apres_ecriture() returns trigger
language plpgsql as $$
declare
  series_touchees uuid[];
  auteurs_touches uuid[];
begin
  if tg_op = 'INSERT' then
    series_touchees := array(select distinct serie_id from nouvelles where serie_id is not null);
    auteurs_touches := array(select distinct i from nouvelles, unnest(nouvelles.auteur_ids) i);
  elsif tg_op = 'DELETE' then
    series_touchees := array(select distinct serie_id from anciennes where serie_id is not null);
    auteurs_touches := array(select distinct i from anciennes, unnest(anciennes.auteur_ids) i);
  else
    series_touchees := array(
      select distinct x from nouvelles n join anciennes a on a.id = n.id,
             unnest(array[n.serie_id, a.serie_id]) as x
       where x is not null
         and (n.serie_id, n.tome, n.couverture, n.annee, n.nb_editions, n.auteurs)
             is distinct from (a.serie_id, a.tome, a.couverture, a.annee, a.nb_editions, a.auteurs));
    auteurs_touches := array(
      select distinct x from nouvelles n join anciennes a on a.id = n.id,
             unnest(n.auteur_ids || a.auteur_ids) as x
       where (n.auteur_ids, n.nb_editions) is distinct from (a.auteur_ids, a.nb_editions));
  end if;
  perform public.rafraichir_series(series_touchees);
  perform public.rafraichir_auteurs(auteurs_touches);
  return null;
end $$;
create trigger oeuvres_insertion after insert on public.oeuvres
  referencing new table as nouvelles for each statement
  execute function public.oeuvres_apres_ecriture();
create trigger oeuvres_modification after update on public.oeuvres
  referencing old table as anciennes new table as nouvelles for each statement
  execute function public.oeuvres_apres_ecriture();
create trigger oeuvres_suppression after delete on public.oeuvres
  referencing old table as anciennes for each statement
  execute function public.oeuvres_apres_ecriture();

-- Série renommée → la clé recopiée sur ses œuvres
create function public.series_apres_renommage() returns trigger
language plpgsql as $$
begin
  update public.oeuvres set serie_cle = new.cle where serie_id = new.id;
  return null;
end $$;
create trigger series_renommage after update of cle on public.series
  for each row execute function public.series_apres_renommage();

-- Formes d'auteur ajoutées, retirées ou réattribuées → les œuvres des éditions concernées
create function public.variantes_apres_ecriture() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    perform public.rafraichir_oeuvres(array(
      select distinct e.oeuvre_id from public.editions e
       where e.auteur_brut in (select forme from nouvelles) and e.oeuvre_id is not null));
  else
    perform public.rafraichir_oeuvres(array(
      select distinct e.oeuvre_id from public.editions e
       where e.auteur_brut in (select forme from anciennes) and e.oeuvre_id is not null));
  end if;
  return null;
end $$;
create trigger variantes_insertion after insert on public.auteurs_variantes
  referencing new table as nouvelles for each statement
  execute function public.variantes_apres_ecriture();
create trigger variantes_modification after update on public.auteurs_variantes
  referencing old table as anciennes new table as nouvelles for each statement
  execute function public.variantes_apres_ecriture();
create trigger variantes_suppression after delete on public.auteurs_variantes
  referencing old table as anciennes for each statement
  execute function public.variantes_apres_ecriture();

-- Auteur renommé → ses œuvres
create function public.auteurs_apres_renommage() returns trigger
language plpgsql as $$
begin
  perform public.rafraichir_oeuvres(array(
    select id from public.oeuvres where auteur_ids @> array[new.id]));
  return null;
end $$;
create trigger auteurs_renommage after update of nom on public.auteurs
  for each row execute function public.auteurs_apres_renommage();

-- 5. Index de recherche

create index oeuvres_document_idx on public.oeuvres using gin (document);
create index oeuvres_titre_trgm_idx on public.oeuvres using gin (titre_cle extensions.gin_trgm_ops);
create index oeuvres_isbns_idx on public.oeuvres using gin (isbns);
create index oeuvres_auteur_ids_idx on public.oeuvres using gin (auteur_ids);
-- Ordre de base, sans requête : couverture d'abord, puis les plus récents, puis les populaires
create index oeuvres_base_idx on public.oeuvres
  ((couverture is not null) desc, annee desc nulls last, popularite desc, title_id_reference);
create index series_document_idx on public.series using gin (document);
create index auteurs_document_idx on public.auteurs using gin (document);
create index auteurs_nom_cle_idx on public.auteurs (nom_cle);

-- 6. Vue des œuvres cherchables (sans stockage). security_invoker : le RLS des tables
--    s'applique ; rien n'est exposé à la clé anon.
create view public.catalogue_oeuvres with (security_invoker = true) as
select o.id, o.title_id_reference as ref, o.titre, o.sous_titre, o.serie_id,
       s.nom as serie_nom, s.slug as serie_slug, o.tome, o.auteurs, o.auteur_ids, o.annee,
       o.formats, o.couverture, o.popularite, o.titre_cle, o.serie_cle, o.auteurs_cle, o.isbns,
       o.document, o.succursales, o.succursales_dispo, o.nb_editions
  from public.oeuvres o left join public.series s on s.id = o.serie_id
 where o.nb_editions > 0;
revoke all on public.catalogue_oeuvres from anon, authenticated;

-- 7. Reprise des données : disponibilité simulée (si les tables copiées existent encore), puis
--    agrégats calculés par Postgres. Sur des tables vides (chargement à suivre), rien à faire.
do $$
begin
  if to_regclass('public.oeuvres_recherche') is not null then
    update public.oeuvres o set succursales = r.succursales, succursales_dispo = r.succursales_dispo
      from public.oeuvres_recherche r where r.oeuvre_id = o.id;
  end if;
end $$;
update public.oeuvres o set serie_cle = s.cle from public.series s where s.id = o.serie_id;
select public.rafraichir_oeuvres(array(select id from public.oeuvres));

drop table if exists public.oeuvres_recherche, public.series_recherche, public.auteurs_recherche;
