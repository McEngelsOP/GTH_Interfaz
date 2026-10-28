-- 1) «Recalcular puntaje» solo con cambios: hora de la última edición de las calibraciones de cada aviso (Requisitos y
--    pesos, Criterios y pesos, Sueldo), incluidos los borrados. La web lo compara con el último recálculo exitoso.
-- 2) Red flag / green flag en los comentarios internos: un comentario puede tener solo la bandera, sin texto.
-- No modifica datos existentes.
begin;
create table if not exists public.gth_aviso_calibracion (
  aviso_id    text primary key check (length(aviso_id) between 1 and 250),
  editado_at  timestamptz not null default now()
);
alter table public.gth_aviso_calibracion enable row level security;
create policy calibracion_lectura on public.gth_aviso_calibracion for select to authenticated
  using (public.gth_puede_ver_aviso(aviso_id));
revoke all on public.gth_aviso_calibracion from anon, authenticated;
grant select on public.gth_aviso_calibracion to authenticated;
grant all on public.gth_aviso_calibracion to service_role;

-- Solo la escriben los disparadores (security definer): la web no la edita directamente.
create or replace function gth_privado.marcar_calibracion() returns trigger
language plpgsql security definer set search_path = '' as $$
declare aviso text := coalesce(new.aviso_id, old.aviso_id);
begin
  insert into public.gth_aviso_calibracion (aviso_id, editado_at) values (aviso, now())
    on conflict (aviso_id) do update set editado_at = excluded.editado_at;
  return null;
end; $$;
revoke all on function gth_privado.marcar_calibracion() from public, anon;
grant execute on function gth_privado.marcar_calibracion() to authenticated;

drop trigger if exists calibracion_requisitos on public.gth_aviso_requisitos;
create trigger calibracion_requisitos after insert or update or delete on public.gth_aviso_requisitos
  for each row execute function gth_privado.marcar_calibracion();
drop trigger if exists calibracion_criterios on public.gth_aviso_criterios;
create trigger calibracion_criterios after insert or update or delete on public.gth_aviso_criterios
  for each row execute function gth_privado.marcar_calibracion();
drop trigger if exists calibracion_sueldo on public.gth_sueldos_ofertados;
create trigger calibracion_sueldo after insert or update or delete on public.gth_sueldos_ofertados
  for each row execute function gth_privado.marcar_calibracion();

alter table public.comentarios_internos add column if not exists bandera text check (bandera in ('roja', 'verde'));
alter table public.comentarios_internos drop constraint if exists comentarios_internos_texto_check;
alter table public.comentarios_internos add constraint comentarios_internos_texto_check
  check (length(btrim(texto)) <= 4000 and (length(btrim(texto)) >= 1 or bandera is not null));
commit;
