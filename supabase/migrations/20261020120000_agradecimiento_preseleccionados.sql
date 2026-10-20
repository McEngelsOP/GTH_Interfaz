-- «Agradecer a no seleccionados» se envía a quienes rindieron Multitest (Preseleccionado) y no pasaron a Entrevista.
-- Solo cambia qué etapas acepta el agradecimiento; confirmar sigue moviendo a No continúan únicamente a los de Postulado,
-- así que los preseleccionados agradecidos se quedan en su etapa (decisión de GTH, 20/10/2026).
begin;
create or replace function public.gth_preparar_accion(p_aviso text,p_accion text,p_destinatarios jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare x record; actual text;
begin
  if jsonb_array_length(p_destinatarios) = 0 then raise exception 'Seleccion vacia'; end if;
  for x in select * from jsonb_to_recordset(p_destinatarios) as r(id_postulante text,detalle jsonb) order by id_postulante loop
    select etapa into actual from public.gth_avance where aviso_id=p_aviso and id_postulante=x.id_postulante for update;
    if actual is null or not ((p_accion='multitest' and actual='preseleccionado') or (p_accion='entrevista' and actual='en_entrevista') or (p_accion='agradecimiento' and actual in ('postulado','no_continua','preseleccionado'))) then raise exception 'Etapa incompatible'; end if;
    if exists(select 1 from public.gth_acciones where aviso_id=p_aviso and id_postulante=x.id_postulante and estado='preparado') then raise exception 'Comunicacion pendiente'; end if;
    insert into public.gth_acciones(aviso_id,id_postulante,accion,detalle) values(p_aviso,x.id_postulante,p_accion,x.detalle);
  end loop;
end; $$;
revoke execute on function public.gth_preparar_accion(text,text,jsonb) from public,anon;
grant execute on function public.gth_preparar_accion(text,text,jsonb) to authenticated;
commit;
