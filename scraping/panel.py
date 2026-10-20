"""Panel temporal para operar el scraper con botones (solo para el equipo, no es la interfaz final).

Abrir:  python -m scraping.panel      (o doble clic en scraping\\abrir_panel.bat)

Cada botón abre su propio Chrome, entra a Bumeran (con la sesión guardada o, si caducó, con las
credenciales de scraping/.env) y va hasta donde le toca:
  1. Revisar postulantes nuevos -> lista de avisos Publicados; compara 'Recibidos' con el último CSV
  2. Descargar CSV              -> menú ⋮ de cada aviso -> "Exportar postulaciones (CSV)" -> importa a la BD
  3. Scrapear oferta            -> menú ⋮ de cada aviso -> "Ver aviso publicado" -> guarda descripción y requisitos
  4. Descargar PDFs             -> entra a cada aviso -> abre cada postulante -> baja su CV adjunto
Si seleccionas filas en la tabla, los botones 2-4 se aplican solo a esos avisos.
"""
import logging
import os
import queue
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import messagebox, ttk

from . import config
from .db import BD
from .run import configurar_log, leer_lista, paso_csv, paso_cvs, paso_detalle

log = logging.getLogger("scraper")
REFRESCAR = object()

COLUMNAS = [
    ("aviso_id", "ID aviso", 90), ("titulo", "Título", 290), ("publicado_el", "Publicado", 85),
    ("recibidos", "En Bumeran", 80), ("al_csv", "Al últ. CSV", 75), ("nuevos", "Nuevos", 60),
    ("en_bd", "En BD", 55), ("pdfs", "PDFs", 50), ("sin_adj", "Sin adj.", 60), ("errores", "Err.", 45),
    ("oferta", "Oferta", 55), ("ultimo_csv", "Último CSV", 130),
]

SQL_AVISOS = """
SELECT a.*, a.recibidos_al_scrapear AS al_csv,
       (SELECT COUNT(*) FROM postulaciones p WHERE p.aviso_id=a.aviso_id AND p.en_ultimo_csv=1) AS en_bd,
       (SELECT COUNT(*) FROM cvs c WHERE c.aviso_id=a.aviso_id AND c.estado='descargado') AS pdfs,
       (SELECT COUNT(*) FROM cvs c WHERE c.aviso_id=a.aviso_id AND c.estado='sin_adjunto') AS sin_adj,
       (SELECT COUNT(*) FROM cvs c WHERE c.aviso_id=a.aviso_id AND c.estado='error') AS errores
FROM avisos a
WHERE a.en_ultima_lista=1 AND lower(COALESCE(a.estado,'publicado'))='publicado'
ORDER BY a.publicado_el DESC, a.aviso_id DESC
"""


class ChromeCerrado(Exception):
    pass


class ColaHandler(logging.Handler):
    def __init__(self, cola):
        super().__init__()
        self.cola = cola

    def emit(self, record):
        self.cola.put(self.format(record))


def _nuevos(f):
    if f["recibidos"] is None:
        return ""
    if f["al_csv"] is None:
        return "sin CSV"
    return f["recibidos"] - f["al_csv"]


def _chrome_vivo(driver):
    try:
        driver.current_url
        return True
    except Exception:
        return False


class Panel:
    def __init__(self, root):
        self.root = root
        root.title("GTH · Scraper de Bumeran (panel temporal)")
        root.geometry("1280x740")
        configurar_log()
        self.cola = queue.Queue()
        h = ColaHandler(self.cola)
        h.setFormatter(logging.Formatter("%(asctime)s  %(levelname)-7s %(message)s", "%H:%M:%S"))
        log.addHandler(h)
        self.bd = BD()
        self.trabajando = False
        self.detener = threading.Event()

        self.var_solo_cambios = tk.BooleanVar(value=True)
        self.var_max_cvs = tk.IntVar(value=0)
        self._construir()
        self.refrescar_tabla()
        self.root.after(200, self._vaciar_cola)
        root.protocol("WM_DELETE_WINDOW", self._cerrar)

    # ------------------------------------------------------------------ interfaz
    def _construir(self):
        barra = ttk.Frame(self.root, padding=8)
        barra.pack(fill="x")
        self.botones = []
        for texto, cmd in [
            ("1. Revisar postulantes nuevos", self.accion_revisar),
            ("2. Descargar CSV", self.accion_csv),
            ("3. Scrapear oferta", self.accion_oferta),
            ("4. Descargar PDFs", self.accion_pdfs),
        ]:
            b = ttk.Button(barra, text=texto, command=cmd)
            b.pack(side="left", padx=4, ipady=4)
            self.botones.append(b)
        self.btn_detener = ttk.Button(barra, text="■ Detener", command=self.accion_detener, state="disabled")
        self.btn_detener.pack(side="left", padx=12, ipady=4)
        ttk.Button(barra, text="Abrir carpeta de datos", command=self.abrir_carpeta).pack(side="right", padx=4)
        ttk.Button(barra, text="Refrescar tabla", command=self.refrescar_tabla).pack(side="right", padx=4)

        opciones = ttk.Frame(self.root, padding=(8, 0, 8, 6))
        opciones.pack(fill="x")
        ttk.Checkbutton(opciones, text="Solo avisos con cambios / pendientes",
                        variable=self.var_solo_cambios).pack(side="left")
        ttk.Label(opciones, text="      Máx. PDFs por aviso (0 = todos):").pack(side="left")
        ttk.Spinbox(opciones, from_=0, to=1000, width=6, textvariable=self.var_max_cvs).pack(side="left", padx=4)
        ttk.Label(opciones, text="   Selecciona filas (Ctrl+clic) para aplicar 2-4 solo a esos avisos.",
                  foreground="#666").pack(side="left")

        cuerpo = ttk.PanedWindow(self.root, orient="vertical")
        cuerpo.pack(fill="both", expand=True, padx=8, pady=4)

        marco_tabla = ttk.Frame(cuerpo)
        self.tabla = ttk.Treeview(marco_tabla, columns=[c[0] for c in COLUMNAS], show="headings",
                                  selectmode="extended", height=13)
        for clave, titulo, ancho in COLUMNAS:
            self.tabla.heading(clave, text=titulo)
            self.tabla.column(clave, width=ancho, anchor="w" if clave == "titulo" else "center")
        self.tabla.tag_configure("cambio", background="#fff4c2")
        self.tabla.tag_configure("error", background="#ffd9d9")
        self.tabla.bind("<Double-1>", self._abrir_pdfs_aviso)
        sb = ttk.Scrollbar(marco_tabla, orient="vertical", command=self.tabla.yview)
        self.tabla.configure(yscrollcommand=sb.set)
        self.tabla.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        cuerpo.add(marco_tabla, weight=3)

        marco_log = ttk.Frame(cuerpo)
        self.txt = tk.Text(marco_log, height=12, font=("Consolas", 9), wrap="none", state="disabled",
                           background="#1e1e1e", foreground="#dcdcdc")
        sb2 = ttk.Scrollbar(marco_log, orient="vertical", command=self.txt.yview)
        self.txt.configure(yscrollcommand=sb2.set)
        self.txt.pack(side="left", fill="both", expand=True)
        sb2.pack(side="right", fill="y")
        cuerpo.add(marco_log, weight=2)

        self.estado = ttk.Label(self.root, text="Listo.", padding=(8, 4), anchor="w")
        self.estado.pack(fill="x")

    def refrescar_tabla(self):
        seleccion = set(self.tabla.selection())
        self.tabla.delete(*self.tabla.get_children())
        filas = self.bd.consultar(SQL_AVISOS)
        con_cambios = 0
        for f in filas:
            nuevos = _nuevos(f)
            valores = {
                "aviso_id": f["aviso_id"], "titulo": f["titulo"] or "", "publicado_el": f["publicado_el"] or "",
                "recibidos": "" if f["recibidos"] is None else f["recibidos"],
                "al_csv": "" if f["al_csv"] is None else f["al_csv"],
                "nuevos": f"+{nuevos}" if isinstance(nuevos, int) and nuevos > 0 else nuevos,
                "en_bd": f["en_bd"], "pdfs": f["pdfs"], "sin_adj": f["sin_adj"], "errores": f["errores"],
                "oferta": "✓" if f["detalle_at"] else "", "ultimo_csv": (f["ultimo_csv_at"] or "")[:19].replace("T", " "),
            }
            cambio = nuevos not in ("", 0)
            con_cambios += cambio
            tag = "error" if f["errores"] else ("cambio" if cambio else "")
            self.tabla.insert("", "end", iid=f["aviso_id"], values=[valores[c[0]] for c in COLUMNAS],
                              tags=(tag,) if tag else ())
        for iid in seleccion & set(self.tabla.get_children()):
            self.tabla.selection_add(iid)
        if not self.trabajando:
            self.estado.config(text=f"{len(filas)} avisos publicados en la BD · {con_cambios} con postulantes "
                                    "nuevos o sin CSV (amarillo). Doble clic en un aviso abre su carpeta de PDFs.")

    def _vaciar_cola(self):
        try:
            while True:
                item = self.cola.get_nowait()
                if item is REFRESCAR:
                    self.refrescar_tabla()
                    continue
                self.txt.configure(state="normal")
                self.txt.insert("end", item + "\n")
                self.txt.see("end")
                self.txt.configure(state="disabled")
        except queue.Empty:
            pass
        self.root.after(200, self._vaciar_cola)

    def _abrir(self, ruta):
        ruta.mkdir(parents=True, exist_ok=True)
        if sys.platform.startswith("win"):
            os.startfile(str(ruta))
        else:
            subprocess.Popen(["xdg-open", str(ruta)])

    def abrir_carpeta(self):
        self._abrir(config.DATA_DIR)

    def _abrir_pdfs_aviso(self, evento):
        fila = self.tabla.identify_row(evento.y)
        if fila:
            self._abrir(config.carpeta_aviso(fila, self.tabla.set(fila, "titulo")))

    # ------------------------------------------------------------------ ejecución en segundo plano
    def _lanzar(self, nombre, trabajo):
        if self.trabajando:
            messagebox.showinfo("En curso", "Ya hay una tarea en curso. Espera o presiona Detener.")
            return
        self.trabajando = True
        self.detener.clear()
        for b in self.botones:
            b.state(["disabled"])
        self.btn_detener.state(["!disabled"])
        self.estado.config(text=f"En curso: {nombre} …")
        opciones = {"solo_cambios": self.var_solo_cambios.get(),
                    "max_cvs": self.var_max_cvs.get() or None, "ids": list(self.tabla.selection())}

        def hilo():
            from .bumeran import asegurar_sesion
            from .navegador import crear_driver
            bd = BD()
            driver = None
            run = bd.iniciar_run(nombre)
            try:
                log.info("════ %s ════", nombre)
                log.info("Abriendo Chrome…")
                driver = crear_driver()
                asegurar_sesion(driver)          # usa la sesión guardada; si caducó, ingresa con .env
                trabajo(driver, bd, opciones)
                estado = "interrumpido" if self.detener.is_set() else "ok"
                bd.cerrar_run(run, estado)
                log.info("════ %s: %s ════", nombre, "detenido" if estado == "interrumpido" else "terminado")
            except ChromeCerrado:
                log.error("Se cerró la ventana de Chrome; la tarea se detuvo. Lo avanzado quedó guardado.")
                bd.cerrar_run(run, "interrumpido", mensaje="Chrome cerrado")
            except Exception as e:
                if driver is not None and not _chrome_vivo(driver):
                    log.error("Se cerró la ventana de Chrome; la tarea se detuvo. Lo avanzado quedó guardado.")
                else:
                    log.exception("Error en %s: %s", nombre, e)
                bd.cerrar_run(run, "error", mensaje=str(e))
            finally:
                if driver is not None:
                    try:
                        driver.quit()
                    except Exception:
                        pass
                bd.cerrar()
                self.cola.put(REFRESCAR)
                self.root.after(0, self._fin)

        threading.Thread(target=hilo, daemon=True).start()

    def _fin(self):
        self.trabajando = False
        for b in self.botones:
            b.state(["!disabled"])
        self.btn_detener.state(["disabled"])
        self.refrescar_tabla()

    def accion_detener(self):
        self.detener.set()
        self.estado.config(text="Deteniendo después del paso actual …")
        log.info("Se pidió detener; termina el paso actual y para.")

    def _cerrar(self):
        if self.trabajando and not messagebox.askyesno("Salir", "Hay una tarea en curso. ¿Detener y salir?"):
            return
        self.detener.set()
        self.root.destroy()

    # ------------------------------------------------------------------ pasos
    def _leer_lista(self, driver, bd):
        """Lista de avisos Publicados con contadores frescos de Bumeran."""
        avisos = leer_lista(driver, bd)
        self.cola.put(REFRESCAR)
        return avisos

    def _objetivo(self, bd, ids):
        filas = bd.consultar(SQL_AVISOS)
        return [f for f in filas if not ids or f["aviso_id"] in ids]

    def _recorrer(self, driver, bd, opciones, funcion):
        from .navegador import pausa
        avisos = self._objetivo(bd, opciones["ids"])
        for i, a in enumerate(avisos, 1):
            if self.detener.is_set():
                return
            log.info("── [%d/%d] %s · %s", i, len(avisos), a["aviso_id"], a["titulo"])
            funcion(a)
            self.cola.put(REFRESCAR)
            if not _chrome_vivo(driver):
                raise ChromeCerrado()
            if i < len(avisos):
                pausa(config.PAUSA_AVISO)

    def accion_revisar(self):
        def trabajo(driver, bd, op):
            avisos = self._leer_lista(driver, bd)
            cambios = 0
            for a in avisos:
                g = bd.aviso(a["aviso_id"])
                if g["recibidos_al_scrapear"] is None:
                    log.info("%s · %s: sin CSV todavía (%s postulantes)", a["aviso_id"], a["titulo"], g["recibidos"])
                    cambios += 1
                elif g["recibidos"] != g["recibidos_al_scrapear"]:
                    log.info("%s · %s: %+d postulantes desde el último CSV", a["aviso_id"], a["titulo"],
                             g["recibidos"] - g["recibidos_al_scrapear"])
                    cambios += 1
            log.info("%d avisos publicados, %d con postulantes nuevos o sin CSV.", len(avisos), cambios)
        self._lanzar("Revisar postulantes nuevos", trabajo)

    def accion_csv(self):
        def trabajo(driver, bd, op):
            self._leer_lista(driver, bd)          # contadores frescos para decidir qué bajar
            self._recorrer(driver, bd, op, lambda a: paso_csv(driver, bd, a, forzar=not op["solo_cambios"]))
        self._lanzar("Descargar CSV", trabajo)

    def accion_oferta(self):
        def trabajo(driver, bd, op):
            if not self._objetivo(bd, []):
                self._leer_lista(driver, bd)
            self._recorrer(driver, bd, op, lambda a: paso_detalle(driver, bd, a, forzar=not op["solo_cambios"]))
        self._lanzar("Scrapear oferta", trabajo)

    def accion_pdfs(self):
        def trabajo(driver, bd, op):
            if not self._objetivo(bd, []):
                self._leer_lista(driver, bd)
            self._recorrer(driver, bd, op, lambda a: paso_cvs(driver, bd, a, max_cvs=op["max_cvs"],
                                                              detener=self.detener.is_set,
                                                              solo_pendientes=op["solo_cambios"]))
        self._lanzar("Descargar PDFs", trabajo)


def main():
    root = tk.Tk()
    try:
        ttk.Style().theme_use("vista" if sys.platform.startswith("win") else "clam")
    except tk.TclError:
        pass
    Panel(root)
    root.mainloop()


if __name__ == "__main__":
    main()
