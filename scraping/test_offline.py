"""Prueba sin navegador: importa un CSV de Bumeran a una BD temporal y revisa el resultado.
Uso: python -m scraping.test_offline ruta/al/exportCsv.csv
"""
import json
import sys
import tempfile
from pathlib import Path

from .csv_bumeran import leer_csv
from .db import BD


def main(ruta):
    meta, filas = leer_csv(ruta)
    print("Metadatos:", meta)
    print("Filas:", len(filas), "| columnas:", len(filas[0]) if filas else 0)
    with tempfile.TemporaryDirectory() as tmp:
        bd = BD(Path(tmp) / "prueba.db")
        aviso = meta["aviso_id"]
        bd.cx.execute("INSERT INTO avisos(aviso_id, titulo) VALUES (?,?)", (aviso, meta.get("titulo")))
        n1, t1 = bd.importar_csv(aviso, filas)
        n2, t2 = bd.importar_csv(aviso, filas)          # reimportar no debe crear nuevos
        print(f"1ra importación: {n1} nuevos de {t1} | 2da: {n2} nuevos de {t2}")
        assert n2 == 0 and t1 == t2
        tipos = bd.cx.execute("SELECT substr(clave,1,instr(clave,':')-1) t, COUNT(*) n FROM postulaciones GROUP BY t").fetchall()
        print("Tipo de llave:", {r['t']: r['n'] for r in tipos})
        # simular un CV para probar la vista de unión
        r = bd.cx.execute("SELECT documento, email FROM postulaciones LIMIT 1").fetchone()
        bd.guardar_cv(aviso, "999", documento=r["documento"], email=r["email"], tiene_adjunto=True,
                      archivo="cvs/x.pdf", estado="descargado")
        unidos = bd.cx.execute("SELECT COUNT(*) FROM v_postulaciones WHERE cv_archivo IS NOT NULL").fetchone()[0]
        print("Postulaciones unidas a un CV simulado:", unidos)
        assert unidos == 1
        print("Necesita CSV:", bd.necesita_csv(aviso))
        fila = json.loads(bd.cx.execute("SELECT datos_json FROM postulaciones LIMIT 1").fetchone()[0])
        print("Columnas guardadas por postulante:", len(fila))
        bd.cx.close()
    print("OK")


if __name__ == "__main__":
    main(sys.argv[1])
