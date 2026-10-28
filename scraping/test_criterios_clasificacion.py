"""Criterios y pesos de Andrea: python -m unittest scraping.test_criterios_clasificacion"""
import unittest

from . import niveles, ranking
from .empresas_peru import tier_de_empresa
from .sueldo import leer_sueldo, pretension


def filas(*puntajes):
    return [{"clave": f"P{i}", "score_bruto": s, "explicacion_bruta": "x"} for i, s in enumerate(puntajes, 1)]


class TestCriterios(unittest.TestCase):
    def test_diccionario_de_empresas(self):
        self.assertEqual(tier_de_empresa("Banco de Crédito del Perú")[0], "Tier 1")
        self.assertEqual(tier_de_empresa("Rappi Perú SAC")[0], "Tier 1.5")
        self.assertEqual(tier_de_empresa("EY Perú S.A.C.")[0], "Tier 1")
        self.assertIsNone(tier_de_empresa("Colegio Metropolitano"))   # «Metro» solo cuenta como nombre completo
        self.assertIsNone(tier_de_empresa("Empresa Ficticia S.A.C."))

    def test_sueldo_pretendido(self):
        self.assertEqual(leer_sueldo("S/ 3,500"), 3500)
        self.assertIsNone(leer_sueldo("2000 a 2500"))
        self.assertIsNone(leer_sueldo("USD 1500"))
        self.assertEqual(pretension({"Preferencia Salarial": "", "¿Cuál es tu expectativa salarial?": "2800"}), 2800)

    def test_niveles_y_sobrecalificacion(self):
        self.assertEqual(niveles.requisito_de_nivel("Excel y Power BI intermedio"), {"Excel": 2, "Power BI": 2})
        self.assertEqual(niveles.requisito_de_nivel("Experiencia en atención al cliente"), {})
        valor, detalle, sobre = niveles.evaluar({"¿Nivel de Excel?": "Excel avanzado"}, {"Excel": 2})
        self.assertEqual((valor, sobre), (1.0, True))
        self.assertIn("más de lo pedido", detalle)
        self.assertEqual(niveles.evaluar({"¿Nivel de Excel?": "básico"}, {"Excel": 2})[0], 0.0)   # no nombra Excel
        self.assertEqual(niveles.evaluar({"¿Nivel de Excel?": "Excel básico"}, {"Excel": 2})[0], 0.15)
        self.assertEqual(niveles.evaluar({"Exp[1] Descripción": "reportes en Excel"}, {"Excel": 2})[0], 0.15)

    def test_ajustes_por_defecto(self):
        f = filas(0.80, 0.70, 0.75, 0.72)
        datos = {"P2": {"Exp[1] Empresa": "Interbank"}, "P3": {"Exp[1] Empresa": "Universidad de Lima"}}
        ranking.aplicar_ajustes(f, datos, rotacion={"P1"})
        distancia = 0.80 - 0.70
        self.assertAlmostEqual(f[0]["score_bruto"], 0.80 - 0.5 * distancia)          # alta rotación
        self.assertAlmostEqual(f[1]["score_bruto"], 0.70 + 0.25 * distancia)         # Tier 1
        self.assertEqual(f[1]["ajustes"]["escala"]["tier"], "Tier 1")
        self.assertIn("rubro", f[2]["ajustes"])                                       # universidad: rubro y Tier 1
        self.assertIn("escala", f[2]["ajustes"])

    def test_intensidad_cero_apaga_el_criterio(self):
        f = filas(0.80, 0.70)
        ranking.aplicar_ajustes(f, {"P2": {"Exp[1] Empresa": "Interbank"}}, {"escala_empresa": 0}, rotacion={"P1"})
        self.assertNotIn("escala", f[1].get("ajustes") or {})
        f = filas(0.80, 0.70)
        ranking.aplicar_ajustes(f, {}, {"rotacion": 0}, rotacion={"P1"})
        self.assertEqual(f[0]["score_bruto"], 0.80)

    def test_sueldo_estricto_descarta_y_manejable_no(self):
        datos = {"P1": {"Preferencia Salarial": "5000"}, "P2": {"Preferencia Salarial": "2000"}, "P3": {}}
        f = filas(0.90, 0.70, 0.75)
        ranking.aplicar_ajustes(f, datos, oferta=3000, modo="estricto")
        self.assertLess(f[0]["score_bruto"], min(f[1]["score_bruto"], f[2]["score_bruto"]))
        self.assertTrue(f[0]["ajustes"]["sueldo"]["descartado"])
        f = filas(0.90, 0.70, 0.75)
        ranking.aplicar_ajustes(f, datos, oferta=3000, modo="manejable")
        self.assertEqual(f[0]["score_bruto"], 0.90)

    def test_reutilizar_una_fila_descuenta_todos_los_ajustes(self):
        f = filas(0.80, 0.70)
        ranking.aplicar_ajustes(f, {"P2": {"Exp[1] Empresa": "Interbank"}}, rotacion={"P1"})
        ranking.quitar_bonificacion_rubro(f[0]); ranking.quitar_bonificacion_rubro(f[1])
        self.assertEqual([x["score_bruto"] for x in f], [0.80, 0.70])


if __name__ == "__main__":
    unittest.main()
