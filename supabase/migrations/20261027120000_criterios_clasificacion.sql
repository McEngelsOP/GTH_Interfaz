-- «Criterios y pesos» (matriz de clasificación de Andrea): intensidad 0-100 de cada criterio por aviso y la penalización
-- por alta rotación. 50 = peso normal (Experiencia laboral empieza en 100). Sin fila = todos los valores por defecto.
-- El servidor de GTH (scraping/ranking.py) los lee al recalcular. Solo agrega una tabla: no modifica datos.
begin;
create table if not exists public.gth_aviso_criterios (
  aviso_id           text primary key check (length(aviso_id) between 1 and 250),
  experiencia        integer not null default 100 check (experiencia between 0 and 100),
  rotacion           numeric(3,2) not null default 0.50 check (rotacion between 0 and 1),
  rubro              integer not null default 50 check (rubro between 0 and 100),
  sobrecalificacion  integer not null default 50 check (sobrecalificacion between 0 and 100),
  escala_empresa     integer not null default 50 check (escala_empresa between 0 and 100),
  actualizado_por    uuid references auth.users(id) on delete set null default auth.uid(),
  actualizado_at     timestamptz not null default now()
);

create or replace function gth_privado.sello_criterios() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and new.aviso_id <> old.aviso_id then raise exception 'El aviso no es editable'; end if;
  new.actualizado_por := auth.uid(); new.actualizado_at := now();
  return new;
end; $$;
revoke all on function gth_privado.sello_criterios() from public, anon;
create trigger sello_criterios before insert or update on public.gth_aviso_criterios
  for each row execute function gth_privado.sello_criterios();

alter table public.gth_aviso_criterios enable row level security;
-- Todos los que ven el aviso consultan los criterios; los cambia solo la superadministración (como el criterio salarial).
create policy criterios_lectura on public.gth_aviso_criterios for select to authenticated
  using (public.gth_puede_ver_aviso(aviso_id));
create policy criterios_alta on public.gth_aviso_criterios for insert to authenticated
  with check (gth_privado.es_superadmin() and public.gth_puede_ver_aviso(aviso_id));
create policy criterios_edicion on public.gth_aviso_criterios for update to authenticated
  using (gth_privado.es_superadmin() and public.gth_puede_ver_aviso(aviso_id))
  with check (gth_privado.es_superadmin() and public.gth_puede_ver_aviso(aviso_id));
revoke all on public.gth_aviso_criterios from anon, authenticated;
grant select, insert, update on public.gth_aviso_criterios to authenticated;
grant all on public.gth_aviso_criterios to service_role;
commit;
