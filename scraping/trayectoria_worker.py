"""Análisis por lotes. Cada transacción es independiente de importar el CSV."""
import json
import logging
import uuid
from datetime import date

from .trayectoria import analizar, huella
from .trayectoria_reglas import VERSION

log = logging.getLogger("scraper")


def ejecutar(bd, aviso_id, hoy=None):
    hoy = hoy or date.today()
    if bd.motor == "sqlite":
        bd.cx.execute("""CREATE TABLE IF NOT EXISTS gth_trayectoria_analisis (
          id TEXT PRIMARY KEY, aviso_id TEXT NOT NULL, clave TEXT NOT NULL,
          id_postulante TEXT, huella TEXT NOT NULL, version TEXT NOT NULL,
          estado TEXT NOT NULL, fecha_referencia TEXT NOT NULL, vigente_hasta TEXT,
          calculado_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, detalle TEXT NOT NULL,
          UNIQUE(aviso_id,clave,huella,version,fecha_referencia))""")
        bd.cx.commit()
    filas = bd.consultar("SELECT clave,id_postulante,datos_json FROM postulaciones WHERE aviso_id=? AND en_ultimo_csv=1", (aviso_id,))
    anteriores = bd.consultar("SELECT clave,huella,version,fecha_referencia,vigente_hasta FROM gth_trayectoria_analisis WHERE aviso_id=? ORDER BY fecha_referencia", (aviso_id,))
    cache = {(r["clave"], r["huella"], r["version"]): r for r in anteriores}
    lote, reutilizados = [], 0
    for f in filas:
        datos = json.loads(f["datos_json"]) if isinstance(f["datos_json"], str) else f["datos_json"]
        h = huella(datos)
        anterior = cache.get((f["clave"], h, VERSION))
        if anterior and (not anterior["vigente_hasta"] or str(anterior["vigente_hasta"]) >= hoy.isoformat()):
            reutilizados += 1
            continue
        resultado = analizar(datos, hoy)
        lote.append((str(uuid.uuid4()), aviso_id, f["clave"], f["id_postulante"], h, VERSION,
                     resultado["estado"], hoy.isoformat(), resultado["vigente_hasta"], json.dumps(resultado, ensure_ascii=False)))
    sql = bd._sql("""INSERT INTO gth_trayectoria_analisis
      (id,aviso_id,clave,id_postulante,huella,version,estado,fecha_referencia,vigente_hasta,detalle)
      VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(aviso_id,clave,huella,version,fecha_referencia) DO NOTHING""")
    # Lotes limitados; una repetición/reanudación no duplica análisis ni revisiones.
    run = bd.iniciar_run("trayectoria", aviso_id) if lote else None
    try:
        for offset in range(0, len(lote), 200):
            bd.cx.cursor().executemany(sql, lote[offset:offset + 200])
            bd.cx.commit()
        if run:
            bd.cerrar_run(run, "ok", len(lote), len(filas), f"{reutilizados} reutilizados")
    except Exception:
        bd.cx.rollback()
        if run:
            bd.cerrar_run(run, "error", mensaje="No se completó el análisis de trayectoria. Puede reanudarse.")
        raise
    log.info("Trayectoria: %d analizados, %d reutilizados", len(lote), reutilizados)
    return {"analizados": len(lote), "reutilizados": reutilizados}


def ejecutar_seguro(bd, aviso_id):
    try:
        return ejecutar(bd, aviso_id)
    except Exception:
        bd.cx.rollback()
        # No imprimir CV, conexión ni errores crudos con parámetros personales.
        log.warning("Trayectoria no disponible. Comprueba la migración y ejecuta --solo-trayectoria; la importación se conserva.")
        return None
