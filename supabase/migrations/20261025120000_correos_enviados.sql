-- Registro de los correos que la web envía a postulantes desde la cuenta de GTH (server/correo.ts, api/correo.ts).
-- Lo escribe solo el servidor con la clave service_role; no guarda el cuerpo del mensaje. Aplicar después de
-- ranking_recalculos. Solo agrega una tabla: no modifica datos ni tablas existentes.
begin;
create table if not exists public.gth_correos_enviados (
  id            bigint generated always as identity primary key,
  creado_por    uuid references auth.users(id) on delete set null,
  tipo          text not null check (tipo in ('agradecimiento', 'entrevista', 'perfil')),
  aviso_id      text check (aviso_id is null or length(aviso_id) between 1 and 250),
  id_postulante text check (id_postulante is null or length(id_postulante) between 1 and 250),
  destinatario  text not null check (length(destinatario) between 3 and 200),
  asunto        text not null check (length(asunto) between 1 and 300),
  estado        text not null check (estado in ('enviado', 'error')),
  error         text,
  creado_at     timestamptz not null default now()
);
create index if not exists ix_correos_enviados_aviso on public.gth_correos_enviados(aviso_id, id_postulante, creado_at desc);

alter table public.gth_correos_enviados enable row level security;
-- Los usuarios con sesión ven los correos de los avisos que pueden ver; nadie escribe desde la web.
create policy correos_enviados_leer on public.gth_correos_enviados for select to authenticated
  using (aviso_id is not null and public.gth_puede_ver_aviso(aviso_id));
revoke all on public.gth_correos_enviados from anon, authenticated;
grant select on public.gth_correos_enviados to authenticated;
grant all on public.gth_correos_enviados to service_role;
commit;
