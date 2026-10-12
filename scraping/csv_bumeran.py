"""Lectura del CSV que exporta Bumeran ("Exportar postulaciones (CSV)").

Formato observado:
  "ID de aviso: 1118437785"
  "Titulo del aviso: Analista de cobranzas"
  "Fecha de publicación: 2026-09-10"
  (línea vacía)
  Nombre;Apellido;...;E-Mail;Tipo Documento;Nro. Documento;...   <- 94 columnas
Separador ';', codificación cp1252 (a veces utf-8), campos de texto libre entre comillas
(pueden traer saltos de línea).
"""
import csv
import hashlib
import io
import re
import unicodedata
from pathlib import Path

_META = {
    "aviso_id": re.compile(r"ID de aviso:\s*(\d+)", re.I),
    "titulo": re.compile(r"Titulo del aviso:\s*(.+?)\"?$", re.I),
    "fecha_publicacion": re.compile(r"Fecha de publicaci.n:\s*([\d-]+)", re.I),
}


def _leer_texto(ruta: Path) -> str:
    crudo = ruta.read_bytes()
    for cod in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return crudo.decode(cod)
        except UnicodeDecodeError:
            continue
    return crudo.decode("latin-1", errors="replace")


def leer_csv(ruta) -> tuple[dict, list[dict]]:
    """Devuelve (metadatos, filas). Cada fila es un dict columna -> valor."""
    ruta = Path(ruta)
    texto = _leer_texto(ruta)

    lineas = texto.splitlines(keepends=True)
    meta = {}
    inicio = 0
    for i, linea in enumerate(lineas[:15]):
        for k, rx in _META.items():
            m = rx.search(linea)
            if m and k not in meta:
                meta[k] = m.group(1).strip().strip('"')
        cab = linea.lstrip('"').lower()
        if cab.startswith("nombre") and ";" in linea:
            inicio = i
            break
    else:
        raise ValueError(f"No se encontró la cabecera de columnas en {ruta.name}")

    cuerpo = "".join(lineas[inicio:])
    lector = csv.DictReader(io.StringIO(cuerpo), delimiter=";")
    filas = []
    for fila in lector:
        fila = {(k or "").strip(): (v or "").strip() for k, v in fila.items() if k is not None}
        if any(fila.values()):
            filas.append(fila)
    return meta, filas


def normalizar_documento(valor: str) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", valor or "").upper()


_PARTICULAS = {"de", "del", "la", "las", "los", "da", "das", "do", "dos", "san", "santa", "van", "von", "mc", "y"}


def _solo_letras(texto: str) -> str:
    sin_tildes = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", sin_tildes.lower())


def _primer_apellido(apellido: str) -> str:
    """'López García' -> 'lopez'; 'De la Cruz Pérez' -> 'delacruz'."""
    partes = (apellido or "").split()
    tomadas = []
    for p in partes:
        tomadas.append(p)
        if p.lower() not in _PARTICULAS:
            break
    return _solo_letras("".join(tomadas))


def _armar_id(nombre, primer_apellido, *numeros) -> str:
    inicial = _solo_letras(nombre)[:1] or "x"
    apellido = primer_apellido or "sinapellido"
    digitos = next((d for d in (re.sub(r"\D", "", n or "") for n in numeros) if d), "")
    return f"{inicial}{apellido}{digitos[-3:].rjust(3, '0') if digitos else '000'}"


def id_postulante(fila: dict) -> str:
    """ID legible desde una fila del CSV: inicial del nombre + primer apellido + 3 últimos dígitos del
    celular. Ej.: Aaron López, celular 999 999 888 -> 'alopez888'. Sin celular usa el otro teléfono,
    luego el DNI; sin ninguno, '000'.
    (Puede repetirse entre dos personas: se le agrega un número al final para que sea único en el aviso.)"""
    tel = {k.lower(): v for k, v in fila.items() if k.lower().startswith("tel")}
    celular = next((v for k, v in tel.items() if "celular" in k), "")
    otro = next((v for k, v in tel.items() if "celular" not in k), "")
    return _armar_id(fila.get("Nombre", ""), _primer_apellido(fila.get("Apellido", "")),
                     celular, otro, fila.get("Nro. Documento", ""))


def id_desde_perfil(nombre_completo, celular=None, otro_telefono=None, documento=None) -> str:
    """El mismo ID, armado con lo que muestra el perfil del postulante en Bumeran, donde el nombre viene
    junto ('Nombre1 Nombre2 Apellido1 Apellido2'): el primer apellido es la penúltima palabra
    (la última si solo hay dos)."""
    partes = (nombre_completo or "").split()
    apellido = partes[-2] if len(partes) >= 3 else (partes[-1] if len(partes) == 2 else "")
    return _armar_id(partes[0] if partes else "", _solo_letras(apellido), celular, otro_telefono, documento)


def clave_postulacion(fila: dict) -> str:
    """Llave estable de un postulante dentro de un aviso: documento > email > hash."""
    doc = normalizar_documento(fila.get("Nro. Documento", ""))
    if doc:
        return "DOC:" + doc
    email = (fila.get("E-Mail") or "").strip().lower()
    if email:
        return "MAIL:" + email
    base = "|".join(fila.get(k, "") for k in ("Nombre", "Apellido", "Fecha de nacimiento", "Fecha Postulación"))
    return "HASH:" + hashlib.sha1(base.encode("utf-8")).hexdigest()[:16]
