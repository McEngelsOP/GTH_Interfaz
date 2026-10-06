"""
Matching semántico CV <-> oferta con embeddings (Camino 2 - LLM Embeddings)
Proyecto: Agente de Reclutamiento GTH

Entrada : CSV exportado desde Bumeran (panel de empresas).
Salida  : ranking_embeddings.csv con score, ranking y evidencia por requisito.

Uso:
    pip install pandas numpy sentence-transformers
    python matching_llm.py ruta/al/exportCsv.csv
    python matching_llm.py ruta/al/exportCsv.csv --backend tfidf   # prueba rápida sin descargar modelos
    python matching_llm.py ruta/al/exportCsv.csv --oferta oferta_ejemplo.json

Desde código: ranking_embeddings(df, oferta) -> DataFrame (backend usado en df.attrs["backend"]).
El modelo e5 solo se usa si ya está en la caché local; nunca se descarga. Si no está, se usa tfidf.
"""
import argparse
import json
import logging
import os
import re
import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# 1. OFERTA: reemplazar por el aviso real que entregue GTH.
#    Cada requisito se compara por separado contra el CV -> eso da la explicación.
#    Los pesos los define el esquema de pesos por puesto.
# ---------------------------------------------------------------------------
OFERTA = {
    "titulo": "Analista de cobranzas",
    "requisitos": [  # (texto del requisito, peso)  <-- EJEMPLO, NO ES EL AVISO REAL
        ("Experiencia en gestión de cobranzas y recuperación de cartera morosa", 0.30),
        ("Conciliación de cuentas por cobrar, estados de cuenta y aplicación de pagos", 0.20),
        ("Manejo de ERP (SAP u otro) y registro contable de cobranzas", 0.15),
        ("Elaboración de reportes de cobranza y análisis de antigüedad de deuda", 0.15),
        ("Formación en Administración, Contabilidad, Finanzas o afines", 0.10),
        ("Comunicación con clientes y negociación de compromisos de pago", 0.10),
    ],
}

# Campos que NUNCA entran al texto del embedding (privacidad + sesgo).
CAMPOS_EXCLUIDOS = [
    "Nombre", "Apellido", "Edad", "Fecha de nacimiento", "Nacionalidad", "Género",
    "Estado Civil", "Ciudad", "Lugar de residencia", "Dirección", "Teléfono celular",
    "Otro teléfono", "E-Mail", "Tipo Documento", "Nro. Documento",
]

# ---------------------------------------------------------------------------
# 2. LECTURA DEL CSV DE BUMERAN
#    - 4 líneas de metadatos (ID aviso, título, fecha) antes del encabezado
#    - separador ';', codificación cp1252, campos multilínea entre comillas
# ---------------------------------------------------------------------------
def leer_bumeran(path):
    with open(path, encoding="cp1252") as f:
        meta = [f.readline().strip().strip('"') for _ in range(3)]
    df = pd.read_csv(path, sep=";", skiprows=4, encoding="cp1252", dtype=str).fillna("")
    df.insert(0, "candidato_id", [f"CAND-{i+1:03d}" for i in range(len(df))])
    return meta, df


def limpiar(t):
    return re.sub(r"\s+", " ", str(t)).strip()


def chunks_candidato(row, n_exp=4, n_est=4):
    """Divide el CV en fragmentos con sentido propio (una experiencia, un estudio...).
    Comparar requisito vs fragmento es más preciso que requisito vs CV completo,
    y permite decir QUÉ parte del CV respalda cada requisito."""
    out = []
    for i in range(1, n_exp + 1):
        puesto = limpiar(row.get(f"Exp[{i}] Puesto", ""))
        if not puesto:
            continue
        txt = (f"Experiencia: {puesto}. Área: {limpiar(row.get(f'Exp[{i}] Area',''))}, "
               f"{limpiar(row.get(f'Exp[{i}] SubArea',''))}. Industria: {limpiar(row.get(f'Exp[{i}] Industria',''))}. "
               f"Funciones: {limpiar(row.get(f'Exp[{i}] Descripción',''))}")
        out.append((f"Exp[{i}] {puesto}", txt))
    for i in range(1, n_est + 1):
        titulo = limpiar(row.get(f"Est[{i}] Titulo", ""))
        if not titulo:
            continue
        txt = (f"Estudios: {titulo}. Nivel: {limpiar(row.get(f'Est[{i}] Nivel',''))} "
               f"({limpiar(row.get(f'Est[{i}] Estado',''))}). Área: {limpiar(row.get(f'Est[{i}] Area',''))}")
        out.append((f"Est[{i}] {titulo}", txt))
    if limpiar(row.get("Idiomas", "")):
        out.append(("Idiomas", f"Idiomas: {limpiar(row['Idiomas'])}"))
    return out

# ---------------------------------------------------------------------------
# 3. EMBEDDINGS
# ---------------------------------------------------------------------------
log = logging.getLogger("matching.embeddings")


class Embedder:
    def __init__(self, backend="e5"):
        self.backend = backend
        if backend == "e5":
            try:
                # Sin internet: solo carga el modelo si ya está en la caché local.
                os.environ.setdefault("HF_HUB_OFFLINE", "1")
                from sentence_transformers import SentenceTransformer
                # Modelo multilingüe (español OK). Requiere prefijos "query:" / "passage:".
                self.model = SentenceTransformer("intfloat/multilingual-e5-base", local_files_only=True)
            except Exception as exc:  # paquete o modelo no disponible -> tfidf
                log.warning("Modelo e5 no disponible localmente (%s); se usa backend tfidf.", exc)
                self.backend = "tfidf"

    def fit(self, corpus):
        if self.backend == "tfidf":  # solo para probar el flujo sin internet
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.vec = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True).fit(corpus)

    def encode(self, textos, es_query):
        if self.backend == "tfidf":
            m = self.vec.transform(textos).toarray()
        else:
            pref = "query: " if es_query else "passage: "
            m = self.model.encode([pref + t for t in textos], normalize_embeddings=True)
        n = np.linalg.norm(m, axis=1, keepdims=True)
        return m / np.where(n == 0, 1, n)

# ---------------------------------------------------------------------------
# 4. MATCHING POR REQUISITO + SCORE PONDERADO + EXPLICACIÓN
# ---------------------------------------------------------------------------
def matching(df, oferta, emb):
    reqs = [r for r, _ in oferta["requisitos"]]
    pesos = np.array([w for _, w in oferta["requisitos"]])
    pesos = pesos / pesos.sum()

    cand_chunks = {r["candidato_id"]: chunks_candidato(r) for _, r in df.iterrows()}
    emb.fit(reqs + [t for ch in cand_chunks.values() for _, t in ch])
    E_req = emb.encode(reqs, es_query=True)

    filas = []
    for cid, ch in cand_chunks.items():
        if not ch:
            filas.append({"candidato_id": cid, "score_embeddings": 0.0, "explicacion": "CV sin información"})
            continue
        E_ch = emb.encode([t for _, t in ch], es_query=False)
        S = E_req @ E_ch.T                  # similitud requisito x fragmento
        mejor = S.max(axis=1)               # mejor evidencia para cada requisito
        idx = S.argmax(axis=1)
        score = float((pesos * mejor).sum())
        fila = {"candidato_id": cid, "score_embeddings": round(score, 4)}
        partes = []
        for k, req in enumerate(reqs):
            fila[f"req{k+1}_sim"] = round(float(mejor[k]), 3)
            partes.append(f"[{req[:40]}…] -> {ch[idx[k]][0]} ({mejor[k]:.2f})")
        fila["explicacion"] = " | ".join(partes)
        filas.append(fila)

    res = pd.DataFrame(filas).sort_values("score_embeddings", ascending=False)
    res.insert(1, "ranking", range(1, len(res) + 1))
    return res


def ranking_embeddings(df, oferta, backend="e5", embedder=None):
    """Punto de entrada del módulo: df con columna candidato_id y campos Exp/Est/Idiomas.
    Los campos personales se descartan antes de construir cualquier texto."""
    df = df.drop(columns=[c for c in CAMPOS_EXCLUIDOS if c in df.columns]).fillna("")
    emb = embedder or Embedder(backend)
    res = matching(df, oferta, emb)
    res.attrs["backend"] = emb.backend
    log.info("Ranking de embeddings: %d candidatos, backend=%s", len(res), emb.backend)
    return res


def cargar_oferta(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return {"titulo": data["titulo"], "requisitos": [(r["texto"], float(r["peso"])) for r in data["requisitos"]]}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--backend", default="e5", choices=["e5", "tfidf"])
    ap.add_argument("--oferta", help="JSON con titulo y requisitos (ver oferta_ejemplo.json)")
    ap.add_argument("--out", default="ranking_embeddings.csv")
    a = ap.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    meta, df = leer_bumeran(a.csv)
    print(" | ".join(meta), f"| {len(df)} postulantes")
    ranking = ranking_embeddings(df, cargar_oferta(a.oferta) if a.oferta else OFERTA, a.backend)
    print(f"Backend: {ranking.attrs['backend']}")
    # Tabla de salida SIN datos personales; el candidato_id se cruza con el CSV original si hace falta.
    ranking.to_csv(a.out, index=False, encoding="utf-8-sig")
    print(ranking[["candidato_id", "ranking", "score_embeddings"]].head(10).to_string(index=False))
