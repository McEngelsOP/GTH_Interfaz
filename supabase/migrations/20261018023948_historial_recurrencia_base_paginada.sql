-- Historial y recurrencia sobre todas las postulaciones guardadas, no solo el último CSV.
-- Todas las vistas y funciones consultan como el usuario: también los conteos respetan RLS.
create function public.gth_documento(text) returns text
language sql immutable parallel safe security invoker set search_path = '' as $$
  select nullif(regexp_replace(upper(trim($1)), '[^A-Z0-9]', '', 'g'), '');
$$;

create function public.gth_fecha(text) returns date
language plpgsql immutable parallel safe security invoker set search_path = '' as $$
begin
  if $1 ~ '^\d{4}-\d{2}-\d{2}' then return left($1, 10)::date; end if;
  if $1 ~ '^\d{1,2}/\d{1,2}/\d{4}' then
    return make_date(left(split_part($1,'/',3),4)::integer, split_part($1,'/',2)::integer, split_part($1,'/',1)::integer);
  end if;
  return null;
exception when others then return null;
end; $$;

create function public.gth_sin_tildes(text) returns text
language sql immutable parallel safe security invoker set search_path = '' as $$
  select translate(lower(coalesce($1,'')), 'áéíóúüñ', 'aeiouun');
$$;

create function public.gth_nivel_estudio(text) returns integer
language sql immutable parallel safe security invoker set search_path = '' as $$
  select coalesce(array_position(array['Doctorado','Master','Posgrado','Universitario','Terciario/Técnico','Secundario','Curso','Otro'], $1), 9);
$$;

create schema if not exists gth_interno;
revoke all on schema gth_interno from public,anon;
grant usage on schema gth_interno to authenticated;

create view gth_interno.identidades with (security_invoker = true) as
with normalizadas as materialized (
  select p.*, public.gth_documento(p.documento) as doc, nullif(lower(trim(p.email)), '') as mail
  from public.postulaciones p
), correos as (
  select mail, min(doc) as doc, count(distinct doc) as documentos
  from normalizadas where mail is not null group by mail
)
select n.*,
  md5(case
    when n.doc is not null then 'DOC:' || n.doc
    when c.documentos = 1 then 'DOC:' || c.doc
    when n.mail is not null and coalesce(c.documentos,0) = 0 then 'MAIL:' || n.mail
    else 'FILA:' || n.aviso_id || ':' || n.clave
  end) as persona_id
from normalizadas n left join correos c on c.mail = n.mail;

create function public.gth_historial_postulaciones(p_aviso_id text, p_id_postulante text)
returns table(aviso_id text, titulo text, fecha date, score double precision, backend text, criterios_version text)
language sql stable security invoker set search_path = '' as $$
  with persona as (
    select persona_id from gth_interno.identidades
    where aviso_id = p_aviso_id and id_postulante = p_id_postulante
  ), postulaciones as (
    select distinct on (p.aviso_id) p.*
    from gth_interno.identidades p
    where p.persona_id in (select persona_id from persona)
    order by p.aviso_id, public.gth_fecha(p.fecha_postulacion) desc nulls last, p.actualizado_at desc nulls last, p.clave
  )
  select p.aviso_id, a.titulo, public.gth_fecha(p.fecha_postulacion), r.score, r.backend, r.criterios_version
  from postulaciones p join public.avisos a on a.aviso_id = p.aviso_id
  left join lateral (
    select r.score,r.backend,r.criterios_version from public.ranking_embeddings r
    where r.aviso_id = p.aviso_id and r.clave = p.clave
      and (a.criterios_version is null or r.criterios_version = a.criterios_version)
    order by r.calculado_at desc nulls last limit 1
  ) r on true
  order by public.gth_fecha(p.fecha_postulacion) desc nulls last, p.aviso_id;
$$;

create function public.gth_resumen_postulaciones(p_aviso_id text, p_ids text[])
returns table(id_postulante text, total integer)
language sql stable security invoker set search_path = '' as $$
  with identidades as materialized (select persona_id,aviso_id,id_postulante from gth_interno.identidades),
  seleccion as (select distinct id_postulante,persona_id from identidades
    where aviso_id = p_aviso_id and id_postulante = any(p_ids)),
  conteos as (select persona_id, count(distinct aviso_id)::integer as total from identidades
    where persona_id in (select persona_id from seleccion) group by persona_id)
  select s.id_postulante,c.total from seleccion s join conteos c using(persona_id);
$$;

-- La agrupación se hace ANTES de filtrar y paginar, por lo que una persona no queda partida entre páginas.
create view public.v_gth_personas_base with (security_invoker = true) as
with filas as materialized (
  select distinct on (i.persona_id,b.aviso_id) b.*, i.persona_id as identidad,
    coalesce(public.gth_fecha(b.fecha_postulacion),public.gth_fecha(i.fecha_postulacion)) as fecha,
    (select string_agg(case when ord > 1 and lower(palabra) = any(array['de','del','la','las','los','y']) then lower(palabra) else initcap(palabra) end,' ' order by ord) from regexp_split_to_table(regexp_replace(trim(b.ciudad),'[.\s]+$','','g'),'\s+') with ordinality t(palabra,ord)) as ciudad_normalizada
  from public.v_base_postulantes b join gth_interno.identidades i
    on i.aviso_id = b.aviso_id and md5(i.clave) = b.persona_id
  order by i.persona_id,b.aviso_id,i.actualizado_at desc nulls last,i.clave
), grupos as (
  select identidad,
    (jsonb_agg(to_jsonb(f) order by fecha desc nulls last,aviso_id)->0) as reciente,
    (jsonb_agg(to_jsonb(f) order by public.gth_nivel_estudio(nivel_estudio),fecha desc nulls last,aviso_id)->0) as estudios,
    (array_agg(cv_url order by fecha desc nulls last,aviso_id) filter (where cv_url is not null))[1] as cv_url,
    bool_or(sin_cv) as sin_cv,
    jsonb_agg(jsonb_build_object('id',aviso_id,'titulo',coalesce(aviso_titulo,aviso_id),'area',aviso_area,'fecha',fecha)
      order by fecha desc nulls last,aviso_id) as avisos
  from filas f group by identidad
)
select identidad as id,
  coalesce(nullif(trim(concat_ws(' ',reciente->>'nombre',reciente->>'apellido')),''),reciente->>'id_postulante','Postulante') as nombre,
  reciente->>'email' as email, reciente->>'telefono' as telefono, reciente->>'ciudad_normalizada' as ciudad,
  reciente->>'puesto_actual' as puesto, reciente->>'empresa_actual' as empresa, reciente->>'area_experiencia' as "areaExperiencia",
  estudios->>'estudio' as estudio, estudios->>'nivel_estudio' as "nivelEstudio", estudios->>'estado_estudio' as "estadoEstudio", estudios->>'institucion' as institucion,
  coalesce((select jsonb_agg(jsonb_build_object('idioma',trim(split_part(x,' - ',1)), 'nivel',trim(split_part(x,' - ',2))))
    from unnest(string_to_array(reciente->>'idiomas','/')) x where trim(x) <> ''),'[]'::jsonb) as idiomas,
  (reciente->>'fecha')::date as "ultimaPostulacion", avisos,
  jsonb_build_object('estado',case when cv_url is not null then 'disponible' when sin_cv then 'sin_adjunto' else 'pendiente' end,
    'enlace',cv_url,'vista',case when cv_url ~ 'drive.google.com/file/d/[^/]+'
       then 'https://drive.google.com/file/d/' || substring(cv_url from '/file/d/([^/]+)') || '/preview' else null end) as cv
from grupos;

create function public.gth_base_centralizada(p_filtros jsonb default '{}', p_pagina integer default 1,
  p_por_pagina integer default 50, p_incluir_resumen boolean default true)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with personas as materialized (select * from public.v_gth_personas_base),
  filtradas as materialized (
    select p.* from personas p where
      (coalesce(p_filtros->>'texto','') = '' or position(public.gth_sin_tildes(trim(p_filtros->>'texto')) in
        public.gth_sin_tildes(concat_ws(' ',nombre,puesto,empresa,estudio,institucion,"areaExperiencia"))) > 0)
      and (coalesce(p_filtros->>'aviso','') = '' or exists(select 1 from jsonb_array_elements(avisos) a where a->>'id' = p_filtros->>'aviso'))
      and (coalesce(p_filtros->>'area','') = '' or exists(select 1 from jsonb_array_elements(avisos) a where a->>'area' = p_filtros->>'area'))
      and (coalesce(p_filtros->>'nivel','') = '' or public.gth_nivel_estudio("nivelEstudio") <= public.gth_nivel_estudio(p_filtros->>'nivel'))
      and (coalesce(p_filtros->>'estado','') = '' or "estadoEstudio" = p_filtros->>'estado')
      and (coalesce(p_filtros->>'ciudad','') = '' or ciudad = p_filtros->>'ciudad')
      and (coalesce(p_filtros->>'desde','') = '' or "ultimaPostulacion" >= public.gth_fecha(p_filtros->>'desde'))
      and (coalesce(p_filtros->>'cv','') = '' or (p_filtros->>'cv' = 'con' and cv->>'estado' = 'disponible')
        or (p_filtros->>'cv' = 'sin' and cv->>'estado' <> 'disponible'))
      and (coalesce(p_filtros->>'varios','false') <> 'true' or jsonb_array_length(avisos) > 1)
      and (coalesce(p_filtros->>'idioma','') = '' or exists(select 1 from jsonb_array_elements(idiomas) i
        where i->>'idioma' = p_filtros->>'idioma' and (coalesce(p_filtros->>'nivelIdioma','') = ''
          or array_position(array['Básico','Intermedio','Avanzado','Nativo'],i->>'nivel') >=
             array_position(array['Básico','Intermedio','Avanzado','Nativo'],p_filtros->>'nivelIdioma'))))
  ), pagina as (
    select * from filtradas order by "ultimaPostulacion" desc nulls last,nombre,id
    limit least(greatest(p_por_pagina,1),500) offset ((greatest(p_pagina,1)::bigint-1)*least(greatest(p_por_pagina,1),500))
  )
  select jsonb_build_object('personas',coalesce((select jsonb_agg(to_jsonb(p)) from pagina p),'[]'::jsonb),
    'total',(select count(*) from filtradas),
    'resumen',case when p_incluir_resumen then (select jsonb_build_object('personas',count(*),
      'postulaciones',coalesce(sum(jsonb_array_length(avisos)),0),
      'recurrentes',count(*) filter(where jsonb_array_length(avisos)>1)) from personas) end,
    'opciones',case when p_incluir_resumen then jsonb_build_object(
      'avisos',coalesce((select jsonb_agg(jsonb_build_array(id,titulo) order by titulo,id)
        from (select distinct a->>'id' as id,a->>'titulo' as titulo from personas,jsonb_array_elements(avisos) a) x),'[]'::jsonb),
      'areas',coalesce((select jsonb_agg(v order by v) from (select distinct a->>'area' as v from personas,jsonb_array_elements(avisos) a where nullif(a->>'area','') is not null) x),'[]'::jsonb),
      'ciudades',coalesce((select jsonb_agg(v order by v) from (select distinct ciudad as v from personas where nullif(ciudad,'') is not null) x),'[]'::jsonb),
      'idiomas',coalesce((select jsonb_agg(v order by v) from (select distinct i->>'idioma' as v from personas,jsonb_array_elements(idiomas) i where nullif(i->>'idioma','') is not null) x),'[]'::jsonb)
    ) end);
$$;

create index if not exists ix_gth_post_documento on public.postulaciones(public.gth_documento(documento)) where documento is not null;
create index if not exists ix_gth_post_correo on public.postulaciones(lower(trim(email))) where email is not null;
create index if not exists ix_gth_post_fecha on public.postulaciones(public.gth_fecha(fecha_postulacion) desc, aviso_id);

revoke all on gth_interno.identidades,public.v_gth_personas_base from public,anon;
-- La identidad con documentos queda en un esquema no expuesto por la Data API.
-- SECURITY INVOKER necesita permisos de las vistas subyacentes; RLS sigue siendo obligatorio.
grant select on gth_interno.identidades,public.v_gth_personas_base to authenticated;
grant select on public.avisos,public.postulaciones,public.cvs,public.ranking_embeddings to authenticated;
revoke execute on function public.gth_documento(text), public.gth_fecha(text), public.gth_sin_tildes(text), public.gth_nivel_estudio(text),
  public.gth_historial_postulaciones(text,text),public.gth_resumen_postulaciones(text,text[]),public.gth_base_centralizada(jsonb,integer,integer,boolean) from public,anon;
grant execute on function public.gth_documento(text), public.gth_fecha(text), public.gth_sin_tildes(text), public.gth_nivel_estudio(text),
  public.gth_historial_postulaciones(text,text),public.gth_resumen_postulaciones(text,text[]),public.gth_base_centralizada(jsonb,integer,integer,boolean) to authenticated;
notify pgrst,'reload schema';
