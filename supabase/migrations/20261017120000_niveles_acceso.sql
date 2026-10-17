-- Niveles de acceso de GTH. Aplicar en GTH_Bumeran después de avance_compartido.
--   * maestro: ve todos los avisos (también los confidenciales) y administra usuarios y permisos.
--   * general: ve los avisos no confidenciales; si su perfil trae una lista de avisos, solo esos.
-- Las cuentas se crean desde la web (api/usuarios.ts, con la clave service_role del servidor).
-- El scraper entra con el rol postgres y no pasa por RLS: sigue leyendo y escribiendo todo.
begin;

create table public.gth_perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null default '' check (length(nombre) <= 120),
  nivel text not null default 'general' check (nivel in ('maestro','general')),
  secciones text[],                      -- null = todas las secciones del menú
  avisos text[],                         -- null = todos los avisos no confidenciales
  debe_cambiar_clave boolean not null default true,
  activo boolean not null default true,
  actualizado_at timestamptz not null default now()
);

create table public.avisos_confidenciales (
  aviso_id text primary key check (length(aviso_id) between 1 and 250),
  marcado_por uuid references auth.users(id) on delete set null default auth.uid(),
  marcado_at timestamptz not null default now()
);

-- security definer: las políticas las llaman sin depender del RLS de estas tablas.
create function public.gth_es_maestro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gth_perfiles
                 where user_id = (select auth.uid()) and activo and nivel = 'maestro');
$$;

create function public.gth_puede_ver_aviso(p_aviso text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.gth_perfiles p
    where p.user_id = (select auth.uid()) and p.activo
      and (p.nivel = 'maestro'
           or (not exists (select 1 from public.avisos_confidenciales c where c.aviso_id = p_aviso)
               and (p.avisos is null or p_aviso = any (p.avisos)))));
$$;

-- El propio usuario apaga el aviso de contraseña temporal después de cambiarla.
create function public.gth_clave_cambiada() returns void
language sql security definer set search_path = '' as $$
  update public.gth_perfiles set debe_cambiar_clave = false, actualizado_at = now()
  where user_id = (select auth.uid());
$$;

revoke execute on function public.gth_es_maestro(), public.gth_puede_ver_aviso(text), public.gth_clave_cambiada() from public, anon;
grant execute on function public.gth_es_maestro(), public.gth_puede_ver_aviso(text), public.gth_clave_cambiada() to authenticated;

alter table public.gth_perfiles enable row level security;
alter table public.avisos_confidenciales enable row level security;
revoke all on public.gth_perfiles, public.avisos_confidenciales from anon, authenticated;
grant select, update on public.gth_perfiles to authenticated;
grant select, insert, delete on public.avisos_confidenciales to authenticated;

create policy perfiles_lectura on public.gth_perfiles for select to authenticated
  using (user_id = (select auth.uid()) or public.gth_es_maestro());
create policy perfiles_edicion on public.gth_perfiles for update to authenticated
  using (public.gth_es_maestro()) with check (public.gth_es_maestro());
create policy confidenciales_lectura on public.avisos_confidenciales for select to authenticated
  using (public.gth_es_maestro());
create policy confidenciales_marcar on public.avisos_confidenciales for insert to authenticated
  with check (public.gth_es_maestro());
create policy confidenciales_desmarcar on public.avisos_confidenciales for delete to authenticated
  using (public.gth_es_maestro());

-- Un maestro no puede quitarse a sí mismo el nivel ni desactivarse (evita quedarse sin administradores).
create function public.gth_proteger_perfil() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.user_id = auth.uid() and (new.nivel <> old.nivel or new.activo <> old.activo) then
    raise exception 'No puedes cambiar tu propio nivel ni desactivar tu cuenta';
  end if;
  if new.user_id <> old.user_id or new.email <> old.email then raise exception 'Campo no editable'; end if;
  new.actualizado_at := now();
  return new;
end; $$;
create trigger proteger_perfil before update on public.gth_perfiles
  for each row execute function public.gth_proteger_perfil();

-- Políticas restrictivas: se suman (AND) a las que ya tiene cada tabla, sin reemplazarlas.
create policy aviso_visible on public.avisos as restrictive for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));
create policy aviso_visible on public.postulaciones as restrictive for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));
create policy aviso_visible on public.cvs as restrictive for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));
create policy aviso_visible on public.ranking_embeddings as restrictive for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));
create policy aviso_visible on public.en_revision as restrictive for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));
create policy aviso_visible on public.comentarios_internos as restrictive for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));
create policy aviso_visible on public.gth_avance as restrictive for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));
create policy aviso_visible on public.gth_acciones as restrictive for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));
create policy aviso_visible on public.scrape_runs as restrictive for all to authenticated
  using (aviso_id is null or public.gth_puede_ver_aviso(aviso_id));
create policy aviso_visible on public.solicitudes as restrictive for all to authenticated
  using (aviso_id is null or public.gth_puede_ver_aviso(aviso_id))
  with check (aviso_id is null or public.gth_puede_ver_aviso(aviso_id));

-- Los usuarios que ya existían quedan como maestros para no perder el acceso al aplicar la migración.
insert into public.gth_perfiles (user_id, email, nivel, debe_cambiar_clave)
select id, email, 'maestro', false from auth.users
on conflict do nothing;

commit;
