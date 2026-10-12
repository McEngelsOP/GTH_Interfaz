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

from .criterios import criterios_aviso
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


def paso_ranking(bd, aviso: dict, forzar=False):
    """Calcula y guarda el ranking del aviso. Devuelve cuántos postulantes se calcularon (0 si estaba al día)."""
    import pandas as pd
    from matching.embeddings.matching_llm import ranking_embeddings, reescalar_por_aviso
    from matching.embeddings.server import _fragmentos

    aviso_id = aviso["aviso_id"]
    a = bd.aviso(aviso_id)
    if not a or not a.get("detalle_texto"):
        log.info("Ranking omitido: falta la oferta publicada del aviso")
        return 0
    criterios, version = criterios_aviso(a["titulo"], a["detalle_texto"])
    if a.get("criterios_version") != version:
        bd.marcar(aviso_id, criterios=json.dumps(criterios, ensure_ascii=False), criterios_version=version)
    postulantes = bd.postulantes_para_ranking(aviso_id)
    if not postulantes:
        return 0
    emb = _modelo()
    guardado = {} if forzar else bd.ranking_guardado(aviso_id, version)
    claves = {p["clave"] for p in postulantes}
    # tfidf depende de todos los textos del aviso: se recalcula completo. e5 es por persona: solo los que faltan.
    nuevos = postulantes if emb.backend != "e5" else [
        p for p in postulantes if guardado.get(p["clave"], {}).get("backend") != emb.backend]
    if not nuevos and set(guardado) == claves:
        log.info("Ranking al día (%d postulantes, criterios %s)", len(postulantes), version)
        return 0

    n = len(criterios)
    oferta = {"titulo": a["titulo"], "requisitos": [(c["label"], c["weightPct"]) for c in criterios]}
    calculado = {}
    if nuevos:
        t = time.time()
        df = pd.DataFrame([{"candidato_id": p["clave"], **_campos(p["datos_json"])} for p in nuevos]).fillna("")
        res = ranking_embeddings(df, oferta, embedder=emb, reescalar=False)
        for r in res.to_dict("records"):
            calculado[r["candidato_id"]] = {
                "backend": emb.backend, "score_bruto": float(r["score_embeddings"]),
                "req_sims_bruto": [_num(r.get(f"req{k + 1}_sim")) for k in range(n)],
                "req_fragmentos": _fragmentos(r["explicacion"], n), "explicacion_bruta": r["explicacion"],
                "calculado_at": ahora()}
        log.info("Ranking %s: %d postulantes calculados en %.0f s", emb.backend, len(nuevos), time.time() - t)

    filas = [{"clave": p["clave"], "id_postulante": p["id_postulante"],
              **(calculado.get(p["clave"]) or guardado[p["clave"]])} for p in postulantes]
    # Ranking y escala del aviso completo, con las similitudes originales de todos
    df = pd.DataFrame([{"candidato_id": f["clave"], "score_embeddings": f["score_bruto"], "explicacion": f["explicacion_bruta"],
                        **{f"req{k + 1}_sim": (f["req_sims_bruto"] or [None] * n)[k] for k in range(n)}} for f in filas])
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
    log.info("Ranking guardado: %d postulantes (criterios %s)", len(filas), version)
    return len(nuevos)
