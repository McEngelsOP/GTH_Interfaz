"""Configuración del scraper. Todo lo ajustable está aquí o en variables de entorno."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Carpeta de datos (BD, CSVs, CVs, perfil de Chrome). Está en .gitignore: contiene datos personales.
DATA_DIR = Path(os.environ.get("GTH_SCRAPER_DATA", BASE_DIR / "data"))
DB_PATH = DATA_DIR / "gth.db"
DESCARGAS_DIR = DATA_DIR / "descargas_tmp"   # carpeta donde Chrome descarga; luego se mueve
CSV_DIR = DATA_DIR / "csv"
CV_DIR = DATA_DIR / "cvs"
DEBUG_DIR = DATA_DIR / "debug"
PERFIL_CHROME_DIR = DATA_DIR / "chrome_profile"  # perfil propio: conserva la sesión entre corridas
LOG_PATH = DATA_DIR / "scraper.log"

URL_BASE = "https://www.bumeran.com.pe"
URL_AVISOS = URL_BASE + "/empresas/avisos/listado"
URL_INGRESO = URL_BASE + "/empresas/ingreso"

ESTADO_OBJETIVO = "Publicado"

# Tiempos (segundos). Bumeran a veces carga lento: ser generosos.
TIMEOUT_CARGA = int(os.environ.get("GTH_TIMEOUT_CARGA", 45))
TIMEOUT_DESCARGA = int(os.environ.get("GTH_TIMEOUT_DESCARGA", 120))
TIMEOUT_LOGIN_MANUAL = 300
REINTENTOS = 3
PAUSA_AVISO = (2.0, 5.0)     # pausa aleatoria entre avisos
PAUSA_CV = (1.0, 2.5)        # pausa aleatoria entre postulantes

# Si pasaron más de N días desde el último CSV, se vuelve a descargar aunque "Recibidos" no cambie.
DIAS_REVISION_FORZADA = 7

# En la lista de postulantes, quitar filtros guardados (p. ej. "experiencia en área X")
# para que aparezcan TODOS los postulantes.
LIMPIAR_FILTROS_POSTULANTES = True


def asegurar_directorios():
    for d in (DATA_DIR, DESCARGAS_DIR, CSV_DIR, CV_DIR, DEBUG_DIR, PERFIL_CHROME_DIR):
        d.mkdir(parents=True, exist_ok=True)


def carpeta_aviso(aviso_id, titulo=None) -> Path:
    """Carpeta de los CVs de un aviso: data/cvs/<aviso_id> - <título>/ (un aviso = una carpeta)."""
    import re
    import unicodedata
    limpio = unicodedata.normalize("NFKD", titulo or "").encode("ascii", "ignore").decode()
    limpio = re.sub(r"[^A-Za-z0-9 ._-]+", " ", limpio)
    limpio = re.sub(r"\s+", " ", limpio).strip(" .")[:60]
    return CV_DIR / (f"{aviso_id} - {limpio}" if limpio else str(aviso_id))
