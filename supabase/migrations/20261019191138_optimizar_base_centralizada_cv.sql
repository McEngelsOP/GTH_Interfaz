-- ETAPA-I: corrige búsquedas repetidas de CV al agrupar la Base centralizada.
-- Aplicar en el proyecto GTH usado por la web, después de las migraciones existentes.
-- Conserva SECURITY INVOKER, permisos y RLS; no modifica postulantes ni límites de ejecución.
begin;

create or replace view public.v_base_postulantes
with (security_invoker = true) as             -- respeta el RLS de las tablas (solo usuarios con sesión)
with cvs_visibles as materialized (
  select aviso_id, documento, lower(email) as correo, card_id, drive_url, estado
  from public.cvs
), cvs_por_identidad as materialized (
  select aviso_id, tipo, identidad,
    (array_agg(drive_url order by card_id) filter (where drive_url is not null))[1] as cv_url,
    bool_or(estado = 'sin_adjunto') as sin_cv
  from (
    select aviso_id, 'doc' as tipo, documento as identidad, card_id, drive_url, estado
    from cvs_visibles where documento <> ''
    union all
    select aviso_id, 'mail' as tipo, correo as identidad, card_id, drive_url, estado
    from cvs_visibles where correo <> ''
  ) c group by aviso_id, tipo, identidad
)
select md5(p.clave)                                          as persona_id,
       p.aviso_id,
       a.titulo                                              as aviso_titulo,
       a.detalle_json -> 'migas' ->> 1                       as aviso_area,
       p.id_postulante,
       initcap(trim(p.nombre))                               as nombre,
       initcap(trim(p.apellido))                             as apellido,
       nullif(p.email, '')                                   as email,
       nullif(p.datos_json ->> 'Teléfono celular', '')       as telefono,
       nullif(p.datos_json ->> 'Fecha Postulación', '')      as fecha_postulacion,
       coalesce(nullif(p.datos_json ->> 'Ciudad', ''), nullif(p.datos_json ->> 'Lugar de residencia', '')) as ciudad,
       nullif(p.datos_json ->> 'Exp[1] Puesto', '')          as puesto_actual,
       nullif(p.datos_json ->> 'Exp[1] Empresa', '')         as empresa_actual,
       nullif(p.datos_json ->> 'Exp[1] Area', '')            as area_experiencia,
       est.titulo                                            as estudio,        -- el de mayor nivel, no el último
       est.nivel                                             as nivel_estudio,
       est.estado                                            as estado_estudio,
       est.institucion                                       as institucion,
       nullif(p.datos_json ->> 'Idiomas', '')                as idiomas,
       coalesce(doc.cv_url, mail.cv_url)                      as cv_url,
       (coalesce(doc.sin_cv,false) or coalesce(mail.sin_cv,false)) as sin_cv
from public.postulaciones p
join public.avisos a on a.aviso_id = p.aviso_id
left join cvs_por_identidad doc on doc.aviso_id = p.aviso_id and doc.tipo = 'doc'
  and p.documento <> '' and doc.identidad = p.documento
left join cvs_por_identidad mail on mail.aviso_id = p.aviso_id and mail.tipo = 'mail'
  and p.email <> '' and mail.identidad = p.email
left join lateral (
  select e.value as nivel,
         nullif(p.datos_json ->> replace(e.key, 'Nivel', 'Titulo'), '')      as titulo,
         nullif(p.datos_json ->> replace(e.key, 'Nivel', 'Estado'), '')      as estado,
         nullif(p.datos_json ->> replace(e.key, 'Nivel', 'Institucion'), '') as institucion
  from jsonb_each_text(p.datos_json) e
  where e.key like 'Est[%] Nivel' and e.value <> ''
  order by case e.value when 'Doctorado' then 7 when 'Master' then 6 when 'Posgrado' then 5 when 'Universitario' then 4
                        when 'Terciario/Técnico' then 3 when 'Secundario' then 2 else 1 end desc, e.key
  limit 1) est on true
where p.en_ultimo_csv = 1;


notify pgrst, 'reload schema';
commit;
