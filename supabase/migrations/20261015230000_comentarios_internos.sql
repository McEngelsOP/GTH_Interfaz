-- Aplicar solo en GTH_Bumeran. No modifica postulaciones, CVs ni rankings.
-- El administrador debe dar acceso explícito a cada colaborador antes de usar comentarios:
-- insert into public.gth_colaboradores (user_id)
-- select id from auth.users where email in ('correo-del-colaborador');
create table public.gth_colaboradores (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.gth_colaboradores enable row level security;
revoke all on public.gth_colaboradores from anon, authenticated;
grant select on public.gth_colaboradores to authenticated;
create policy colaboradores_ver_acceso on public.gth_colaboradores
  for select to authenticated using (user_id = (select auth.uid()));

create table public.comentarios_internos (
  aviso_id text not null check (length(aviso_id) between 1 and 250),
  id_postulante text not null check (length(id_postulante) between 1 and 250),
  texto text not null check (length(btrim(texto)) between 1 and 4000),
  actualizado_at timestamptz not null default now(),
  actualizado_por uuid references auth.users(id) on delete set null default auth.uid(),
  primary key (aviso_id, id_postulante)
);
alter table public.comentarios_internos enable row level security;
revoke all on public.comentarios_internos from anon, authenticated;
grant select, insert, update, delete on public.comentarios_internos to authenticated;

create policy comentarios_lectura on public.comentarios_internos for select to authenticated
  using (exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())));
create policy comentarios_creacion on public.comentarios_internos for insert to authenticated
  with check (exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())));
create policy comentarios_edicion on public.comentarios_internos for update to authenticated
  using (exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())))
  with check (exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())));
create policy comentarios_borrado on public.comentarios_internos for delete to authenticated
  using (exists (select 1 from public.gth_colaboradores where user_id = (select auth.uid())));

create function public.sellar_comentario_interno() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.actualizado_at := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;
revoke execute on function public.sellar_comentario_interno() from public, anon;
grant execute on function public.sellar_comentario_interno() to authenticated;
create trigger sellar_comentario before insert or update on public.comentarios_internos
  for each row execute function public.sellar_comentario_interno();
