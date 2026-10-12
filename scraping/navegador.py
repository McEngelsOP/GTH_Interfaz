"""Utilidades de Selenium: crear Chrome, esperas, clics robustos, descargas y volcados de diagnóstico."""
import logging
import os
import random
import shutil
import time
from datetime import datetime
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import (ElementClickInterceptedException,
                                        ElementNotInteractableException,
                                        StaleElementReferenceException)
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait

from . import config

log = logging.getLogger("scraper")


def crear_driver(headless=False) -> webdriver.Chrome:
    opts = webdriver.ChromeOptions()
    opts.add_argument(f"--user-data-dir={config.PERFIL_CHROME_DIR}")
    opts.add_argument("--window-size=1500,1000")
    opts.add_argument("--lang=es-PE")
    if headless:
        opts.add_argument("--headless=new")
    # Sin gestor de contraseñas: evita los avisos de Chrome ("Cambia la contraseña", "¿Guardar contraseña?")
    opts.add_argument("--disable-features=PasswordLeakDetection,PasswordCheck")
    opts.add_experimental_option("prefs", {
        "credentials_enable_service": False,
        "profile.password_manager_enabled": False,
        "profile.password_manager_leak_detection": False,
        "download.default_directory": str(config.DESCARGAS_DIR),
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "plugins.always_open_pdf_externally": True,      # PDFs se descargan, no se abren en el visor
        "profile.default_content_setting_values.automatic_downloads": 1,
    })
    ruta_driver = os.environ.get("CHROMEDRIVER")
    service = Service(ruta_driver) if ruta_driver else None   # sin ruta: Selenium Manager lo resuelve
    driver = webdriver.Chrome(options=opts, service=service) if service else webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(config.TIMEOUT_CARGA * 2)
    try:  # necesario para que descargue en modo headless
        driver.execute_cdp_cmd("Browser.setDownloadBehavior",
                               {"behavior": "allow", "downloadPath": str(config.DESCARGAS_DIR)})
    except Exception:
        pass
    return driver


def esperar(driver, condicion, timeout=None, mensaje=""):
    return WebDriverWait(driver, timeout or config.TIMEOUT_CARGA, poll_frequency=0.4,
                         ignored_exceptions=(StaleElementReferenceException,)).until(condicion, mensaje)


def pausa(rango):
    time.sleep(random.uniform(*rango))


def clic(driver, elemento):
    """Clic tolerante: centra el elemento y, si algo lo tapa, usa clic por JavaScript."""
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", elemento)
    time.sleep(0.3)
    try:
        elemento.click()
    except (ElementClickInterceptedException, ElementNotInteractableException):
        driver.execute_script("arguments[0].click();", elemento)


def cerrar_pestanas_extra(driver, principal):
    for h in list(driver.window_handles):
        if h != principal:
            try:
                driver.switch_to.window(h)
                driver.close()
            except Exception:
                pass
    driver.switch_to.window(principal)


class EsperaDescarga:
    """Toma una foto de la carpeta de descargas antes del clic y espera al archivo nuevo completo."""

    def __init__(self, carpeta=None):
        self.carpeta = Path(carpeta or config.DESCARGAS_DIR)
        self.antes = set(os.listdir(self.carpeta))

    def esperar(self, timeout=None, prefijo=None, extension=None) -> Path:
        limite = time.time() + (timeout or config.TIMEOUT_DESCARGA)
        candidato, tam_prev = None, -1
        while time.time() < limite:
            actuales = set(os.listdir(self.carpeta))
            nuevos = actuales - self.antes
            en_curso = [n for n in nuevos if n.endswith((".crdownload", ".tmp"))]
            completos = [n for n in nuevos if not n.endswith((".crdownload", ".tmp"))
                         and (prefijo is None or n.startswith(prefijo))
                         and (extension is None or n.lower().endswith(extension))]
            if completos and not en_curso:
                ruta = self.carpeta / sorted(completos)[0]
                tam = ruta.stat().st_size
                if ruta == candidato and tam == tam_prev and tam > 0:
                    return ruta              # tamaño estable dos lecturas seguidas
                candidato, tam_prev = ruta, tam
            time.sleep(0.7)
        raise TimeoutError("La descarga no terminó a tiempo")


def mover(origen: Path, destino: Path) -> Path:
    destino.parent.mkdir(parents=True, exist_ok=True)
    if destino.exists():
        destino.unlink()
    shutil.move(str(origen), str(destino))
    return destino


def volcar_debug(driver, nombre):
    """Guarda captura + HTML para diagnosticar fallos (queda en data/debug, carpeta ignorada por git)."""
    try:
        sello = datetime.now().strftime("%Y%m%d_%H%M%S")
        base = config.DEBUG_DIR / f"{sello}_{nombre}"
        driver.save_screenshot(str(base) + ".png")
        Path(str(base) + ".html").write_text(driver.page_source, encoding="utf-8")
        log.info("Diagnóstico guardado en %s.*", base)
    except Exception as e:
        log.warning("No se pudo guardar diagnóstico: %s", e)


def reintentar(func, *args, intentos=None, nombre="paso", driver=None, **kwargs):
    intentos = intentos or config.REINTENTOS
    ultimo = None
    for i in range(1, intentos + 1):
        try:
            return func(*args, **kwargs)
        except KeyboardInterrupt:
            raise
        except Exception as e:
            if getattr(e, "reintentable", True) is False:   # errores definitivos: no insistir
                raise
            ultimo = e
            log.warning("%s falló (intento %d/%d): %s", nombre, i, intentos, e)
            if driver is not None and i == intentos:
                volcar_debug(driver, nombre.replace(" ", "_"))
            time.sleep(3 * i)
    raise ultimo
