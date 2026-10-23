import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

from .db import BD
from .trayectoria import analizar, fecha, huella
from .trayectoria_worker import ejecutar

HOY = date(2026, 10, 22)


def experiencia(n, empresa, inicio, fin, modalidad="Dependiente", puesto="Analista", descripcion=""):
    return {f"Exp[{n}] {k}": v for k, v in {"Empresa": empresa, "Puesto": puesto, "Fecha Inicio": inicio,
        "Fecha Fin": fin, "Modalidad": modalidad, "Descripción": descripcion}.items()}


def patron():
    return {**experiencia(1, "Empresa A", "2026-01-01", "2026-01-31"),
            **experiencia(2, "Empresa B", "2026-02-01", "2026-02-28"),
            **experiencia(3, "Empresa C", "2026-03-01", "2026-03-31"),
            **experiencia(4, "Empresa D", "2026-04-01", "Actualidad")}


class TrayectoriaTests(unittest.TestCase):
    def test_tres_transiciones_cuatro_empleos(self):
        r = analizar(patron(), HOY)
        self.assertEqual(r["estado"], "patron_detectado")
        self.assertEqual(len(r["ventana"]["transiciones"]), 3)
        self.assertEqual(len(r["experiencias"]), 4)

    def test_tres_empleos_son_dos_transiciones(self):
        d = {k: v for k, v in patron().items() if not k.startswith("Exp[4]")}
        self.assertEqual(analizar(d, HOY)["estado"], "sin_patron")

    def test_fuera_de_seis_meses(self):
        d = patron(); d.update(experiencia(4, "D", "2026-09-01", "Actualidad"))
        self.assertEqual(analizar(d, HOY)["estado"], "sin_patron")

    def test_limite_calendario_inclusivo(self):
        d = patron(); d.update(experiencia(4, "D", "2026-08-01", "Actualidad"))
        self.assertEqual(analizar(d, HOY)["estado"], "patron_detectado")

    def test_no_depende_del_indice(self):
        d = {k.replace("Exp[1]", "Exp[41]"): v for k, v in patron().items()}
        self.assertEqual(analizar(d, HOY)["estado"], "patron_detectado")

    def test_preprofesionales_excluidas(self):
        d = patron(); d.update(experiencia(2, "B", "2026-02-01", "2026-02-28", puesto="Practicante preprofesional"))
        r = analizar(d, HOY)
        self.assertNotEqual(r["estado"], "patron_detectado")
        self.assertEqual(r["total_transiciones"], 1, "no puentear la experiencia excluida")

    def test_profesionales_pueden_contar(self):
        d = patron(); d.update(experiencia(2, "B", "2026-02-01", "2026-02-28", modalidad="", puesto="Practicante profesional"))
        self.assertEqual(analizar(d, HOY)["estado"], "patron_detectado")

    def test_profesionales_con_termino_documentado(self):
        d = patron(); d.update(experiencia(2, "B", "2026-02-01", "2026-02-28", puesto="Practicante profesional", descripcion="Culminación del convenio"))
        self.assertNotEqual(analizar(d, HOY)["estado"], "patron_detectado")

    def test_practicante_sin_tipo_no_asume_dependiente(self):
        d = patron(); d["Exp[2] Puesto"] = "Practicante"
        self.assertEqual(analizar(d, HOY)["estado"], "informacion_insuficiente")

    def test_freelance_excluye_solo_su_experiencia(self):
        d = patron(); d["Exp[2] Modalidad"] = "Freelance"
        self.assertEqual(analizar(d, HOY)["total_transiciones"], 1)
        d["Resumen"] = "Busco oportunidades freelance"
        d["Exp[2] Modalidad"] = "Dependiente"
        self.assertEqual(analizar(d, HOY)["estado"], "patron_detectado")

    def test_todos_proyectos_no_aplica(self):
        d = {k: "Freelance" if k.endswith("Modalidad") else v for k, v in patron().items()}
        self.assertEqual(analizar(d, HOY)["estado"], "no_aplica")

    def test_modalidad_ausente_no_asume(self):
        d = patron(); d["Exp[2] Modalidad"] = ""
        self.assertEqual(analizar(d, HOY)["estado"], "informacion_insuficiente")

    def test_fechas_incompletas_y_vacias(self):
        for valor in ["", "2026", "31/02/2026", "texto", "Actualidad"]:
            with self.subTest(valor=valor):
                d = patron(); d["Exp[2] Fecha Inicio"] = valor
                self.assertEqual(analizar(d, HOY)["estado"], "informacion_insuficiente")
        d = patron(); d["Exp[1] Fecha Fin"] = ""
        self.assertEqual(analizar(d, HOY)["estado"], "informacion_insuficiente")

    def test_fechas_invertidas_futuras(self):
        for inicio, fin in [("2026-04-01", "2026-01-01"), ("2027-01-01", "2027-02-01")]:
            d = patron(); d.update(experiencia(2, "B", inicio, fin))
            self.assertNotEqual(analizar(d, HOY)["estado"], "patron_detectado")

    def test_fechas_mensuales_y_limite_ambiguo(self):
        d = patron(); d["Exp[2] Fecha Inicio"] = "02/2026"
        self.assertEqual(analizar(d, HOY)["estado"], "patron_detectado")
        d.update(experiencia(4, "D", "2026-08", "Actualidad"))
        self.assertEqual(analizar(d, HOY)["estado"], "informacion_insuficiente")

    def test_solapamiento_no_es_sustitucion(self):
        d = patron(); d["Exp[1] Fecha Fin"] = "2026-03-15"
        self.assertNotEqual(analizar(d, HOY)["estado"], "patron_detectado")

    def test_misma_empresa_y_duplicados(self):
        d = patron(); d["Exp[2] Empresa"] = "Empresa A"
        self.assertEqual(analizar(d, HOY)["estado"], "sin_patron")
        d = patron(); d.update({k.replace("Exp[2]", "Exp[9]"): v for k, v in d.copy().items() if k.startswith("Exp[2]")})
        self.assertEqual(len(analizar(d, HOY)["experiencias"]), 4)

    def test_horizonte_y_ausencia_de_datos(self):
        self.assertEqual(analizar({}, HOY)["estado"], "informacion_insuficiente")
        d = {k: v.replace("2026", "2022") for k, v in patron().items()}
        self.assertEqual(analizar(d, HOY)["estado"], "sin_patron")

    def test_huella_solo_laboral_y_unicode(self):
        d = patron(); h = huella(d)
        self.assertEqual(h, huella({**d, "E-Mail": "cambio@example.test"}))
        self.assertEqual(h, huella(dict(reversed(list(d.items())))))
        self.assertNotEqual(h, huella({**d, "Exp[1] Empresa": "Otra"}))
        self.assertEqual(fecha("02/2024", HOY)["max"], date(2024, 2, 29))


class PersistenciaTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.bd = BD(Path(self.tmp.name) / "test.db")
        self.bd.crear_aviso("A", "Aviso ficticio")

    def tearDown(self):
        self.bd.cerrar(); self.tmp.cleanup()

    def importar(self, extra=None):
        return self.bd.importar_csv("A", [{"Nombre": "Persona", "Apellido": "Prueba", "E-Mail": "persona@example.test", **patron(), **(extra or {})}])

    def test_importacion_analiza_reutiliza_y_actualiza(self):
        self.assertEqual(self.importar(), (1, 1))
        self.assertEqual(self.bd.uno("SELECT count(*) n FROM gth_trayectoria_analisis")["n"], 1)
        self.importar({"Teléfono celular": "000000000"})
        self.assertEqual(self.bd.uno("SELECT count(*) n FROM gth_trayectoria_analisis")["n"], 1)
        self.importar({"Exp[2] Modalidad": "Freelance"})
        self.assertEqual(self.bd.uno("SELECT count(*) n FROM gth_trayectoria_analisis")["n"], 2)
        self.assertEqual(self.bd.uno("SELECT count(*) n FROM postulaciones")["n"], 1)

    def test_error_no_revierte_importacion(self):
        with patch("scraping.trayectoria_worker.ejecutar", side_effect=RuntimeError("fallo simulado")):
            self.assertEqual(self.importar(), (1, 1))
        self.assertEqual(self.bd.uno("SELECT count(*) n FROM postulaciones")["n"], 1)
        self.assertEqual(ejecutar(self.bd, "A")["analizados"], 1)

    def test_vence_al_salir_del_horizonte(self):
        self.importar()
        r = ejecutar(self.bd, "A", date(2029, 1, 1))
        self.assertEqual(r["analizados"], 1)
        row = self.bd.uno("SELECT detalle FROM gth_trayectoria_analisis ORDER BY fecha_referencia DESC LIMIT 1")
        self.assertEqual(json.loads(row["detalle"])["estado"], "sin_patron")

    def test_version_nueva_recalcula_sin_borrar_historial(self):
        self.importar()
        self.bd.cx.execute("UPDATE gth_trayectoria_analisis SET version='trayectoria-v2'")
        self.bd.cx.commit()
        self.assertEqual(ejecutar(self.bd, "A")["analizados"], 1)
        self.assertEqual(ejecutar(self.bd, "A")["reutilizados"], 1)
        self.assertEqual(self.bd.uno("SELECT count(*) n FROM gth_trayectoria_analisis")["n"], 2)

    def test_reimportacion_con_cabecera_alternativa_invalida_cache(self):
        self.importar({"Exp[2] Fecha fin": "2026-02-28"})
        self.importar({"Exp[2] Fecha fin": "2026-03-31"})
        self.assertEqual(self.bd.uno("SELECT count(*) n FROM gth_trayectoria_analisis")["n"], 2)
        self.assertEqual(ejecutar(self.bd, "A")["reutilizados"], 1)


if __name__ == "__main__":
    unittest.main()
