"""Regla de prácticas de GTH (correo de Andrea, 21/10/2026; decisiones del 22/10): años de experiencia equivalentes.

En los avisos de asistente, analista o coordinador (no en los de prácticas), cada requisito del tipo «N años de
experiencia» se evalúa contando la experiencia del CSV de Bumeran así:
  - experiencia laboral: 1 (cada año cuenta un año);
  - práctica profesional: 0.5;
  - práctica preprofesional: 0. «Practicante de X» sin especificar el tipo cuenta como preprofesional.
El requisito vale min(1, años equivalentes / N). Los meses en que se superponen dos experiencias cuentan una vez, con
el factor más alto. La similitud de e5 no distingue años ni prácticas; por eso este requisito la reemplaza.
"""
import re
from datetime import date

from .campos_trayectoria import campo_laboral
from .fechas_trayectoria import fecha
from .trayectoria import normalizar

VERSION = "practicas1"
AVISO_APLICA = re.compile(r"\b(?:asistente|analista|coordinador|coordinadora)\b")
AVISO_PRACTICAS = re.compile(r"\b(?:practicante|practicas?|pasante|pasantia|trainee)\b")
NUMEROS = {"un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6}
_NUM = r"(\d+(?:[.,]\d+)?|un|uno|una|dos|tres|cuatro|cinco|seis)"
ANIOS = re.compile(_NUM + r"\s*(?:a\s*" + _NUM + r"\s*)?anos?\b")
PREPROFESIONAL = re.compile(r"\bpre[ -]?profesional(?:es)?\b|\bpre[ -]?practicas?\b")
PROFESIONAL = re.compile(r"\bpractic(?:a|as|ante)s?\s+profesional(?:es)?\b")
PRACTICA = re.compile(r"\b(?:practicante|practicas?|pasante|pasantia)\b")


def aplica(titulo) -> bool:
    t = normalizar(titulo)
    return bool(AVISO_APLICA.search(t)) and not AVISO_PRACTICAS.search(t)


def _numero(texto):
    return float(NUMEROS[texto]) if texto in NUMEROS else float(texto.replace(",", "."))


def anios_requeridos(etiqueta):
    """N de «N años de experiencia» (en «de 1 a 2 años» se toma el mínimo); None si el requisito no es de años."""
    t = normalizar(etiqueta)
    if "experiencia" not in t:
        return None
    m = ANIOS.search(t)
    n = _numero(m[1]) if m else 0
    return n if n > 0 else None


def requisitos_de_anios(titulo, etiquetas) -> dict:
    """{índice del requisito: años pedidos} a los que se aplica la regla en este aviso."""
    if not aplica(titulo):
        return {}
    return {k: n for k, e in enumerate(etiquetas) if (n := anios_requeridos(e))}


def factor(puesto, descripcion, explicita=""):
    """1 laboral, 0.5 práctica profesional, 0 preprofesional o práctica sin tipo."""
    t = normalizar(" ".join([puesto, descripcion, explicita]))
    if PREPROFESIONAL.search(t):
        return 0.0
    if PROFESIONAL.search(t):
        return 0.5
    if PRACTICA.search(normalizar(" ".join([puesto, explicita]))):
        return 0.0
    return 1.0


def _meses(desde: date, hasta: date):
    n = (hasta.year - desde.year) * 12 + hasta.month - desde.month
    return [(desde.year * 12 + desde.month - 1 + i) for i in range(n + 1)]


def anios_equivalentes(datos, hoy=None):
    """(años equivalentes, años laborales, años de práctica profesional) del CV. Las prácticas preprofesionales no
    suman."""
    hoy = hoy or date.today()
    exps = {}
    for k, v in (datos or {}).items():
        campo = campo_laboral(k)
        if campo and v is not None and str(v).strip():
            exps.setdefault(campo[0], {}).setdefault(campo[1], str(v).strip())
    por_mes = {}
    for e in exps.values():
        ini, fin = fecha(e.get("Fecha Inicio", ""), hoy), fecha(e.get("Fecha Fin", ""), hoy)
        if not ini or ini["precision"] == "actualidad":
            continue
        if not e.get("Fecha Fin"):   # en el CSV de Bumeran, sin fecha de fin = empleo actual
            fin = {"min": hoy, "max": hoy, "precision": "actualidad"}
        if not fin:
            continue
        # Solo el año: se toma la mitad del año para no inflar ni anular la experiencia
        desde = date(ini["min"].year, 7, 1) if ini["precision"] == "anio" else ini["min"]
        hasta = date(fin["min"].year, 7, 1) if fin["precision"] == "anio" else min(fin["max"], hoy)
        if hasta < desde:
            continue
        f = factor(e.get("Puesto", ""), e.get("Descripción", ""),
                   " ".join(e.get(c, "") for c in ("Modalidad", "Tipo de contrato", "Tipo de empleo")))
        for m in _meses(desde, hasta):
            por_mes[m] = max(por_mes.get(m, 0.0), f)
    laboral = sum(1 for f in por_mes.values() if f == 1.0) / 12
    practica = sum(1 for f in por_mes.values() if f == 0.5) / 12
    return laboral + practica / 2, laboral, practica


def describir(total, laboral, practica):
    texto = f"{total:.1f} años de experiencia equivalente: {laboral:.1f} laborales"
    return texto + (f" y {practica:.1f} de práctica profesional, que cuentan la mitad" if practica else "")
