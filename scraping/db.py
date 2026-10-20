"""Base de datos del scraper: Supabase (Postgres) o, si no está configurado, SQLite local.

Motor:
  - Supabase: si scraping/.env (o el entorno) trae SUPABASE_DB_URL. Los PDFs no van a Supabase sino
    al Google Drive de ESAN (ver almacen.py); aquí se guarda su id y enlace. El esquema está en
    scraping/supabase_esquema.sql y se crea una vez desde el SQL Editor de Supabase.
  - SQLite:   en otro caso, un solo archivo scraping/data/gth.db (se crea solo).

Tablas:
  avisos         -> un registro por aviso de Bumeran (lista + detalle público + control de scraping)
  postulaciones  -> filas del CSV exportado (una por postulante y aviso)
  cvs            -> CV adjunto (PDF real) de cada postulante, descargado desde su perfil
  scrape_runs    -> bitácora de cada corrida / paso (para "Actualizado hace ..." y errores)
Vista:
  v_postulaciones -> postulaciones + ruta del CV adjunto (unidas por documento o correo)

Todo el SQL de este módulo usa marcadores '?' y funciona igual en los dos motores.
Las fechas se guardan en ISO 8601 con zona horaria y se devuelven siempre como texto ISO.
"""
import json
import sqlite3
from datetime import date, datetime, timedelta

from . import almacen, config
from .credenciales import valor
from .csv_bumeran import clave_postulacion, id_postulante, normalizar_documento

ESQUEMA_SQLITE = """
CREATE TABLE IF NOT EXISTS avisos (
    aviso_id              TEXT PRIMARY KEY,
    titulo                TEXT,
    estado                TEXT,
    publicado_el          TEXT,
    creado_por            TEXT,
    visitas               INTEGER,
    recibidos             INTEGER,      -- contador de Bumeran en la última lectura de la lista
    no_leidos             INTEGER,
    recibidos_al_scrapear INTEGER,      -- valor de 'recibidos' cuando se descargó el último CSV
    url_publica           TEXT,
    url_postulantes       TEXT,
    detalle_json          TEXT,
    detalle_texto         TEXT,
    detalle_at            TEXT,
    ultimo_csv_at         TEXT,
    ultimo_cvs_at         TEXT,
    ultima_revision_at    TEXT,         -- última vez que se leyó en la lista
    primera_vez_at        TEXT,
    en_ultima_lista       INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS postulaciones (
    aviso_id          TEXT NOT NULL,
    clave             TEXT NOT NULL,
    id_postulante     TEXT,             -- ID legible (alopez888): nombre del PDF y llave con el CSV
    documento         TEXT,
    email             TEXT,
    nombre            TEXT,
    apellido          TEXT,
    fecha_postulacion TEXT,
    datos_json        TEXT NOT NULL,    -- fila completa del CSV (94 columnas)
    en_ultimo_csv     INTEGER DEFAULT 1,
    primera_vez_at    TEXT,
    actualizado_at    TEXT,
    PRIMARY KEY (aviso_id, clave)
);

CREATE TABLE IF NOT EXISTS cvs (
    aviso_id       TEXT NOT NULL,
    card_id        TEXT NOT NULL,       -- id de la tarjeta en la lista de postulantes
    id_postulacion TEXT,
    id_cv          TEXT,
    documento      TEXT,
    email          TEXT,
    tiene_adjunto  INTEGER,
    archivo        TEXT,                -- ruta local del PDF
    drive_id       TEXT,                -- id del PDF en Google Drive
    drive_url      TEXT,                -- enlace para abrir el PDF en Google Drive
    estado         TEXT,                -- descargado | sin_adjunto | error
    error          TEXT,
    actualizado_at TEXT,
    PRIMARY KEY (aviso_id, card_id)
);

CREATE TABLE IF NOT EXISTS scrape_runs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo      TEXT,                     -- corrida | lista | csv | detalle | cvs
    aviso_id  TEXT,
    inicio    TEXT,
    fin       TEXT,
    estado    TEXT,                     -- en_curso | ok | error | interrumpido
    nuevos    INTEGER,
    total     INTEGER,
    mensaje   TEXT
);

CREATE TABLE IF NOT EXISTS ranking_embeddings (   -- ranking e5 calculado al bajar el CSV (ver ranking.py)
    aviso_id          TEXT NOT NULL,
    clave             TEXT NOT NULL,
    id_postulante     TEXT,
    criterios_version TEXT NOT NULL,
    backend           TEXT NOT NULL,
    ranking           INTEGER,
    score             REAL,
    score_bruto       REAL,
    req_sims          TEXT,
    req_sims_bruto    TEXT,
    req_fragmentos    TEXT,
    explicacion       TEXT,
    explicacion_bruta TEXT,
    calculado_at      TEXT,
    PRIMARY KEY (aviso_id, clave)
);

CREATE INDEX IF NOT EXISTS ix_post_doc ON postulaciones(aviso_id, documento);
CREATE INDEX IF NOT EXISTS ix_post_mail ON postulaciones(aviso_id, email);
CREATE INDEX IF NOT EXISTS ix_cvs_doc ON cvs(aviso_id, documento);
CREATE INDEX IF NOT EXISTS ix_cvs_mail ON cvs(aviso_id, email);

DROP VIEW IF EXISTS v_postulaciones;
CREATE VIEW v_postulaciones AS
SELECT p.*,
       c.archivo  AS cv_archivo,
       c.drive_url AS cv_url,
       c.estado   AS cv_estado,
       c.id_postulacion AS bumeran_id_postulacion
FROM postulaciones p
LEFT JOIN cvs c
  ON c.aviso_id = p.aviso_id
 AND ( (p.documento <> '' AND c.documento = p.documento)
    OR (p.email <> '' AND lower(c.email) = p.email) );
"""

# Columnas añadidas después de la primera versión (BD SQLite ya creadas)
_COLUMNAS_NUEVAS_SQLITE = [("cvs", "drive_id"), ("cvs", "drive_url"), ("postulaciones", "id_postulante"),
                           ("avisos", "criterios"), ("avisos", "criterios_version"), ("avisos", "ranking_at")]


def ahora() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def a_fecha(texto):
    """ISO (con o sin zona) -> datetime con zona. Los valores sin zona se toman como hora local."""
    if not texto:
        return None
    d = datetime.fromisoformat(str(texto))
    return d if d.tzinfo else d.astimezone()


def _a_int(valor_):
    try:
        return int(str(valor_).replace(".", "").replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def _a_texto(v):
    if isinstance(v, datetime):
        return v.astimezone().isoformat(timespec="seconds")
    if isinstance(v, date):
        return v.isoformat()
    return v


def _id_unico(base, usados: set) -> str:
    """alopez888, y si ya existe en el aviso: alopez8882, alopez8883..."""
    candidato, n = base, 1
    while candidato in usados:
        n += 1
        candidato = f"{base}{n}"
    usados.add(candidato)
    return candidato


class BD:
    def __init__(self, ruta=None, motor=None):
        url_pg = valor("SUPABASE_DB_URL")
        self.motor = motor or ("supabase" if url_pg and ruta is None else "sqlite")
        if self.motor == "supabase":
            try:
                import psycopg
                from psycopg.rows import dict_row
            except ImportError as e:
                raise SystemExit("Falta psycopg: pip install -r scraping\\requirements.txt") from e
            self.cx = psycopg.connect(url_pg, row_factory=dict_row, autocommit=False,
                                      prepare_threshold=None)   # el pooler de Supabase no admite prepared statements
        else:
            self.cx = sqlite3.connect(str(ruta or config.DB_PATH))
            self.cx.row_factory = sqlite3.Row
            self.cx.execute("PRAGMA journal_mode=WAL")
            self.cx.executescript(ESQUEMA_SQLITE)
            for tabla, col in _COLUMNAS_NUEVAS_SQLITE:
                if col not in {r["name"] for r in self.cx.execute(f"PRAGMA table_info({tabla})")}:
                    self.cx.execute(f"ALTER TABLE {tabla} ADD COLUMN {col} TEXT")
                    self.cx.executescript(ESQUEMA_SQLITE)    # rehace la vista con la columna nueva
            self.cx.commit()

    # ------------------------------------------------------------------ acceso genérico
    def _sql(self, sql):
        # psycopg usa %s: los % literales (p. ej. LIKE '%x') se escapan como %%
        return sql.replace("%", "%%").replace("?", "%s") if self.motor == "supabase" else sql

    def consultar(self, sql, params=()) -> list[dict]:
        cur = self.cx.execute(self._sql(sql), params)
        filas = [{k: _a_texto(v) for k, v in dict(r).items()} for r in cur.fetchall()]
        if self.motor == "supabase":
            self.cx.commit()         # no dejar transacciones de lectura abiertas
        return filas

    def uno(self, sql, params=()):
        filas = self.consultar(sql, params)
        return filas[0] if filas else None

    def ejecutar(self, sql, params=()):
        self.cx.execute(self._sql(sql), params)
        self.cx.commit()

    def cerrar(self):
        try:
            self.cx.close()
        except Exception:
            pass

    # ------------------------------------------------------------------ bitácora
    def iniciar_run(self, tipo, aviso_id=None) -> int:
        r = self.uno("INSERT INTO scrape_runs(tipo, aviso_id, inicio, estado) VALUES (?,?,?, 'en_curso') "
                     "RETURNING id", (tipo, aviso_id, ahora()))
        self.cx.commit()
        return r["id"]

    def cerrar_run(self, run_id, estado, nuevos=None, total=None, mensaje=None):
        self.ejecutar("UPDATE scrape_runs SET fin=?, estado=?, nuevos=?, total=?, mensaje=? WHERE id=?",
                      (ahora(), estado, nuevos, total, (mensaje or "")[:2000], run_id))

    # ------------------------------------------------------------------ avisos
    def upsert_lista(self, avisos: list[dict], marcar_ausentes=True):
        """Guarda lo leído en la lista de avisos. Marca en_ultima_lista=0 a los que ya no aparecen
        (salvo marcar_ausentes=False, cuando la lectura pudo quedar incompleta)."""
        t = ahora()
        if marcar_ausentes:
            self.cx.execute("UPDATE avisos SET en_ultima_lista = 0")
        self.cx.cursor().executemany(self._sql(
                """INSERT INTO avisos(aviso_id, titulo, estado, publicado_el, creado_por, visitas,
                                      recibidos, no_leidos, ultima_revision_at, primera_vez_at, en_ultima_lista)
                   VALUES (?,?,?,?,?,?,?,?,?,?,1)
                   ON CONFLICT(aviso_id) DO UPDATE SET
                     titulo=excluded.titulo, estado=excluded.estado, publicado_el=excluded.publicado_el,
                     creado_por=excluded.creado_por, visitas=excluded.visitas, recibidos=excluded.recibidos,
                     no_leidos=excluded.no_leidos, ultima_revision_at=excluded.ultima_revision_at,
                     en_ultima_lista=1"""),
            [(a["aviso_id"], a.get("titulo"), a.get("estado"), a.get("publicado_el"), a.get("creado_por"),
              _a_int(a.get("visitas")), _a_int(a.get("recibidos")), _a_int(a.get("no_leidos")), t, t) for a in avisos])
        self.cx.commit()

    def aviso(self, aviso_id):
        return self.uno("SELECT * FROM avisos WHERE aviso_id=?", (aviso_id,))

    def crear_aviso(self, aviso_id, titulo=None, publicado_el=None):
        """Registra un aviso que aún no está en la BD (p. ej. al importar un CSV a mano)."""
        self.ejecutar("INSERT INTO avisos(aviso_id, titulo, publicado_el, primera_vez_at, en_ultima_lista) "
                      "VALUES (?,?,?,?,1) ON CONFLICT(aviso_id) DO NOTHING",
                      (aviso_id, titulo, publicado_el, ahora()))

    def necesita_csv(self, aviso_id, forzar=False) -> tuple[bool, str]:
        a = self.aviso(aviso_id)
        if forzar:
            return True, "forzado"
        if a is None or a["ultimo_csv_at"] is None:
            return True, "nunca descargado"
        if a["recibidos"] is not None and a["recibidos"] != a["recibidos_al_scrapear"]:
            return True, f"recibidos {a['recibidos_al_scrapear']} -> {a['recibidos']}"
        if datetime.now().astimezone() - a_fecha(a["ultimo_csv_at"]) > timedelta(days=config.DIAS_REVISION_FORZADA):
            return True, f"más de {config.DIAS_REVISION_FORZADA} días sin revisar"
        return False, "sin cambios"

    def marcar(self, aviso_id, **campos):
        if not campos:
            return
        sets = ", ".join(f"{k}=?" for k in campos)
        self.ejecutar(f"UPDATE avisos SET {sets} WHERE aviso_id=?", (*campos.values(), aviso_id))

    def guardar_detalle(self, aviso_id, detalle: dict):
        self.marcar(aviso_id,
                    detalle_json=json.dumps(detalle, ensure_ascii=False),
                    detalle_texto=detalle.get("descripcion_texto"),
                    url_publica=detalle.get("url"),
                    detalle_at=ahora())

    # ------------------------------------------------------------------ postulaciones
    def importar_csv(self, aviso_id, filas: list[dict]) -> tuple[int, int]:
        """Upsert de las filas del CSV. Devuelve (nuevos, total)."""
        t = ahora()
        ids = {r["clave"]: r["id_postulante"] for r in self.consultar(
            "SELECT clave, id_postulante FROM postulaciones WHERE aviso_id=?", (aviso_id,))}
        existentes = set(ids)
        usados = {v for v in ids.values() if v}
        self.cx.execute(self._sql("UPDATE postulaciones SET en_ultimo_csv=0 WHERE aviso_id=?"), (aviso_id,))
        nuevos = 0
        vistos = set()
        sql = self._sql(
            """INSERT INTO postulaciones(aviso_id, clave, id_postulante, documento, email, nombre, apellido,
                                         fecha_postulacion, datos_json, en_ultimo_csv, primera_vez_at, actualizado_at)
               VALUES (?,?,?,?,?,?,?,?,?,1,?,?)
               ON CONFLICT(aviso_id, clave) DO UPDATE SET
                 id_postulante=COALESCE(postulaciones.id_postulante, excluded.id_postulante),
                 documento=excluded.documento, email=excluded.email, nombre=excluded.nombre,
                 apellido=excluded.apellido, fecha_postulacion=excluded.fecha_postulacion,
                 datos_json=excluded.datos_json, en_ultimo_csv=1, actualizado_at=excluded.actualizado_at""")
        lote = []                        # se envía en bloque: mucho más rápido contra Supabase
        for f in filas:
            clave = clave_postulacion(f)
            vistos.add(clave)            # si se repite dentro del CSV, se queda la última fila
            if clave not in existentes:
                nuevos += 1
                existentes.add(clave)
            if not ids.get(clave):        # el ID se asigna una sola vez y no cambia entre corridas
                ids[clave] = _id_unico(id_postulante(f), usados)
            lote.append((aviso_id, clave, ids[clave], normalizar_documento(f.get("Nro. Documento", "")),
                         (f.get("E-Mail") or "").strip().lower(), f.get("Nombre"), f.get("Apellido"),
                         f.get("Fecha Postulación"), json.dumps(f, ensure_ascii=False), t, t))
        if lote:
            self.cx.cursor().executemany(sql, lote)
        self.cx.commit()
        return nuevos, len(vistos)

    def buscar_postulacion(self, aviso_id, documento=None, email=None):
        """Fila del CSV que corresponde a un perfil de Bumeran: por DNI y, si no, por correo."""
        doc = normalizar_documento(documento or "")
        if doc:
            r = self.uno("SELECT * FROM postulaciones WHERE aviso_id=? AND documento=?", (aviso_id, doc))
            if r:
                return r
        mail = (email or "").strip().lower()
        if mail:
            return self.uno("SELECT * FROM postulaciones WHERE aviso_id=? AND email=?", (aviso_id, mail))
        return None

    def postulantes_con_cv(self, aviso_id) -> list[dict]:
        """Filas del último CSV con su ID y el PDF que les corresponde (para el CSV con ID)."""
        return self.consultar("SELECT * FROM v_postulaciones WHERE aviso_id=? AND en_ultimo_csv=1 "
                              "ORDER BY id_postulante", (aviso_id,))

    # ------------------------------------------------------------------ ranking por embeddings
    def postulantes_para_ranking(self, aviso_id) -> list[dict]:
        filas = self.consultar("SELECT clave, id_postulante, datos_json FROM postulaciones "
                               "WHERE aviso_id=? AND en_ultimo_csv=1", (aviso_id,))
        for f in filas:
            if isinstance(f["datos_json"], str):
                f["datos_json"] = json.loads(f["datos_json"])
        return filas

    def ranking_guardado(self, aviso_id, version) -> dict:
        """Filas ya calculadas con esta versión de criterios, por clave (con sus valores originales)."""
        filas = self.consultar("SELECT clave, backend, score_bruto, req_sims_bruto, req_fragmentos, explicacion_bruta "
                               "FROM ranking_embeddings WHERE aviso_id=? AND criterios_version=?", (aviso_id, version))
        for f in filas:
            for k in ("req_sims_bruto", "req_fragmentos"):
                if isinstance(f[k], str):
                    f[k] = json.loads(f[k])
        return {f["clave"]: f for f in filas}

    def guardar_ranking(self, aviso_id, version, filas: list[dict]):
        """Reemplaza el ranking del aviso: upsert de las filas y borra las de otros criterios o de quienes
        ya no están en el último CSV."""
        t = ahora()
        cols = ["aviso_id", "clave", "id_postulante", "criterios_version", "backend", "ranking", "score", "score_bruto",
                "req_sims", "req_sims_bruto", "req_fragmentos", "explicacion", "explicacion_bruta", "calculado_at"]
        sql = self._sql(f"INSERT INTO ranking_embeddings({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))}) "
                        f"ON CONFLICT(aviso_id, clave) DO UPDATE SET "
                        + ", ".join(f"{c}=excluded.{c}" for c in cols[2:]))
        lote = [(aviso_id, f["clave"], f.get("id_postulante"), version, f["backend"], f["ranking"], f["score"],
                 f["score_bruto"], json.dumps(f["req_sims"]), json.dumps(f["req_sims_bruto"]),
                 json.dumps(f["req_fragmentos"], ensure_ascii=False), f["explicacion"], f["explicacion_bruta"],
                 f.get("calculado_at") or t) for f in filas]
        if lote:
            self.cx.cursor().executemany(sql, lote)
        self.cx.execute(self._sql("DELETE FROM ranking_embeddings WHERE aviso_id=? AND (criterios_version<>? OR clave NOT IN "
                                  "(SELECT clave FROM postulaciones WHERE aviso_id=? AND en_ultimo_csv=1))"),
                        (aviso_id, version, aviso_id))
        self.cx.commit()
        self.marcar(aviso_id, ranking_at=t)

    def contar_postulaciones(self, aviso_id) -> int:
        return self.uno("SELECT COUNT(*) AS n FROM postulaciones WHERE aviso_id=? AND en_ultimo_csv=1",
                        (aviso_id,))["n"]

    # ------------------------------------------------------------------ cvs
    def cv_resuelto(self, aviso_id, card_id) -> bool:
        r = self.uno("SELECT estado FROM cvs WHERE aviso_id=? AND card_id=?", (aviso_id, card_id))
        return r is not None and r["estado"] in ("descargado", "sin_adjunto")

    def contar_cvs_resueltos(self, aviso_id) -> int:
        return self.uno("SELECT COUNT(*) AS n FROM cvs WHERE aviso_id=? AND estado IN ('descargado','sin_adjunto')",
                        (aviso_id,))["n"]

    def guardar_cv(self, aviso_id, card_id, **d):
        """Registra el resultado del CV de un postulante. Si hay archivo, también lo sube a Google Drive
        (carpeta del aviso) y guarda su id y enlace."""
        drive_id = drive_url = None
        if d.get("archivo"):
            from pathlib import Path
            ruta = Path(d["archivo"])
            if ruta.exists():
                drive_id, drive_url = almacen.subir_cv(ruta, ruta.parent.name)
        self.ejecutar(
            """INSERT INTO cvs(aviso_id, card_id, id_postulacion, id_cv, documento, email, tiene_adjunto,
                               archivo, drive_id, drive_url, estado, error, actualizado_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(aviso_id, card_id) DO UPDATE SET
                 id_postulacion=COALESCE(excluded.id_postulacion, cvs.id_postulacion),
                 id_cv=COALESCE(excluded.id_cv, cvs.id_cv), documento=excluded.documento,
                 email=excluded.email, tiene_adjunto=excluded.tiene_adjunto,
                 archivo=COALESCE(excluded.archivo, cvs.archivo),
                 drive_id=COALESCE(excluded.drive_id, cvs.drive_id),
                 drive_url=COALESCE(excluded.drive_url, cvs.drive_url),
                 estado=excluded.estado, error=excluded.error, actualizado_at=excluded.actualizado_at""",
            (aviso_id, card_id, d.get("id_postulacion"), d.get("id_cv"),
             normalizar_documento(d.get("documento") or ""), (d.get("email") or "").strip().lower(),
             1 if d.get("tiene_adjunto") else 0, d.get("archivo"), drive_id, drive_url, d.get("estado"),
             d.get("error"), ahora()))

    def cvs_sin_drive(self) -> list[dict]:
        """CVs descargados que todavía no están en Google Drive (p. ej. si falló la subida)."""
        return self.consultar("SELECT * FROM cvs WHERE estado='descargado' AND archivo IS NOT NULL "
                              "AND drive_id IS NULL ORDER BY aviso_id")

    def marcar_drive(self, aviso_id, card_id, drive_id, drive_url):
        self.ejecutar("UPDATE cvs SET drive_id=?, drive_url=? WHERE aviso_id=? AND card_id=?",
                      (drive_id, drive_url, aviso_id, card_id))
