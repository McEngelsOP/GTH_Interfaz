"""Cronología factual a partir del CSV. Sin red, modelos ni lectura de PDF."""
import calendar
import hashlib
import re
import unicodedata
from datetime import date, timedelta

from .fechas_trayectoria import AUSENTES, fecha, lectura_fecha, normalizar_fecha
from .campos_trayectoria import campo_laboral

from .trayectoria_reglas import VERSION, TRANSICIONES_MINIMAS, VENTANA_MESES, HORIZONTE_MESES


def normalizar(texto):
    return " ".join("".join(c for c in unicodedata.normalize("NFD", str(texto or "").lower())
                            if unicodedata.category(c) != "Mn").split())


def campos_laborales(datos):
    return {k: str(v) for k, v in datos.items() if campo_laboral(k) and v is not None}


def resolver_campo(fuentes, hoy):
    """Una columna vacía no tapa otra poblada; valores incompatibles no se eligen al azar."""
    valores = {}
    for fuente in fuentes:
        valor = fuente["valor"].strip()
        if normalizar_fecha(valor) not in AUSENTES:
            intervalo = fecha(valor, hoy)
            clave = (intervalo["min"], intervalo["max"], intervalo["precision"]) if intervalo else normalizar(valor)
            valores.setdefault(clave, valor)
    if len(valores) > 1:
        return " | ".join(valores.values()), True
    return next(iter(valores.values()), fuentes[0]["valor"].strip() if fuentes else ""), False


def huella(datos):
    # Igual que gth_trayectoria_huella en SQL: enmarcado por longitud, orden C.
    campos = campos_laborales(datos)
    texto = "".join(f"{len(k)}:{k}{len(campos[k])}:{campos[k]}" for k in sorted(campos))
    return hashlib.md5(texto.encode("utf-8")).hexdigest()


def meses(d, cantidad):
    n = d.year * 12 + d.month - 1 + cantidad
    y, m = divmod(n, 12)
    return date(y, m + 1, min(d.day, calendar.monthrange(y, m + 1)[1]))


def modalidad(puesto, empresa, descripcion, explicita):
    # Clasificar solo la experiencia correspondiente, nunca todo el CV por una palabra.
    texto = normalizar(" ".join([puesto, empresa, descripcion, explicita]))
    if re.search(r"\b(?:pre[ -]?profesional(?:es)?|pre[ -]?practicas)\b", texto):
        return "preprofesional", "Práctica preprofesional"
    if re.search(r"\b(?:freelanc\w*|autonom[oa]|independiente)\b", texto):
        return "independiente", "Trabajo independiente declarado"
    if re.search(r"\b(?:por proyectos?|por campana|estacional)\b", texto):
        return "temporal", "Trabajo por proyecto, campaña o temporada declarado"
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
        indice, campo = campo_laboral(k)
        grupos.setdefault(indice, {}).setdefault(campo, []).append({"columna": k, "valor": v})
    experiencias, vistos = [], set()
    problemas, notas = [], []
    bloqueantes = False
    for indice, fuentes in sorted(grupos.items()):
        fuentes = {k: sorted(v, key=lambda f: f["columna"]) for k, v in fuentes.items()}
        resueltos = {k: resolver_campo(v, hoy) for k, v in sorted(fuentes.items())}
        d = {k: valor for k, (valor, _) in resueltos.items()}
        conflictos = [k for k, (_, conflicto) in resueltos.items() if conflicto]
        empresa, puesto = d.get("Empresa", "").strip(), d.get("Puesto", "").strip()
        descripcion = d.get("Descripción", d.get("Descripcion", "")).strip()
        ini, fin = d.get("Fecha Inicio", "").strip(), d.get("Fecha Fin", "").strip()
        if not any([empresa, puesto, descripcion, ini, fin]):
            continue
        explicita = " ".join(d.get(k, "").strip() for k in ["Modalidad", "Tipo de contrato", "Tipo de empleo"] if d.get(k, "").strip())
        modo, motivo = modalidad(puesto, empresa, descripcion, explicita)
        if conflictos:
            modo, motivo = "desconocida", "Campos laborales contradictorios"
        dedup = (normalizar(empresa), normalizar(puesto), ini, fin, modo)
        if dedup in vistos:
            continue
        vistos.add(dedup)
        inicio, inicio_leido = lectura_fecha(ini, hoy)
        final, fin_leido = lectura_fecha(fin, hoy)
        for campo, leida in [("Fecha Inicio", inicio_leido), ("Fecha Fin", fin_leido)]:
            leida["fuentes"] = fuentes.get(campo, [])
        # Dos valores incompatibles no acreditan ninguna fecha ni modalidad.
        if "Fecha Inicio" in conflictos:
            inicio = None
        if "Fecha Fin" in conflictos:
            final = None
        # Un mes en curso conserva precisión mensual; sus días posibles no superan el análisis.
        if inicio and inicio["precision"] == "mes" and inicio["min"] <= hoy < inicio["max"]:
            inicio = {**inicio, "max": hoy}
        if final and final["precision"] == "mes" and final["min"] <= hoy < final["max"]:
            final = {**final, "max": hoy}
        excluida = modo in {"preprofesional", "independiente", "temporal"}
        valida = bool(not conflictos and inicio and final and inicio["precision"] not in {"anio", "actualidad"}
                      and final["precision"] != "anio" and inicio["min"] <= final["max"]
                      and inicio["max"] <= hoy and (final["min"] <= hoy))
        incidencias_fecha = [f"valores contradictorios para {k.lower()} entre columnas del archivo" for k in conflictos]
        for nombre, leida, intervalo in [("inicio", inicio_leido, inicio), ("fin", fin_leido, final)]:
            if ("Fecha Inicio" if nombre == "inicio" else "Fecha Fin") in conflictos:
                continue
            if leida["estado"] == "ausente":
                incidencias_fecha.append(f"fecha de {nombre} no registrada en la fuente")
            elif leida["estado"] == "no_reconocida":
                incidencias_fecha.append(f"fecha de {nombre} presente, pero con formato no reconocido: {leida['original']}")
            elif intervalo["precision"] == "anio":
                incidencias_fecha.append(f"fecha de {nombre} con solo el año; falta precisión de mes")
            elif nombre == "inicio" and intervalo["precision"] == "actualidad":
                incidencias_fecha.append("el inicio indica actualidad, sin fecha de comienzo")
            elif intervalo["min"] > hoy:
                incidencias_fecha.append(f"fecha de {nombre} posterior a la fecha de análisis")
        if inicio and final and final["max"] < inicio["min"]:
            incidencias_fecha.append("fecha de fin anterior a la fecha de inicio")
        problemas.extend(f"Exp[{indice}]: {mensaje}" for mensaje in incidencias_fecha)
        if not excluida:
            if not empresa:
                problemas.append(f"Exp[{indice}]: empresa no registrada")
            if modo == "desconocida":
                notas.append(f"Exp[{indice}]: {motivo.lower()}; no se confirma una relación dependiente")
            bloqueantes |= bool(incidencias_fecha or not empresa or motivo == "Práctica sin tipo especificado")
        experiencias.append({"indice": indice, "empresa": empresa, "puesto": puesto,
            "inicio": ini, "fin": fin, "fecha_inicio": inicio_leido, "fecha_fin": fin_leido,
            "campos_origen": fuentes,
            "modalidad": modo, "motivo": motivo,
            "evidencia": " · ".join(x.strip() for x in [puesto, explicita, descripcion] if x.strip())[:1200],
            "excluida": excluida, "_inicio": inicio, "_fin": final, "_valida": valida})
    # Una experiencia no ubicable impide reconstruir una secuencia completa con seguridad.
    ubicables = all(e["_inicio"] and e["_inicio"]["precision"] not in {"anio", "actualidad"} for e in experiencias)
    ordenadas = sorted((e for e in experiencias if e["_inicio"]), key=lambda e: e["_inicio"]["min"] if e["_inicio"] else date.min)
    transiciones, posibles = [], []
    if ubicables:
        # Primero establecer adyacencia, después excluir: no puentear prácticas/proyectos.
        for a, b in zip(ordenadas, ordenadas[1:]):
            if a["excluida"] or b["excluida"]:
                continue
            if not a["_valida"] or not b["_valida"] or not a["empresa"] or not b["empresa"]:
                continue
            empresa_a = re.sub(r"[^a-z0-9]", "", normalizar(a["empresa"]))
            empresa_b = re.sub(r"[^a-z0-9]", "", normalizar(b["empresa"]))
            if empresa_a == empresa_b:
                continue
            # Solo un posible cambio dentro del horizonte puede bloquear el resultado reciente.
            t = b["_inicio"]
            if t["max"] < corte:
                continue
            if t["min"] < corte:
                problemas.append("Transición en el límite del horizonte de 24 meses")
                bloqueantes = True
                continue
            # Una relación vigente o un solapamiento no acreditan una sustitución.
            if a["_fin"]["precision"] == "actualidad" or a["_fin"]["max"] >= b["_inicio"]["min"]:
                problemas.append(f"Exp[{a['indice']}] y Exp[{b['indice']}]: simultaneidad o límite temporal ambiguo")
                bloqueantes = True
                continue
            # Otra experiencia anterior todavía activa invalida la interpretación de sustitución.
            if any(c is not a and c is not b and not c["excluida"] and c["_inicio"] and c["_fin"]
                   and c["_inicio"]["min"] <= a["_inicio"]["min"]
                   and c["_fin"]["max"] >= b["_inicio"]["min"] for c in ordenadas):
                problemas.append("Existen relaciones laborales simultáneas")
                bloqueantes = True
                continue
            evento = {"desde": a["indice"], "hasta": b["indice"], "min": t["min"], "max": t["max"]}
            posibles.append(evento)
            if "desconocida" not in (a["modalidad"], b["modalidad"]):
                transiciones.append(evento)
    elif experiencias:
        problemas.append("La cronología contiene experiencias sin fecha de inicio suficiente")
        bloqueantes = True
    def buscar_ventana(eventos):
        nonlocal bloqueantes
        for i in range(len(eventos) - TRANSICIONES_MINIMAS + 1):
            grupo = eventos[i:i + TRANSICIONES_MINIMAS]
            if grupo[-1]["max"] <= meses(grupo[0]["min"], VENTANA_MESES):
                return {"inicio": grupo[0]["min"].isoformat(), "fin": grupo[-1]["max"].isoformat(),
                        "transiciones": [{**t, "min": t["min"].isoformat(), "max": t["max"].isoformat()} for t in grupo]}
            if grupo[-1]["min"] <= meses(grupo[0]["max"], VENTANA_MESES):
                problemas.append("Fechas parciales en el límite de seis meses")
                bloqueantes = True
        return None

    ventana = buscar_ventana(transiciones)
    ventana_posible = buscar_ventana(posibles) if not ventana else None
    aplica = any(not e["excluida"] for e in experiencias)
    if ventana_posible:
        problemas.append("Se alcanza el umbral con modalidad contractual sin confirmar; no se acredita un patrón dependiente")
    estado = ("patron_detectado" if ventana else "no_aplica" if experiencias and not aplica
              else "informacion_insuficiente" if bloqueantes or ventana_posible or not experiencias else "sin_patron")
    # Invalidar también candidatos provisionales cuando salgan del horizonte; conservamos v1 como historial.
    vencimientos = [meses(t["min"], HORIZONTE_MESES) for t in posibles]
    # Una fecha futura no puede conservar su diagnóstico para siempre al cambiar el calendario.
    vencimientos.extend(f["min"] - timedelta(days=1) for e in experiencias for f in (e["_inicio"], e["_fin"])
                        if f and f["min"] > hoy)
    vence = min(vencimientos, default=None)
    for e in experiencias:
        for k in ["_inicio", "_fin", "_valida"]:
            e.pop(k)
    return {"version": VERSION, "huella": huella(datos), "estado": estado,
            "fecha_referencia": hoy.isoformat(), "vigente_hasta": vence.isoformat() if vence else None,
            "parametros": {"transiciones": TRANSICIONES_MINIMAS, "ventana_meses": VENTANA_MESES, "horizonte_meses": HORIZONTE_MESES},
            "experiencias": experiencias, "ventana": ventana, "ventana_posible": ventana_posible,
            "notas": list(dict.fromkeys(notas)), "incidencias": list(dict.fromkeys(problemas)),
            "total_transiciones": len(transiciones), "total_transiciones_posibles": len(posibles) - len(transiciones), "fuente": "CSV de Bumeran"}
