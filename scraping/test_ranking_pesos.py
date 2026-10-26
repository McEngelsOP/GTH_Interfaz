"""Ranking con los requisitos y pesos de la web (gth_aviso_requisitos): python -m unittest scraping.test_ranking_pesos

Sin modelo ni base: e5 se reemplaza por similitudes fijas y la base por un diccionario en memoria."""
import json
import unittest
from unittest import mock

import pandas as pd

from . import ranking
from .criterios import _hash_corto, criterios_aviso

OFERTA = "Requisitos:\n- Experiencia en cobranzas\n- Manejo de Excel\n"
SIMS = {("P1", "Experiencia en cobranzas"): 0.9, ("P1", "Manejo de Excel"): 0.5, ("P1", "Sector educativo"): 0.2,
        ("P2", "Experiencia en cobranzas"): 0.4, ("P2", "Manejo de Excel"): 0.95, ("P2", "Sector educativo"): 0.9}


class BDFalsa:
    motor = "supabase"

    def __init__(self):
        self.a = {"aviso_id": "A1", "titulo": "Analista", "detalle_texto": OFERTA, "criterios": None, "criterios_version": None}
        self.requisitos, self.filas, self.version = [], {}, None
        self.postulantes = [{"clave": c, "id_postulante": c.lower(), "datos_json": {"Exp[1] Puesto": "Analista"}}
                            for c in ("P1", "P2")]

    def consultar(self, sql, params=()):
        assert "gth_aviso_requisitos" in sql
        return self.requisitos

    def aviso(self, aviso_id):
        return dict(self.a)

    def marcar(self, aviso_id, **campos):
        self.a.update(campos)

    def postulantes_para_ranking(self, aviso_id):
        return self.postulantes

    def ranking_guardado(self, aviso_id, version):
        return {k: f for k, f in self.filas.items()} if version == self.version else {}

    def guardar_ranking(self, aviso_id, version, filas):
        self.version, self.filas = version, {f["clave"]: f for f in filas}


class Embedder:
    backend = "e5"


def e5_falso(llamadas):
    def ranking_embeddings(df, oferta, embedder=None, reescalar=True):
        reqs = [r for r, _ in oferta["requisitos"]]
        llamadas.append(reqs)
        pesos = [w for _, w in oferta["requisitos"]]
        filas = []
        for cid in df["candidato_id"]:
            sims = [SIMS[(cid, r)] for r in reqs]
            fila = {"candidato_id": cid, "score_embeddings": round(sum(w * s for w, s in zip(pesos, sims)) / sum(pesos), 4),
                    "explicacion": " | ".join(f"[{r[:40]}…] -> Exp[1] Analista ({s:.2f})" for r, s in zip(reqs, sims))}
            fila.update({f"req{k + 1}_sim": s for k, s in enumerate(sims)})
            filas.append(fila)
        return pd.DataFrame(filas)
    return ranking_embeddings


class TestRankingPesos(unittest.TestCase):
    def setUp(self):
        self.bd, self.llamadas = BDFalsa(), []
        for p in (mock.patch.object(ranking, "_modelo", return_value=Embedder()),
                  mock.patch("matching.embeddings.matching_llm.ranking_embeddings", e5_falso(self.llamadas))):
            p.start()
            self.addCleanup(p.stop)

    def req(self, etiqueta, peso, activo=True):
        return {"etiqueta": etiqueta, "peso": peso, "activo": activo}

    def orden(self):
        return sorted(self.bd.filas, key=lambda k: self.bd.filas[k]["ranking"])

    def test_sin_requisitos_guardados_usa_la_oferta(self):
        criterios, version = ranking.criterios_efectivos(self.bd, self.bd.a)
        self.assertEqual(version, f"Bumeran {_hash_corto('Experiencia en cobranzas|Manejo de Excel#' + ranking.RUBRO_VERSION)}")
        self.assertEqual([c["label"] for c in criterios], ["Experiencia en cobranzas", "Manejo de Excel"])

    def test_pesos_iguales_no_cambian_la_version(self):
        sin_guardar = ranking.criterios_efectivos(self.bd, self.bd.a)[1]
        self.bd.requisitos = [self.req("Experiencia en cobranzas", 70), self.req("Manejo de Excel", 70)]
        self.assertEqual(ranking.criterios_efectivos(self.bd, self.bd.a)[1], sin_guardar)

    def test_bonificacion_por_educacion_superior(self):
        filas = [{"clave": c, "score_bruto": s, "explicacion_bruta": "x"} for c, s in (("P1", 0.80), ("P2", 0.70), ("P3", 0.75))]
        datos = {"P1": {"Exp[1] Empresa": "Banco X"}, "P2": {"Exp[1] Empresa": "Universidad ESAN"}, "P3": {}}
        ranking.aplicar_bonificacion_rubro(filas, datos)
        bono = round(ranking.BONO_RUBRO * (0.80 - 0.70), 4)
        self.assertEqual(filas[1]["score_bruto"], round(0.70 + bono, 4))
        self.assertEqual(filas[1]["ajustes"]["rubro"], {"educacion_superior": ["Universidad ESAN"], "bono": bono})
        self.assertEqual(filas[0]["score_bruto"], 0.80)
        # Al reutilizar la fila se descuenta la bonificación anterior antes de volver a aplicarla
        ranking.quitar_bonificacion_rubro(filas[1])
        self.assertEqual((filas[1]["score_bruto"], filas[1]["ajustes"]), (0.70, None))

    def test_porcentajes_suman_100(self):
        self.assertEqual(ranking._porcentajes([50, 50, 50]), [34, 33, 33])
        self.assertEqual(sum(ranking._porcentajes([10, 100, 7])), 100)

    def test_anadir_requisito_solo_calcula_el_nuevo_y_cambiar_pesos_no_usa_e5(self):
        self.assertEqual(ranking.paso_ranking(self.bd, {"aviso_id": "A1"}), 2)
        self.assertEqual(self.llamadas, [["Experiencia en cobranzas", "Manejo de Excel"]])
        self.assertEqual(self.orden(), ["P1", "P2"])   # 0.70 contra 0.675

        self.bd.requisitos = [self.req("Experiencia en cobranzas", 50), self.req("Manejo de Excel", 50),
                              self.req("Sector educativo", 50)]
        self.assertEqual(ranking.paso_ranking(self.bd, {"aviso_id": "A1"}), 2)
        self.assertEqual(self.llamadas[1:], [["Sector educativo"]])
        self.assertEqual(self.orden(), ["P2", "P1"])   # el nuevo requisito favorece a P2
        self.assertAlmostEqual(self.bd.filas["P2"]["score_bruto"], round((0.4 + 0.95 + 0.9) / 3, 4))
        self.assertEqual([c["label"] for c in json.loads(self.bd.a["criterios"])],
                         ["Experiencia en cobranzas", "Manejo de Excel", "Sector educativo"])
        self.assertEqual(self.bd.a["criterios_version"], self.bd.version)
        self.assertEqual(self.bd.filas["P2"]["req_fragmentos"], ["Exp[1] Analista"] * 3)

        self.bd.requisitos = [self.req("Experiencia en cobranzas", 100), self.req("Manejo de Excel", 10),
                              self.req("Sector educativo", 0, activo=False)]
        ranking.paso_ranking(self.bd, {"aviso_id": "A1"})
        self.assertEqual(len(self.llamadas), 2)          # sin e5: solo vuelve a ponderar
        self.assertEqual(self.orden(), ["P1", "P2"])
        self.assertEqual(len(self.bd.filas["P1"]["req_sims_bruto"]), 2)

    def test_al_dia_no_recalcula(self):
        ranking.paso_ranking(self.bd, {"aviso_id": "A1"})
        self.assertEqual(ranking.paso_ranking(self.bd, {"aviso_id": "A1"}), 0)
        self.assertEqual(len(self.llamadas), 1)


if __name__ == "__main__":
    unittest.main()
