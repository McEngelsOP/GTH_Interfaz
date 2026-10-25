-- «Recalcular puntaje» (Requisitos y pesos): la web deja el pedido en ranking_recalculos y el servidor de la laptop de
-- GTH (python -m scraping.multitest_servidor, el mismo de Multitest) lo toma, recalcula el ranking e5 del aviso con los
-- requisitos y pesos de gth_aviso_requisitos y lo guarda en ranking_embeddings. Usa el mismo latido (servidor_latido,
-- servicio 'multitest'). Aplicar después de pesos_independientes.
begin;
create table if not exists public.ranking_recalculos (
  id            bigint generated always as identity primary key,
  aviso_id      text not null check (length(aviso_id) between 1 and 250),
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'ok', 'error')),
  mensaje       text,
  creado_por    uuid not null default auth.uid(),
  creado_at     timestamptz not null default now(),
  tomado_at     timestamptz,
  terminado_at  timestamptz
);
create index if not exists ix_ranking_recalculos_pend on public.ranking_recalculos(estado, creado_at);
create index if not exists ix_ranking_recalculos_aviso on public.ranking_recalculos(aviso_id, creado_at desc);

alter table public.ranking_recalculos enable row level security;
-- Cualquier usuario con sesión que vea el aviso pide el recálculo y ve el estado de los pedidos del aviso (también los
-- de sus compañeros). Cerrarlos lo hace solo el servidor, con la conexión directa a la base (sin RLS).
create policy ranking_recalculos_leer on public.ranking_recalculos for select to authenticated
  using (public.gth_puede_ver_aviso(aviso_id));
create policy ranking_recalculos_pedir on public.ranking_recalculos for insert to authenticated
  with check (estado = 'pendiente' and creado_por = auth.uid() and public.gth_puede_ver_aviso(aviso_id));

revoke all on public.ranking_recalculos from anon, authenticated;
grant select, insert on public.ranking_recalculos to authenticated;
grant all on public.ranking_recalculos to service_role;
commit;
