"""Encabezados laborales explícitos; sin coincidencias aproximadas ni cambios al CSV."""
import re
import unicodedata

# Mismo alfabeto y espacios que gth_trayectoria_campo_valido en PostgreSQL.
ESPACIOS = re.compile(r"[ \t\r\n\f\v\u00a0\u202f\ufeff]+")
TILDES = str.maketrans("ÁÉÍÓÚÜÑáéíóúüñABCDEFGHIJKLMNOPQRSTUVWXYZ", "AEIOUUNaeiouunabcdefghijklmnopqrstuvwxyz")
CAMPO = re.compile(r"exp *\[ *([0-9]+) *\] +(.+)")
ALIAS = {
    "empresa": "Empresa", "puesto": "Puesto", "descripcion": "Descripción",
    "modalidad": "Modalidad", "tipo de contrato": "Tipo de contrato", "tipo de empleo": "Tipo de empleo",
    **dict.fromkeys(("fecha inicio", "fecha de inicio", "fecha ingreso", "fecha de ingreso"), "Fecha Inicio"),
    **dict.fromkeys(("fecha fin", "fecha de fin", "fecha termino", "fecha de termino",
                     "fecha finalizacion", "fecha de finalizacion", "fecha egreso", "fecha de egreso"), "Fecha Fin"),
}


def campo_laboral(nombre):
    texto = ESPACIOS.sub(" ", unicodedata.normalize("NFC", nombre).translate(TILDES)).strip(" ")
    m = CAMPO.fullmatch(texto)
    if m and m[2] in ALIAS:
        return int(m[1]), ALIAS[m[2]]
    return None
