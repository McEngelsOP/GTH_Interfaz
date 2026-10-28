"""Regla de prácticas de GTH (correo de Andrea, 21/10/2026; decisiones del 22/10): años de experiencia equivalentes.

En los avisos de asistente, analista o coordinador (no en los de prácticas), cada requisito del tipo «N años de
experiencia» se evalúa contando la experiencia del CSV de Bumeran así:
  - experiencia laboral: 1 (cada año cuenta un año);
  - práctica profesional: 0.5;
  - práctica preprofesional: 0. «Practicante de X» sin especificar el tipo cuenta como preprofesional.
Solo cuenta la experiencia relacionada con el requisito (criterio de Andrea: no asumir que toda experiencia es
relevante): una experiencia es relacionada si su similitud e5 con el requisito está en la mitad alta de las
experiencias del aviso (ranking.py). Validado contra la elección de GTH en 3 procesos (25/10/2026).
El requisito vale min(1, años equivalentes / N). Los meses en que se superponen dos experiencias cuentan una vez, con
el factor más alto. La similitud de e5 no distingue años ni prácticas; por eso este requisito la reemplaza.

Reglas validadas con GTH (28/10/2026, parámetro `reglas_gth`; ranking.py las usa en todos los avisos):
  - una experiencia también es relacionada si su puesto, área o descripción menciona el tema del requisito o un
    sinónimo (palabras_relacionadas: se arman del texto de cada requisito, no son una lista fija por aviso);
  - «Interno de …» cuenta como práctica profesional;
  - con dos o más prácticas sin tipo, la más reciente cuenta como profesional.
"""
import re
from datetime import date

from .campos_trayectoria import campo_laboral
from .fechas_trayectoria import fecha
from .trayectoria import normalizar

VERSION = "practicas2"   # 2: solo experiencia relacionada
AVISO_APLICA = re.compile(r"\b(?:asistente|analista|coordinador|coordinadora)\b")
AVISO_PRACTICAS = re.compile(r"\b(?:practicante|practicas?|pasante|pasantia|trainee)\b")
NUMEROS = {"un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6}
_NUM = r"(\d+(?:[.,]\d+)?|un|uno|una|dos|tres|cuatro|cinco|seis)"
ANIOS = re.compile(_NUM + r"\s*(?:a\s*" + _NUM + r"\s*)?anos?\b")
PREPROFESIONAL = re.compile(r"\bpre[ -]?profesional(?:es)?\b|\bpre[ -]?practicas?\b")
PROFESIONAL = re.compile(r"\bpractic(?:a|as|ante)s?\s+profesional(?:es)?\b")
PRACTICA = re.compile(r"\b(?:practicante|practicas?|pasante|pasantia)\b")
INTERNO = re.compile(r"^intern[oa]\b|\bintern[oa] de\b|\binternado\b")

# Experiencia relacionada por palabras (reglas de GTH). Si el tema del requisito menciona un disparador, cuentan todas las
# frases de su grupo; además cuentan las palabras del propio tema (palabras_relacionadas).
SINONIMOS = [
    ({"cliente", "clientes", "usuario", "usuarios", "publico", "estudiante", "estudiantes", "alumno", "alumnos"}, [
        "atencion", "atencion al cliente", "servicio al cliente", "servicio de atencion", "atencion al publico",
        "atencion al usuario", "atencion al estudiante", "atencion al alumno", "atencion a estudiantes",
        "atencion a alumnos", "atencion de alumnos", "atencion al ciudadano", "experiencia del cliente",
        "customer service", "customer experience", "customer care", "call center", "contact center", "telemarketing",
        "televentas", "teleoperador", "teleoperadora", "mesa de ayuda", "help desk", "soporte al cliente", "postventa",
        "post venta", "reclamos", "consultas", "front desk", "counter", "recepcion", "recepcionista", "anfitrion",
        "anfitriona", "orientacion a estudiantes", "orientacion al estudiante", "orientacion academica",
        "bienestar estudiantil", "servicios estudiantiles", "asesor de servicio", "asesor de atencion",
        "ejecutivo de atencion", "ejecutiva de atencion", "gestor de atencion", "plataforma de atencion", "cobranza",
        "fidelizacion", "retencion de clientes", "matricula", "admision"]),
    ({"seleccion", "reclutamiento", "talento", "atraccion", "headhunting"}, [
        "seleccion", "seleccion de personal", "reclutamiento", "reclutador", "reclutadora", "atraccion de talento",
        "atraccion del talento", "gestion del talento", "gestion de talento", "talent acquisition", "headhunting",
        "hunting", "entrevistas por competencias", "entrevistas de seleccion", "entrevistas laborales",
        "evaluacion psicolaboral", "evaluaciones psicolaborales", "psicolaboral", "pruebas psicometricas",
        "evaluacion psicometrica", "assessment", "assessment center", "onboarding", "induccion", "gestion humana",
        "recursos humanos", "rrhh", "people", "employer branding", "levantamiento de perfiles", "perfiles de puesto",
        "cobertura de vacantes", "vacantes", "desarrollo organizacional", "gestion del desempeno", "capacitacion"]),
    ({"docente", "docentes", "profesor", "profesores"}, [
        "docente", "docentes", "profesores", "plana docente", "gestion docente", "atencion docente",
        "atencion a docentes", "atencion de docentes", "coordinacion academica", "coordinador academico",
        "coordinadora academica", "gestion academica", "carga lectiva", "carga academica", "programacion academica",
        "servicios academicos", "asistente academico", "asistente academica", "secretaria academica",
        "registros academicos", "bienestar docente", "capacitacion docente", "formacion docente",
        "acompanamiento docente", "acompanamiento pedagogico", "horarios de clases", "silabos", "silabo"]),
]
VACIAS = {"de", "del", "la", "las", "el", "los", "en", "a", "al", "y", "o", "u", "con", "para", "por", "minimo",
          "minima", "experiencia", "anos", "ano", "procesos", "proceso", "presencial", "telefonico", "telefonica",
          "virtual", "solida", "solido", "comprobada", "comprobable", "deseable", "areas", "area", "similares", "afines",
          "puestos", "cargos", "funciones", "universidades", "empresas", "sector", "rubro"}


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


def _clase(puesto, descripcion, explicita="", reglas_gth=False):
    """«laboral», «profesional», «preprofesional» o «sin_tipo» (práctica que no dice de qué tipo es)."""
    t = normalizar(" ".join([puesto, descripcion, explicita]))
    if PREPROFESIONAL.search(t):
        return "preprofesional"
    if PROFESIONAL.search(t) or (reglas_gth and INTERNO.search(normalizar(puesto))):
        return "profesional"
    if PRACTICA.search(normalizar(" ".join([puesto, explicita]))):
        return "sin_tipo"
    return "laboral"


FACTOR = {"laboral": 1.0, "profesional": 0.5, "preprofesional": 0.0, "sin_tipo": 0.0}


def factor(puesto, descripcion, explicita="", reglas_gth=False):
    """1 laboral, 0.5 práctica profesional, 0 preprofesional o práctica sin tipo."""
    return FACTOR[_clase(puesto, descripcion, explicita, reglas_gth)]


def palabras_relacionadas(etiqueta):
    """Frases que hacen relacionada una experiencia con el requisito «N años de experiencia en …» (reglas de GTH): las
    palabras de cada parte del tema del requisito (deben aparecer todas) y los sinónimos de los grupos que menciona."""
    tema = re.split(r"\bexperiencia\b", normalizar(etiqueta), maxsplit=1)[-1]
    frases = []
    for parte in re.split(r"\s*(?:,|;|/|\by/o\b|\by\b|\bo\b)\s*", tema):
        parte = re.split(r"\s\ben\b", re.sub(r"^\s*en\s+", "", parte), maxsplit=1)[0]   # «… en universidades»: el lugar no es el tema
        palabras = [w for w in re.findall(r"[a-z]+", parte) if w not in VACIAS and len(w) > 2]
        if palabras:
            frases.append(tuple(palabras))
    sinonimos = []
    for disparadores, grupo in SINONIMOS:
        if disparadores & set(re.findall(r"[a-z]+", tema)):
            sinonimos += [g for g in grupo if g not in sinonimos]
    return {"tema": frases, "sinonimos": sinonimos}


def relacionadas_por_palabras(datos, palabras):
    """Índices Exp[i] cuyo puesto, área, subárea o descripción menciona el tema del requisito o un sinónimo."""
    exps = {}
    for k, v in (datos or {}).items():
        campo = campo_laboral(k)
        if campo and campo[1] in ("Puesto", "Area", "SubArea", "Descripción") and str(v or "").strip():
            exps.setdefault(campo[0], []).append(normalizar(str(v)))
    out = set()
    for indice, textos in exps.items():
        texto = " ".join(textos)
        if any(re.search(r"\b" + re.escape(s) + r"\b", texto) for s in palabras["sinonimos"]) or \
           any(all(re.search(r"\b" + re.escape(w[:max(4, len(w) - 2)]), texto) for w in frase) for frase in palabras["tema"]):
            out.add(indice)
    return out


PREGUNTA_ANIOS = re.compile(r"\banos de experiencia\b|\bcuantos anos\b|\btiempo de experiencia\b")
_CANTIDAD = r"(\d+(?:[.,]\d+)?|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)"
DECLARADO = re.compile(r"\b" + _CANTIDAD + r"\s*(?:(?:anos?|anios?|nos)(\s*y\s*medio)?|(meses|mes))\b")
SOLO_NUMERO = re.compile(r"^\s*(\d+(?:[.,]\d+)?)()()\b")
SIN_EXPERIENCIA = re.compile(r"^\s*(?:no cuento|no tengo|ninguna|sin experiencia|aun no|no he)\b")
NUMEROS_DECLARADOS = {**NUMEROS, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10}


def anios_declarados(datos):
    """Años de experiencia que el postulante declara en la pregunta del aviso («¿Cuántos años de experiencia tienes…?»):
    «10 meses» -> 0.83, «2 años y medio» -> 2.5, «más de 5 años» -> 5. None si no hay pregunta o no da un número."""
    for k, v in (datos or {}).items():
        if "?" not in k or not PREGUNTA_ANIOS.search(normalizar(k)):
            continue
        respuesta = normalizar(v)
        if SIN_EXPERIENCIA.search(respuesta):
            return 0.0
        m = DECLARADO.search(respuesta) or SOLO_NUMERO.search(respuesta)
        if not m:
            continue
        n = float(NUMEROS_DECLARADOS[m[1]]) if m[1] in NUMEROS_DECLARADOS else float(m[1].replace(",", "."))
        n += 0.5 if m[2] else 0
        return round(n / 12, 2) if m[3] else n
    return None


def _meses(desde: date, hasta: date):
    n = (hasta.year - desde.year) * 12 + hasta.month - desde.month
    return [(desde.year * 12 + desde.month - 1 + i) for i in range(n + 1)]


def experiencias(datos, hoy=None, reglas_gth=False):
    """[(índice Exp[i], meses que abarca, factor)] de las experiencias con fechas legibles del CSV. Con las reglas de GTH, con dos
    o más prácticas sin tipo, la más reciente cuenta como profesional."""
    hoy = hoy or date.today()
    exps = {}
    for k, v in (datos or {}).items():
        campo = campo_laboral(k)
        if campo and v is not None and str(v).strip():
            exps.setdefault(campo[0], {}).setdefault(campo[1], str(v).strip())
    out = []
    for indice, e in sorted(exps.items()):
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
        clase = _clase(e.get("Puesto", ""), e.get("Descripción", ""),
                       " ".join(e.get(c, "") for c in ("Modalidad", "Tipo de contrato", "Tipo de empleo")), reglas_gth)
        out.append([indice, set(_meses(desde, hasta)), FACTOR[clase], clase])
    sin_tipo = [e for e in out if e[3] == "sin_tipo"]
    if reglas_gth and len(sin_tipo) >= 2:
        max(sin_tipo, key=lambda e: max(e[1]))[2] = FACTOR["profesional"]
    return [(indice, meses, f) for indice, meses, f, _ in out]


def anios_equivalentes(datos, hoy=None, relacionadas=None, reglas_gth=False):
    """(años equivalentes, años laborales, años de práctica profesional) del CV. Las prácticas preprofesionales no
    suman. Con `relacionadas` (índices Exp[i]) solo cuentan esas experiencias."""
    por_mes = {}
    for indice, meses, f in experiencias(datos, hoy, reglas_gth):
        if relacionadas is not None and indice not in relacionadas:
            continue
        for m in meses:
            por_mes[m] = max(por_mes.get(m, 0.0), f)
    laboral = sum(1 for f in por_mes.values() if f == 1.0) / 12
    practica = sum(1 for f in por_mes.values() if f == 0.5) / 12
    return laboral + practica / 2, laboral, practica


# Rubro (criterio de Andrea): experiencia en educación superior, el sector de ESAN. Se reconoce por el nombre de la
# empresa: el campo Industria «Educación» también incluye colegios y rindió peor contra la elección de GTH (25/10).
EDUCACION_SUPERIOR = re.compile(
    r"\b(?:universidad|university)\b|instituto (?:superior|de educacion superior)|escuela (?:de posgrado|superior)|graduate school|"
    r"\b(?:upc|usil|pucp|esan|utp|idat|certus|tecsup|senati|toulouse|cibertec|isil|zegel|ucal|ucsur|upn|ucv|usmp)\b")


# Con las reglas de GTH también cuenta cualquier instituto (p. ej. «Instituto Daniel Alcides Carrión»); los colegios suman media.
INSTITUTO = re.compile(r"\binstituto\b")
COLEGIO = re.compile(r"\bcolegio\b|\bi\.?\s?e\.?\s?p?\.?\s|\binstitucion educativa\b|\bescuela\b")


def _superior(empresa, reglas_gth=False):
    t = normalizar(empresa)
    return bool(EDUCACION_SUPERIOR.search(t) or (reglas_gth and INSTITUTO.search(t)))


def empresas_educacion_superior(datos, reglas_gth=False):
    """Empresas de educación superior (universidades, institutos superiores, escuelas de posgrado) del CV, sin repetir."""
    out = []
    for k, v in (datos or {}).items():
        campo = campo_laboral(k)
        empresa = str(v or "").strip()
        if campo and campo[1] == "Empresa" and empresa and _superior(empresa, reglas_gth) and empresa not in out:
            out.append(empresa)
    return out


def ultima_en_educacion(datos):
    """True si la experiencia más reciente del CV (Exp[1] en Bumeran) es en educación: universidad, instituto, colegio
    o industria «Educación»."""
    empresa = normalizar(str((datos or {}).get("Exp[1] Empresa") or ""))
    industria = normalizar(str((datos or {}).get("Exp[1] Industria") or ""))
    return bool(empresa and (_superior(empresa, True) or COLEGIO.search(empresa + " ") or industria.startswith("educacion")))


def experiencias_educacion(datos):
    """(experiencias en educación superior, experiencias en colegios) del CV: el rubro suma por cada una (reglas de GTH)."""
    superior = colegios = 0
    for k, v in (datos or {}).items():
        campo = campo_laboral(k)
        empresa = str(v or "").strip()
        if campo and campo[1] == "Empresa" and empresa:
            if _superior(empresa, True):
                superior += 1
            elif COLEGIO.search(normalizar(empresa) + " "):
                colegios += 1
    return superior, colegios


def describir(total, laboral, practica):
    texto = f"{total:.1f} años de experiencia relacionada equivalente: {laboral:.1f} laborales"
    return texto + (f" y {practica:.1f} de práctica profesional, que cuentan la mitad" if practica else "")
