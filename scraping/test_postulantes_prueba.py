"""Postulantes de prueba creados a mano: python -m unittest scraping.test_postulantes_prueba"""
import tempfile
import unittest
from pathlib import Path

from .db import BD


class TestPostulantesPrueba(unittest.TestCase):
    def test_importar_el_csv_conserva_a_los_de_prueba(self):
        with tempfile.TemporaryDirectory() as tmp:
            bd = BD(Path(tmp) / "prueba.db", motor="sqlite")
            bd.crear_aviso("A1", "Aviso")
            bd.cx.execute("INSERT INTO postulaciones(aviso_id, clave, id_postulante, datos_json, en_ultimo_csv) "
                          "VALUES ('A1', 'DOC:1', 'prueba-gth-1', '{}', 1), ('A1', 'DOC:2', 'xvieja001', '{}', 1)")
            bd.cx.commit()
            bd.importar_csv("A1", [{"Nro. Documento": "12345678", "Nombre": "Ana", "Apellido": "Real", "E-Mail": "ana@x.pe"}])
            estado = {r["id_postulante"]: r["en_ultimo_csv"] for r in bd.consultar("SELECT id_postulante, en_ultimo_csv FROM postulaciones")}
            self.assertEqual(estado["prueba-gth-1"], 1)   # creado a mano: se conserva
            self.assertEqual(estado["xvieja001"], 0)      # ya no vino en el CSV
            self.assertEqual(estado["areal678"], 1)
            bd.cx.close()


if __name__ == "__main__":
    unittest.main()
