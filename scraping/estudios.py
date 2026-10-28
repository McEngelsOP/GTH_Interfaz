"""Regla de posgrado de GTH (28/10/2026, todos los avisos).

En los requisitos de formación («Bachiller o Titulado en Psicología…», «Profesional universitario de Administración…»),
una maestría, MBA, magíster o doctorado en un área relacionada con la carrera pedida vale el 100 % del requisito,
aunque esté en curso: para hacer un posgrado antes hay que haberse graduado. Las carreras afines se reconocen con
AFINES; si el requisito no nombra ninguna de ellas, la regla no se aplica y queda la similitud de e5.
"""
import re

from .trayectoria import normalizar

REQUISITO = re.compile(r"\b(?:bachiller|titulad[oa]s?|egresad[oa]s?|licenciad[oa]s?|profesional universitari[oa]|"
                       r"carreras?|grado academico|formacion universitaria)\b")
POSGRADO = re.compile(r"\b(?:maestria|magister|master|mba|doctorado|doctor|phd|emba)\b")
NIVEL_POSGRADO = {"master", "doctorado"}
# Carrera que nombra el requisito -> palabras que hacen afín el área o el título del posgrado
AFINES = {
    "administracion": ["administracion", "negocios", "gestion", "empresas", "empresarial", "management", "business",
                       "mba", "gerencia", "direccion", "finanzas", "marketing", "recursos humanos", "talento",
                       "contabilidad", "contable", "economia"],
    "marketing": ["marketing", "mercadotecnia", "comercial", "comunicacion", "comunicaciones", "publicidad", "ventas",
                  "negocios", "mba"],
    "educacion": ["educacion", "educativa", "educativo", "pedagogia", "docencia", "ensenanza", "didactica",
                  "aprendizaje", "gestion educativa", "curriculo"],
    "psicologia": ["psicologia", "gestion humana", "recursos humanos", "talento", "comportamiento organizacional",
                   "desarrollo organizacional", "coaching"],
    "comunicacion": ["comunicacion", "comunicaciones", "periodismo", "marketing", "publicidad", "relaciones publicas"],
    "economia": ["economia", "finanzas", "negocios", "mba"],
    "contabilidad": ["contabilidad", "finanzas", "auditoria", "tributacion", "mba"],
    "ingenieria": ["ingenieria", "gestion", "operaciones", "proyectos", "mba"],
}


def afines_del_requisito(etiqueta):
    """Palabras afines a las carreras que pide el requisito de formación; [] si no es un requisito de formación o no
    nombra una carrera conocida."""
    t = normalizar(etiqueta)
    if not REQUISITO.search(t):
        return []
    out = []
    for carrera, palabras in AFINES.items():
        if re.search(r"\b" + carrera[:-2], t):
            out += [p for p in palabras if p not in out]
    return out


def requisitos_de_formacion(etiquetas):
    return {k: a for k, e in enumerate(etiquetas) if (a := afines_del_requisito(e))}


PREGUNTA_GRADO = re.compile(r"grado academico|ultimo grado|grado de instruccion|nivel academico|eres psicolog|formacion academica")
NO_CUMPLE = re.compile(r"\bno soy\b|\bno\b\s*,|^\s*no\b|\bestudiante\b|\btecnic[oa]\b|\btrunc[oa]s?\b|\bincomplet[oa]\b|"
                       r"\ben curso\b|\bcursando\b|\bciclo\b|\bsecundaria\b")
CUMPLE = re.compile(r"\b(?:bachiller|titulad[oa]|titulo|licenciad[oa]|licenciatura|egresad[oa]|graduad[oa]|profesional|"
                    r"universitari[oa]|grado de bachiller|lic)\b")
TODAS_LAS_CARRERAS = sorted({p for ps in AFINES.values() for p in ps} | set(AFINES) |
                            {"ingenieria", "derecho", "turismo", "hoteleria", "enfermeria", "medicina", "arquitectura",
                             "ciencia politica", "sociologia", "biologia", "quimica", "fisica", "matematica", "arte", "diseno"})


def grado_respondido(datos, afines):
    """Respuesta a la pregunta del aviso sobre el grado académico: («cumple», texto) si dice bachiller, titulado,
    licenciado, egresado o un posgrado en una carrera afín (o no nombra carrera y la pregunta ya la nombra: «¿Eres
    psicólogo?» -> «Sí, bachiller»); («no_cumple», texto) si dice estudiante, técnico, trunco o «no soy…»; None si no
    hay respuesta o no es concluyente (una carrera que no es afín queda con la similitud de e5)."""
    for k, v in (datos or {}).items():
        pregunta, respuesta = normalizar(k), normalizar(v)
        if not respuesta or not PREGUNTA_GRADO.search(pregunta):
            continue
        carreras = [c for c in TODAS_LAS_CARRERAS if re.search(r"\b" + re.escape(c), respuesta)]
        afin = any(re.search(r"\b" + re.escape(p), respuesta) for p in afines)
        if NO_CUMPLE.search(respuesta) and not POSGRADO.search(respuesta):
            return "no_cumple", str(v).strip()
        if POSGRADO.search(respuesta) or CUMPLE.search(respuesta):
            if afin or (not carreras and any(re.search(r"\b" + re.escape(p[:max(5, len(p) - 3)]), pregunta) for p in afines)):
                return "cumple", str(v).strip()
    return None


def posgrado_afin(datos, afines):
    """Título del primer posgrado del CV en un área afín, o None."""
    estudios = {}
    for k, v in (datos or {}).items():
        m = re.match(r"Est\[(\d+)\] (Titulo|Nivel|Area)$", k)
        if m and str(v or "").strip():
            estudios.setdefault(int(m[1]), {})[m[2]] = str(v).strip()
    for _, e in sorted(estudios.items()):
        titulo, nivel = normalizar(e.get("Titulo", "")), normalizar(e.get("Nivel", ""))
        if not (POSGRADO.search(titulo) or nivel in NIVEL_POSGRADO):
            continue
        texto = f"{titulo} {normalizar(e.get('Area', ''))}"
        if any(re.search(r"\b" + re.escape(p) + r"\b", texto) for p in afines):
            return e.get("Titulo") or e.get("Nivel")
    return None
