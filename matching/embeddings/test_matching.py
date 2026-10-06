"""Pruebas del matching por embeddings con backend tfidf (sin internet).

    python -m unittest matching.embeddings.test_matching -v

La prueba con datos reales lee el export de Bumeran desde _insumos/ (ignorado por Git) y se omite si no está.
"""
import glob
import os
import unittest

import pandas as pd

from .matching_llm import CAMPOS_EXCLUIDOS, OFERTA, Embedder, leer_bumeran, ranking_embeddings
from .server import puntuar

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV_REAL = sorted(glob.glob(os.path.join(RAIZ, "_insumos", "exportCsv-*.csv")))


class RankingEmbeddingsTest(unittest.TestCase):
    def test_columnas_y_orden(self):
        df = pd.DataFrame([
            {"candidato_id": "a", "Nombre": "Zoraida", "Exp[1] Puesto": "Analista de cobranzas",
             "Exp[1] Descripción": "Gestión de cartera morosa y conciliación de cuentas por cobrar"},
            {"candidato_id": "b", "Nombre": "Beto", "Exp[1] Puesto": "Cocinero", "Exp[1] Descripción": "Preparación de alimentos"},
            {"candidato_id": "c", "Nombre": "Ceci"},
        ])
        res = ranking_embeddings(df, OFERTA, backend="tfidf")
        self.assertEqual(res.attrs["backend"], "tfidf")
        self.assertEqual(list(res["candidato_id"]), ["a", "b", "c"])
        self.assertEqual(list(res["ranking"]), [1, 2, 3])
        for col in ["candidato_id", "ranking", "score_embeddings", "explicacion"] + [f"req{k + 1}_sim" for k in range(len(OFERTA["requisitos"]))]:
            self.assertIn(col, res.columns)
        self.assertNotIn("Zoraida", " ".join(res["explicacion"]))

    def test_servicio_descarta_campos_personales(self):
        payload = {"oferta": {"titulo": "X", "requisitos": [["Gestión de cobranzas", 70], ["Uso de SAP", 30]]},
                   "candidatos": [{"candidato_id": "cand-1", "campos": {"Nombre": "Zoraida", "E-Mail": "ana@x.pe", "Exp[1] Puesto": "Cobranzas SAP"}}]}
        out = puntuar(payload, Embedder("tfidf"))
        self.assertEqual(out["backend"], "tfidf")
        fila = out["ranking"][0]
        self.assertEqual(fila["candidato_id"], "cand-1")
        self.assertEqual(len(fila["req_sims"]), 2)
        self.assertEqual(fila["req_fragmentos"], ["Exp[1] Cobranzas SAP"] * 2)
        self.assertNotIn("Zoraida", str(out))

    def test_oferta_sin_pesos(self):
        with self.assertRaises(ValueError):
            puntuar({"oferta": {"requisitos": [["a", 0]]}, "candidatos": []}, Embedder("tfidf"))

    @unittest.skipUnless(CSV_REAL, "No hay export de Bumeran en _insumos/")
    def test_csv_real_bumeran(self):
        meta, df = leer_bumeran(CSV_REAL[0])
        self.assertEqual(len(df.columns), 95)  # 94 columnas + candidato_id
        res = ranking_embeddings(df, OFERTA, backend="tfidf")
        self.assertEqual(len(res), len(df))
        self.assertTrue(res["score_embeddings"].is_monotonic_decreasing)
        self.assertTrue(all(c not in res.columns for c in CAMPOS_EXCLUIDOS))
        print(f"\n{meta[1]} | {len(res)} postulantes | backend={res.attrs['backend']}")
        print(res[["candidato_id", "ranking", "score_embeddings"]].head(5).to_string(index=False))


if __name__ == "__main__":
    unittest.main()
