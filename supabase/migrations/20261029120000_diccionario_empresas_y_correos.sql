-- 1) Diccionario de empresas Tier 1 / Tier 1.5 editable (antes solo en scraping/empresas_peru.py, que queda como copia de
--    respaldo). Cada fila es un nombre o alias normalizado (minúsculas, sin tildes) que se busca como palabras completas
--    en la empresa del CV; `exacto` = solo si es el nombre completo (siglas como «ey» o «tasa»). Lo edita quien tenga
--    gth_perfiles.editar_diccionario (todos por defecto; un administrador puede quitarlo). Agregar o quitar una empresa
--    marca para recalcular solo los avisos con postulantes que trabajaron en ella.
-- 2) Correo corregido de un postulante (por su ID de Bumeran): vale en todos sus avisos y no lo pisa el CSV de Bumeran.
-- No modifica datos existentes (el diccionario se carga con scraping/cargar_diccionario.py).
begin;
alter table public.gth_perfiles add column if not exists editar_diccionario boolean not null default true;

create table if not exists public.gth_empresas_diccionario (
  alias       text primary key check (length(alias) between 2 and 120 and alias = lower(alias)),
  tier        text not null check (tier in ('Tier 1', 'Tier 1.5')),
  sector      text not null check (length(sector) between 1 and 80),
  exacto      boolean not null default false,
  origen      text not null default 'equipo' check (origen in ('base', 'equipo')),
  creado_por  uuid references auth.users(id) on delete set null default auth.uid(),
  creado_at   timestamptz not null default now()
);

create or replace function gth_privado.puede_editar_diccionario() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gth_perfiles where user_id = auth.uid() and activo and editar_diccionario);
$$;
revoke all on function gth_privado.puede_editar_diccionario() from public, anon;
grant execute on function gth_privado.puede_editar_diccionario() to authenticated;

alter table public.gth_empresas_diccionario enable row level security;
create policy diccionario_lectura on public.gth_empresas_diccionario for select to authenticated using (true);
create policy diccionario_alta on public.gth_empresas_diccionario for insert to authenticated
  with check (gth_privado.puede_editar_diccionario() and origen = 'equipo');
create policy diccionario_baja on public.gth_empresas_diccionario for delete to authenticated
  using (gth_privado.puede_editar_diccionario());
revoke all on public.gth_empresas_diccionario from anon, authenticated;
grant select, insert, delete on public.gth_empresas_diccionario to authenticated;
grant all on public.gth_empresas_diccionario to service_role;

-- Avisos con postulantes que trabajaron en la empresa agregada o quitada: quedan con cambios por recalcular.
create or replace function gth_privado.marcar_avisos_empresa() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  fila public.gth_empresas_diccionario := coalesce(new, old);
  patron text := '(^|[^a-z0-9])' || regexp_replace(fila.alias, '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '([^a-z0-9]|$)';
begin
  insert into public.gth_aviso_calibracion (aviso_id, editado_at)
  select distinct p.aviso_id, now()
    from public.postulaciones p, jsonb_each_text(p.datos_json) e
   where p.en_ultimo_csv = 1 and e.key ~ '^Exp\[\d+\] Empresa$' and public.gth_sin_tildes(e.value) ~ patron
  on conflict (aviso_id) do update set editado_at = excluded.editado_at;
  return null;
end; $$;
revoke all on function gth_privado.marcar_avisos_empresa() from public, anon;
grant execute on function gth_privado.marcar_avisos_empresa() to authenticated;
drop trigger if exists diccionario_recalculo on public.gth_empresas_diccionario;
create trigger diccionario_recalculo after insert or delete on public.gth_empresas_diccionario
  for each row execute function gth_privado.marcar_avisos_empresa();

create table if not exists public.gth_correos_postulante (
  id_postulante   text primary key check (length(id_postulante) between 1 and 250),
  email           text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' and length(email) <= 254),
  actualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  actualizado_at  timestamptz not null default now()
);
create or replace function gth_privado.sello_correo() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.email := lower(btrim(new.email)); new.actualizado_por := auth.uid(); new.actualizado_at := now();
  return new;
end; $$;
revoke all on function gth_privado.sello_correo() from public, anon;
grant execute on function gth_privado.sello_correo() to authenticated;
drop trigger if exists sello_correo on public.gth_correos_postulante;
create trigger sello_correo before insert or update on public.gth_correos_postulante
  for each row execute function gth_privado.sello_correo();
alter table public.gth_correos_postulante enable row level security;
create policy correos_lectura on public.gth_correos_postulante for select to authenticated
  using (exists (select 1 from public.gth_perfiles where user_id = (select auth.uid()) and activo));
create policy correos_alta on public.gth_correos_postulante for insert to authenticated
  with check (exists (select 1 from public.gth_perfiles where user_id = (select auth.uid()) and activo));
create policy correos_edicion on public.gth_correos_postulante for update to authenticated
  using (exists (select 1 from public.gth_perfiles where user_id = (select auth.uid()) and activo))
  with check (exists (select 1 from public.gth_perfiles where user_id = (select auth.uid()) and activo));
revoke all on public.gth_correos_postulante from anon, authenticated;
grant select, insert, update on public.gth_correos_postulante to authenticated;
grant all on public.gth_correos_postulante to service_role;
commit;
