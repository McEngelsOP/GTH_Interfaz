"""Cronología factual a partir del CSV. Sin red, modelos ni lectura de PDF."""
import calendar
import hashlib
import re
import unicodedata
from datetime import date, timedelta

from .trayectoria_reglas import VERSION, TRANSICIONES_MINIMAS, VENTANA_MESES, HORIZONTE_MESES

CAMPO = re.compile(r"^Exp\[(\d+)\] (Empresa|Puesto|Fecha Inicio|Fecha Fin|Descripci[oó]n|Modalidad|Tipo de contrato|Tipo de empleo)$")


def normalizar(texto):
    return " ".join("".join(c for c in unicodedata.normalize("NFD", str(texto or "").lower())
                            if unicodedata.category(c) != "Mn").split())


def campos_laborales(datos):
    return {k: str(v) for k, v in datos.items() if CAMPO.fullmatch(k) and v is not None}


def huella(datos):
    # Igual que gth_trayectoria_huella en SQL: enmarcado por longitud, orden C.
    campos = campos_laborales(datos)
    texto = "".join(f"{len(k)}:{k}{len(campos[k])}:{campos[k]}" for k in sorted(campos))
    return hashlib.md5(texto.encode("utf-8")).hexdigest()


def meses(d, cantidad):
    n = d.year * 12 + d.month - 1 + cantidad
    y, m = divmod(n, 12)
    return date(y, m + 1, min(d.day, calendar.monthrange(y, m + 1)[1]))


def fecha(valor, hoy):
    """Intervalo posible; jamás completar una fecha parcial con un día inventado."""
    t = normalizar(valor)
    if t in {"actualidad", "presente", "actual", "actualmente", "a la fecha"}:
        return {"min": hoy, "max": hoy, "precision": "actualidad"}
    try:
        if re.fullmatch(r"\d{4}", t):
            y = int(t)
            return {"min": date(y, 1, 1), "max": date(y, 12, 31), "precision": "anio"}
        if re.fullmatch(r"\d{4}-\d{2}", t):
            y, m = map(int, t.split("-"))
        elif re.fullmatch(r"\d{1,2}[/.-]\d{4}", t):
            m, y = map(int, re.split(r"[/.-]", t))
        elif re.fullmatch(r"\d{4}-\d{2}-\d{2}", t):
            d = date.fromisoformat(t)
            return {"min": d, "max": d, "precision": "dia"}
        elif re.fullmatch(r"\d{1,2}[/.-]\d{1,2}[/.-]\d{4}", t):
            day, m, y = map(int, re.split(r"[/.-]", t))
            d = date(y, m, day)
            return {"min": d, "max": d, "precision": "dia"}
        else:
            return None
        return {"min": date(y, m, 1), "max": date(y, m, calendar.monthrange(y, m)[1]), "precision": "mes"}
    except (ValueError, OverflowError):
        return None


def modalidad(puesto, empresa, descripcion, explicita):
    # Clasificar solo la experiencia correspondiente, nunca todo el CV por una palabra.
    texto = normalizar(" ".join([puesto, empresa, descripcion, explicita]))
    if re.search(r"\b(?:pre[ -]?profesional(?:es)?|pre[ -]?practicas)\b", texto):
        return "preprofesional", "Práctica preprofesional"
    if re.search(r"\b(?:freelanc\w*|autonom[oa]|independiente|por proyectos?|por campana|estacional)\b", texto):
        return "independiente", "Trabajo independiente o proyecto documentado"
    profesional = bool(re.search(r"\bpractic(?:as?|ante)\b.*\bprofesional(?:es)?\b", texto))
    if re.search(r"\b(?:fin(?:alizacion)? (?:de |del )?contrato|contrato (?:concluido|finalizado)|culminacion (?:de |del )?(?:periodo|convenio)|plazo (?:fijo|determinado))\b", texto):
        return "temporal", "Término o duración contractual documentados"
    if profesional:
        return "profesional", "Práctica profesional; motivo de término no acreditado"
    if re.search(r"\bpractic(?:as?|ante)\b", texto):
        return "desconocida", "Práctica sin tipo especificado"
    if re.search(r"\b(?:dependiente|planilla|contrato indefinido|contrato indeterminado|tiempo indeterminado)\b", normalizar(explicita)):
        return "dependiente", "Modalidad dependiente explícita"
    return "desconocida", "Modalidad contractual no documentada"


def analizar(datos, hoy=None):
    hoy = hoy or date.today()
    corte = meses(hoy, -HORIZONTE_MESES)
    grupos = {}
    for k, v in campos_laborales(datos).items():
        m = CAMPO.fullmatch(k)
        grupos.setdefault(int(m[1]), {})[m[2]] = v
    experiencias, vistos = [], set()
    problemas = []
    for indice, d in sorted(grupos.items()):
        empresa, puesto = d.get("Empresa", "").strip(), d.get("Puesto", "").strip()
        descripcion = d.get("Descripción", d.get("Descripcion", "")).strip()
        ini, fin = d.get("Fecha Inicio", "").strip(), d.get("Fecha Fin", "").strip()
        if not any([empresa, puesto, descripcion, ini, fin]):
            continue
        explicita = " ".join(d.get(k, "") for k in ["Modalidad", "Tipo de contrato", "Tipo de empleo"])
        modo, motivo = modalidad(puesto, empresa, descripcion, explicita)
        dedup = (normalizar(empresa), normalizar(puesto), ini, fin, modo)
        if dedup in vistos:
            continue
        vistos.add(dedup)
        inicio, final = fecha(ini, hoy), fecha(fin, hoy)
        excluida = modo in {"preprofesional", "independiente", "temporal"}
        valida = bool(inicio and final and inicio["precision"] not in {"anio", "actualidad"}
                      and final["precision"] != "anio" and inicio["min"] <= final["max"]
                      and inicio["max"] <= hoy and (final["min"] <= hoy))
        if not excluida and (not valida or not empresa or modo == "desconocida"):
            problemas.append(f"Exp[{indice}]: fechas, empresa o modalidad insuficientes")
        experiencias.append({"indice": indice, "empresa": empresa, "puesto": puesto,
            "inicio": ini, "fin": fin, "modalidad": modo, "motivo": motivo,
            "evidencia": " · ".join(x for x in [puesto, explicita, descripcion] if x)[:1200],
            "excluida": excluida, "_inicio": inicio, "_fin": final, "_valida": valida})
    # Una experiencia no ubicable impide reconstruir una secuencia completa con seguridad.
    ubicables = all(e["_inicio"] and e["_inicio"]["precision"] not in {"anio", "actualidad"} for e in experiencias)
    ordenadas = sorted(experiencias, key=lambda e: e["_inicio"]["min"] if e["_inicio"] else date.min)
    transiciones = []
    if ubicables:
        # Primero establecer adyacencia, después excluir: no puentear prácticas/proyectos.
        for a, b in zip(ordenadas, ordenadas[1:]):
            if a["excluida"] or b["excluida"]:
                continue
            if not a["_valida"] or not b["_valida"] or "desconocida" in (a["modalidad"], b["modalidad"]) or not a["empresa"] or not b["empresa"]:
                continue
            empresa_a = re.sub(r"[^a-z0-9]", "", normalizar(a["empresa"]))
            empresa_b = re.sub(r"[^a-z0-9]", "", normalizar(b["empresa"]))
            if empresa_a == empresa_b:
                continue
            # Una relación vigente o un solapamiento no acreditan una sustitución.
            if a["_fin"]["precision"] == "actualidad" or a["_fin"]["max"] >= b["_inicio"]["min"]:
                problemas.append(f"Exp[{a['indice']}] y Exp[{b['indice']}]: simultaneidad o límite temporal ambiguo")
                continue
            # Otra experiencia anterior todavía activa invalida la interpretación de sustitución.
            if any(c is not a and c is not b and c["_inicio"] and c["_fin"]
                   and c["_inicio"]["min"] <= a["_inicio"]["min"]
                   and c["_fin"]["max"] >= b["_inicio"]["min"] for c in ordenadas):
                problemas.append("Existen relaciones laborales simultáneas")
                continue
            t = b["_inicio"]
            if t["max"] < corte:
                continue
            if t["min"] < corte:
                problemas.append("Transición en el límite del horizonte de 24 meses")
                continue
            transiciones.append({"desde": a["indice"], "hasta": b["indice"], "min": t["min"], "max": t["max"]})
    elif experiencias:
        problemas.append("La cronología contiene experiencias sin fecha de inicio suficiente")
    ventana = None
    for i in range(len(transiciones) - TRANSICIONES_MINIMAS + 1):
        grupo = transiciones[i:i + TRANSICIONES_MINIMAS]
        if grupo[-1]["max"] <= meses(grupo[0]["min"], VENTANA_MESES):
            ventana = {"inicio": grupo[0]["min"].isoformat(), "fin": grupo[-1]["max"].isoformat(),
                       "transiciones": [{**t, "min": t["min"].isoformat(), "max": t["max"].isoformat()} for t in grupo]}
            break
        if grupo[-1]["min"] <= meses(grupo[0]["max"], VENTANA_MESES):
            problemas.append("Fechas parciales en el límite de seis meses")
    aplica = any(not e["excluida"] for e in experiencias)
    estado = "patron_detectado" if ventana else "no_aplica" if experiencias and not aplica else "informacion_insuficiente" if problemas or not experiencias else "sin_patron"
    # Sin cambios de fuente, solo vencer cuando una transición abandone el horizonte.
    vence = min((meses(t["min"], HORIZONTE_MESES) for t in transiciones), default=None)
    for e in experiencias:
        for k in ["_inicio", "_fin", "_valida"]:
            e.pop(k)
    return {"version": VERSION, "huella": huella(datos), "estado": estado,
            "fecha_referencia": hoy.isoformat(), "vigente_hasta": vence.isoformat() if vence else None,
            "parametros": {"transiciones": TRANSICIONES_MINIMAS, "ventana_meses": VENTANA_MESES, "horizonte_meses": HORIZONTE_MESES},
            "experiencias": experiencias, "ventana": ventana, "incidencias": list(dict.fromkeys(problemas)),
            "total_transiciones": len(transiciones), "fuente": "CSV de Bumeran"}
