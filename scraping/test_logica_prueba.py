"""Reglas validadas con GTH (28/10/2026, prueba 8b en los avisos I, II y III): python -m unittest scraping.test_logica_prueba"""
import unittest
from datetime import date

from . import estudios, niveles
from . import experiencia as ex
from . import ranking
from .test_experiencia import exp

HOY = date(2026, 10, 28)


class TestLogicaPrueba(unittest.TestCase):
    def test_palabras_se_arman_del_requisito(self):
        p = ex.palabras_relacionadas("Mínimo 2 años de experiencia en atención a docentes en universidades.")
        self.assertEqual(p["tema"], [("atencion", "docentes")])
        self.assertIn("gestion docente", p["sinonimos"])
        self.assertNotIn("call center", p["sinonimos"])   # el grupo de atención al cliente no se dispara
        p = ex.palabras_relacionadas("Mínimo 3 años de experiencia en procesos de selección y/o Gestión del Talento.")
        self.assertEqual(p["tema"], [("seleccion",), ("gestion", "talento")])

    def test_experiencia_relacionada_por_palabras(self):
        p = ex.palabras_relacionadas("Mínimo 1 año de experiencia en atención al cliente presencial o telefónico.")
        datos = {**exp(1, "Asistente de atención al estudiante", "2025-01-01", ""),
                 **exp(2, "Mesero", "2020-01-01", "2024-12-31", "Preparación de mesas")}
        self.assertEqual(ex.relacionadas_por_palabras(datos, p), {1})

    def test_interno_y_dos_practicas_sin_tipo(self):
        self.assertEqual(ex.factor("Interno de psicología", ""), 1)
        self.assertEqual(ex.factor("Interno de psicología", "", reglas_gth=True), 0.5)
        self.assertEqual(ex.factor("Auditor interno", "", reglas_gth=True), 1)
        datos = {**exp(1, "Practicante de RRHH", "2024-01-01", "2024-12-31"),
                 **exp(2, "Practicante de reclutamiento", "2023-01-01", "2023-12-31")}
        self.assertEqual(ex.anios_equivalentes(datos, HOY)[0], 0)
        self.assertAlmostEqual(ex.anios_equivalentes(datos, HOY, reglas_gth=True)[0], 0.5)   # la más reciente, a la mitad

    def test_escala_por_experiencia(self):
        datos = {"Exp[1] Empresa": "Footloose", "Exp[2] Empresa": "Continental Standford", "Exp[3] Empresa": "HR LATAM"}
        filas = [{"clave": c, "score_bruto": s, "explicacion_bruta": "x"} for c, s in (("P1", 0.5), ("P2", 0.6), ("P3", 0.9))]
        ranking.aplicar_ajustes(filas, {"P1": datos}, {"rubro": 0, "rotacion": 0}, reglas_gth=True)
        escala = filas[0]["ajustes"]["escala"]
        self.assertEqual(escala["experiencias"], 2)   # HR LATAM ya no cuenta
        self.assertAlmostEqual(escala["delta"], 2 * ranking.ESCALA_POR_EXPERIENCIA * ranking.BONO_ESCALA * ranking._distancia(filas[1:] + [{"score_bruto": 0.5}]), 3)

    def test_rubro_por_experiencia(self):
        datos = {"Exp[1] Empresa": "Universidad Tecnológica del Perú", "Exp[2] Empresa": "Instituto Daniel Alcides Carrión",
                 "Exp[3] Empresa": "I.E.P Juan Espinoza Medrano", "Exp[4] Empresa": "Interbank"}
        self.assertEqual(ex.experiencias_educacion(datos), (2, 1))
        self.assertEqual(ex.empresas_educacion_superior(datos), ["Universidad Tecnológica del Perú"])

    def test_posgrado_afin_es_100(self):
        afines = estudios.afines_del_requisito("Profesional universitario de Administración / Marketing / Educación o afines.")
        maestria = {"Est[1] Titulo": "Maestría en Tecnología Educativa", "Est[1] Nivel": "Master", "Est[1] Estado": "En Curso"}
        self.assertEqual(estudios.posgrado_afin(maestria, afines), "Maestría en Tecnología Educativa")
        self.assertIsNone(estudios.posgrado_afin({"Est[1] Titulo": "Maestría en Ingeniería Civil", "Est[1] Nivel": "Master"}, afines))
        self.assertIsNone(estudios.posgrado_afin({"Est[1] Titulo": "Diplomado en Educación", "Est[1] Nivel": "Posgrado"}, afines))
        self.assertEqual(estudios.afines_del_requisito("Mínimo 2 años de experiencia"), [])

    def test_escala_de_herramientas(self):
        pedido = {"Excel": 2, "Power BI": 2}
        self.assertAlmostEqual(niveles.evaluar({}, pedido, reglas_gth=True)[0], 0.2)
        self.assertAlmostEqual(niveles.evaluar({"P?": "Excel básico"}, pedido, reglas_gth=True)[0], (0.3 + 0.2) / 2)
        self.assertAlmostEqual(niveles.evaluar({"P?": "Excel intermedio", "Q?": "Power BI"}, pedido, reglas_gth=True)[0], (1 + 0.3) / 2)
        self.assertAlmostEqual(niveles.evaluar({"P?": "Excel"}, {"Excel": 1}, reglas_gth=True)[0], 1)

    def test_bono_interno_por_anios_de_sobra(self):
        etiquetas = ["1 año de experiencia en cobranzas", "Excel"]
        filas = [{"clave": c, "req_sims_bruto": [0.5, s], "score_bruto": 0.5, "explicacion_bruta": "x | y"}
                 for c, s in (("P1", 0.4), ("P2", 0.6), ("P3", 0.9))]
        datos = {"P1": exp(1, "Analista de cobranzas", "2024-10-01", "2025-09-30"),     # 1 año: sin bono
                 "P2": exp(1, "Analista de cobranzas", "2023-04-01", "2025-09-30"),     # 2,5 años: 1,5 de sobra
                 "P3": exp(1, "Mesero", "2010-01-01", "2025-09-30")}                    # 15 años: tope de 4
        ranking.aplicar_regla_practicas(filas, datos, "Analista de cobranzas", etiquetas, [1, 1], reglas_gth=True)
        self.assertEqual([round(f.get("_extra", 0), 1) for f in filas], [0, 1.5, 4])
        ranking.aplicar_ajustes(filas, datos, {"rubro": 0, "escala_empresa": 0, "rotacion": 0}, reglas_gth=True)
        self.assertNotIn("anios_extra", filas[0].get("ajustes") or {})
        self.assertIn("anios_extra", filas[1]["ajustes"])
        fila = {**filas[1], "ajustes": dict(filas[1]["ajustes"])}
        antes = fila["score_bruto"]
        ranking.quitar_bonificacion_rubro(fila)   # al reutilizar la fila se descuenta para volver a aplicarlo
        self.assertLess(fila["score_bruto"], antes)

    def test_respuesta_sobre_herramientas(self):
        q = "¿A qué nivel dominas Excel y Power BI?"
        self.assertEqual(niveles.evaluar({q: "Intermedio"}, {"Excel": 2, "Power BI": 2}, reglas_gth=True)[0], 1)
        self.assertEqual(niveles.nivel_respondido({q: "intermedio - basico"}, "Power BI"), 1)
        self.assertEqual(niveles.evaluar({q: "Intermedio"}, {"Excel": 2}, reglas_gth=False)[0], 0)   # sin reglas_gth, como antes

    def test_respuesta_sobre_grado(self):
        afines = estudios.afines_del_requisito("Bachiller o Titulado(a) en Psicología o carreras afines.")
        q = "¿Eres Psicólogo? ¿Cuál es tu último grado académico?"
        self.assertEqual(estudios.grado_respondido({q: "Si, bachiller"}, afines)[0], "cumple")
        self.assertEqual(estudios.grado_respondido({q: "No soy psicóloga. Soy titulada en Contabilidad"}, afines)[0], "no_cumple")
        self.assertIsNone(estudios.grado_respondido({q: ""}, afines))

    def test_anios_declarados(self):
        q = "¿Cuántos de años de experiencia tienes realizando procesos de selección?"
        self.assertEqual(ex.anios_declarados({q: "10 meses"}), 0.83)
        self.assertEqual(ex.anios_declarados({q: "2 años y medio, perfiles masivos"}), 2.5)
        self.assertEqual(ex.anios_declarados({q: "No cuento con experiencia en ese rubro"}), 0)
        self.assertIsNone(ex.anios_declarados({"Edad": "30"}))
        etiquetas = ["1 año de experiencia en cobranzas", "Excel"]
        filas = [{"clave": "P1", "req_sims_bruto": [0.5, 0.5], "score_bruto": 0.5, "explicacion_bruta": "x | y"}]
        datos = {"P1": {**exp(1, "Analista de cobranzas", "2015-01-01", "2025-09-30"), "¿Cuántos años de experiencia tienes?": "2 años"}}
        ranking.aplicar_regla_practicas(filas, datos, "Analista de cobranzas", etiquetas, [1, 1], reglas_gth=True)
        self.assertEqual(filas[0]["_extra"], 2)   # declara 2: se cuentan 3 (2 + 1 de margen), no 10

    def test_ultima_experiencia_en_educacion(self):
        self.assertTrue(ex.ultima_en_educacion({"Exp[1] Empresa": "Universidad de Lima"}))
        self.assertTrue(ex.ultima_en_educacion({"Exp[1] Empresa": "Corporación Educativa X", "Exp[1] Industria": "Educación"}))
        self.assertFalse(ex.ultima_en_educacion({"Exp[1] Empresa": "Interbank", "Exp[2] Empresa": "UPC"}))

    def test_sin_disponibilidad(self):
        q = "¿Cuenta con disponibilidad para trabajar presencial?"
        self.assertEqual(ranking.sin_disponibilidad({q: "no"}), "no")
        self.assertIsNone(ranking.sin_disponibilidad({q: "Sí, inmediata"}))
        self.assertIsNone(ranking.sin_disponibilidad({q: "noviembre"}))


if __name__ == "__main__":
    unittest.main()
