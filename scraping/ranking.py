"""Ranking por embeddings (e5) de cada aviso, calculado en segundo plano por el scraper.

Se ejecuta después de bajar el CSV: el primer día calcula a todos los postulantes del aviso; en las corridas
siguientes solo a los nuevos (el resto ya tiene su similitud original guardada) y reescala el aviso completo
a 0-1. Si cambian los requisitos de la oferta, se recalcula todo. La web solo lee la tabla ranking_embeddings.

Usa el módulo matching/embeddings (requiere sentence-transformers y el modelo e5 en la caché local; sin ellos
cae a tfidf, que no necesita descargar nada).
"""
import json
import logging
import math
import re
import time

from . import experiencia
from .criterios import _hash_corto, criterios_aviso
from .db import ahora

log = logging.getLogger("scraper")

# Mismos campos que manda la web (src/services/embeddingMatching.ts): nunca nombre, documento ni contacto
CAMPO = re.compile(r"^(Exp\[\d+\] (Puesto|Area|SubArea|Industria|Descripci[oó]n)|Est\[\d+\] (Titulo|Nivel|Estado|Area)|Idiomas)$")
_embedder = None


def disponible() -> bool:
    try:
        import matching.embeddings.matching_llm  # noqa: F401
        return True
    except ImportError:
        return False


def _modelo():
    global _embedder
    if _embedder is None:
        from matching.embeddings.matching_llm import Embedder
        t = time.time()
        _embedder = Embedder("e5")
        log.info("Modelo de embeddings cargado: %s (%.0f s)", _embedder.backend, time.time() - t)
    return _embedder


def _num(v):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else float(v)


def _campos(datos):
    return {k: str(v) for k, v in (datos or {}).items() if CAMPO.match(k) and str(v).strip()}


SIN_INFORMACION = "CV sin información"
BONO_RUBRO = 0.25        # bonificación por experiencia en educación superior con el criterio en 50 (aplicar_ajustes)
BONO_ESCALA = 0.25       # bonificación por trabajar en una empresa Tier 1 con el criterio en 50
RUBRO_VERSION = "clasif3"
# Reglas validadas con GTH (28/10/2026, «prueba 8b» en los avisos I, II y III; desde el 28/10 en todos los avisos):
# experiencia relacionada por palabras, «Interno» y dos prácticas sin tipo (experiencia.py), bono interno por años de
# sobra (no se muestra en la web), rubro por cada experiencia, posgrado = 100 % en estudios y escala de herramientas.
REGLAS_GTH_VERSION = "gth8b"
RUBRO_RECIENTE = 0.5           # el último trabajo en educación suma esta fracción más de la bonificación de rubro
PESO_OTROS_AVISOS = 0.5        # postuló a otros avisos de ESAN: hasta esta fracción de BONO_ESCALA (con 3 o más avisos)
NO_CUMPLE_FORMACION = 0.25     # requisito de formación de quien responde que no cumple: un cuarto del rango del aviso
PENALIZA_DISPONIBILIDAD = 0.5  # quien responde «no» a la disponibilidad: resta como la alta rotación (× distancia)
MARGEN_DECLARADOS = 1          # años de experiencia: no más de los que el postulante declara en el aviso + este margen
PESO_SUELDO = 0.15             # pretensión salarial (ligero): ± esta fracción de la distancia según cuánto pide frente a la mediana
SUELDO_MINIMO, SUELDO_MAXIMO = 800, 15000   # pretensiones fuera de este rango no se consideran (montos mal escritos)
PESO_HERRAMIENTAS_NO_TEC = 0.5  # requisitos de herramientas en puestos que no son de tecnología: la mitad (sin cambio en la web)
PUESTO_TEC = re.compile(r"\b(?:datos|data|bi|business intelligence|analytics|sistemas|ti|tecnologias? de (?:la )?informacion|"
                        r"software|desarrollador|desarrolladora|programador|programadora|developer|soporte tecnico|"
                        r"infraestructura|ciberseguridad|devops|cloud|redes|informatica)\b")
PESO_ANIOS_GTH = 2          # los requisitos «N años de experiencia» pesan el doble en el puntaje (sin cambio en la web)
BONO_ANIOS = BONO_ESCALA / 2   # por cada año de experiencia relacionada por encima de lo pedido (sin control en la web)
ANIOS_EXTRA_MAXIMO = 4         # años de sobra que suman como máximo (4 años = 2 bonificaciones de empresa)
BONOS_MAXIMOS = 2              # rubro y escala: bonificaciones por experiencia que suman como máximo
ESCALA_POR_EXPERIENCIA = 0.5   # cada experiencia en una empresa Tier 1 suma media bonificación (Tier 1.5, un 75 % de eso)
# «Criterios y pesos» (tabla gth_aviso_criterios): intensidad 0-100 % de cada criterio; 0 lo apaga y 100 es su efecto máximo.
# Experiencia laboral empieza en 100 = el peso completo de sus requisitos de años (bajarlo los reduce); los demás en 50.
# rotacion es la penalización (fracción de la distancia entre puntajes altos y bajos del aviso) por alta rotación.
CRITERIOS_BASE = {"experiencia": 100, "rotacion": 0.5, "rubro": 50, "sobrecalificacion": 50, "escala_empresa": 50}


def criterios_clasificacion(bd, aviso_id) -> dict:
    """Criterios y pesos del aviso; sin fila guardada (o fuera de Supabase), los valores de base."""
    if bd.motor != "supabase":
        return dict(CRITERIOS_BASE)
    fila = bd.uno("SELECT experiencia, rotacion, rubro, sobrecalificacion, escala_empresa FROM gth_aviso_criterios "
                  "WHERE aviso_id=?", (aviso_id,)) or {}
    return {k: float(fila[k]) if k == "rotacion" else int(fila[k]) for k in fila} | \
           {k: v for k, v in CRITERIOS_BASE.items() if k not in fila}


def sueldo_aviso(bd, aviso_id):
    """(oferta, modo) del aviso; (None, 'estricto') si no hay oferta."""
    if bd.motor != "supabase":
        return None, "estricto"
    fila = bd.uno("SELECT monto, modo_sueldo FROM gth_sueldos_ofertados WHERE aviso_id=?", (aviso_id,))
    return (float(fila["monto"]) if fila and fila["monto"] is not None else None), (fila or {}).get("modo_sueldo") or "estricto"


def alta_rotacion(bd, aviso_id) -> set:
    """Postulantes con cambios frecuentes entre empleadores (análisis de Rotación laboral), salvo que GTH haya
    registrado la revisión como «justificado» o «dato incorrecto»."""
    if bd.motor != "supabase":
        return set()
    filas = bd.consultar("""SELECT DISTINCT ON (a.clave) a.clave, a.estado,
                              (SELECT r.estado FROM gth_trayectoria_revisiones r WHERE r.analisis_id = a.id
                               ORDER BY r.creada_at DESC, r.id DESC LIMIT 1) AS revision
                            FROM gth_trayectoria_analisis a WHERE a.aviso_id=?
                            ORDER BY a.clave, a.calculado_at DESC""", (aviso_id,))
    return {f["clave"] for f in filas if f["estado"] == "patron_detectado" and f["revision"] not in ("justificado", "dato_incorrecto")}


def requisitos_guardados(bd, aviso_id) -> list[dict]:
    """Requisitos y pesos de «Requisitos y pesos» en la web (tabla gth_aviso_requisitos, solo en Supabase)."""
    if bd.motor != "supabase":
        return []
    return bd.consultar("SELECT etiqueta, peso, activo FROM gth_aviso_requisitos WHERE aviso_id=? ORDER BY orden, etiqueta",
                        (aviso_id,))


def _porcentajes(pesos):
    """Pesos de 0 a 100 independientes -> porcentajes enteros que suman 100 (mayor resto)."""
    exactos = [w * 100 / sum(pesos) for w in pesos]
    out = [int(x) for x in exactos]
    for k in sorted(range(len(pesos)), key=lambda k: out[k] - exactos[k])[:100 - sum(out)]:
        out[k] += 1
    return out


def criterios_efectivos(bd, a: dict):
    """(criterios, version) con que se calcula el ranking: los requisitos activos guardados en la web, con su peso; si
    no hay, los de la oferta publicada con pesos iguales. Con pesos iguales la versión no cambia por el peso; si aplica
    la regla de prácticas (experiencia.py), la versión la incluye."""
    activos = [r for r in requisitos_guardados(bd, a["aviso_id"]) if r["activo"] and r["peso"] > 0]
    if activos:
        pesos = [int(r["peso"]) for r in activos]
        criterios = [{"id": f"r{i + 1}", "label": r["etiqueta"], "weightPct": pct, "type": "LLM", "peso": w}
                     for i, (r, w, pct) in enumerate(zip(activos, pesos, _porcentajes(pesos)))]
    else:
        criterios = [{**c, "peso": 1} for c in criterios_aviso(a["titulo"], a["detalle_texto"])[0]]
        pesos = [1] * len(criterios)
    clave = "|".join(c["label"] for c in criterios)
    if len(set(pesos)) > 1:
        clave += "#" + ",".join(map(str, pesos))
    if experiencia.requisitos_de_anios(a["titulo"], [c["label"] for c in criterios]):
        clave += "#" + experiencia.VERSION
    clave += "#" + RUBRO_VERSION
    clave += "#" + REGLAS_GTH_VERSION
    # Cambiar «Criterios y pesos» o la oferta en modo Estricto cambia el resultado: la versión los incluye
    clasif = criterios_clasificacion(bd, a["aviso_id"])
    if clasif != CRITERIOS_BASE:
        clave += "#" + ",".join(f"{k}={clasif[k]}" for k in sorted(clasif))
    oferta, modo = sueldo_aviso(bd, a["aviso_id"])
    if oferta is not None and modo == "estricto":
        clave += f"#sueldo={oferta:.2f}"
    return criterios, f"Bumeran {_hash_corto(clave)}"


AJUSTES_SUMADOS = ("rubro", "escala", "rotacion", "sueldo", "anios_extra", "disponibilidad", "sueldo_relativo",
                   "rubro_reciente", "otros_avisos")


def otros_avisos(bd, aviso_id, postulantes) -> dict:
    """{clave: cuántos otros avisos de ESAN postuló} (por el ID postulante de Bumeran)."""
    ids = {p["id_postulante"]: p["clave"] for p in postulantes if p.get("id_postulante")}
    if bd.motor != "supabase" or not ids:
        return {}
    filas = bd.consultar("SELECT id_postulante, COUNT(DISTINCT aviso_id) AS n FROM postulaciones "
                         "WHERE id_postulante = ANY(?) AND aviso_id <> ? GROUP BY id_postulante", (list(ids), aviso_id))
    return {ids[f["id_postulante"]]: int(f["n"]) for f in filas}


def sin_disponibilidad(datos):
    """Respuesta que empieza con «no» a una pregunta del aviso sobre disponibilidad; None si no la hay."""
    for k, v in (datos or {}).items():
        if "?" in k and "disponibilidad" in experiencia.normalizar(k) and re.match(r"\s*no\b", experiencia.normalizar(v)):
            return str(v).strip()[:80]
    return None


def quitar_bonificacion_rubro(fila):
    """Fila reutilizada de un cálculo anterior: su score_bruto ya trae las bonificaciones y penalizaciones; se
    descuentan para volver a aplicarlas con el rango actual del aviso."""
    ajustes = dict(_json(fila.get("ajustes")) or {})
    delta = 0.0
    for k in AJUSTES_SUMADOS:
        ajuste = ajustes.pop(k, None) or {}
        delta += ajuste.get("delta", ajuste.get("bono", 0.0) if k == "rubro" else 0.0)   # «bono»: filas de antes del 27/10
    if delta and fila.get("score_bruto") is not None:
        fila["score_bruto"] = round(fila["score_bruto"] - delta, 4)
    fila["ajustes"] = ajustes or None


def _distancia(validas):
    """Distancia entre los puntajes altos y bajos del aviso (percentiles 90 y 10): la escala de los ajustes."""
    puntajes = sorted(f["score_bruto"] for f in validas)
    return puntajes[int(.9 * len(puntajes))] - puntajes[int(.1 * len(puntajes))]


def _sumar(fila, clave, delta, **detalle):
    fila["score_bruto"] = round(fila["score_bruto"] + delta, 4)
    fila["ajustes"] = {**(fila.get("ajustes") or {}), clave: {**detalle, "delta": round(delta, 4)}}


def aplicar_ajustes(filas, datos, criterios=None, rotacion=frozenset(), oferta=None, modo="estricto", reglas_gth=False,
                    otros_avisos=None):
    """Criterios de Andrea que suman o restan al puntaje (no reemplazan a los requisitos), con su intensidad 0-100:
      - rubro: experiencia en educación superior suma BONO_RUBRO × distancia con el criterio en 50
        (validado contra la elección de GTH: top 15 de 12 a 17 de 51 elegidos, 25/10/2026). En reglas_gth suma por cada
        experiencia: una bonificación por universidad o instituto y media por colegio, hasta BONOS_MAXIMOS;
      - años de sobra (interno: la web no lo muestra): BONO_ANIOS × distancia por cada año por encima
        de lo pedido, en proporción por fracción, hasta ANIOS_EXTRA_MAXIMO años (fila["_extra"], de aplicar_regla_practicas);
      - escala de empresa: trabajar en una empresa Tier 1 o 1.5 del diccionario (empresas_peru.py) suma BONO_ESCALA; con
        las reglas de GTH, ESCALA_POR_EXPERIENCIA por cada experiencia en una de ellas, hasta BONOS_MAXIMOS;
      - alta rotación: resta `rotacion` × distancia;
      - disponibilidad (interno): quien responde «no» a la pregunta de disponibilidad del aviso resta
        PENALIZA_DISPONIBILIDAD × distancia;
      - sueldo en modo Estricto: quien pretende más que la oferta queda al final del ranking (descartado)."""
    from .empresas_peru import TIER_VALOR, tier_de_empresa
    from .sueldo import pretension
    c = {**CRITERIOS_BASE, **(criterios or {})}
    validas = [f for f in filas if f["explicacion_bruta"] != SIN_INFORMACION and f.get("score_bruto") is not None]
    if len(validas) < 2:
        return
    distancia = _distancia(validas)
    for f in validas:
        d = datos.get(f["clave"]) or {}
        empresas = experiencia.empresas_educacion_superior(d, reglas_gth)
        if reglas_gth:
            superior, colegios = experiencia.experiencias_educacion(d)
            unidades = min(BONOS_MAXIMOS, superior + .5 * colegios)
        else:
            unidades = 1.0 if empresas else 0.0
        if unidades and c["rubro"] > 0:
            bono = BONO_RUBRO * unidades * c["rubro"] / 50 * distancia
            _sumar(f, "rubro", bono, educacion_superior=empresas, bono=round(bono, 4))
        if reglas_gth and RUBRO_RECIENTE and c["rubro"] > 0 and experiencia.ultima_en_educacion(d):
            _sumar(f, "rubro_reciente", BONO_RUBRO * RUBRO_RECIENTE * c["rubro"] / 50 * distancia)
        if reglas_gth and PESO_OTROS_AVISOS and (n := (otros_avisos or {}).get(f["clave"], 0)):
            _sumar(f, "otros_avisos", BONO_ESCALA * PESO_OTROS_AVISOS * min(1.0, n / 3) * distancia, avisos=n)
        if reglas_gth and f.get("_extra"):
            _sumar(f, "anios_extra", BONO_ANIOS * f["_extra"] * distancia, anios=round(f["_extra"], 2))
        tiers = [(t, k) for k, v in d.items() if k.endswith("] Empresa") and (t := tier_de_empresa(v))]
        if tiers and c["escala_empresa"] > 0:
            (tier, sector), campo = max(tiers, key=lambda x: TIER_VALOR[x[0][0]])
            valor = min(BONOS_MAXIMOS, ESCALA_POR_EXPERIENCIA * sum(TIER_VALOR[t[0]] for t, _ in tiers)) if reglas_gth else TIER_VALOR[tier]
            _sumar(f, "escala", BONO_ESCALA * c["escala_empresa"] / 50 * valor * distancia,
                   tier=tier, sector=sector, empresa=d[campo], experiencias=len(tiers))
        if f["clave"] in rotacion and c["rotacion"] > 0:
            _sumar(f, "rotacion", -c["rotacion"] * distancia, penalizacion=c["rotacion"])
        if reglas_gth and (respuesta := sin_disponibilidad(d)):
            _sumar(f, "disponibilidad", -PENALIZA_DISPONIBILIDAD * distancia, respuesta=respuesta)
    if reglas_gth and PESO_SUELDO:   # pretensión frente a la mediana del aviso: suma un poco a quien pide menos y resta al que pide más
        pedidos = {f["clave"]: p for f in validas if (p := pretension(datos.get(f["clave"]))) and SUELDO_MINIMO <= p <= SUELDO_MAXIMO}
        if len(pedidos) >= 5:
            mediana = sorted(pedidos.values())[len(pedidos) // 2]
            for f in validas:
                if f["clave"] in pedidos:
                    relativo = max(-1.0, min(1.0, (mediana - pedidos[f["clave"]]) / mediana))
                    _sumar(f, "sueldo_relativo", PESO_SUELDO * relativo * distancia, pretension=pedidos[f["clave"]], mediana=mediana)
    if oferta is not None and modo == "estricto":
        alto = max(f["score_bruto"] for f in validas)
        bajo = min(f["score_bruto"] for f in validas)
        for f in validas:
            pedido = pretension(datos.get(f["clave"]))
            if pedido is not None and pedido > oferta:   # al final, conservando su orden entre los descartados
                _sumar(f, "sueldo", -((alto - bajo) + distancia), descartado=True, pretension=pedido, oferta=oferta)


def aplicar_bonificacion_rubro(filas, datos):
    """Solo la bonificación por rubro con el criterio en 50 (pruebas y compatibilidad)."""
    aplicar_ajustes(filas, datos, {"escala_empresa": 0, "rotacion": 0})


def aplicar_regla_estudios(filas, datos, etiquetas):
    """Requisito de formación (estudios.py, reglas de GTH): un posgrado afín en el CV o una respuesta del aviso que confirma
    el grado en una carrera afín lo llevan al máximo del requisito en el aviso; una respuesta que dice que no cumple
    (estudiante, técnico, trunco, «no soy…») lo baja a NO_CUMPLE_FORMACION del rango. Devuelve los índices."""
    from . import estudios
    reglas = estudios.requisitos_de_formacion(etiquetas)
    validas = [f for f in filas if f["explicacion_bruta"] != SIN_INFORMACION and f["req_sims_bruto"]]
    for k, afines in reglas.items():
        valores = [f["req_sims_bruto"][k] for f in validas if f["req_sims_bruto"][k] is not None]
        if not valores:
            continue
        lo, hi = min(valores), max(valores)
        for f in validas:
            d = datos.get(f["clave"])
            sims = f.get("_sims") or list(f["req_sims_bruto"])
            titulo, respuesta = estudios.posgrado_afin(d, afines), estudios.grado_respondido(d, afines)
            if titulo:
                valor, detalle = hi, f"Posgrado afín: {titulo}"
            elif respuesta and respuesta[0] == "cumple":
                valor, detalle = hi, f"Respondió: {respuesta[1][:60]}"
            elif respuesta and (sims[k] or 0.0) > lo + NO_CUMPLE_FORMACION * (hi - lo):
                valor, detalle = lo + NO_CUMPLE_FORMACION * (hi - lo), f"Respondió: {respuesta[1][:60]}"
            else:
                continue
            sims[k] = round(valor, 4)
            f["_sims"] = sims
            partes = f["explicacion_bruta"].split(" | ")
            partes += [""] * (len(etiquetas) - len(partes))
            partes[k] = f"[{etiquetas[k][:40]}…] -> {detalle} ({(valor - lo) / ((hi - lo) or 1):.2f})"
            f["explicacion_bruta"] = " | ".join(partes)
    return reglas


def aplicar_regla_niveles(filas, datos, etiquetas, reglas_gth=False):
    """Sobrecalificación (niveles.py): reemplaza la similitud e5 de los requisitos que piden un nivel de herramienta o
    idioma por el valor de la regla, llevado al rango del requisito en el aviso. Deja el detalle en ajustes."""
    from . import niveles
    reglas = niveles.requisitos_de_nivel(etiquetas)
    if not reglas:
        return {}
    validas = [f for f in filas if f["explicacion_bruta"] != SIN_INFORMACION and f["req_sims_bruto"]]
    for k, pedido in reglas.items():
        valores = [f["req_sims_bruto"][k] for f in validas if f["req_sims_bruto"][k] is not None]
        lo, hi = (min(valores), max(valores)) if valores else (0.0, 1.0)
        for f in validas:
            valor, detalle, sobre = niveles.evaluar(datos.get(f["clave"]), pedido, reglas_gth)
            sims = f.get("_sims") or list(f["req_sims_bruto"])
            sims[k] = round(lo + valor * (hi - lo), 4)
            f["_sims"] = sims
            partes = f["explicacion_bruta"].split(" | ")
            partes += [""] * (len(etiquetas) - len(partes))
            partes[k] = f"[{etiquetas[k][:40]}…] -> {detalle} ({valor:.2f})"
            f["explicacion_bruta"] = " | ".join(partes)
            ajustes = f.get("ajustes") or {}
            f["ajustes"] = {**ajustes, "niveles": {**(ajustes.get("niveles") or {}), etiquetas[k]: {"detalle": detalle, "sobrecalificado": sobre}}}
    return reglas


def recalcular_puntajes(filas, pesos):
    """Puntaje de cada fila con las similitudes de las reglas (_sims) y los pesos ajustados por «Criterios y pesos»."""
    if sum(pesos) <= 0:
        return
    for f in filas:
        if f["explicacion_bruta"] != SIN_INFORMACION and f["req_sims_bruto"]:
            sims = f.get("_sims") or f["req_sims_bruto"]
            f["score_bruto"] = round(sum(w * (s or 0.0) for w, s in zip(pesos, sims)) / sum(pesos), 4)


def similitud_experiencias(emb, postulantes, requisito, cache):
    """{clave: {índice Exp[i]: similitud e5 de esa experiencia con el requisito}}. Reutiliza lo guardado en `cache`
    (columna ajustes) y solo calcula con e5 a los postulantes que faltan, todos en un lote."""
    from matching.embeddings.matching_llm import chunks_candidato
    out, textos, donde = {}, [], []
    for p in postulantes:
        if p["clave"] in cache:
            out[p["clave"]] = cache[p["clave"]]
            continue
        out[p["clave"]] = {}
        for nombre, texto in chunks_candidato(_campos(p["datos_json"])):
            if nombre.startswith("Exp["):
                textos.append(texto)
                donde.append((p["clave"], int(nombre[4:nombre.index("]")])))
    if textos:
        sims = (emb.encode([requisito], es_query=True) @ emb.encode(textos, es_query=False).T)[0]
        for (clave, indice), s in zip(donde, sims):
            out[clave][indice] = round(float(s), 4)
    return out


def aplicar_regla_practicas(filas, datos, titulo, etiquetas, pesos, sims_exp=None, reglas_gth=False):
    """Reemplaza la similitud e5 de los requisitos «N años de experiencia» por los años equivalentes de experiencia
    relacionada (experiencia.py), llevados al rango de similitud de ese requisito en el aviso para que pese igual que
    los demás. Una experiencia es relacionada si su similitud con el requisito (sims_exp[k][clave][i]) está en la mitad
    alta de las del aviso; sin sims_exp cuentan todas. Deja en cada fila "_sims" (para ordenar y reescalar) y "ajustes"
    (similitudes por experiencia y años, para reutilizarlos), y recalcula score_bruto; req_sims_bruto conserva e5.
    En reglas_gth también es relacionada la experiencia que menciona el tema del requisito (experiencia.palabras_relacionadas)
    y deja en "_extra" los años por encima de lo pedido (hasta ANIOS_EXTRA_MAXIMO) para aplicar_ajustes."""
    reglas = experiencia.requisitos_de_anios(titulo, etiquetas)
    if not reglas:
        return
    palabras = {k: experiencia.palabras_relacionadas(etiquetas[k]) for k in reglas} if reglas_gth else {}
    validas = [f for f in filas if f["explicacion_bruta"] != SIN_INFORMACION and f["req_sims_bruto"]]
    rangos, cortes = {}, {}
    for k in reglas:
        valores = [f["req_sims_bruto"][k] for f in validas if f["req_sims_bruto"][k] is not None]
        rangos[k] = (min(valores), max(valores)) if valores else (0.0, 1.0)
        if sims_exp and k in sims_exp:
            todas = sorted(s for d in sims_exp[k].values() for s in d.values())
            cortes[k] = todas[len(todas) // 2] if todas else None   # mediana de las experiencias del aviso
    for f in validas:
        sims, partes = list(f["req_sims_bruto"]), f["explicacion_bruta"].split(" | ")
        partes += [""] * (len(etiquetas) - len(partes))
        ajustes = {}
        for k, n in reglas.items():
            propias = (sims_exp or {}).get(k, {}).get(f["clave"])
            relacionadas = None if k not in cortes else {i for i, s in (propias or {}).items() if s >= cortes[k]}
            if reglas_gth and relacionadas is not None:
                relacionadas |= experiencia.relacionadas_por_palabras(datos.get(f["clave"]), palabras[k])
            total, laboral, practica = experiencia.anios_equivalentes(datos.get(f["clave"]), relacionadas=relacionadas,
                                                                     reglas_gth=reglas_gth)
            declarados = experiencia.anios_declarados(datos.get(f["clave"])) if reglas_gth else None
            if declarados is not None and total > declarados + MARGEN_DECLARADOS:
                total = laboral = declarados + MARGEN_DECLARADOS   # no más de lo que el postulante dice tener
                practica = 0.0
            v = min(1.0, total / n)
            if reglas_gth:
                f["_extra"] = max(f.get("_extra", 0.0), min(ANIOS_EXTRA_MAXIMO, max(0.0, total - n)))
            lo, hi = rangos[k]
            sims[k] = round(lo + v * (hi - lo), 4)
            partes[k] = f"[{etiquetas[k][:40]}…] -> {experiencia.describir(total, laboral, practica)} ({v:.2f})"
            ajustes[etiquetas[k]] = {"experiencias": {str(i): s for i, s in (propias or {}).items()},
                                     "anios": round(total, 2), "laborales": round(laboral, 2), "practica": round(practica, 2)}
        f["_sims"] = sims
        f["ajustes"] = {"experiencia": ajustes}
        f["explicacion_bruta"] = " | ".join(partes)
        f["score_bruto"] = round(sum(w * (s or 0.0) for w, s in zip(pesos, sims)) / sum(pesos), 4)


def cache_experiencias(filas, etiqueta):
    """Similitudes por experiencia ya guardadas en la columna ajustes para ese requisito: {clave: {índice: sim}}."""
    out = {}
    for clave, f in filas.items():
        guardado = ((_json(f.get("ajustes")) or {}).get("experiencia") or {}).get(etiqueta)
        if guardado and "experiencias" in guardado:
            out[clave] = {int(i): s for i, s in guardado["experiencias"].items()}
    return out


def _json(v):
    return json.loads(v) if isinstance(v, str) else v


def _por_requisito(fila, etiquetas):
    """{etiqueta: (similitud, parte de la explicación)} de una fila guardada que se calculó con esas etiquetas."""
    sims = fila.get("req_sims_bruto") or []
    partes = (fila.get("explicacion_bruta") or "").split(" | ")
    return {e: (sims[k], partes[k] if k < len(partes) else "") for k, e in enumerate(etiquetas)
            if k < len(sims) and sims[k] is not None}


def _sin_informacion(backend, n):
    return {"backend": backend, "score_bruto": 0.0, "req_sims_bruto": [None] * n, "req_fragmentos": [""] * n,
            "explicacion_bruta": SIN_INFORMACION, "calculado_at": ahora()}


def paso_ranking(bd, aviso: dict, forzar=False):
    """Calcula y guarda el ranking del aviso. Devuelve cuántos postulantes se calcularon (0 si estaba al día).

    Los requisitos y pesos salen de criterios_efectivos. Si cambian (se añade, quita o pondera un requisito en la web),
    se reutiliza la similitud ya calculada de cada requisito que sigue y solo se calcula con e5 la de los nuevos."""
    import pandas as pd
    from matching.embeddings.matching_llm import ranking_embeddings, reescalar_por_aviso
    from matching.embeddings.server import _fragmentos

    aviso_id = aviso["aviso_id"]
    a = bd.aviso(aviso_id)
    if not a or not a.get("detalle_texto"):
        log.info("Ranking omitido: falta la oferta publicada del aviso")
        return 0
    criterios, version = criterios_efectivos(bd, a)
    etiquetas, pesos = [c["label"] for c in criterios], [c["peso"] for c in criterios]
    n = len(criterios)

    def marcar_criterios():  # después de guardar el ranking: la web muestra el ranking con estos criterios
        if a.get("criterios_version") != version:
            sin_peso = [{k: v for k, v in c.items() if k != "peso"} for c in criterios]
            bd.marcar(aviso_id, criterios=json.dumps(sin_peso, ensure_ascii=False), criterios_version=version)

    postulantes = bd.postulantes_para_ranking(aviso_id)
    if not postulantes:
        marcar_criterios()
        return 0
    guardado = {} if forzar else bd.ranking_guardado(aviso_id, version)
    claves = {p["clave"] for p in postulantes}
    if guardado and set(guardado) == claves and all(f.get("backend") == "e5" for f in guardado.values()):
        marcar_criterios()   # al día: no hace falta cargar el modelo (el servidor revisa cada hora)
        log.info("Ranking al día (%d postulantes, criterios %s)", len(postulantes), version)
        return 0
    emb = _modelo()
    # tfidf depende de todos los textos del aviso: se recalcula completo. e5 es por persona: solo los que faltan.
    nuevos = postulantes if emb.backend != "e5" else [
        p for p in postulantes if guardado.get(p["clave"], {}).get("backend") != emb.backend]
    if not nuevos and set(guardado) == claves:
        marcar_criterios()
        log.info("Ranking al día (%d postulantes, criterios %s)", len(postulantes), version)
        return 0

    # Similitud por requisito con los criterios anteriores (e5), para no recalcular los requisitos que siguen.
    anterior, filas_previas = {}, {}
    previa = a.get("criterios_version")
    if nuevos and not forzar and emb.backend == "e5" and previa and previa != version:
        previas = [c["label"] for c in _json(a.get("criterios")) or []]
        filas_previas = {k: f for k, f in bd.ranking_guardado(aviso_id, previa).items() if f.get("backend") == "e5"}
        anterior = {k: (f["explicacion_bruta"] == SIN_INFORMACION, _por_requisito(f, previas)) for k, f in filas_previas.items()}

    calculado, grupos = {}, {}
    for p in nuevos:
        sin_info, conocidos = anterior.get(p["clave"], (False, {}))
        if sin_info:   # sin experiencia, estudios ni idiomas: da igual qué requisitos haya
            calculado[p["clave"]] = _sin_informacion(emb.backend, n)
            continue
        faltan = tuple(e for e in etiquetas if e not in conocidos)
        grupos.setdefault(faltan, []).append((p, conocidos))

    t = time.time()
    for faltan, miembros in grupos.items():
        completo = len(faltan) == n
        res = {}
        if faltan:
            df = pd.DataFrame([{"candidato_id": p["clave"], **_campos(p["datos_json"])} for p, _ in miembros]).fillna("")
            oferta = {"titulo": a["titulo"],
                      "requisitos": list(zip(etiquetas, pesos)) if completo else [(e, 1) for e in faltan]}
            res = {r["candidato_id"]: r for r in ranking_embeddings(df, oferta, embedder=emb, reescalar=False).to_dict("records")}
        for p, conocidos in miembros:
            r = res.get(p["clave"])
            if r is not None and r["explicacion"] == SIN_INFORMACION:
                calculado[p["clave"]] = _sin_informacion(emb.backend, n)
                continue
            if completo:
                sims = [_num(r.get(f"req{k + 1}_sim")) for k in range(n)]
                explicacion, score = r["explicacion"], float(r["score_embeddings"])
            else:   # combina lo ya calculado con lo nuevo, ponderado como en matching_llm.matching
                por_req = dict(conocidos)
                if r is not None:
                    partes = r["explicacion"].split(" | ")
                    por_req.update({e: (_num(r.get(f"req{k + 1}_sim")), partes[k] if k < len(partes) else "")
                                    for k, e in enumerate(faltan)})
                sims = [por_req[e][0] for e in etiquetas]
                explicacion = " | ".join(por_req[e][1] for e in etiquetas)
                score = round(sum(w * (s or 0.0) for w, s in zip(pesos, sims)) / sum(pesos), 4)
            calculado[p["clave"]] = {
                "backend": emb.backend, "score_bruto": score, "req_sims_bruto": sims,
                "req_fragmentos": _fragmentos(explicacion, n), "explicacion_bruta": explicacion, "calculado_at": ahora()}
    if calculado:
        log.info("Ranking %s: %d postulantes calculados en %.0f s (%d reutilizando requisitos ya calculados)", emb.backend,
                 len(calculado), time.time() - t, sum(len(m) for f, m in grupos.items() if len(f) < n))

    filas = [{"clave": p["clave"], "id_postulante": p["id_postulante"],
              **(calculado.get(p["clave"]) or guardado[p["clave"]])} for p in postulantes]
    for f in filas:
        quitar_bonificacion_rubro(f)
    # Regla de prácticas: similitud de cada experiencia con los requisitos de años (guardada en ajustes para reutilizarla)
    sims_exp = None
    if emb.backend == "e5":
        previos = {**filas_previas, **guardado}
        sims_exp = {k: similitud_experiencias(emb, postulantes, etiquetas[k], cache_experiencias(previos, etiquetas[k]))
                    for k in experiencia.requisitos_de_anios(a["titulo"], etiquetas)}
    datos = {p["clave"]: p["datos_json"] for p in postulantes}
    reglas_gth = True   # reglas validadas con GTH en todos los avisos
    aplicar_regla_practicas(filas, datos, a["titulo"], etiquetas, pesos, sims_exp, reglas_gth)
    reglas_nivel = aplicar_regla_niveles(filas, datos, etiquetas, reglas_gth)
    reglas_estudios = aplicar_regla_estudios(filas, datos, etiquetas) if reglas_gth else {}
    # «Criterios y pesos»: Experiencia laboral escala el peso de sus requisitos (100 = completo) y Sobrecalificación el de
    # los suyos (50 = igual)
    clasif = criterios_clasificacion(bd, aviso_id)
    anios = experiencia.requisitos_de_anios(a["titulo"], etiquetas)
    # Con las reglas de GTH los requisitos de años pesan PESO_ANIOS_GTH veces su peso de la web (interno: la web no cambia)
    peso_anios = clasif["experiencia"] / 100 * (PESO_ANIOS_GTH if reglas_gth else 1)
    # y en puestos que no son de tecnología, los de herramientas pesan PESO_HERRAMIENTAS_NO_TEC veces (también interno)
    peso_niveles = clasif["sobrecalificacion"] / 50 * (PESO_HERRAMIENTAS_NO_TEC if reglas_gth and not PUESTO_TEC.search(
        experiencia.normalizar(a["titulo"])) else 1)
    pesos_ajustados = [w * (peso_anios if k in anios else peso_niveles if k in reglas_nivel else 1)
                       for k, w in enumerate(pesos)]
    if reglas_nivel or reglas_estudios or pesos_ajustados != pesos:
        recalcular_puntajes(filas, pesos_ajustados)
    aplicar_ajustes(filas, datos, clasif, alta_rotacion(bd, aviso_id), *sueldo_aviso(bd, aviso_id), reglas_gth=reglas_gth,
                    otros_avisos=otros_avisos(bd, aviso_id, postulantes) if reglas_gth and PESO_OTROS_AVISOS else None)
    for f in filas:
        if "_sims" in f:
            f["req_fragmentos"] = _fragmentos(f["explicacion_bruta"], n)
    # Ranking y escala del aviso completo, con las similitudes de todos (las de la regla de prácticas, si aplica)
    df = pd.DataFrame([{"candidato_id": f["clave"], "score_embeddings": f["score_bruto"], "explicacion": f["explicacion_bruta"],
                        **{f"req{k + 1}_sim": (f.get("_sims") or f["req_sims_bruto"] or [None] * n)[k] for k in range(n)}}
                       for f in filas])
    df = df.sort_values("score_embeddings", ascending=False, kind="stable")
    df.insert(1, "ranking", range(1, len(df) + 1))
    if emb.backend == "e5":
        df = reescalar_por_aviso(df, n)
    final = {r["candidato_id"]: r for r in df.to_dict("records")}
    for f in filas:
        r = final[f["clave"]]
        f.update(ranking=int(r["ranking"]), score=_num(r["score_embeddings"]), explicacion=r["explicacion"],
                 req_sims=[_num(r.get(f"req{k + 1}_sim")) for k in range(n)],
                 req_sims_bruto=[_num(v) for v in (f["req_sims_bruto"] or [None] * n)])
    bd.guardar_ranking(aviso_id, version, filas)
    marcar_criterios()
    log.info("Ranking guardado: %d postulantes (criterios %s)", len(filas), version)
    return len(calculado)
