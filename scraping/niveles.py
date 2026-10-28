"""Análisis de sobrecalificación (criterio de Andrea) con la regla de herramientas de GTH (22/10/2026).

Para los requisitos que piden un nivel de una herramienta o idioma («Excel y Power BI intermedio», «inglés avanzado»):
  - nivel del postulante igual o mayor al pedido: 100 % del requisito (pedir intermedio y tener avanzado no penaliza);
  - menor: básico 15 %, intermedio 50 %;
  - la menciona sin nivel: «por validar», 15 %;
  - no la menciona: 0.
Si el nivel supera al pedido, el postulante queda marcado «Sobrecalificado» para validarlo en la entrevista.
El nivel se lee de las respuestas al aviso, del campo Idiomas y de los textos de experiencia y estudios del CSV.
"""
import re

from .trayectoria import normalizar

NIVELES = {"basico": 1, "intermedio": 2, "avanzado": 3}
NOMBRE_NIVEL = {1: "básico", 2: "intermedio", 3: "avanzado"}
CREDITO = {0: 0.0, 1: 0.15, 2: 0.5, 3: 1.0}
POR_VALIDAR = 0.15
# Escala de GTH (28/10/2026): no la menciona 20 %, básico o sin nivel 30 %, intermedio 70 %; cumplir el nivel
# pedido, 100 %
CREDITO_GTH = {0: 0.2, 1: 0.3, 2: 0.7, 3: 1.0}
PALABRA_NIVEL = re.compile(r"\b(basico|basica|elemental|inicial|intermedio|intermedia|medio|media|avanzado|avanzada|"
                           r"experto|experta|dominio|nativo|nativa|fluido|fluida|alto)\b")
NIVEL_DE = {"basico": 1, "basica": 1, "elemental": 1, "inicial": 1, "intermedio": 2, "intermedia": 2, "medio": 2,
            "media": 2, "avanzado": 3, "avanzada": 3, "experto": 3, "experta": 3, "dominio": 3, "nativo": 3,
            "nativa": 3, "fluido": 3, "fluida": 3, "alto": 3}
HERRAMIENTAS = {
    "Excel": r"excel", "Power BI": r"power\s?bi", "SQL": r"sql", "Word": r"word", "PowerPoint": r"power\s?point",
    "Office": r"office|ofimatica", "Python": r"python", "SAP": r"sap", "Tableau": r"tableau", "Photoshop": r"photoshop",
    "Illustrator": r"illustrator", "AutoCAD": r"autocad", "Canva": r"canva", "Google Analytics": r"google analytics",
    "Adobe": r"adobe", "Inglés": r"ingles|english", "Portugués": r"portugues", "Francés": r"frances",
}
PATRON = {h: re.compile(r"\b(?:" + p + r")\b") for h, p in HERRAMIENTAS.items()}


def requisito_de_nivel(etiqueta):
    """{herramienta: nivel pedido} si el requisito pide un nivel concreto; {} si no."""
    t = normalizar(etiqueta)
    niveles = [NIVELES[m] for m in re.findall(r"\b(basico|intermedio|avanzado)\b", t)]
    if not niveles:
        return {}
    return {h: max(niveles) for h, p in PATRON.items() if p.search(t)}


def requisitos_de_nivel(etiquetas):
    return {k: r for k, e in enumerate(etiquetas) if (r := requisito_de_nivel(e))}


def _textos(datos):
    """Respuestas al aviso, idiomas y textos de experiencia y estudios del CSV."""
    for k, v in (datos or {}).items():
        if not str(v or "").strip():
            continue
        if "?" in k or k.startswith("Ind") or k == "Idiomas" or re.search(r"\] (Descripci|Puesto|Titulo)", k):
            yield normalizar(v)


def nivel_candidato(datos, herramienta, reglas_gth=False):
    """Nivel 1-3 del postulante en la herramienta; 0.5 si la menciona sin nivel; 0 si no la menciona. Con las reglas de GTH también
    cuenta la respuesta a una pregunta que la nombra (nivel_respondido)."""
    patron, mejor = PATRON[herramienta], 0.0
    otras = re.compile("|".join(p.pattern for h, p in PATRON.items() if h != herramienta))
    for texto in _textos(datos):
        for m in patron.finditer(texto):
            despues = texto[m.end():m.end() + 45]
            corte = otras.search(despues)
            despues = despues[:corte.start()] if corte else despues
            nivel = PALABRA_NIVEL.search(despues) or PALABRA_NIVEL.search(texto[max(0, m.start() - 25):m.start()])
            mejor = max(mejor, NIVEL_DE[nivel.group(1)] if nivel else 0.5)
    if reglas_gth:
        mejor = max(mejor, nivel_respondido(datos, herramienta))
    return mejor


AFIRMATIVA = re.compile(r"^\s*(?:si|sí|claro|manejo|domino|tengo)\b")


def nivel_respondido(datos, herramienta):
    """Nivel de la herramienta en la respuesta a una pregunta del aviso que la nombra («¿A qué nivel dominas Excel y
    Power BI?» -> «Intermedio»): la respuesta no repite el nombre. Con un nivel por herramienta («intermedio - básico»)
    se toman en el orden de la pregunta. 0.5 si responde que sí sin nivel; 0 si no hay pregunta o respuesta."""
    mejor = 0.0
    for k, v in (datos or {}).items():
        pregunta, respuesta = normalizar(k), normalizar(v)
        if "?" not in k or not respuesta or not PATRON[herramienta].search(pregunta) or PATRON[herramienta].search(respuesta):
            continue
        nombradas = sorted((m.start(), h) for h, p in PATRON.items() if (m := p.search(pregunta)))
        niveles = [NIVEL_DE[w] for w in PALABRA_NIVEL.findall(respuesta)]
        if len(niveles) > 1 and len(niveles) == len(nombradas):
            nivel = niveles[[h for _, h in nombradas].index(herramienta)]
        elif niveles:
            nivel = niveles[0]
        else:
            nivel = 0.5 if AFIRMATIVA.search(respuesta) else 0.0
        mejor = max(mejor, nivel)
    return mejor


def evaluar(datos, pedido, reglas_gth=False):
    """(valor 0-1 del requisito, detalle legible, sobrecalificado). Con las reglas de GTH (28/10/2026, todos los avisos)
    se usa CREDITO_GTH y mencionarla sin nivel cuenta como básico."""
    credito = CREDITO_GTH if reglas_gth else CREDITO
    valores, partes, sobre = [], [], False
    for herramienta, nivel_pedido in pedido.items():
        nivel = nivel_candidato(datos, herramienta, reglas_gth)
        if nivel == 0:
            valores.append(credito[0]); partes.append(f"{herramienta}: no lo menciona")
        elif nivel == 0.5 and not reglas_gth:
            valores.append(POR_VALIDAR); partes.append(f"{herramienta}: por validar")
        elif nivel == 0.5:
            valores.append(1.0 if 1 >= nivel_pedido else credito[1]); partes.append(f"{herramienta}: sin nivel (se toma básico)")
        else:
            nivel = int(nivel)
            valores.append(1.0 if nivel >= nivel_pedido else credito[nivel])
            sobre |= nivel > nivel_pedido
            partes.append(f"{herramienta}: {NOMBRE_NIVEL[nivel]}" + (" (más de lo pedido)" if nivel > nivel_pedido else ""))
    return sum(valores) / len(valores), ", ".join(partes), sobre
