-- Envío a Multitest desde la web publicada: la web deja el pedido en multitest_envios y el servidor (la laptop de GTH,
-- python -m scraping.multitest_servidor) lo toma, corre la automatización con Playwright y confirma en gth_acciones a
-- los candidatos agregados. servidor_latido dice si ese servidor está prendido (la web muestra «Servidor apagado»).
begin;
create table if not exists public.multitest_envios (
  id            bigint generated always as identity primary key,
  aviso_id      text not null,
  registros     jsonb not null,                  -- datos del formulario; el servidor los borra al terminar
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'ok', 'error')),
  resultados    jsonb,                           -- [{ id, ok, error }]
  mensaje       text,
  creado_por    uuid not null default auth.uid(),
  creado_at     timestamptz not null default now(),
  tomado_at     timestamptz,
  terminado_at  timestamptz
);
create index if not exists ix_multitest_envios_pend on public.multitest_envios(estado, creado_at);

create table if not exists public.servidor_latido (
  servicio  text primary key,
  equipo    text,
  visto_at  timestamptz not null default now()
);

alter table public.multitest_envios enable row level security;
alter table public.servidor_latido enable row level security;
-- Solo colaboradores de GTH; cada uno ve y crea sus pedidos de los avisos que puede ver. El servidor usa la
-- conexión directa a la base (sin RLS) para tomarlos y cerrarlos.
create policy multitest_envios_leer on public.multitest_envios for select to authenticated
  using (creado_por = auth.uid() and exists (select 1 from public.gth_colaboradores c where c.user_id = auth.uid()));
create policy multitest_envios_pedir on public.multitest_envios for insert to authenticated
  with check (estado = 'pendiente' and creado_por = auth.uid()
    and exists (select 1 from public.gth_colaboradores c where c.user_id = auth.uid()));
create policy aviso_visible on public.multitest_envios as restrictive for all to authenticated
  using (public.gth_puede_ver_aviso(aviso_id)) with check (public.gth_puede_ver_aviso(aviso_id));
create policy servidor_latido_leer on public.servidor_latido for select to authenticated using (true);

-- Supabase da por defecto todos los permisos a authenticated: aquí solo leer y pedir; cerrar pedidos y marcar el
-- latido lo hace únicamente el servidor.
revoke all on public.multitest_envios, public.servidor_latido from anon, authenticated;
grant select, insert on public.multitest_envios to authenticated;
grant select on public.servidor_latido to authenticated;
commit;
