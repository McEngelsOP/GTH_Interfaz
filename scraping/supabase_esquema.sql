-- =============================================================================================
-- Esquema del scraper de Bumeran para Supabase.
-- Cómo usarlo: Supabase -> SQL Editor -> pegar todo este archivo -> Run. Se puede volver a correr.
--
-- Quién accede:
--   * El scraper (PC con Chrome) se conecta con SUPABASE_DB_URL (rol postgres): no pasa por RLS.
--     Esa clave solo va en scraping/.env de esa PC.
--   * Los PDFs NO se guardan en Supabase: van al Google Drive de ESAN; aquí solo su id y enlace.
--   * La web usa la clave pública "anon" + Supabase Auth: solo usuarios con sesión iniciada
--     (rol authenticated) pueden leer. Sin sesión no se ve nada (datos personales, Ley 29733).
-- =============================================================================================

create table if not exists public.avisos (
    aviso_id              text primary key,
    titulo                text,
    estado                text,
    publicado_el          text,                 -- AAAA-MM-DD
    creado_por            text,
    visitas               integer,
    recibidos             integer,              -- contador de Bumeran en la última lectura de la lista
    no_leidos             integer,
    recibidos_al_scrapear integer,              -- valor de 'recibidos' cuando se bajó el último CSV
    url_publica           text,
    url_postulantes       text,
    detalle_json          jsonb,
    detalle_texto         text,
    detalle_at            timestamptz,
    ultimo_csv_at         timestamptz,          -- "Actualizado hace ..."
    ultimo_cvs_at         timestamptz,
    ultima_revision_at    timestamptz,
    primera_vez_at        timestamptz,
    en_ultima_lista       integer default 1
);

create table if not exists public.postulaciones (
    aviso_id          text not null references public.avisos(aviso_id) on delete cascade,
    clave             text not null,            -- DOC:<documento> | MAIL:<correo> | HASH:<...>
    id_postulante     text,                     -- ID legible (alopez888): nombre del PDF y llave con el CSV
    documento         text,
    email             text,
    nombre            text,
    apellido          text,
    fecha_postulacion text,
    datos_json        jsonb not null,           -- fila completa del CSV (94 columnas)
    en_ultimo_csv     integer default 1,
    primera_vez_at    timestamptz,
    actualizado_at    timestamptz,
    primary key (aviso_id, clave)
);

create table if not exists public.cvs (
    aviso_id        text not null references public.avisos(aviso_id) on delete cascade,
    card_id         text not null,              -- id de la tarjeta en la lista de postulantes
    id_postulacion  text,
    id_cv           text,
    documento       text,
    email           text,
    tiene_adjunto   integer,
    archivo         text,                       -- ruta local en la PC del scraper
    drive_id        text,                       -- id del PDF en Google Drive
    drive_url       text,                       -- enlace para abrir el PDF en Google Drive
    estado          text,                       -- descargado | sin_adjunto | error
    error           text,
    actualizado_at  timestamptz,
    primary key (aviso_id, card_id)
);

create table if not exists public.scrape_runs (
    id        bigint generated always as identity primary key,
    tipo      text,                             -- corrida | lista | csv | detalle | cvs | ...
    aviso_id  text,
    inicio    timestamptz,
    fin       timestamptz,
    estado    text,                             -- en_curso | ok | error | interrumpido
    nuevos    integer,
    total     integer,
    mensaje   text
);

-- Pedidos de la web al scraper ("Actualizar"). No hay servidor encendido todo el día: el scraper
-- los toma cuando la PC con Chrome está prendida; mientras tanto quedan como 'pendiente'.
create table if not exists public.solicitudes (
    id           bigint generated always as identity primary key,
    tipo         text not null default 'actualizar'
                 check (tipo in ('actualizar', 'revisar', 'csv', 'oferta', 'pdfs')),
    aviso_id     text,                          -- null = todos los avisos publicados
    estado       text not null default 'pendiente'
                 check (estado in ('pendiente', 'en_curso', 'ok', 'error')),
    mensaje      text,
    creada_por   uuid default auth.uid(),
    creada_at    timestamptz not null default now(),
    tomada_at    timestamptz,
    terminada_at timestamptz
);

alter table public.postulaciones add column if not exists id_postulante text;
create unique index if not exists ux_post_id on public.postulaciones(aviso_id, id_postulante);
create index if not exists ix_post_doc  on public.postulaciones(aviso_id, documento);
create index if not exists ix_post_mail on public.postulaciones(aviso_id, email);
create index if not exists ix_cvs_doc   on public.cvs(aviso_id, documento);
create index if not exists ix_cvs_mail  on public.cvs(aviso_id, email);
create index if not exists ix_runs_aviso on public.scrape_runs(aviso_id, inicio desc);
create index if not exists ix_solicitudes_pend on public.solicitudes(estado, creada_at);

create or replace view public.v_postulaciones
with (security_invoker = true) as             -- respeta el RLS de las tablas
select p.*,
       c.archivo         as cv_archivo,
       c.drive_url       as cv_url,
       c.estado          as cv_estado,
       c.id_postulacion  as bumeran_id_postulacion
from public.postulaciones p
left join public.cvs c
  on c.aviso_id = p.aviso_id
 and ( (p.documento <> '' and c.documento = p.documento)
    or (p.email <> '' and lower(c.email) = p.email) );

-- ------------------------------------------------------------------ seguridad (RLS)
alter table public.avisos        enable row level security;
alter table public.postulaciones enable row level security;
alter table public.cvs           enable row level security;
alter table public.scrape_runs   enable row level security;
alter table public.solicitudes   enable row level security;

drop policy if exists "leer avisos" on public.avisos;
create policy "leer avisos" on public.avisos for select to authenticated using (true);
drop policy if exists "leer postulaciones" on public.postulaciones;
create policy "leer postulaciones" on public.postulaciones for select to authenticated using (true);
drop policy if exists "leer cvs" on public.cvs;
create policy "leer cvs" on public.cvs for select to authenticated using (true);
drop policy if exists "leer corridas" on public.scrape_runs;
create policy "leer corridas" on public.scrape_runs for select to authenticated using (true);
drop policy if exists "leer solicitudes" on public.solicitudes;
create policy "leer solicitudes" on public.solicitudes for select to authenticated using (true);
drop policy if exists "pedir actualizacion" on public.solicitudes;
create policy "pedir actualizacion" on public.solicitudes for insert to authenticated
    with check (estado = 'pendiente');

-- ------------------------------------------------------------------ ranking por embeddings (e5)
-- El scraper calcula el ranking en segundo plano al bajar el CSV (aviso nuevo o postulantes nuevos) y la web
-- solo lo lee. criterios = requisitos de la oferta (scraping/criterios.py), con pesos iguales.
alter table public.avisos add column if not exists criterios jsonb;
alter table public.avisos add column if not exists criterios_version text;
alter table public.avisos add column if not exists ranking_at timestamptz;

create table if not exists public.ranking_embeddings (
    aviso_id          text not null,
    clave             text not null,
    id_postulante     text,
    criterios_version text not null,
    backend           text not null,            -- e5 | tfidf
    ranking           integer,
    score             double precision,         -- e5: reescalado 0-1 dentro del aviso (el mejor = 1)
    score_bruto       double precision,         -- similitud original del modelo
    req_sims          jsonb,                    -- similitud por criterio (misma escala que score)
    req_sims_bruto    jsonb,
    req_fragmentos    jsonb,                    -- fragmento del CV que respalda cada criterio
    explicacion       text,
    explicacion_bruta text,
    calculado_at      timestamptz,
    primary key (aviso_id, clave),
    foreign key (aviso_id, clave) references public.postulaciones(aviso_id, clave) on delete cascade
);

alter table public.ranking_embeddings enable row level security;
drop policy if exists "leer ranking" on public.ranking_embeddings;
create policy "leer ranking" on public.ranking_embeddings for select to authenticated using (true);
