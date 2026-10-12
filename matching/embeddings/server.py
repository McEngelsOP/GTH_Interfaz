"""
Servicio local del matching por embeddings para la interfaz (Vite reenvía /api/embeddings aquí).

Uso:
    python -m matching.embeddings.server            # http://127.0.0.1:8001
    python -m matching.embeddings.server --backend tfidf

POST /api/embeddings
    {"oferta": {"titulo": str, "requisitos": [[texto, peso], ...]},
     "candidatos": [{"candidato_id": str, "campos": {"Exp[1] Puesto": ..., ...}}]}
 -> {"backend": "e5" | "tfidf",
     "ranking": [{"candidato_id", "ranking", "score_embeddings", "req_sims": [...], "req_fragmentos": [...], "explicacion"}]}

No se guarda nada en disco: los datos llegan, se puntúan en memoria y se descartan.
"""
import argparse
import json
import logging
import math
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pandas as pd

from .matching_llm import CAMPOS_EXCLUIDOS, Embedder, ranking_embeddings

MAX_BODY = 20 * 1024 * 1024
log = logging.getLogger("matching.embeddings")
_PARTE = re.compile(r"-> (.*) \((-?\d+\.\d+)\)$")


def _fragmentos(explicacion, n):
    """Extrae el fragmento del CV que respalda cada requisito desde la columna explicacion."""
    partes = explicacion.split(" | ")
    out = []
    for k in range(n):
        m = _PARTE.search(partes[k]) if k < len(partes) else None
        out.append(m.group(1) if m else "")
    return out


def puntuar(payload, embedder):
    oferta = payload.get("oferta") or {}
    requisitos = [(str(t), float(w)) for t, w in oferta.get("requisitos", [])]
    if not requisitos or sum(w for _, w in requisitos) <= 0:
        raise ValueError("La oferta necesita al menos un requisito con peso mayor que cero.")
    filas = []
    for c in payload.get("candidatos", []):
        campos = {k: str(v) for k, v in (c.get("campos") or {}).items() if k not in CAMPOS_EXCLUIDOS}
        filas.append({"candidato_id": str(c["candidato_id"]), **campos})
    if not filas:
        return {"backend": embedder.backend, "ranking": []}
    df = pd.DataFrame(filas).fillna("")
    res = ranking_embeddings(df, {"titulo": str(oferta.get("titulo", "")), "requisitos": requisitos}, embedder=embedder)
    n = len(requisitos)
    ranking = []
    for r in res.to_dict("records"):
        sims = [r.get(f"req{k + 1}_sim") for k in range(n)]
        ranking.append({
            "candidato_id": r["candidato_id"],
            "ranking": int(r["ranking"]),
            "score_embeddings": float(r["score_embeddings"]),
            "score_bruto": float(r.get("score_bruto", r["score_embeddings"])),  # e5: score antes de reescalar
            "req_sims": [None if s is None or (isinstance(s, float) and math.isnan(s)) else float(s) for s in sims],
            "req_fragmentos": _fragmentos(r["explicacion"], n),
            "explicacion": r["explicacion"],
        })
    return {"backend": res.attrs["backend"], "ranking": ranking}


def crear_handler(embedder):
    lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def _json(self, status, body):
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self):
            if self.path != "/api/embeddings":
                return self._json(404, {"error": "Ruta no encontrada."})
            size = int(self.headers.get("Content-Length") or 0)
            if size <= 0 or size > MAX_BODY:
                return self._json(413, {"error": "Solicitud vacía o demasiado grande."})
            try:
                payload = json.loads(self.rfile.read(size).decode("utf-8"))
                with lock:  # el vectorizador tfidf se reajusta en cada solicitud
                    return self._json(200, puntuar(payload, embedder))
            except (ValueError, KeyError, TypeError) as exc:
                return self._json(400, {"error": str(exc)})

        def log_message(self, fmt, *args):  # sin volcar contenido de las solicitudes
            log.info("%s %s", self.command, self.path)

    return Handler


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8001)
    ap.add_argument("--backend", default="e5", choices=["e5", "tfidf"])
    a = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="[embeddings] %(message)s")
    embedder = Embedder(a.backend)
    log.info("Escuchando en http://%s:%d · backend=%s", a.host, a.port, embedder.backend)
    ThreadingHTTPServer((a.host, a.port), crear_handler(embedder)).serve_forever()


if __name__ == "__main__":
    main()
