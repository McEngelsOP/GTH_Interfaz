import tempfile
import unittest
from datetime import date
from pathlib import Path

from .csv_bumeran import leer_csv
from .fechas_trayectoria import fecha, lectura_fecha
from .trayectoria import analizar, huella
from .campos_trayectoria import campo_laboral
from .test_trayectoria import HOY, experiencia, patron


def perfil_regresion():
    datos = {}
    for n, emp, inicio, fin, puesto in [
        (1, "Consultora A", "2016-01-01", "", "Consultora Independiente"),
        (2, "Empresa B", "2024-06-01", "2025-12-01", "Líder de Personal"),
        (3, "Empresa C", "2023-08-01", "2024-05-01", "Analista de Nóminas"),
        (4, "Empresa D", "2021-06-01", "2022-06-01", "Coordinadora"),
    ]:
        datos.update(experiencia(n, emp, inicio, fin, modalidad="", puesto=puesto))
    return datos


class FechasTrayectoriaTests(unittest.TestCase):
    def test_encabezados_de_fecha_equivalentes(self):
        for cabecera in ["Exp[1] Fecha fin", "EXP[1] FECHA FIN", " Exp [ 1 ] Fecha de fin ",
                         "Exp[1]\u00a0Fecha\u202ffin", "Exp[1] Fecha de término", "Exp[1] Fecha de finalización",
                         "\ufeffExp[1] Fecha egreso", "Exp[1] Fecha de te\u0301rmino"]:
            with self.subTest(cabecera=cabecera):
                d = experiencia(1, "A", "junio del 2024", "")
                d[cabecera] = "31/12/2025 00:00:00"
                r = analizar(d, HOY)
                self.assertEqual(r["incidencias"], [])
                self.assertEqual(r["experiencias"][0]["fecha_fin"]["texto"], "31/12/2025")
                self.assertIn({"columna": cabecera, "valor": d[cabecera]}, r["experiencias"][0]["fecha_fin"]["fuentes"])

    def test_alias_inicio_y_campos_laborales(self):
        d = {" exp[1] EMPRESA ": "A", "EXP[1] PUESTO": "Analista", "Exp[1] Fecha de ingreso": "jun. 2024",
             "Exp[1] Fecha de fin": "dic. 2025", "Exp[1] descripcio\u0301n": "Funciones",
             "Exp[1] TIPO DE CONTRATO": "Dependiente"}
        r = analizar(d, HOY)
        self.assertEqual(r["incidencias"], [])
        self.assertEqual(r["experiencias"][0]["modalidad"], "dependiente")
        self.assertEqual(r["experiencias"][0]["fecha_inicio"]["precision"], "mes")
        for nombre in ["Est[1] Fecha Fin", "Fecha Fin", "Exp[1] Fecha Fin estimada", "Exp[١] Fecha Fin"]:
            self.assertIsNone(campo_laboral(nombre), nombre)
            self.assertEqual(huella(d), huella({**d, nombre: "otra"}))

    def test_columnas_equivalentes_con_una_vacia_no_pierden_fecha(self):
        for vacio in ["", "N/A", "Sin datos", "null"]:
            d = experiencia(1, "A", "2024-01-01", vacio)
            d["Exp[1] Fecha fin"] = "2025-12-31"
            self.assertEqual(analizar(d, HOY)["incidencias"], [])
            self.assertEqual(analizar(dict(reversed(list(d.items()))), HOY), analizar(d, HOY))

    def test_fechas_equivalentes_con_formatos_distintos_no_son_conflicto(self):
        d = experiencia(1, "A", "2024-01-01", "2025-12-31")
        d["Exp[1] Fecha fin"] = "31/12/2025"
        self.assertEqual(analizar(d, HOY)["incidencias"], [])

    def test_columnas_de_fecha_contradictorias_conservan_evidencia(self):
        d = patron(); d["Exp[2] Fecha fin"] = "2026-03-31"
        r = analizar(d, HOY)
        self.assertEqual(r["estado"], "informacion_insuficiente")
        self.assertIn("Exp[2]: valores contradictorios para fecha fin entre columnas del archivo", r["incidencias"])
        self.assertFalse(any("no registrada" in i for i in r["incidencias"]))
        f = r["experiencias"][1]["fecha_fin"]
        self.assertEqual(f["estado"], "no_reconocida")
        self.assertEqual({v["valor"] for v in f["fuentes"]}, {"2026-02-28", "2026-03-31"})

    def test_conflicto_no_convierte_empleo_en_excluido(self):
        d = experiencia(1, "A", "2024-01-01", "2025-12-31")
        d["Exp[1] modalidad"] = "Freelance"
        r = analizar(d, HOY)
        self.assertEqual(r["estado"], "informacion_insuficiente")
        self.assertFalse(r["experiencias"][0]["excluida"])

    def test_csv_con_variantes_de_encabezado_hasta_analisis(self):
        for cod in ["utf-8-sig", "cp1252"]:
            with tempfile.TemporaryDirectory() as tmp:
                p = Path(tmp) / "test.csv"
                p.write_text('Nombre;EXP[1] Empresa;Exp[1] Fecha de inicio;Exp[1] Fecha Fin;Exp[1] Fecha fin\n'
                             'Prueba;A;01/06/2024;;31/12/2025\n', encoding=cod)
                _, filas = leer_csv(p)
                r = analizar(filas[0], HOY)
                self.assertEqual(r["incidencias"], [])
                self.assertEqual(r["experiencias"][0]["fin"], "31/12/2025")

    def test_solapamiento_historico_no_bloquea_horizonte_actual(self):
        d = {**experiencia(1, "A", "2019-01-01", "2023-12-31"),
             **experiencia(2, "B", "2023-01-01", "2023-12-31")}
        r = analizar(d, HOY)
        self.assertEqual(r["estado"], "sin_patron")
        self.assertEqual(r["incidencias"], [])
        d.update(experiencia(3, "C", "2025-01-01", "2025-12-31"))
        self.assertEqual(analizar(d, HOY)["estado"], "sin_patron")

    def test_solapamiento_reciente_sigue_sin_contar_como_cambio(self):
        d = {**experiencia(1, "A", "2025-01-01", "2026-06-30"),
             **experiencia(2, "B", "2026-01-01", "2026-09-30")}
        r = analizar(d, HOY)
        self.assertEqual(r["estado"], "informacion_insuficiente")
        self.assertEqual(r["total_transiciones"], 0)
        self.assertTrue(any("simultaneidad" in i for i in r["incidencias"]))

    def test_huella_incluye_variantes_y_sus_cambios(self):
        d = {"Exp[1] Fecha fin": "2025-12-31"}
        self.assertNotEqual(huella(d), huella({}))
        self.assertNotEqual(huella(d), huella({"Exp[1] Fecha fin": "2025-11-30"}))

    def test_fechas_con_hora_local_y_particula_del(self):
        for valor in ["1/6/2024 00:00:00", "2024/06/01 12:30:01.123", "1 de junio del 2024"]:
            self.assertEqual(fecha(valor, HOY)["min"], date(2024, 6, 1))
        for valor in ["1/6/2024 25:00:00", "31/02/2024 00:00:00", "06/24 00:00:00"]:
            self.assertIsNone(fecha(valor, HOY), valor)

    def test_formatos_dia(self):
        for valor in ["2024-06-01", "2024/6/1", "2024.06.01", "1/6/2024", "01-06-2024", "01.06.2024",
                      "1 de junio de 2024", "01-jun-2024", "1 June 2024", "01 JUN. 2024",
                      "2024-06-01T00:00:00Z", "2024-06-01 00:00:00", "2024-06-01T23:59:59.123-05:00",
                      " 01 / 06 / 2024 ", "01–06–2024"]:
            with self.subTest(valor=valor):
                r = fecha(valor, HOY)
                self.assertEqual(r, {"min": date(2024, 6, 1), "max": date(2024, 6, 1), "precision": "dia"})

    def test_formatos_mes(self):
        for valor in ["2024-06", "2024/06", "06/2024", "6.2024", "junio 2024", "Jun. de 2024", "June 2024", "jun-2024"]:
            with self.subTest(valor=valor):
                self.assertEqual(fecha(valor, HOY), {"min": date(2024, 6, 1), "max": date(2024, 6, 30), "precision": "mes"})
        for valor in ["set. 2024", "septiembre 2024", "SEPT 2024", "setiembre de 2024"]:
            self.assertEqual(fecha(valor, HOY)["min"], date(2024, 9, 1))
        self.assertEqual(fecha("febrero 2024", HOY)["max"], date(2024, 2, 29))

    def test_no_inventa_dia_ni_siglo_ni_fecha_excel(self):
        self.assertEqual(fecha("2024-06-01", HOY)["precision"], "dia")
        self.assertEqual(fecha("2024", HOY)["precision"], "anio")
        for valor in ["06/24", "2024-13", "31/02/2024", "2024-02-30T00:00:00Z", "45292", "Jun 24", "2024-00"]:
            self.assertIsNone(fecha(valor, HOY), valor)

    def test_ausente_y_no_reconocida_son_distintas(self):
        for valor in ["", "N/A", "null", "—", "Sin datos"]:
            self.assertEqual(lectura_fecha(valor, HOY)[1]["estado"], "ausente")
        for valor in ["2024 trimestre 2", "31/02/2024"]:
            _, r = lectura_fecha(valor, HOY)
            self.assertEqual(r["estado"], "no_reconocida")
            self.assertEqual(r["original"], valor)
            self.assertIn(valor, r["texto"])

    def test_actualidad_explicita(self):
        for valor in ["Actualidad", "Presente", "Present", "Hasta la fecha", "En curso"]:
            self.assertEqual(fecha(valor, HOY)["precision"], "actualidad")
        self.assertIsNone(fecha("", HOY))

    def test_caso_compartido_sin_falsa_falta_de_fechas(self):
        r = analizar(perfil_regresion(), HOY)
        self.assertEqual(r["estado"], "sin_patron")
        self.assertEqual(r["total_transiciones"], 0)
        self.assertEqual(r["total_transiciones_posibles"], 0)
        self.assertIsNone(r["ventana"])
        self.assertEqual(r["incidencias"], ["Exp[1]: fecha de fin no registrada en la fuente"])
        self.assertEqual(len(r["notas"]), 3)
        self.assertEqual(r["experiencias"][0]["motivo"], "Trabajo independiente declarado")
        self.assertTrue(all("· ·" not in e["evidencia"] and not e["evidencia"].endswith(" · ") for e in r["experiencias"]))
        self.assertTrue(all(e["fecha_inicio"]["estado"] == "valida" for e in r["experiencias"]))

    def test_fecha_presente_no_se_reporta_ausente(self):
        d = patron(); d["Exp[2] Fecha Inicio"] = "febrero de 2026"
        self.assertEqual(analizar(d, HOY)["estado"], "patron_detectado")
        d["Exp[2] Fecha Inicio"] = "segundo trimestre de 2026"
        r = analizar(d, HOY)
        self.assertIn("Exp[2]: fecha de inicio presente, pero con formato no reconocido: segundo trimestre de 2026", r["incidencias"])
        self.assertNotIn("Exp[2]: fecha de inicio no registrada en la fuente", r["incidencias"])

    def test_fin_vacio_no_asume_actualidad(self):
        d = patron(); d["Exp[2] Fecha Fin"] = ""
        r = analizar(d, HOY)
        self.assertEqual(r["estado"], "informacion_insuficiente")
        self.assertEqual(r["experiencias"][1]["fecha_fin"]["estado"], "ausente")
        self.assertIn("Exp[2]: fecha de fin no registrada en la fuente", r["incidencias"])

    def test_error_invertido_es_explicito(self):
        d = patron(); d["Exp[2] Fecha Fin"] = "2025-12-31"
        self.assertIn("Exp[2]: fecha de fin anterior a la fecha de inicio", analizar(d, HOY)["incidencias"])

    def test_modalidad_ausente_no_produce_alerta_confirmada(self):
        d = {k: "" if k.endswith("Modalidad") else v for k, v in patron().items()}
        r = analizar(d, HOY)
        self.assertEqual(r["estado"], "informacion_insuficiente")
        self.assertEqual(r["total_transiciones"], 0)
        self.assertEqual(r["total_transiciones_posibles"], 3)
        self.assertIsNone(r["ventana"])
        self.assertEqual(len(r["ventana_posible"]["transiciones"]), 3)
        self.assertFalse(any("fecha" in x.lower() for x in r["incidencias"]))

    def test_tres_empleos_no_alcanzan_umbral_sin_modalidad(self):
        d = {k: "" if k.endswith("Modalidad") else v for k, v in patron().items() if not k.startswith("Exp[4]")}
        r = analizar(d, HOY)
        self.assertEqual(r["estado"], "sin_patron")
        self.assertEqual(r["total_transiciones_posibles"], 2)

    def test_excluida_igualmente_muestra_fecha_pendiente(self):
        d = experiencia(1, "Consultora", "2024-01", "", modalidad="Independiente")
        r = analizar(d, HOY)
        self.assertEqual(r["estado"], "no_aplica")
        self.assertEqual(r["incidencias"], ["Exp[1]: fecha de fin no registrada en la fuente"])

    def test_csv_a_analisis_sin_transformar_fechas(self):
        # El importador conserva las fechas del CSV; la evidencia debe guardar ese mismo valor.
        for cod in ["utf-8-sig", "cp1252"]:
            with tempfile.TemporaryDirectory() as tmp:
                p = Path(tmp) / "test.csv"
                p.write_text('Nombre;Exp[1] Empresa;Exp[1] Puesto;Exp[1] Fecha Inicio;Exp[1] Fecha Fin;Exp[1] Modalidad\n'
                             'Prueba;Empresa A;Analista;junio de 2024;2025-12-01T00:00:00Z;Dependiente\n', encoding=cod)
                _, filas = leer_csv(p)
                r = analizar(filas[0], HOY)
                self.assertEqual(r["incidencias"], [])
                self.assertEqual(r["experiencias"][0]["inicio"], "junio de 2024")
                self.assertEqual(r["experiencias"][0]["fecha_inicio"]["texto"], "jun. 2024")

    def test_no_cuenta_solapamiento_con_horizonte(self):
        d = experiencia(1, "A", "2023-08", "2024-05")
        d.update(experiencia(2, "B", "2024-06", "2025-12"))
        self.assertEqual(analizar(d, HOY)["total_transiciones"], 0)

    def test_independiente_paralelo_no_invalida_dependientes(self):
        d = patron(); d.update(experiencia(9, "Consultora", "2016-01", "Actualidad", modalidad="Independiente"))
        self.assertEqual(analizar(d, HOY)["estado"], "patron_detectado")

    def test_cache_de_fecha_futura_expira(self):
        d = experiencia(1, "A", "2026-11-01", "2026-12-01")
        self.assertEqual(analizar(d, HOY)["vigente_hasta"], "2026-10-31")

    def test_mes_en_curso_se_lee_sin_inventar_dia(self):
        d = patron(); d["Exp[4] Fecha Inicio"] = "abril 2026"
        r = analizar(d, date(2026, 4, 15))
        self.assertEqual(r["estado"], "patron_detectado")
        self.assertEqual(r["experiencias"][3]["fecha_inicio"]["precision"], "mes")
        self.assertEqual(r["experiencias"][3]["fecha_inicio"]["texto"], "abr. 2026")


if __name__ == "__main__":
    unittest.main()
