"""Servidor de envíos a Multitest: corre en la laptop de GTH mientras esté prendida.

La web («Enviar Multitest» en Avance de candidatos) deja el pedido en Supabase (tabla multitest_envios). Este proceso:
  - marca su latido en servidor_latido cada pocos segundos (si deja de hacerlo, la web muestra «Servidor apagado»);
  - toma los pedidos pendientes, corre scripts/multitest-envio.mjs (Playwright + Chrome) y
  - confirma en gth_acciones a los candidatos agregados y libera a los que fallaron, aunque la web ya esté cerrada.

Uso (desde la raíz del repo, o doble clic en scraping\\iniciar_servidor_multitest.bat):
  python -m scraping.multitest_servidor            Chrome sin ventana
  python -m scraping.multitest_servidor --ventana  Chrome visible (para ver qué hace)
Requiere SUPABASE_DB_URL en scraping\\.env y MULTITEST_USUARIO / MULTITEST_CLAVE en .env.local.
"""
import argparse
import json
import logging
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

from . import config
from .db import BD

log = logging.getLogger("multitest")
RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "automatizacion" / "multitest"
SERVICIO = "multitest"
CADA_LATIDO = 15        # segundos; la web considera apagado al servidor tras 90 s sin latido
CADA_REVISION = 5
LIMITE_ENVIO = 30 * 60  # un envío que tarde más se corta


def configurar_log():
    config.asegurar_directorios()
    fmt = logging.Formatter("%(asctime)s %(levelname)-7s %(message)s", "%Y-%m-%d %H:%M:%S")
    log.setLevel(logging.INFO)
    log.handlers.clear()
    for h in (logging.StreamHandler(sys.stdout),
              logging.FileHandler(Path(config.LOG_PATH).with_name("multitest_servidor.log"), encoding="utf-8")):
        h.setFormatter(fmt)
        log.addHandler(h)


def _json(v):
    return v if isinstance(v, (list, dict)) else json.loads(v or "null")


def latido(bd: BD):
    bd.ejecutar("""INSERT INTO servidor_latido(servicio, equipo, visto_at) VALUES (?, ?, now())
                   ON CONFLICT (servicio) DO UPDATE SET equipo = excluded.equipo, visto_at = now()""",
                (SERVICIO, socket.gethostname()))


def cerrar_acciones(bd: BD, aviso_id, ok_ids, fallidos):
    """Mismo efecto que gth_finalizar_accion: confirma a los agregados y libera la reserva de los demás."""
    if ok_ids:
        bd.ejecutar("""UPDATE gth_acciones SET estado = 'confirmado', confirmado_at = now()
                       WHERE aviso_id = ? AND accion = 'multitest' AND estado = 'preparado' AND id_postulante = ANY(?)""",
                    (aviso_id, list(ok_ids)))
    if fallidos:
        bd.ejecutar("""DELETE FROM gth_acciones
                       WHERE aviso_id = ? AND accion = 'multitest' AND estado = 'preparado' AND id_postulante = ANY(?)""",
                    (aviso_id, list(fallidos)))


def recuperar_interrumpidos(bd: BD):
    """Pedidos que quedaron «en curso» porque la laptop se apagó: se cierran con error y se liberan las reservas."""
    for p in bd.consultar("SELECT id, aviso_id, registros FROM multitest_envios WHERE estado = 'en_curso'"):
        ids = [r["id"] for r in _json(p["registros"]) or []]
        cerrar_acciones(bd, p["aviso_id"], [], ids)
        bd.ejecutar("""UPDATE multitest_envios SET estado = 'error', terminado_at = now(), registros = '[]'::jsonb,
                       mensaje = 'El servidor se apagó durante el envío. Revisa en Multitest quiénes quedaron agregados.'
                       WHERE id = ?""", (p["id"],))
        log.warning("Pedido %s interrumpido: cerrado con error", p["id"])


def tomar_pedido(bd: BD):
    return bd.uno("""UPDATE multitest_envios SET estado = 'en_curso', tomado_at = now()
                     WHERE id = (SELECT id FROM multitest_envios WHERE estado = 'pendiente'
                                 ORDER BY creado_at LIMIT 1 FOR UPDATE SKIP LOCKED)
                     RETURNING id, aviso_id, registros""")


def procesar(bd: BD, pedido, ventana: bool):
    registros = _json(pedido["registros"])
    ids = [r["id"] for r in registros]
    log.info("Pedido %s (aviso %s): %d candidatos", pedido["id"], pedido["aviso_id"], len(registros))
    CARPETA.mkdir(parents=True, exist_ok=True)
    archivo, salida = CARPETA / "registros.json", CARPETA / "resultados.json"
    archivo.write_text(json.dumps({"registros": registros}, ensure_ascii=False), encoding="utf-8")
    salida.unlink(missing_ok=True)
    env = {**os.environ, "MULTITEST_HEADLESS": "0" if ventana else "1"}
    resultados, mensaje = [], None
    try:
        with open(CARPETA / "ultima-corrida.log", "w", encoding="utf-8") as registro:
            subprocess.run([shutil.which("node") or "node", "scripts/multitest-envio.mjs", str(archivo), str(salida)],
                           cwd=RAIZ, env=env, stdout=registro, stderr=subprocess.STDOUT, timeout=LIMITE_ENVIO)
        resultados = json.loads(salida.read_text(encoding="utf-8"))["resultados"]
    except subprocess.TimeoutExpired:
        mensaje = "El envío tardó demasiado y se detuvo. Revisa en Multitest quiénes quedaron agregados."
    except Exception as e:  # el script no llegó a escribir resultados
        mensaje = f"La automatización se detuvo antes de terminar ({e.__class__.__name__}). Revisa automatizacion/multitest/ultima-corrida.log."
    finally:
        archivo.unlink(missing_ok=True)   # datos personales: no se dejan en disco
    ok_ids = [r["id"] for r in resultados if r.get("ok")]
    fallidos = [i for i in ids if i not in ok_ids]
    cerrar_acciones(bd, pedido["aviso_id"], ok_ids, fallidos)
    if not resultados:
        resultados = [{"id": i, "ok": False, "error": mensaje} for i in ids]
    bd.ejecutar("""UPDATE multitest_envios SET estado = ?, resultados = ?::jsonb, mensaje = ?, terminado_at = now(),
                   registros = '[]'::jsonb WHERE id = ?""",
                ("error" if mensaje else "ok", json.dumps(resultados, ensure_ascii=False), mensaje, pedido["id"]))
    log.info("Pedido %s: %d agregados y enviados, %d con error", pedido["id"], len(ok_ids), len(fallidos))


def latidos():
    """Hilo aparte con su propia conexión: el latido sigue aunque un envío tarde varios minutos."""
    bd = None
    while True:
        try:
            bd = bd or BD()
            latido(bd)
        except Exception as e:
            log.error("No se pudo marcar el latido: %s", e)
            if bd:
                bd.cerrar()
            bd = None
        time.sleep(CADA_LATIDO)


def main(argv=None):
    p = argparse.ArgumentParser(description="Servidor de envíos a Multitest (GTH)")
    p.add_argument("--ventana", action="store_true", help="muestra Chrome mientras trabaja")
    args = p.parse_args(argv)
    configurar_log()
    if BD().motor != "supabase":
        raise SystemExit("Falta SUPABASE_DB_URL en scraping\\.env")
    threading.Thread(target=latidos, daemon=True).start()
    log.info("Servidor de Multitest encendido en %s. Ctrl+C para apagarlo.", socket.gethostname())
    bd = None
    while True:
        try:
            if bd is None:
                bd = BD()
                recuperar_interrumpidos(bd)
            pedido = tomar_pedido(bd)
            if pedido:
                procesar(bd, pedido, args.ventana)
                continue
            time.sleep(CADA_REVISION)
        except KeyboardInterrupt:
            log.info("Servidor de Multitest apagado.")
            return 0
        except SystemExit:
            raise
        except Exception as e:  # sin internet, Supabase reiniciado…: se reconecta
            log.error("Error: %s. Reintento en 30 s.", e)
            if bd:
                bd.cerrar()
            bd = None
            time.sleep(30)


if __name__ == "__main__":
    sys.exit(main())
