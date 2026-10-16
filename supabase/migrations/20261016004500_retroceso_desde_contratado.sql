-- Ejecutar en GTH_Bumeran después de avance_compartido.
-- Permite corregir Contratado → En entrevista; conserva comunicaciones y permisos.
begin;
create or replace function public.gth_mover_etapas(p_aviso text,p_cambios jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare x record; actual text; etapas text[] := array['postulado','preseleccionado','en_entrevista','contratado'];
begin
  if jsonb_array_length(p_cambios) = 0 then raise exception 'Seleccion vacia'; end if;
  for x in select * from jsonb_to_recordset(p_cambios) as r(id_postulante text,anterior text,nueva text) order by id_postulante loop
    select etapa into actual from public.gth_avance where aviso_id=p_aviso and id_postulante=x.id_postulante for update;
    if actual is null or actual <> x.anterior or (actual = 'no_continua' or (actual = 'contratado' and x.nueva is distinct from 'en_entrevista')) then raise exception 'El expediente cambio'; end if;
    if exists(select 1 from public.gth_acciones where aviso_id=p_aviso and id_postulante=x.id_postulante and estado='preparado') then raise exception 'Comunicacion pendiente'; end if;
    if x.nueva <> 'no_continua' and (array_position(etapas,x.nueva) is null or abs(array_position(etapas,x.nueva)-array_position(etapas,actual)) <> 1) then raise exception 'Etapa invalida'; end if;
    update public.gth_avance set etapa=x.nueva,actualizado_at=now() where aviso_id=p_aviso and id_postulante=x.id_postulante;
  end loop;
end; $$;

revoke execute on function public.gth_mover_etapas(text,jsonb) from public, anon;
grant execute on function public.gth_mover_etapas(text,jsonb) to authenticated;
commit;
