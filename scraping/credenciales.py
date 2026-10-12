"""Credenciales de Bumeran.

Se leen de (en este orden):
  1. Variables de entorno BUMERAN_USUARIO y BUMERAN_CLAVE
  2. Archivo scraping/.env  (está en .gitignore: nunca se sube al repositorio)

Formato de scraping/.env:
    BUMERAN_USUARIO=correo@esan.edu.pe
    BUMERAN_CLAVE=la_contraseña
    # Opcional: Supabase para los registros (si falta, se usa SQLite local data/gth.db)
    SUPABASE_DB_URL=postgresql://postgres.xxxx:CLAVE@aws-0-xx.pooler.supabase.com:5432/postgres
    # Opcional: nombre de la carpeta raíz en Google Drive (por defecto "GTH - CVs postulantes")
    GDRIVE_CARPETA_RAIZ=GTH - CVs postulantes
"""
import os

from .config import BASE_DIR

RUTA_ENV = BASE_DIR / ".env"


def _leer_env_archivo():
    datos = {}
    if RUTA_ENV.exists():
        for linea in RUTA_ENV.read_text(encoding="utf-8-sig").splitlines():
            linea = linea.strip()
            if linea and not linea.startswith("#") and "=" in linea:
                k, v = linea.split("=", 1)
                datos[k.strip()] = v.strip().strip('"').strip("'")
    return datos


def valor(nombre, defecto=None):
    """Lee una variable de entorno o, si no está, de scraping/.env."""
    return os.environ.get(nombre) or _leer_env_archivo().get(nombre) or defecto


def obtener():
    """Devuelve (usuario, clave) o None si no están configuradas."""
    usuario = os.environ.get("BUMERAN_USUARIO")
    clave = os.environ.get("BUMERAN_CLAVE")
    if usuario and clave:
        return usuario, clave
    env = _leer_env_archivo()
    if env.get("BUMERAN_USUARIO") and env.get("BUMERAN_CLAVE"):
        return env["BUMERAN_USUARIO"], env["BUMERAN_CLAVE"]
    return None
