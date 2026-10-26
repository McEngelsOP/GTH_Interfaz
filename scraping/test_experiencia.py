"""Regla de prácticas (años equivalentes): python -m unittest scraping.test_experiencia"""
import unittest
from datetime import date

from . import experiencia as ex
from . import ranking

HOY = date(2026, 10, 24)


def exp(i, puesto, inicio, fin, descripcion=""):
    return {f"Exp[{i}] Puesto": puesto, f"Exp[{i}] Fecha Inicio": inicio, f"Exp[{i}] Fecha Fin": fin,
            f"Exp[{i}] Descripción": descripcion, f"Exp[{i}] Empresa": f"Empresa {i}"}


class TestExperiencia(unittest.TestCase):
    def test_avisos_y_requisitos_a_los_que_aplica(self):
        self.assertTrue(ex.aplica("Analista de Cobranzas"))
        self.assertTrue(ex.aplica("Asistente Administrativo"))
        self.assertFalse(ex.aplica("Practicante de Marketing"))
        self.assertFalse(ex.aplica("Docente de matemática"))
        self.assertEqual(ex.anios_requeridos("2 años de experiencia en puestos similares"), 2)
        self.assertEqual(ex.anios_requeridos("Mínimo un año de experiencia en atención al cliente"), 1)
        self.assertEqual(ex.anios_requeridos("Experiencia de 1 a 2 años en cobranzas"), 1)
        self.assertIsNone(ex.anios_requeridos("Experiencia en atención al cliente"))
        self.assertIsNone(ex.anios_requeridos("Excel intermedio"))
        self.assertEqual(ex.requisitos_de_anios("Analista", ["Excel", "2 años de experiencia"]), {1: 2})
        self.assertEqual(ex.requisitos_de_anios("Practicante", ["2 años de experiencia"]), {})

    def test_factor_por_tipo(self):
        self.assertEqual(ex.factor("Analista contable", "Elaboración de reportes y buenas prácticas"), 1)
        self.assertEqual(ex.factor("Practicante profesional de contabilidad", ""), 0.5)
        self.assertEqual(ex.factor("Asistente", "Prácticas profesionales en el área de finanzas"), 0.5)
        self.assertEqual(ex.factor("Practicante preprofesional", ""), 0)
        self.assertEqual(ex.factor("Asistente", "Prácticas pre profesionales"), 0)
        self.assertEqual(ex.factor("Practicante de marketing", ""), 0)   # sin tipo = preprofesional

    def test_anios_equivalentes(self):
        datos = {**exp(1, "Analista", "2024-01-01", "2024-12-31"),                      # 1 año laboral
                 **exp(2, "Practicante profesional", "2023-01-01", "2023-12-31"),       # 1 año a la mitad
                 **exp(3, "Practicante de ventas", "2022-01-01", "2022-12-31")}         # no suma
        total, laboral, practica = ex.anios_equivalentes(datos, HOY)
        self.assertAlmostEqual(total, 1.5)
        self.assertAlmostEqual(laboral, 1)
        self.assertAlmostEqual(practica, 1)

    def test_superposicion_y_empleo_actual(self):
        datos = {**exp(1, "Analista", "2025-10-01", ""),                                 # actual: 13 meses
                 **exp(2, "Practicante profesional", "2025-10-01", "2026-03-31")}       # superpuesta: no suma
        total, laboral, practica = ex.anios_equivalentes(datos, HOY)
        self.assertAlmostEqual(total, 13 / 12)
        self.assertEqual(practica, 0)

    def test_regla_en_el_ranking(self):
        filas = [{"clave": c, "req_sims_bruto": [0.8, 0.7], "score_bruto": 0.75,
                  "explicacion_bruta": "[Excel…] -> Exp[1] A (0.80) | [2 años…] -> Exp[1] A (0.70)"} for c in ("P1", "P2")]
        filas[1]["req_sims_bruto"] = [0.8, 0.9]
        datos = {"P1": exp(1, "Analista", "2023-10-01", "2025-09-30"),              # 2 años: cumple
                 "P2": exp(1, "Practicante de ventas", "2020-01-01", "2025-12-31")}  # solo preprofesional
        ranking.aplicar_regla_practicas(filas, datos, "Analista", ["Excel", "2 años de experiencia"], [1, 1])
        self.assertEqual(filas[0]["_sims"], [0.8, 0.9])    # tope del rango del requisito en el aviso
        self.assertEqual(filas[1]["_sims"], [0.8, 0.7])    # piso
        self.assertEqual(filas[1]["req_sims_bruto"], [0.8, 0.9])   # la similitud e5 se conserva
        self.assertGreater(filas[0]["score_bruto"], filas[1]["score_bruto"])
        self.assertIn("2.0 años de experiencia relacionada equivalente", filas[0]["explicacion_bruta"])
        self.assertEqual(filas[0]["ajustes"]["experiencia"]["2 años de experiencia"]["anios"], 2.0)

    def test_empresas_de_educacion_superior(self):
        datos = {"Exp[1] Empresa": "Universidad Peruana de Ciencias Aplicadas (UPC)", "Exp[2] Empresa": "Colegio San Silvestre",
                 "Exp[3] Empresa": "CERTUS", "Exp[4] Empresa": "Banco de Crédito", "Exp[5] Empresa": "ESAN-Graduate School of Business"}
        self.assertEqual(ex.empresas_educacion_superior(datos),
                         ["Universidad Peruana de Ciencias Aplicadas (UPC)", "CERTUS", "ESAN-Graduate School of Business"])
        self.assertEqual(ex.empresas_educacion_superior({"Exp[1] Empresa": "Innova Teaching School"}), [])
        self.assertEqual(ex.empresas_educacion_superior({"Exp[1] Empresa": "Centro de Salud Mental Comunitario Universitario"}), [])

    def test_solo_cuenta_experiencia_relacionada(self):
        datos = {**exp(1, "Analista de cobranzas", "2022-10-01", "2024-09-30"),      # 2 años, relacionada
                 **exp(2, "Mesero", "2024-10-01", "2026-09-30")}                    # 2 años, no relacionada
        self.assertAlmostEqual(ex.anios_equivalentes(datos, HOY)[0], 4.0)
        self.assertAlmostEqual(ex.anios_equivalentes(datos, HOY, relacionadas={1})[0], 2.0)
        self.assertEqual(ex.anios_equivalentes(datos, HOY, relacionadas=set())[0], 0)

    def test_regla_con_similitud_por_experiencia(self):
        etiquetas = ["Excel", "3 años de experiencia en cobranzas"]
        filas = [{"clave": c, "req_sims_bruto": [0.8, s], "score_bruto": 0.0,
                  "explicacion_bruta": "[Excel…] -> Exp[1] A (0.80) | [3 años…] -> Exp[1] A (0.70)"} for c, s in (("P1", 0.7), ("P2", 0.9))]
        datos = {"P1": {**exp(1, "Analista de cobranzas", "2020-10-01", "2023-09-30"), **exp(2, "Mesero", "2023-10-01", "2026-09-30")},
                 "P2": {**exp(1, "Mesero", "2017-10-01", "2026-09-30")}}
        # P1: la experiencia de cobranzas es relacionada (similitud alta); P2 solo tiene experiencia no relacionada
        sims_exp = {1: {"P1": {1: 0.85, 2: 0.70}, "P2": {1: 0.60}}}
        ranking.aplicar_regla_practicas(filas, datos, "Analista de cobranzas", etiquetas, [1, 1], sims_exp)
        self.assertEqual(filas[0]["_sims"][1], 0.9)    # 3 años relacionados: cumple
        self.assertEqual(filas[1]["_sims"][1], 0.7)    # 9 años, pero ninguno relacionado
        self.assertEqual(filas[0]["ajustes"]["experiencia"][etiquetas[1]]["experiencias"], {"1": 0.85, "2": 0.70})
        self.assertEqual(ranking.cache_experiencias({"P1": {"ajustes": filas[0]["ajustes"]}}, etiquetas[1]), {"P1": {1: 0.85, 2: 0.70}})


if __name__ == "__main__":
    unittest.main()
