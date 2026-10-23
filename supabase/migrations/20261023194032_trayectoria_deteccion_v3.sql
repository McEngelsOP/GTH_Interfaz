-- Aplicar después de trayectoria_fechas_v2. Conserva snapshots y revisiones anteriores.
-- Actualizar el scraper y ejecutar --solo-trayectoria para generar trayectoria-v3.
begin;

create or replace function public.gth_trayectoria_campo_valido(p_nombre text) returns boolean
language sql immutable parallel safe security invoker set search_path='' as $$
  select btrim(regexp_replace(translate(normalize(p_nombre, NFC),
    'ÁÉÍÓÚÜÑáéíóúüñABCDEFGHIJKLMNOPQRSTUVWXYZ', 'AEIOUUNaeiouunabcdefghijklmnopqrstuvwxyz'),
    U&'[ \0009\000A\000D\000C\000B\00A0\202F\FEFF]+', ' ', 'g'))
    ~ '^exp *\[ *[0-9]+ *\] +(empresa|puesto|descripcion|modalidad|tipo de contrato|tipo de empleo|fecha (de )?(inicio|ingreso|fin|termino|finalizacion|egreso))$';
$$;

create or replace function public.gth_trayectoria_huella(p_datos jsonb) returns text
language sql immutable parallel safe security invoker set search_path='' as $$
  select md5(coalesce(string_agg(length(key)::text || ':' || key || length(value)::text || ':' || value,
    '' order by key collate "C"),'')) from jsonb_each_text(p_datos)
  where value is not null and public.gth_trayectoria_campo_valido(key);
$$;

alter policy trayectoria_revision_insertar on public.gth_trayectoria_revisiones to authenticated
  with check (autor=(select auth.uid()) and exists (
    select 1 from public.gth_trayectoria_analisis a join public.postulaciones p
      on p.aviso_id=a.aviso_id and p.clave=a.clave
    where a.id=analisis_id and a.version='trayectoria-v3'
      and a.huella=public.gth_trayectoria_huella(p.datos_json)
      and p.en_ultimo_csv=1 and (a.vigente_hasta is null or a.vigente_hasta>=current_date)
      and not exists(select 1 from public.gth_trayectoria_analisis nueva
        where nueva.aviso_id=a.aviso_id and nueva.clave=a.clave and nueva.version=a.version
          and nueva.huella=a.huella and (nueva.fecha_referencia,nueva.calculado_at,nueva.id)>(a.fecha_referencia,a.calculado_at,a.id))));

create or replace function public.gth_trayectoria_resumen(p_aviso text,p_desde integer default 0)
returns table(id_postulante text,analisis_id uuid,estado text,calculado_at timestamptz,revision text)
language sql stable security invoker set search_path='' as $$
  select p.id_postulante,a.id,
    case when a.id is null then 'pendiente'
      when a.huella<>public.gth_trayectoria_huella(p.datos_json) or a.version<>'trayectoria-v3'
        or a.vigente_hasta<current_date then 'desactualizado' else a.estado end,
    a.calculado_at,
    (select r.estado from public.gth_trayectoria_revisiones r where r.analisis_id=a.id order by r.creada_at desc,r.id desc limit 1)
  from public.postulaciones p
  left join lateral (select a.* from public.gth_trayectoria_analisis a
    where a.aviso_id=p.aviso_id and a.clave=p.clave
    order by (a.huella=public.gth_trayectoria_huella(p.datos_json) and a.version='trayectoria-v3') desc,
      a.fecha_referencia desc,a.calculado_at desc,a.id desc limit 1) a on true
  where p.aviso_id=p_aviso and p.en_ultimo_csv=1 and p.id_postulante is not null
  order by p.id_postulante,p.clave offset greatest(0,p_desde) limit 500;
$$;

revoke execute on function public.gth_trayectoria_campo_valido(text),public.gth_trayectoria_resumen(text,integer) from public,anon;
grant execute on function public.gth_trayectoria_campo_valido(text),public.gth_trayectoria_resumen(text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
