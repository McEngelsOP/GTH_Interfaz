"""Servidor de GTH: corre en la laptop de GTH mientras esté prendida (envíos a Multitest y recálculo de puntaje).

La web deja los pedidos en Supabase y este proceso:
  - marca su latido en servidor_latido cada pocos segundos (si deja de hacerlo, la web muestra «Servidor apagado»);
  - «Enviar Multitest» (Avance de candidatos, tabla multitest_envios): corre scripts/multitest-envio.mjs (Playwright +
    Chrome) y confirma en gth_acciones a los candidatos agregados y libera a los que fallaron, aunque la web esté cerrada;
  - «Recalcular puntaje» (Requisitos y pesos, tabla ranking_recalculos): recalcula el ranking e5 del aviso con los
    requisitos y pesos guardados (scraping/ranking.py) y lo deja en ranking_embeddings;
  - cada 5 minutos revisa Bumeran (python -m scraping.run --rapido, con la ventana de Chrome: sin ventana Bumeran lo
    bloquea): lee la lista de avisos y solo entra a los nuevos o con postulantes nuevos (CSV, oferta, ranking y CV en
    PDF). El detalle queda en data\\scraper.log.

Uso (desde la raíz del repo, o doble clic en scraping\\iniciar_servidor_gth.bat):
  python -m scraping.multitest_servidor                 Chrome de Multitest sin ventana
  python -m scraping.multitest_servidor --ventana       Chrome de Multitest visible (para ver qué hace)
  python -m scraping.multitest_servidor --sin-scraping  sin la revisión de Bumeran cada 5 minutos
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
log_ranking = logging.getLogger("scraper")   # mensajes de scraping/ranking.py
RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "automatizacion" / "multitest"
SERVICIO = "multitest"
CADA_LATIDO = 15        # segundos; la web considera apagado al servidor tras 90 s sin latido
CADA_REVISION = 5
LIMITE_ENVIO = 30 * 60  # un envío que tarde más se corta
CADA_SCRAPING = 5 * 60  # pausa entre el fin de una revisión de Bumeran y el inicio de la siguiente
LIMITE_SCRAPING = 45 * 60   # una revisión que tarde más (p. ej. Bumeran pide captcha y nadie lo resuelve) se corta


def configurar_log():
    config.asegurar_directorios()
    fmt = logging.Formatter("%(asctime)s %(levelname)-7s %(message)s", "%Y-%m-%d %H:%M:%S")
    manejadores = (logging.StreamHandler(sys.stdout),
                   logging.FileHandler(Path(config.LOG_PATH).with_name("multitest_servidor.log"), encoding="utf-8"))
    for h in manejadores:
        h.setFormatter(fmt)
    for registro in (log, log_ranking):
        registro.setLevel(logging.INFO)
        registro.handlers.clear()
        for h in manejadores:
            registro.addHandler(h)


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


def recuperar_recalculos(bd: BD):
    """Recálculos que quedaron «en curso» porque la laptop se apagó: vuelven a la cola."""
    bd.ejecutar("UPDATE ranking_recalculos SET estado = 'pendiente', tomado_at = NULL WHERE estado = 'en_curso'")


def tomar_recalculo(bd: BD):
    return bd.uno("""UPDATE ranking_recalculos SET estado = 'en_curso', tomado_at = now()
                     WHERE id = (SELECT id FROM ranking_recalculos WHERE estado = 'pendiente'
                                 ORDER BY creado_at LIMIT 1 FOR UPDATE SKIP LOCKED)
                     RETURNING id, aviso_id, tomado_at""")


def recalcular(bd: BD, pedido):
    """Recalcula el ranking del aviso con sus requisitos y pesos guardados. Los demás pedidos pendientes del mismo aviso
    se cierran con este: ya leen los mismos pesos."""
    from . import ranking
    aviso_id = pedido["aviso_id"]
    log.info("Recálculo %s: aviso %s", pedido["id"], aviso_id)
    run = bd.iniciar_run("ranking", aviso_id)
    estado = "ok"
    try:
        if not ranking.disponible():
            raise RuntimeError("falta el módulo matching/embeddings en esta laptop")
        n = ranking.paso_ranking(bd, {"aviso_id": aviso_id})
        bd.cerrar_run(run, "ok", n)
        mensaje = f"Puntaje recalculado ({n} postulantes)." if n else "El ranking ya estaba al día con estos requisitos y pesos."
    except Exception as e:
        bd.cx.rollback()
        bd.cerrar_run(run, "error", mensaje=str(e)[:500])
        log.exception("Recálculo %s falló", pedido["id"])
        estado, mensaje = "error", "No se pudo recalcular el puntaje. Revisa el registro del servidor en la laptop de GTH."
    bd.ejecutar("""UPDATE ranking_recalculos SET estado = ?, mensaje = ?, terminado_at = now()
                   WHERE id = ? OR (aviso_id = ? AND estado = 'pendiente' AND creado_at <= ?)""",
                (estado, mensaje, pedido["id"], aviso_id, pedido["tomado_at"]))
    log.info("Recálculo %s: %s", pedido["id"], mensaje)


def revisar_bumeran():
    """Una revisión de Bumeran en un proceso aparte (Chrome con la sesión guardada); si se cuelga, se corta entera.
    Chrome va con ventana: Bumeran (Cloudflare) bloquea Chrome sin ventana."""
    t = time.time()
    cmd = [sys.executable, "-m", "scraping.run", "--rapido"]
    proceso = subprocess.Popen(cmd, cwd=RAIZ, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        codigo = proceso.wait(timeout=LIMITE_SCRAPING)
        log.info("Revisión de Bumeran %s en %.0f s", "terminada" if codigo == 0 else f"con errores (código {codigo})",
                 time.time() - t)
    except subprocess.TimeoutExpired:
        # /T también cierra el Chrome que abrió, para no dejar bloqueado el perfil con la sesión de Bumeran
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proceso.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log.error("La revisión de Bumeran tardó más de %d min y se cortó (¿pidió captcha o ingreso a mano?). "
                  "Revisa data\\scraper.log.", LIMITE_SCRAPING // 60)


def scraping_periodico():
    """Hilo aparte: revisa Bumeran cada 5 minutos mientras el servidor esté prendido."""
    while True:
        try:
            revisar_bumeran()
        except Exception as e:
            log.error("No se pudo revisar Bumeran: %s", e)
        time.sleep(CADA_SCRAPING)


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
    p = argparse.ArgumentParser(description="Servidor de GTH: envíos a Multitest, recálculo de puntaje y revisión de Bumeran")
    p.add_argument("--ventana", action="store_true", help="muestra Chrome mientras trabaja")
    p.add_argument("--sin-scraping", action="store_true", help="no revisa Bumeran cada 5 minutos")
    args = p.parse_args(argv)
    configurar_log()
    if BD().motor != "supabase":
        raise SystemExit("Falta SUPABASE_DB_URL en scraping\\.env")
    threading.Thread(target=latidos, daemon=True).start()
    if not args.sin_scraping:
        threading.Thread(target=scraping_periodico, daemon=True).start()
    log.info("Servidor de GTH (Multitest, recálculo de puntaje%s) encendido en %s. Ctrl+C para apagarlo.",
             "" if args.sin_scraping else " y revisión de Bumeran cada 5 min", socket.gethostname())
    bd = None
    while True:
        try:
            if bd is None:
                bd = BD()
                recuperar_interrumpidos(bd)
                recuperar_recalculos(bd)
            pedido = tomar_pedido(bd)
            if pedido:
                procesar(bd, pedido, args.ventana)
                continue
            pedido = tomar_recalculo(bd)
            if pedido:
                recalcular(bd, pedido)
                continue
            time.sleep(CADA_REVISION)
        except KeyboardInterrupt:
            log.info("Servidor de GTH apagado.")
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
