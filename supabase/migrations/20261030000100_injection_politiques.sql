-- Suite de 20261030000000_injection_mon_dossier.sql. En ligne, `editions` et `oeuvres` ont la
-- RLS (comme toutes les tables du catalogue) ; en local, elles ne l'avaient pas. On l'active
-- partout (Supabase expose les tables de `public` par son API : sans politique, rien n'y est
-- lisible) et on ouvre ces deux tables au rôle d'injection, comme les autres.
-- Le site lit avec le propriétaire des tables (DATABASE_URL), que la RLS ne limite pas.

alter table public.editions enable row level security;
alter table public.oeuvres enable row level security;

create policy injection_catalogue on public.editions
  for all to levisbiblio_injection using (true) with check (true);
create policy injection_catalogue on public.oeuvres
  for all to levisbiblio_injection using (true) with check (true);
