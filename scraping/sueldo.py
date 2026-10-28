"""Sueldo pretendido del CSV de Bumeran, con la misma regla que la web (src/services/salarios.ts).

Solo montos mensuales en soles: rangos, otras monedas o texto ambiguo quedan sin monto. Primero la columna estándar
«Preferencia Salarial» y, si no trae un monto válido, la respuesta a la pregunta salarial del aviso.
"""
import re
import unicodedata

MAX_SUELDO = 1_000_000
CAMPO = re.compile(r"^(?:preferencia salarial|pretension(?: salarial)?|sueldo (?:bruto )?(?:pretendido|deseado)|"
                   r"remuneracion pretendida|expectativa salarial|salario (?:bruto )?(?:pretendido|deseado))"
                   r"(?:\s*\((?:s/\.?|pen|soles)\))?$")
PREGUNTA = re.compile(r"\b(?:expectativas? salarial(?:es)?|pretensi(?:on|ones) salarial(?:es)?)\b")
OTRA_MONEDA = re.compile(r"USD|US\$|\$|d[oó]lar|EUR|anual|a[nñ]o|quincen|seman|diari|hora", re.I)
NUMERO = re.compile(r"(?:\d+|\d{1,3}(?:[ ,.]\d{3})+)(?:[.,]\d{1,2})?")


def _campo(nombre):
    t = "".join(c for c in unicodedata.normalize("NFD", str(nombre).lower()) if unicodedata.category(c) != "Mn")
    return re.sub(r"[_-]", " ", t).strip()


def leer_sueldo(valor):
    texto = str(valor or "").strip().replace(" ", " ")
    if not texto or OTRA_MONEDA.search(texto):
        return None
    texto = re.sub(r"^(?:S/\.?|PEN|soles)\s*", "", texto, flags=re.I)
    texto = re.sub(r"\s*(?:PEN|soles)?\s*(?:mensual(?:es)?|al mes)?$", "", texto, flags=re.I).strip()
    if not NUMERO.fullmatch(texto):
        return None
    decimal = re.search(r"[.,](\d{1,2})$", texto)
    entero = re.sub(r"[ ,.]", "", texto[:-len(decimal.group(0))] if decimal else texto)
    numero = float(entero + ("." + decimal.group(1) if decimal else ""))
    return numero if 0 < numero <= MAX_SUELDO else None


def pretension(datos):
    campos = [(_campo(k), v) for k, v in (datos or {}).items()]
    for coincide in (CAMPO.fullmatch, PREGUNTA.search):
        for campo, valor in campos:
            if coincide(campo) and isinstance(valor, str):
                monto = leer_sueldo(valor)
                if monto is not None:
                    return monto
    return None
