"""Fechas del CSV: interpretar sin locale, red ni completar datos ausentes."""
import calendar
import re
import unicodedata
from datetime import date, datetime

MESES = (
    ("ene", "enero", "jan", "january"), ("feb", "febrero", "february"),
    ("mar", "marzo", "march"), ("abr", "abril", "apr", "april"),
    ("may", "mayo"), ("jun", "junio", "june"), ("jul", "julio", "july"),
    ("ago", "agosto", "aug", "august"), ("sep", "sept", "set", "septiembre", "setiembre", "september"),
    ("oct", "octubre", "october"), ("nov", "noviembre", "november"), ("dic", "diciembre", "dec", "december"),
)
MES_POR_NOMBRE = {nombre: n for n, nombres in enumerate(MESES, 1) for nombre in nombres}
ACTUALIDAD = {"actualidad", "presente", "actual", "actualmente", "a la fecha", "hasta la fecha",
              "present", "current", "en curso", "hoy"}
AUSENTES = {"", "-", "--", "n/a", "na", "n.d.", "s/d", "sin datos", "no informado", "no especificado",
            "null", "none", "nan", "nat", "desconocido", "por declarar", "fecha por declarar"}


def normalizar_fecha(valor):
    return " ".join("".join(c for c in unicodedata.normalize("NFKD", str(valor or "").casefold())
                            if unicodedata.category(c) != "Mn").translate(str.maketrans("–—−", "---")).split())


def fecha(valor, hoy):
    """Devuelve un intervalo posible. Día 01 en ISO sigue siendo día: no adivinar precisión."""
    t = normalizar_fecha(valor)
    if t in ACTUALIDAD:
        return {"min": hoy, "max": hoy, "precision": "actualidad"}
    try:
        if re.fullmatch(r"\d{4}", t):
            y = int(t)
            return {"min": date(y, 1, 1), "max": date(y, 12, 31), "precision": "anio"}
        # ISO con hora, segundos/fracciones y zona; conservar la fecha declarada sin convertirla a UTC.
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}[t ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:z|[+-]\d{2}:?\d{2})?", t):
            d = datetime.fromisoformat(t.replace("z", "+00:00")).date()
            return {"min": d, "max": d, "precision": "dia"}
        t = re.sub(r"\s*([/.-])\s*", r"\1", t)
        dia = None
        if re.fullmatch(r"\d{4}[-/.]\d{1,2}(?:[-/.]\d{1,2})?", t):
            partes = list(map(int, re.split(r"[-/.]", t)))
            y, m = partes[:2]
            dia = partes[2] if len(partes) == 3 else None
        elif re.fullmatch(r"\d{1,2}[-/.]\d{1,2}[-/.]\d{4}", t):
            dia, m, y = map(int, re.split(r"[-/.]", t))
        elif re.fullmatch(r"\d{1,2}[-/.]\d{4}", t):
            m, y = map(int, re.split(r"[-/.]", t))
        else:
            partes = re.sub(r"\bde\b", " ", t).replace(".", " ").replace("-", " ").replace("/", " ").split()
            if len(partes) == 2 and partes[0] in MES_POR_NOMBRE and re.fullmatch(r"\d{4}", partes[1]):
                m, y = MES_POR_NOMBRE[partes[0]], int(partes[1])
            elif (len(partes) == 3 and re.fullmatch(r"\d{1,2}", partes[0])
                  and partes[1] in MES_POR_NOMBRE and re.fullmatch(r"\d{4}", partes[2])):
                dia, m, y = int(partes[0]), MES_POR_NOMBRE[partes[1]], int(partes[2])
            else:
                return None
        if dia is not None:
            d = date(y, m, dia)
            return {"min": d, "max": d, "precision": "dia"}
        return {"min": date(y, m, 1), "max": date(y, m, calendar.monthrange(y, m)[1]), "precision": "mes"}
    except (ValueError, OverflowError):
        return None


def lectura_fecha(valor, hoy):
    original = str(valor or "").strip()
    intervalo = fecha(original, hoy)
    if intervalo:
        p = intervalo["precision"]
        d = intervalo["min"]
        texto = ("Actualidad" if p == "actualidad" else str(d.year) if p == "anio"
                 else f"{MESES[d.month - 1][0]}. {d.year}" if p == "mes" else f"{d.day:02}/{d.month:02}/{d.year}")
        return intervalo, {"original": original, "estado": "valida", "precision": p, "texto": texto}
    ausente = normalizar_fecha(original) in AUSENTES
    return None, {"original": original, "estado": "ausente" if ausente else "no_reconocida", "precision": None,
                  "texto": "No registrada en la fuente" if ausente else f"{original} (formato no reconocido)"}
