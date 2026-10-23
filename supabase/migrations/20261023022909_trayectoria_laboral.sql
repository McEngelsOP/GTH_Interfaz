-- Aplicar después de niveles_acceso. El scraper escribe; la web consulta y revisa.
begin;

create function public.gth_trayectoria_huella(p_datos jsonb) returns text
language sql immutable parallel safe security invoker set search_path='' as $$
  select md5(coalesce(string_agg(length(key)::text || ':' || key || length(value)::text || ':' || value,
    '' order by key collate "C"),'')) from jsonb_each_text(p_datos)
  where value is not null and key ~ '^Exp\[[0-9]+\] (Empresa|Puesto|Fecha Inicio|Fecha Fin|Descripci[oó]n|Modalidad|Tipo de contrato|Tipo de empleo)$';
$$;

create table public.gth_trayectoria_analisis (
  id uuid primary key default gen_random_uuid(),
  aviso_id text not null,
  clave text not null,
  id_postulante text,
  huella text not null check (huella ~ '^[0-9a-f]{32}$'),
  version text not null,
  estado text not null check (estado in ('patron_detectado','sin_patron','informacion_insuficiente','no_aplica')),
  fecha_referencia date not null,
  vigente_hasta date,
  calculado_at timestamptz not null default now(),
  detalle jsonb not null check (jsonb_typeof(detalle)='object'),
  foreign key(aviso_id,clave) references public.postulaciones(aviso_id,clave) on delete cascade,
  unique(aviso_id,clave,huella,version,fecha_referencia)
);
create index gth_trayectoria_aviso on public.gth_trayectoria_analisis(aviso_id,clave,fecha_referencia desc,calculado_at desc);

create table public.gth_trayectoria_revisiones (
  id uuid primary key default gen_random_uuid(),
  analisis_id uuid not null references public.gth_trayectoria_analisis(id) on delete cascade,
  autor uuid default auth.uid() references auth.users(id) on delete set null,
  estado text not null check (estado in ('justificado','dato_incorrecto','revisado')),
  texto text not null check (length(trim(texto)) between 5 and 2000),
  creada_at timestamptz not null default clock_timestamp()
);
create index gth_trayectoria_revision on public.gth_trayectoria_revisiones(analisis_id,creada_at desc,id);

alter table public.gth_trayectoria_analisis enable row level security;
alter table public.gth_trayectoria_revisiones enable row level security;
revoke all on public.gth_trayectoria_analisis,public.gth_trayectoria_revisiones from public,anon,authenticated;
grant select on public.gth_trayectoria_analisis,public.gth_trayectoria_revisiones to authenticated;
grant insert(analisis_id,estado,texto) on public.gth_trayectoria_revisiones to authenticated;

create policy trayectoria_lectura on public.gth_trayectoria_analisis for select to authenticated
  using (public.gth_puede_ver_aviso(aviso_id));
create policy trayectoria_revision_lectura on public.gth_trayectoria_revisiones for select to authenticated
  using (exists(select 1 from public.gth_trayectoria_analisis a where a.id=analisis_id));
create policy trayectoria_revision_insertar on public.gth_trayectoria_revisiones for insert to authenticated
  with check (autor=(select auth.uid()) and exists (
    select 1 from public.gth_trayectoria_analisis a join public.postulaciones p
      on p.aviso_id=a.aviso_id and p.clave=a.clave
    where a.id=analisis_id and a.version='trayectoria-v1'
      and a.huella=public.gth_trayectoria_huella(p.datos_json)
      and p.en_ultimo_csv=1 and (a.vigente_hasta is null or a.vigente_hasta>=current_date)
      and not exists(select 1 from public.gth_trayectoria_analisis nueva
        where nueva.aviso_id=a.aviso_id and nueva.clave=a.clave and nueva.version=a.version
          and nueva.huella=a.huella and (nueva.fecha_referencia,nueva.calculado_at,nueva.id)>(a.fecha_referencia,a.calculado_at,a.id))));

-- Resumen paginado, sin cronologías completas y sin una llamada por candidato.
create function public.gth_trayectoria_resumen(p_aviso text,p_desde integer default 0)
returns table(id_postulante text,analisis_id uuid,estado text,calculado_at timestamptz,revision text)
language sql stable security invoker set search_path='' as $$
  select p.id_postulante,a.id,
    case when a.id is null then 'pendiente'
      when a.huella<>public.gth_trayectoria_huella(p.datos_json) or a.version<>'trayectoria-v1'
        or a.vigente_hasta<current_date then 'desactualizado' else a.estado end,
    a.calculado_at,
    (select r.estado from public.gth_trayectoria_revisiones r where r.analisis_id=a.id order by r.creada_at desc,r.id desc limit 1)
  from public.postulaciones p
  left join lateral (select a.* from public.gth_trayectoria_analisis a
    where a.aviso_id=p.aviso_id and a.clave=p.clave
    order by (a.huella=public.gth_trayectoria_huella(p.datos_json) and a.version='trayectoria-v1') desc,
      a.fecha_referencia desc,a.calculado_at desc,a.id desc limit 1) a on true
  where p.aviso_id=p_aviso and p.en_ultimo_csv=1 and p.id_postulante is not null
  order by p.id_postulante,p.clave offset greatest(0,p_desde) limit 500;
$$;

revoke execute on function public.gth_trayectoria_huella(jsonb),public.gth_trayectoria_resumen(text,integer) from public,anon;
grant execute on function public.gth_trayectoria_huella(jsonb),public.gth_trayectoria_resumen(text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
