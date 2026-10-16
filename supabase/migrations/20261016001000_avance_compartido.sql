-- Ejecutar en GTH_Bumeran después de comentarios_internos. Reutiliza gth_colaboradores.
-- No cambia las tablas del scraper ni los rankings.
begin;
create table public.gth_avance (
  aviso_id text not null check (length(aviso_id) between 1 and 250),
  id_postulante text not null check (length(id_postulante) between 1 and 250),
  etapa text not null check (etapa in ('postulado','preseleccionado','en_entrevista','contratado','no_continua')),
  actualizado_at timestamptz not null default now(),
  primary key (aviso_id,id_postulante)
);
create table public.gth_acciones (
  aviso_id text not null,
  id_postulante text not null,
  accion text not null check (accion in ('multitest','agradecimiento','entrevista')),
  estado text not null default 'preparado' check (estado in ('preparado','confirmado')),
  detalle jsonb not null check (octet_length(detalle::text) <= 16000),
  creado_por uuid not null default auth.uid() references auth.users(id),
  creado_at timestamptz not null default now(),
  confirmado_at timestamptz,
  primary key (aviso_id,id_postulante,accion),
  foreign key (aviso_id,id_postulante) references public.gth_avance
);
alter table public.gth_avance enable row level security;
alter table public.gth_acciones enable row level security;
revoke all on public.gth_avance, public.gth_acciones from anon, authenticated;
grant select, insert, update on public.gth_avance to authenticated;
grant select, insert, update, delete on public.gth_acciones to authenticated;
create policy avance_equipo on public.gth_avance for all to authenticated
 using (exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())))
 with check (exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())));
create policy acciones_equipo_lectura on public.gth_acciones for select to authenticated
 using (exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())));
create policy acciones_equipo_insertar on public.gth_acciones for insert to authenticated
 with check (creado_por = (select auth.uid()) and estado = 'preparado' and exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())));
create policy acciones_equipo_confirmar on public.gth_acciones for update to authenticated
 using (creado_por = (select auth.uid()) and estado = 'preparado' and exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())))
 with check (creado_por = (select auth.uid()) and estado = 'confirmado' and exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())));
create policy acciones_equipo_liberar on public.gth_acciones for delete to authenticated
 using (creado_por = (select auth.uid()) and estado = 'preparado' and exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())));

create function public.gth_iniciar_avance(p_aviso text,p_filas jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.gth_avance(aviso_id,id_postulante,etapa)
  select p_aviso,x.id_postulante,x.etapa from jsonb_to_recordset(p_filas) as x(id_postulante text,etapa text)
  order by x.id_postulante on conflict do nothing;
end; $$;

create function public.gth_mover_etapas(p_aviso text,p_cambios jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare x record; actual text; etapas text[] := array['postulado','preseleccionado','en_entrevista','contratado'];
begin
  if jsonb_array_length(p_cambios) = 0 then raise exception 'Seleccion vacia'; end if;
  for x in select * from jsonb_to_recordset(p_cambios) as r(id_postulante text,anterior text,nueva text) order by id_postulante loop
    select etapa into actual from public.gth_avance where aviso_id=p_aviso and id_postulante=x.id_postulante for update;
    if actual is null or actual <> x.anterior or actual in ('contratado','no_continua') then raise exception 'El expediente cambio'; end if;
    if exists(select 1 from public.gth_acciones where aviso_id=p_aviso and id_postulante=x.id_postulante and estado='preparado') then raise exception 'Comunicacion pendiente'; end if;
    if x.nueva <> 'no_continua' and (array_position(etapas,x.nueva) is null or abs(array_position(etapas,x.nueva)-array_position(etapas,actual)) <> 1) then raise exception 'Etapa invalida'; end if;
    update public.gth_avance set etapa=x.nueva,actualizado_at=now() where aviso_id=p_aviso and id_postulante=x.id_postulante;
  end loop;
end; $$;

create function public.gth_preparar_accion(p_aviso text,p_accion text,p_destinatarios jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare x record; actual text;
begin
  if jsonb_array_length(p_destinatarios) = 0 then raise exception 'Seleccion vacia'; end if;
  for x in select * from jsonb_to_recordset(p_destinatarios) as r(id_postulante text,detalle jsonb) order by id_postulante loop
    select etapa into actual from public.gth_avance where aviso_id=p_aviso and id_postulante=x.id_postulante for update;
    if actual is null or not ((p_accion='multitest' and actual='preseleccionado') or (p_accion='entrevista' and actual='en_entrevista') or (p_accion='agradecimiento' and actual in ('postulado','no_continua'))) then raise exception 'Etapa incompatible'; end if;
    if exists(select 1 from public.gth_acciones where aviso_id=p_aviso and id_postulante=x.id_postulante and estado='preparado') then raise exception 'Comunicacion pendiente'; end if;
    insert into public.gth_acciones(aviso_id,id_postulante,accion,detalle) values(p_aviso,x.id_postulante,p_accion,x.detalle);
  end loop;
end; $$;

create function public.gth_finalizar_accion(p_aviso text,p_accion text,p_ids text[],p_cancelar boolean default false) returns void
language plpgsql security invoker set search_path = '' as $$
declare persona text; afectadas integer;
begin
  if cardinality(p_ids)=0 then raise exception 'Seleccion vacia'; end if;
  for persona in select unnest(p_ids) order by 1 loop
    perform 1 from public.gth_avance where aviso_id=p_aviso and id_postulante=persona for update;
    if p_cancelar then
      delete from public.gth_acciones where aviso_id=p_aviso and id_postulante=persona and accion=p_accion and estado='preparado' and creado_por=auth.uid();
    else
      update public.gth_acciones set estado='confirmado',confirmado_at=now() where aviso_id=p_aviso and id_postulante=persona and accion=p_accion and estado='preparado' and creado_por=auth.uid();
    end if;
    get diagnostics afectadas = row_count;
    if afectadas<>1 then raise exception 'Accion ajena o ya finalizada'; end if;
    if not p_cancelar and p_accion='agradecimiento' then
      update public.gth_avance set etapa='no_continua',actualizado_at=now() where aviso_id=p_aviso and id_postulante=persona and etapa='postulado';
    end if;
  end loop;
end; $$;
revoke execute on function public.gth_iniciar_avance(text,jsonb),public.gth_mover_etapas(text,jsonb),public.gth_preparar_accion(text,text,jsonb),public.gth_finalizar_accion(text,text,text[],boolean) from public,anon;
grant execute on function public.gth_iniciar_avance(text,jsonb),public.gth_mover_etapas(text,jsonb),public.gth_preparar_accion(text,text,jsonb),public.gth_finalizar_accion(text,text,text[],boolean) to authenticated;
commit;
