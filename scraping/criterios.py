"""Criterios de ranking de cada aviso, a partir de su oferta publicada.

Misma regla que src/services/bumeranSync.ts (la web usa lo que se guarda aquí en avisos.criterios):
  - se toman las líneas de "Requisitos:" / "¿Qué buscamos?" / "¿Qué te pedimos?" (o, si no hay, de "Funciones");
  - las de disponibilidad (presencial en Surco, turnos) no se puntúan: lo de Surco es el requisito obligatorio;
  - todos los criterios pesan lo mismo (suman 100).
"""
import re

MAX_CRITERIOS = 10
SECCION = re.compile(r"^([A-Za-zÁÉÍÓÚÑáéíóúñ ]{3,40}\s*:|¿[^?]{3,60}\?)\s*$")
REQUISITOS = re.compile(r"^(requisitos\s*:?|¿\s*qu[ée] (buscamos|te pedimos|necesitas)\s*\?)\s*$", re.I)
FUNCIONES = re.compile(r"^(funciones\s*:?|responsabilidades\s*:?|¿\s*(qu[ée] har[áa]s|qu[ée] retos asumir[áa]s|"
                       r"cu[áa]l ser[áa] tu (reto|misi[óo]n))\s*\?)\s*$", re.I)
VINETAS = re.compile("[•✅✔☑▪►✓]️?")


def _vineta(linea):
    return re.sub(r"^[\s\-*·–]+", "", linea).strip()


def _seccion(texto, nombre):
    lineas = [l.strip() for l in re.split(r"\r?\n", texto)]
    inicio = next((i for i, l in enumerate(lineas) if nombre.match(l)), None)
    if inicio is None:
        return []
    out = []
    for linea in lineas[inicio + 1:]:
        if SECCION.match(linea):
            break
        out.extend(_vineta(p) for p in VINETAS.split(linea))
    return [x for x in out if x]


def _limpiar(items):
    vistos, out = set(), []
    for x in items:
        if re.match(r"^disponibilidad\b", x, re.I) or len(x) <= 3 or x in vistos:
            continue
        vistos.add(x)
        out.append(x)
    return out


def extraer_requisitos(texto, titulo):
    items = _limpiar(_seccion(texto or "", REQUISITOS))
    if not items:
        items = _limpiar(_seccion(texto or "", FUNCIONES))
    return (items or [titulo])[:MAX_CRITERIOS]


def _hash_corto(texto):
    """FNV-1a de 32 bits sobre unidades UTF-16 (igual que shortHash en bumeranSync.ts)."""
    h = 2166136261
    datos = texto.encode("utf-16-le")
    for i in range(0, len(datos), 2):
        h = ((h ^ (datos[i] | datos[i + 1] << 8)) * 16777619) & 0xFFFFFFFF
    return f"{h:08x}"[:6]


def criterios_aviso(titulo, detalle_texto):
    """Devuelve (criterios, version): criterios = [{id, label, weightPct, type}], pesos iguales que suman 100."""
    titulo = (titulo or "").strip() or "Aviso"
    reqs = extraer_requisitos(detalle_texto, titulo)
    base, extra = divmod(100, len(reqs))
    criterios = [{"id": f"r{i + 1}", "label": r, "weightPct": base + (1 if i < extra else 0), "type": "LLM"}
                 for i, r in enumerate(reqs)]
    return criterios, f"Bumeran {_hash_corto('|'.join(c['label'] for c in criterios))}"
