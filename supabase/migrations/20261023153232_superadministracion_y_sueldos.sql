-- Integra la entrega de sueldos sobre ETAPA-I sin sustituir el proyecto por el ZIP antiguo.
-- No identifica a Andrea por nombre ni promueve automáticamente a usuarios existentes.
begin;

alter table public.gth_perfiles drop constraint gth_perfiles_nivel_check;
alter table public.gth_perfiles add constraint gth_perfiles_nivel_check
  check (nivel in ('superadmin', 'maestro', 'general'));

create schema if not exists gth_privado;
revoke all on schema gth_privado from public, anon;
grant usage on schema gth_privado to authenticated;
create function gth_privado.es_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gth_perfiles
    where user_id = (select auth.uid()) and activo and nivel = 'superadmin');
$$;
revoke all on function gth_privado.es_superadmin() from public, anon;
grant execute on function gth_privado.es_superadmin() to authenticated;

-- Conserva las políticas anteriores: ambos niveles administrativos ven todos los avisos.
create or replace function public.gth_es_maestro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gth_perfiles
    where user_id = (select auth.uid()) and activo and nivel in ('superadmin','maestro'));
$$;
create or replace function public.gth_puede_ver_aviso(p_aviso text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.gth_perfiles p
    where p.user_id = (select auth.uid()) and p.activo
      and (p.nivel in ('superadmin','maestro')
        or (not exists (select 1 from public.avisos_confidenciales c where c.aviso_id = p_aviso)
          and (p.avisos is null or p_aviso = any (p.avisos)))));
$$;

-- También protege las actualizaciones directas a PostgREST, fuera de la interfaz.
create or replace function public.gth_proteger_perfil() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.user_id <> old.user_id or new.email <> old.email then raise exception 'Campo no editable'; end if;
  if auth.uid() is not null then
    if old.user_id = auth.uid() and (new.nivel <> old.nivel or new.activo <> old.activo) then
      raise exception 'No puedes cambiar tu propio nivel ni desactivar tu cuenta';
    end if;
    if old.nivel = 'superadmin' and (old.user_id <> auth.uid() or new.nivel <> old.nivel or new.activo <> old.activo) then
      raise exception 'La cuenta superadministradora está protegida';
    end if;
    if new.nivel = 'superadmin' and old.nivel <> 'superadmin' then
      raise exception 'El alta de superadministración requiere configuración del responsable de la base';
    end if;
    if old.user_id <> auth.uid() and not gth_privado.es_superadmin() and (old.nivel <> 'general' or new.nivel <> 'general') then
      raise exception 'Solo la superadministradora puede gestionar administradores';
    end if;
  end if;
  new.actualizado_at := now();
  return new;
end; $$;

-- Oferta compartida por aviso. Una fila con monto null representa una oferta retirada.
-- No tiene FK a avisos: también admite los códigos de convocatorias creadas manualmente.
create table public.gth_sueldos_ofertados (
  aviso_id text primary key check (length(aviso_id) between 1 and 250),
  monto numeric(12,2) check (monto is null or (monto > 0 and monto <= 1000000)),
  actualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  actualizado_at timestamptz not null default now()
);
alter table public.gth_sueldos_ofertados enable row level security;
revoke all on public.gth_sueldos_ofertados from public, anon, authenticated;
grant select, insert, update on public.gth_sueldos_ofertados to authenticated;
grant all on public.gth_sueldos_ofertados to service_role;
create policy sueldos_lectura on public.gth_sueldos_ofertados for select to authenticated
  using (public.gth_puede_ver_aviso(aviso_id));
create policy sueldos_alta on public.gth_sueldos_ofertados for insert to authenticated
  with check (gth_privado.es_superadmin() and public.gth_puede_ver_aviso(aviso_id));
create policy sueldos_edicion on public.gth_sueldos_ofertados for update to authenticated
  using (gth_privado.es_superadmin() and public.gth_puede_ver_aviso(aviso_id))
  with check (gth_privado.es_superadmin() and public.gth_puede_ver_aviso(aviso_id));
create function gth_privado.sello_oferta() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and new.aviso_id <> old.aviso_id then raise exception 'El aviso no es editable'; end if;
  new.actualizado_por := auth.uid(); new.actualizado_at := now();
  return new;
end; $$;
revoke all on function gth_privado.sello_oferta() from public, anon;
create trigger sello_oferta before insert or update on public.gth_sueldos_ofertados
  for each row execute function gth_privado.sello_oferta();

commit;
