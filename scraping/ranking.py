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
    return criterios, f"Bumeran {_hash_corto(clave)}"


def aplicar_regla_practicas(filas, datos, titulo, etiquetas, pesos):
    """Reemplaza la similitud e5 de los requisitos «N años de experiencia» por los años equivalentes (experiencia.py),
    llevados al rango de similitud de ese requisito en el aviso para que pese igual que los demás. Deja en cada fila
    "_sims" (para ordenar y reescalar) y recalcula score_bruto; req_sims_bruto conserva la similitud e5 original."""
    reglas = experiencia.requisitos_de_anios(titulo, etiquetas)
    if not reglas:
        return
    validas = [f for f in filas if f["explicacion_bruta"] != SIN_INFORMACION and f["req_sims_bruto"]]
    rangos = {}
    for k in reglas:
        valores = [f["req_sims_bruto"][k] for f in validas if f["req_sims_bruto"][k] is not None]
        rangos[k] = (min(valores), max(valores)) if valores else (0.0, 1.0)
    for f in validas:
        sims, partes = list(f["req_sims_bruto"]), f["explicacion_bruta"].split(" | ")
        partes += [""] * (len(etiquetas) - len(partes))
        total, laboral, practica = experiencia.anios_equivalentes(datos.get(f["clave"]))
        for k, n in reglas.items():
            v = min(1.0, total / n)
            lo, hi = rangos[k]
            sims[k] = round(lo + v * (hi - lo), 4)
            partes[k] = f"[{etiquetas[k][:40]}…] -> {experiencia.describir(total, laboral, practica)} ({v:.2f})"
        f["_sims"] = sims
        f["explicacion_bruta"] = " | ".join(partes)
        f["score_bruto"] = round(sum(w * (s or 0.0) for w, s in zip(pesos, sims)) / sum(pesos), 4)


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
        marcar_criterios()   # al día: no hace falta cargar el modelo (el servidor revisa cada 5 min)
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
    anterior = {}
    previa = a.get("criterios_version")
    if nuevos and not forzar and emb.backend == "e5" and previa and previa != version:
        previas = [c["label"] for c in _json(a.get("criterios")) or []]
        anterior = {k: (f["explicacion_bruta"] == SIN_INFORMACION, _por_requisito(f, previas))
                    for k, f in bd.ranking_guardado(aviso_id, previa).items() if f.get("backend") == "e5"}

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
    aplicar_regla_practicas(filas, {p["clave"]: p["datos_json"] for p in postulantes}, a["titulo"], etiquetas, pesos)
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
