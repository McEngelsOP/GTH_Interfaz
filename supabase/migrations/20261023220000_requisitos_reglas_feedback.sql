-- Requisitos con peso por aviso, reglas de puntaje, su activación por aviso y feedback del ranking.
-- Aplicar en GTH_Bumeran después de superadministracion_y_sueldos. Solo agrega tablas y columnas vacías:
-- la web y el scraper actuales no las usan todavía (siguen con avisos.criterios y pesos iguales).
-- Sin FK a avisos, como gth_sueldos_ofertados: también admite convocatorias creadas manualmente.
-- El scraper entra con el rol postgres y no pasa por RLS.
begin;

-- Requisitos de cada aviso con su peso entero. Los activos de un aviso suman exactamente 100.
-- Los requisitos escritos a mano para una convocatoria van aquí con origen 'manual'.
create table public.gth_aviso_requisitos (
  id uuid primary key default gen_random_uuid(),
  aviso_id text not null check (length(aviso_id) between 1 and 250),
  etiqueta text not null check (length(btrim(etiqueta)) between 1 and 500),
  peso integer not null check (peso between 0 and 100),
  activo boolean not null default true,
  origen text not null default 'manual' check (origen in ('bumeran','manual')),
  orden integer not null default 0,
  actualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  actualizado_at timestamptz not null default now(),
  unique (aviso_id, etiqueta)
);
create index ix_aviso_requisitos_aviso on public.gth_aviso_requisitos(aviso_id, orden);

-- Catálogo de reglas que crean los usuarios. La descripción se compara con el CV como un requisito;
-- si cumple, se aplica el efecto con su valor (porcentaje entero).
create table public.gth_reglas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 1 and 120),
  descripcion text not null check (length(btrim(descripcion)) between 1 and 2000),
  efecto text not null check (efecto in ('bono','penalizacion','alerta')),
  valor integer not null default 0 check (valor between 0 and 100),
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado_at timestamptz not null default now(),
  actualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  actualizado_at timestamptz not null default now()
);

-- Reglas activadas a mano en cada aviso. Sin fila = la regla no aplica a ese aviso.
-- valor null = usa el valor del catálogo; con número, lo reemplaza solo en este aviso.
create table public.gth_aviso_reglas (
  aviso_id text not null check (length(aviso_id) between 1 and 250),
  regla_id uuid not null references public.gth_reglas(id) on delete cascade,
  activa boolean not null default true,
  valor integer check (valor is null or valor between 0 and 100),
  actualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  actualizado_at timestamptz not null default now(),
  primary key (aviso_id, regla_id)
);
create index ix_aviso_reglas_regla on public.gth_aviso_reglas(regla_id);

-- Feedback del equipo sobre el ranking: «no lo escogimos por…». Texto libre, para afinar reglas y pesos.
create table public.gth_feedback_ranking (
  id bigint generated always as identity primary key,
  aviso_id text not null check (length(aviso_id) between 1 and 250),
  id_postulante text not null check (length(id_postulante) between 1 and 250),
  posicion_sistema integer check (posicion_sistema is null or posicion_sistema > 0),
  decision text not null check (decision in ('no_escogido','escogido')),
  motivo text not null check (length(btrim(motivo)) between 1 and 4000),
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado_at timestamptz not null default now()
);
create index ix_feedback_ranking_postulante on public.gth_feedback_ranking(aviso_id, id_postulante);

-- Puntaje con reglas aplicadas y su detalle. score conserva el puntaje puro de embeddings.
alter table public.ranking_embeddings add column if not exists score_reglas double precision;
alter table public.ranking_embeddings add column if not exists ajustes jsonb;

-- ------------------------------------------------------------------ sellos y validaciones
create function gth_privado.sello_por_aviso() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and new.aviso_id <> old.aviso_id then raise exception 'El aviso no es editable'; end if;
  new.actualizado_por := auth.uid(); new.actualizado_at := now();
  return new;
end; $$;

create function gth_privado.sello_regla() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then new.creado_por := auth.uid(); new.creado_at := now();
  else new.creado_por := old.creado_por; new.creado_at := old.creado_at; end if;
  new.actualizado_por := auth.uid(); new.actualizado_at := now();
  return new;
end; $$;

create function gth_privado.sello_feedback() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then new.creado_por := auth.uid(); new.creado_at := now();
  elsif new.aviso_id <> old.aviso_id or new.id_postulante <> old.id_postulante then
    raise exception 'El aviso y el postulante no son editables';
  else new.creado_por := old.creado_por; new.creado_at := old.creado_at; end if;
  return new;
end; $$;

-- Se revisa al cerrar la transacción: un guardado puede mover varios pesos a la vez.
create function gth_privado.validar_pesos_aviso() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  v_aviso text := coalesce(new.aviso_id, old.aviso_id);
  v_total integer; v_activos integer; v_suma integer;
begin
  select count(*), count(*) filter (where activo), coalesce(sum(peso) filter (where activo), 0)
    into v_total, v_activos, v_suma
    from public.gth_aviso_requisitos where aviso_id = v_aviso;
  if v_total > 0 and v_activos = 0 then
    raise exception 'El aviso % debe tener al menos un requisito activo', v_aviso;
  end if;
  if v_activos > 0 and v_suma <> 100 then
    raise exception 'Los pesos activos del aviso % suman % y deben sumar 100', v_aviso, v_suma;
  end if;
  return null;
end; $$;

revoke all on function gth_privado.sello_por_aviso(), gth_privado.sello_regla(), gth_privado.sello_feedback(),
  gth_privado.validar_pesos_aviso() from public, anon;

create trigger sello_aviso_requisito before insert or update on public.gth_aviso_requisitos
  for each row execute function gth_privado.sello_por_aviso();
create constraint trigger pesos_suman_100 after insert or update or delete on public.gth_aviso_requisitos
  deferrable initially deferred for each row execute function gth_privado.validar_pesos_aviso();
create trigger sello_regla before insert or update on public.gth_reglas
  for each row execute function gth_privado.sello_regla();
create trigger sello_aviso_regla before insert or update on public.gth_aviso_reglas
  for each row execute function gth_privado.sello_por_aviso();
create trigger sello_feedback before insert or update on public.gth_feedback_ranking
  for each row execute function gth_privado.sello_feedback();

-- ------------------------------------------------------------------ seguridad (RLS)
-- Todos los usuarios con sesión trabajan sobre los avisos que pueden ver (gth_puede_ver_aviso).
-- El catálogo de reglas no depende de un aviso: por ahora lo edita cualquier usuario con sesión.
alter table public.gth_aviso_requisitos enable row level security;
alter table public.gth_reglas enable row level security;
alter table public.gth_aviso_reglas enable row level security;
alter table public.gth_feedback_ranking enable row level security;
revoke all on public.gth_aviso_requisitos, public.gth_reglas, public.gth_aviso_reglas, public.gth_feedback_ranking
  from public, anon, authenticated;
grant select, insert, update, delete on public.gth_aviso_requisitos, public.gth_reglas, public.gth_aviso_reglas,
  public.gth_feedback_ranking to authenticated;
grant all on public.gth_aviso_requisitos, public.gth_reglas, public.gth_aviso_reglas, public.gth_feedback_ranking
  to service_role;

create policy requisitos_por_aviso on public.gth_aviso_requisitos for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));

create policy reglas_libres on public.gth_reglas for all to authenticated
  using (true) with check (true);

create policy reglas_por_aviso on public.gth_aviso_reglas for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));

-- Cada uno edita o borra solo su propio feedback.
create policy feedback_lectura on public.gth_feedback_ranking for select to authenticated
  using (public.gth_puede_ver_aviso(aviso_id));
create policy feedback_alta on public.gth_feedback_ranking for insert to authenticated
  with check (public.gth_puede_ver_aviso(aviso_id));
create policy feedback_edicion on public.gth_feedback_ranking for update to authenticated
  using (creado_por = (select auth.uid()) and public.gth_puede_ver_aviso(aviso_id))
  with check (public.gth_puede_ver_aviso(aviso_id));
create policy feedback_borrado on public.gth_feedback_ranking for delete to authenticated
  using (creado_por = (select auth.uid()) and public.gth_puede_ver_aviso(aviso_id));

commit;
