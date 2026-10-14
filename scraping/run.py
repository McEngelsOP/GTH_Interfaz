"""Orquestador del scraping de Bumeran.

Uso (desde la carpeta raíz del repo):
  python -m scraping.run                      sincroniza todo: lista, CSV de avisos nuevos/cambiados,
                                              detalle de avisos nuevos y CVs adjuntos pendientes
  python -m scraping.run --solo-lista         solo lee la lista de avisos (rápido, para probar)
  python -m scraping.run --aviso 1118437785   solo ese aviso
  python -m scraping.run --sin-cvs            no descarga los PDF adjuntos
  python -m scraping.run --solo-pdfs          solo los PDFs de cada aviso (sin CSV ni oferta)
  python -m scraping.run --max-cvs 3          descarga como máximo 3 CVs por aviso (prueba)
  python -m scraping.run --forzar             vuelve a descargar aunque no haya cambios
  python -m scraping.run --estado             muestra lo que hay en la BD (sin abrir Chrome)
  python -m scraping.run --importar-csv X.csv importa un CSV ya descargado (sin abrir Chrome)
  python -m scraping.run --solo-ranking       calcula el ranking e5 de los avisos guardados (sin Chrome)
  python -m scraping.run --subir-drive        sube a Google Drive los PDFs que falten
  python -m scraping.run --subir-drive RUTA   importa y sube una carpeta 'cvs' de otra PC (p. ej. la de Will)
"""
import argparse
import json
import logging
import sys
from pathlib import Path

from . import config
from .csv_bumeran import leer_csv
from .db import BD, ahora

log = logging.getLogger("scraper")


def configurar_log():
    config.asegurar_directorios()
    fmt = logging.Formatter("%(asctime)s %(levelname)-7s %(message)s", "%H:%M:%S")
    log.setLevel(logging.INFO)
    log.handlers.clear()
    consola = logging.StreamHandler(sys.stdout)
    consola.setFormatter(fmt)
    archivo = logging.FileHandler(config.LOG_PATH, encoding="utf-8")
    archivo.setFormatter(logging.Formatter("%(asctime)s %(levelname)-7s %(message)s"))
    log.addHandler(consola)
    log.addHandler(archivo)


def _a_int(v):
    try:
        return int(str(v).replace(".", "").replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def mostrar_estado(bd: BD):
    filas = bd.consultar("""
        SELECT a.aviso_id, a.titulo, a.publicado_el, a.recibidos, a.ultimo_csv_at, a.ultimo_cvs_at,
               (SELECT COUNT(*) FROM postulaciones p WHERE p.aviso_id=a.aviso_id AND p.en_ultimo_csv=1) AS en_bd,
               (SELECT COUNT(*) FROM cvs c WHERE c.aviso_id=a.aviso_id AND c.estado='descargado') AS pdfs,
               (SELECT COUNT(*) FROM cvs c WHERE c.aviso_id=a.aviso_id AND c.estado='error') AS errores
        FROM avisos a WHERE a.en_ultima_lista=1 ORDER BY a.publicado_el DESC""")
    print(f"\nBase de datos: {'Supabase' if bd.motor == 'supabase' else 'SQLite local'}")
    print(f"{'Aviso':<11} {'Publicado':<10} {'Bumeran':>7} {'En BD':>6} {'PDFs':>5} {'Err':>4}  {'Último CSV':<19}  Título")
    for f in filas:
        print(f"{f['aviso_id']:<11} {f['publicado_el'] or '':<10} {f['recibidos'] or 0:>7} {f['en_bd']:>6} "
              f"{f['pdfs']:>5} {f['errores']:>4}  {(f['ultimo_csv_at'] or '-')[:19]:<19}  {(f['titulo'] or '')[:45]}")
    print()


def importar_csv_local(bd: BD, ruta, aviso_id=None):
    meta, filas = leer_csv(ruta)
    aviso_id = aviso_id or meta.get("aviso_id")
    if not aviso_id:
        raise SystemExit("El CSV no trae 'ID de aviso'; indícalo con --aviso")
    bd.crear_aviso(aviso_id, meta.get("titulo"), meta.get("fecha_publicacion"))
    nuevos, total = bd.importar_csv(aviso_id, filas)
    bd.marcar(aviso_id, ultimo_csv_at=ahora())
    print(f"Aviso {aviso_id} ({meta.get('titulo')}): {total} postulantes en el CSV, {nuevos} nuevos.")


def escribir_csv_con_ids(bd: BD, aviso: dict):
    """Deja en la carpeta del aviso 'postulantes_<aviso>.csv': el CSV de Bumeran con dos columnas
    al inicio, id_postulante (alopez888) y cv_pdf (nombre del PDF de esa persona, si ya se bajó)."""
    import csv
    filas = bd.postulantes_con_cv(aviso["aviso_id"])
    if not filas:
        return None
    carpeta = config.carpeta_aviso(aviso["aviso_id"], aviso.get("titulo"))
    carpeta.mkdir(parents=True, exist_ok=True)
    columnas, datos = ["id_postulante", "cv_pdf"], []
    for f in filas:
        original = f["datos_json"] if isinstance(f["datos_json"], dict) else json.loads(f["datos_json"])
        columnas += [c for c in original if c not in columnas]
        datos.append({"id_postulante": f["id_postulante"],
                      "cv_pdf": Path(f["cv_archivo"]).name if f.get("cv_archivo") else "", **original})
    ruta = carpeta / f"postulantes_{aviso['aviso_id']}.csv"
    with open(ruta, "w", encoding="utf-8-sig", newline="") as fh:   # utf-8-sig: Excel lo abre bien
        w = csv.DictWriter(fh, fieldnames=columnas, delimiter=";", extrasaction="ignore")
        w.writeheader()
        w.writerows(datos)
    return ruta


def escribir_indice_pdfs(bd: BD, aviso: dict):
    """Deja en la carpeta del aviso 'indice_pdfs_<aviso>.csv': qué PDF es de quién según su perfil en
    Bumeran (DNI y correo). Sirve para unir los PDFs con el CSV de postulantes por DNI, sin depender
    de que el ID armado desde el nombre coincida."""
    import csv
    filas = bd.consultar("SELECT card_id, documento, email, archivo, estado FROM cvs WHERE aviso_id=? "
                         "ORDER BY archivo", (aviso["aviso_id"],))
    if not filas:
        return None
    carpeta = config.carpeta_aviso(aviso["aviso_id"], aviso.get("titulo"))
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta = carpeta / f"indice_pdfs_{aviso['aviso_id']}.csv"
    with open(ruta, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["id_postulante", "archivo_pdf", "dni", "email", "estado", "card_bumeran"])
        for f in filas:
            nombre = Path(f["archivo"]).name if f["archivo"] else ""
            w.writerow([Path(nombre).stem, nombre, f["documento"], f["email"], f["estado"], f["card_id"]])
    return ruta


def subir_a_drive(bd: BD, carpeta_externa=None):
    """Sube a Google Drive los PDFs pendientes.
    Sin carpeta: los CVs ya registrados que no se pudieron subir antes.
    Con carpeta (p. ej. la carpeta 'cvs' que entrega otra PC con --solo-pdfs): por cada subcarpeta
    '<ID aviso> - <título>' lee su indice_pdfs_<ID>.csv, copia los PDFs a data/cvs, los registra en la BD
    (DNI y correo del perfil, para unirlos con el CSV) y los sube."""
    import csv
    import re
    import shutil
    from . import almacen
    if not almacen.configurado():
        raise SystemExit("Falta scraping/google_credentials.json (ver README, sección Google Drive).")
    almacen.compartir_con_enlace()
    subidos = 0
    if carpeta_externa is None:
        for c in bd.cvs_sin_drive():
            ruta = Path(c["archivo"])
            if not ruta.exists():
                log.warning("No existe el archivo local de %s/%s", c["aviso_id"], c["card_id"])
                continue
            drive_id, url = almacen.subir_cv(ruta, ruta.parent.name)
            if drive_id:
                bd.marcar_drive(c["aviso_id"], c["card_id"], drive_id, url)
                subidos += 1
        log.info("Subidos a Google Drive: %d PDFs pendientes", subidos)
        return subidos
    for sub in sorted(Path(carpeta_externa).iterdir()):
        m = re.match(r"(\d{6,})(?: - (.*))?$", sub.name)
        indice = sub / f"indice_pdfs_{m.group(1)}.csv" if m else None
        if not m or not indice.exists():
            continue
        aviso_id, titulo = m.group(1), m.group(2)
        bd.crear_aviso(aviso_id, titulo)
        destino = config.carpeta_aviso(aviso_id, (bd.aviso(aviso_id) or {}).get("titulo") or titulo)
        with open(indice, encoding="utf-8-sig", newline="") as fh:
            filas = list(csv.DictReader(fh, delimiter=";"))
        n = 0
        for f in filas:
            card = f.get("card_bumeran")
            if not card or bd.uno("SELECT 1 AS x FROM cvs WHERE aviso_id=? AND card_id=? AND "
                                  "(drive_id IS NOT NULL OR estado='sin_adjunto')", (aviso_id, card)):
                continue
            datos = {"documento": f.get("dni"), "email": f.get("email")}
            origen = sub / f["archivo_pdf"] if f.get("archivo_pdf") else None
            if f.get("estado") == "descargado" and origen and origen.exists():
                destino.mkdir(parents=True, exist_ok=True)
                copia = destino / origen.name
                if not copia.exists():
                    shutil.copy2(origen, copia)
                bd.guardar_cv(aviso_id, card, **datos, tiene_adjunto=True, archivo=str(copia), estado="descargado")
                n += 1
            elif f.get("estado") == "sin_adjunto":
                bd.guardar_cv(aviso_id, card, **datos, tiene_adjunto=False, estado="sin_adjunto")
        log.info("Aviso %s: %d PDFs registrados y subidos a Google Drive", aviso_id, n)
        subidos += n
    return subidos


def paso_csv(driver, bd: BD, aviso: dict, forzar=False) -> bool:
    """Descarga e importa el CSV del aviso si cambió 'Recibidos' (o siempre con forzar). True si lo bajó."""
    from .bumeran import exportar_csv
    from .navegador import reintentar
    aviso_id = aviso["aviso_id"]
    necesita, motivo = bd.necesita_csv(aviso_id, forzar=forzar)
    if not necesita:
        log.info("CSV al día (%s)", motivo)
        return False
    log.info("Descargando CSV (%s)", motivo)
    run = bd.iniciar_run("csv", aviso_id)
    try:
        ruta = reintentar(exportar_csv, driver, aviso, nombre="exportar csv", driver=driver)
        meta, filas = leer_csv(ruta)
        if meta.get("aviso_id") and meta["aviso_id"] != aviso_id:
            raise ValueError(f"El CSV descargado es del aviso {meta['aviso_id']}, no del {aviso_id}")
        nuevos, total = bd.importar_csv(aviso_id, filas)
        bd.marcar(aviso_id, recibidos_al_scrapear=_a_int(aviso.get("recibidos")), ultimo_csv_at=ahora())
        bd.cerrar_run(run, "ok", nuevos, total, ruta.name)
        log.info("CSV importado: %d postulantes, %d nuevos", total, nuevos)
        escribir_csv_con_ids(bd, aviso)
        return True
    except Exception as e:
        bd.cerrar_run(run, "error", mensaje=str(e))
        log.error("No se pudo obtener el CSV del aviso %s: %s", aviso_id, e)
        return False


def paso_detalle(driver, bd: BD, aviso: dict, forzar=False):
    """Guarda la oferta publicada (descripción, requisitos, modalidad...). Una sola vez salvo forzar."""
    from .bumeran import obtener_detalle
    from .navegador import reintentar
    aviso_id = aviso["aviso_id"]
    guardado = bd.aviso(aviso_id)
    if guardado["detalle_at"] is not None and not forzar:
        log.info("Oferta ya guardada")
        return
    run = bd.iniciar_run("detalle", aviso_id)
    try:
        detalle = reintentar(obtener_detalle, driver, aviso, guardado["url_publica"],
                             nombre="detalle aviso", driver=driver)
        bd.guardar_detalle(aviso_id, detalle)
        bd.cerrar_run(run, "ok")
        log.info("Oferta guardada (%d caracteres)", len(detalle.get("descripcion_texto") or ""))
    except Exception as e:
        bd.cerrar_run(run, "error", mensaje=str(e))
        log.error("No se pudo leer el aviso público %s: %s", aviso_id, e)


def paso_cvs(driver, bd: BD, aviso: dict, max_cvs=None, detener=None, solo_pendientes=False, asegurar_csv=True,
             usar_csv=True):
    """Descarga el CV adjunto de los postulantes que aún no se tienen. Cada PDF se guarda con el ID del
    postulante, que sale del CSV: por eso antes se baja el CSV si está desactualizado."""
    from .bumeran import descargar_cvs
    aviso_id = aviso["aviso_id"]
    if asegurar_csv:
        paso_csv(driver, bd, aviso)
    if solo_pendientes:
        pendientes = bd.contar_postulaciones(aviso_id) - bd.contar_cvs_resueltos(aviso_id)
        a = bd.aviso(aviso_id)
        cambio = a["recibidos"] is not None and a["recibidos"] != a["recibidos_al_scrapear"]
        if pendientes <= 0 and not cambio and a["ultimo_cvs_at"]:
            log.info("CVs al día")
            return
    run = bd.iniciar_run("cvs", aviso_id)
    try:
        est = descargar_cvs(driver, bd, aviso, max_nuevos=max_cvs, detener=detener, usar_csv=usar_csv)
        bd.marcar(aviso_id, ultimo_cvs_at=ahora())
        bd.cerrar_run(run, "ok" if est["errores"] == 0 else "error", est["descargados"], None, str(est))
        log.info("CVs: %s", est)
    except Exception as e:
        bd.cerrar_run(run, "error", mensaje=str(e))
        log.error("Falló la descarga de CVs del aviso %s: %s", aviso_id, e)
    finally:
        escribir_indice_pdfs(bd, aviso)
        if usar_csv:
            escribir_csv_con_ids(bd, aviso)


def paso_ranking_seguro(bd: BD, aviso: dict, forzar=False):
    """Ranking por embeddings del aviso (ver ranking.py). Si falla, se registra y la corrida sigue."""
    from . import ranking
    if not ranking.disponible():
        log.info("Ranking omitido: no está el módulo matching/embeddings")
        return
    run = bd.iniciar_run("ranking", aviso["aviso_id"])
    try:
        n = ranking.paso_ranking(bd, aviso, forzar=forzar)
        bd.cerrar_run(run, "ok", n)
    except Exception as e:
        bd.cerrar_run(run, "error", mensaje=str(e))
        log.exception("No se pudo calcular el ranking del aviso %s: %s", aviso["aviso_id"], e)


def procesar_aviso(driver, bd: BD, aviso: dict, args):
    log.info("── Aviso %s · %s", aviso["aviso_id"], aviso.get("titulo"))
    if args.solo_pdfs:      # solo PDFs: el nombre de cada PDF sale del perfil, sin CSV
        paso_cvs(driver, bd, aviso, max_cvs=args.max_cvs, solo_pendientes=True, asegurar_csv=False,
                 usar_csv=False)
        return
    bajo_csv = paso_csv(driver, bd, aviso, forzar=args.forzar)
    paso_detalle(driver, bd, aviso, forzar=args.forzar)
    if not args.sin_ranking:
        paso_ranking_seguro(bd, aviso)
    if not args.sin_cvs:
        paso_cvs(driver, bd, aviso, max_cvs=args.max_cvs, solo_pendientes=not (bajo_csv or args.forzar),
                 asegurar_csv=False)


def main(argv=None):
    p = argparse.ArgumentParser(description="Scraper de Bumeran para GTH")
    p.add_argument("--aviso", help="ID de un aviso concreto")
    p.add_argument("--solo-lista", action="store_true")
    p.add_argument("--sin-cvs", action="store_true")
    p.add_argument("--solo-pdfs", action="store_true",
                   help="solo los CVs en PDF de cada aviso (sin CSV ni oferta); el nombre sale del perfil")
    p.add_argument("--sin-ranking", action="store_true", help="no calcula el ranking por embeddings")
    p.add_argument("--solo-ranking", action="store_true",
                   help="solo calcula el ranking de los avisos ya guardados (sin abrir Chrome); con --forzar, completo")
    p.add_argument("--max-cvs", type=int, default=None)
    p.add_argument("--forzar", action="store_true")
    p.add_argument("--headless", action="store_true", help="Chrome sin ventana (solo cuando ya funcione bien)")
    p.add_argument("--estado", action="store_true")
    p.add_argument("--importar-csv", metavar="RUTA")
    p.add_argument("--subir-drive", metavar="CARPETA", nargs="?", const="",
                   help="sube a Google Drive los PDFs pendientes; con CARPETA, importa una carpeta 'cvs' externa")
    args = p.parse_args(argv)

    configurar_log()
    bd = BD()

    if args.estado:
        mostrar_estado(bd)
        return
    if args.importar_csv:
        importar_csv_local(bd, args.importar_csv, args.aviso)
        return
    if args.subir_drive is not None:
        subir_a_drive(bd, args.subir_drive or None)
        return
    if args.solo_ranking:
        avisos = bd.consultar("SELECT aviso_id, titulo FROM avisos WHERE en_ultima_lista=1 AND ultimo_csv_at IS NOT NULL "
                              "ORDER BY publicado_el DESC")
        avisos = [a for a in avisos if not args.aviso or a["aviso_id"] == args.aviso]
        for i, a in enumerate(avisos, 1):
            log.info("── [%d/%d] Ranking %s · %s", i, len(avisos), a["aviso_id"], a["titulo"])
            paso_ranking_seguro(bd, a, forzar=args.forzar)
        return

    from .bumeran import asegurar_sesion, leer_avisos
    from .navegador import crear_driver, pausa, reintentar, volcar_debug

    corrida = bd.iniciar_run("corrida", args.aviso)
    estado_final, mensaje = "ok", ""
    driver = crear_driver(headless=args.headless)
    try:
        asegurar_sesion(driver)
        run = bd.iniciar_run("lista")
        avisos = reintentar(leer_avisos, driver, nombre="leer lista de avisos", driver=driver)
        bd.upsert_lista(avisos)
        bd.cerrar_run(run, "ok", total=len(avisos))

        if not args.solo_lista:
            objetivo = [a for a in avisos if not args.aviso or a["aviso_id"] == args.aviso]
            if args.aviso and not objetivo:
                raise SystemExit(f"El aviso {args.aviso} no está entre los avisos '{config.ESTADO_OBJETIVO}'")
            objetivo.sort(key=lambda a: a.get("publicado_el") or "", reverse=True)
            for i, aviso in enumerate(objetivo, 1):
                log.info("[%d/%d]", i, len(objetivo))
                procesar_aviso(driver, bd, aviso, args)
                try:
                    driver.current_url
                except Exception as e:
                    raise RuntimeError("Chrome se cerró o dejó de responder") from e
                pausa(config.PAUSA_AVISO)
    except KeyboardInterrupt:
        estado_final, mensaje = "interrumpido", "Detenido por el usuario"
        log.warning("Detenido por el usuario. Lo avanzado quedó guardado.")
    except Exception as e:
        estado_final, mensaje = "error", str(e)
        log.exception("Error general: %s", e)
        volcar_debug(driver, "error_general")
    finally:
        try:
            driver.quit()
        except Exception:
            pass
        bd.cerrar_run(corrida, estado_final, mensaje=mensaje)
    mostrar_estado(bd)
    return 0 if estado_final == "ok" else 1      # el .bat lo usa para reintentar


if __name__ == "__main__":
    sys.exit(main())
