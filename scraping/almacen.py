"""Subida de los CVs (PDF) de postulantes al Google Drive de ESAN.

Se activa solo si existe scraping/google_credentials.json (cliente OAuth "App de escritorio" de
Google Cloud, con la API de Drive habilitada). Si no existe, no hace nada y los PDFs quedan solo en
scraping/data/cvs/.

La primera vez abre el navegador para autorizar la cuenta de ESAN; el permiso queda guardado en
data/google_token.json (carpeta ignorada por git). Se usa el permiso mínimo "drive.file": el scraper
solo ve y modifica los archivos y carpetas que él mismo crea, nada más del Drive.

Estructura en Drive:
    GTH - CVs postulantes/                 <- carpeta raíz (compártela con GTH desde Drive)
        <ID aviso> - <título>/             <- una por aviso
            alopez888.pdf
"""
import json
import logging
import time
from pathlib import Path

from . import config
from .credenciales import valor

log = logging.getLogger("scraper")

ALCANCE = ["https://www.googleapis.com/auth/drive.file"]
RUTA_CLIENTE = config.BASE_DIR / "google_credentials.json"
RUTA_TOKEN = config.DATA_DIR / "google_token.json"
RUTA_CACHE = config.DATA_DIR / "google_drive_carpetas.json"     # nombre de carpeta -> id
CARPETA_RAIZ = valor("GDRIVE_CARPETA_RAIZ", "GTH - CVs postulantes")
TIPO_CARPETA = "application/vnd.google-apps.folder"

_servicio = None
_carpetas = None


def configurado() -> bool:
    return RUTA_CLIENTE.exists()


def _drive():
    """Cliente de la API de Drive (autoriza en el navegador la primera vez)."""
    global _servicio
    if _servicio is None:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
        cred = Credentials.from_authorized_user_file(str(RUTA_TOKEN), ALCANCE) if RUTA_TOKEN.exists() else None
        if cred and cred.expired and cred.refresh_token:
            try:
                cred.refresh(Request())
            except Exception:
                cred = None
        if not cred or not cred.valid:
            log.info("Autoriza el acceso a Google Drive en la ventana del navegador que se abrió…")
            cred = InstalledAppFlow.from_client_secrets_file(str(RUTA_CLIENTE), ALCANCE).run_local_server(port=0)
        RUTA_TOKEN.parent.mkdir(parents=True, exist_ok=True)
        RUTA_TOKEN.write_text(cred.to_json(), encoding="utf-8")
        _servicio = build("drive", "v3", credentials=cred, cache_discovery=False)
    return _servicio


def _cache():
    global _carpetas
    if _carpetas is None:
        try:
            _carpetas = json.loads(RUTA_CACHE.read_text(encoding="utf-8"))
        except Exception:
            _carpetas = {}
    return _carpetas


def _guardar_cache():
    RUTA_CACHE.parent.mkdir(parents=True, exist_ok=True)
    RUTA_CACHE.write_text(json.dumps(_cache(), ensure_ascii=False, indent=1), encoding="utf-8")


def _buscar(nombre, padre=None, carpeta=False):
    q = ["trashed = false", "name = '%s'" % nombre.replace("\\", "\\\\").replace("'", "\\'")]
    if padre:
        q.append(f"'{padre}' in parents")
    q.append(f"mimeType {'=' if carpeta else '!='} '{TIPO_CARPETA}'")
    r = _drive().files().list(q=" and ".join(q), fields="files(id, webViewLink)", spaces="drive",
                              pageSize=10).execute()
    archivos = r.get("files", [])
    return archivos[0] if archivos else None


def _carpeta(nombre, padre=None) -> str:
    """Id de la carpeta (la crea si no existe). Se recuerda en data/google_drive_carpetas.json."""
    clave = f"{padre or ''}/{nombre}"
    cache = _cache()
    if clave in cache:
        return cache[clave]
    encontrada = _buscar(nombre, padre, carpeta=True)
    if encontrada:
        cache[clave] = encontrada["id"]
    else:
        meta = {"name": nombre, "mimeType": TIPO_CARPETA}
        if padre:
            meta["parents"] = [padre]
        cache[clave] = _drive().files().create(body=meta, fields="id").execute()["id"]
        log.info("Carpeta creada en Google Drive: %s", nombre)
    _guardar_cache()
    return cache[clave]


def subir_cv(ruta_local: Path, carpeta_aviso: str, intentos=3):
    """Sube (o reemplaza) el PDF en <raíz>/<carpeta_aviso>/ de Google Drive.
    Devuelve (file_id, enlace) o (None, None) si no está configurado o falló: el archivo local se
    conserva y se puede volver a subir con  python -m scraping.run --subir-drive"""
    if not configurado():
        return None, None
    from googleapiclient.http import MediaFileUpload
    ruta_local = Path(ruta_local)
    for i in range(1, intentos + 1):
        try:
            padre = _carpeta(carpeta_aviso, _carpeta(CARPETA_RAIZ))
            media = MediaFileUpload(str(ruta_local), mimetype="application/pdf"
                                    if ruta_local.suffix.lower() == ".pdf" else None, resumable=False)
            existente = _buscar(ruta_local.name, padre)
            if existente:
                r = _drive().files().update(fileId=existente["id"], media_body=media,
                                            fields="id, webViewLink").execute()
            else:
                r = _drive().files().create(body={"name": ruta_local.name, "parents": [padre]},
                                            media_body=media, fields="id, webViewLink").execute()
            return r["id"], r.get("webViewLink")
        except Exception as e:
            log.warning("No se pudo subir %s a Google Drive (intento %d/%d): %s", ruta_local.name, i, intentos, e)
            _cache().clear()          # por si alguien borró o movió la carpeta en Drive
            time.sleep(3 * i)
    return None, None
