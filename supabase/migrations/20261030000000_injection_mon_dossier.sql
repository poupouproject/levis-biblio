-- Notices ajoutées depuis Mon dossier : un emprunt ou une réservation absent du catalogue
-- relevé (nouveauté) y est ajouté après la page (src/lib/catalog/injection.ts).
--
-- 1. `notice_partielle` : le portail ne donne que le titre, l'auteur, l'ISBN et la couverture.
--    Éditeur, année, format et pages restent à compléter (Open Library par ISBN, prochain relevé).
--    Rien ne les relie à un usager : elles sont ajoutées par le compte de service du site.
-- 2. Rôle `levisbiblio_injection` pour le serveur du site : lire le catalogue, y ajouter et mettre
--    à jour (les déclencheurs recalculent œuvres, séries et auteurs), jamais supprimer.
--    Créé sans connexion. Le propriétaire lui donne un mot de passe à la main, jamais dans le
--    dépôt (`alter role levisbiblio_injection with login password '…'`), puis définit
--    DATABASE_INJECTION_URL. Sans cette variable, le site n'ajoute rien.

alter table public.editions add column notice_partielle boolean not null default false;

do $$
begin
  if not exists (select from pg_roles where rolname = 'levisbiblio_injection') then
    create role levisbiblio_injection nologin;
  end if;
end $$;

grant usage on schema public to levisbiblio_injection;
grant select on all tables in schema public to levisbiblio_injection;
grant insert, update on public.editions, public.oeuvres, public.series, public.auteurs,
  public.auteurs_variantes, public.oeuvres_auteurs to levisbiblio_injection;
grant execute on all functions in schema public to levisbiblio_injection;

-- Tables protégées par RLS (sans politique, seul le propriétaire y accède) : ouvertes à ce rôle
-- seulement. Ses droits (pas de delete) limitent ce que « for all » permet.
create policy injection_catalogue on public.series
  for all to levisbiblio_injection using (true) with check (true);
create policy injection_catalogue on public.auteurs
  for all to levisbiblio_injection using (true) with check (true);
create policy injection_catalogue on public.auteurs_variantes
  for all to levisbiblio_injection using (true) with check (true);
create policy injection_catalogue on public.oeuvres_auteurs
  for all to levisbiblio_injection using (true) with check (true);
create policy injection_lecture on public.liens_externes
  for select to levisbiblio_injection using (true);
