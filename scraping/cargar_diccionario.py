"""Carga en Supabase (gth_empresas_diccionario) el diccionario de empresas de empresas_peru.py, una sola vez.

No toca las empresas que el equipo agregó ni vuelve a poner las que quitó después de la primera carga: solo inserta
las del código si la tabla todavía no tiene ninguna de origen «base». Uso: python -m scraping.cargar_diccionario
"""
from .db import BD
from .empresas_peru import EXACTOS, TIER_1, TIER_15, _normalizar


def filas_base():
    filas = {}
    for tier, grupos in (("Tier 1", TIER_1), ("Tier 1.5", TIER_15)):
        for sector, nombres in grupos.items():
            for n in nombres:
                filas.setdefault(_normalizar(n), (tier, sector, False))
    for tier, siglas in EXACTOS.items():
        for s in siglas:
            filas.setdefault(_normalizar(s), (tier, "Sigla reconocida", True))
    return filas


def main():
    cx = BD().cx
    if cx.execute("select count(*) n from public.gth_empresas_diccionario where origen = 'base'").fetchone()["n"]:
        print("El diccionario base ya estaba cargado: no se cambia nada.")
        return
    filas = filas_base()
    with cx.cursor() as cur:
        # La carga inicial no marca avisos para recalcular: el ranking ya usa este mismo diccionario.
        cur.execute("alter table public.gth_empresas_diccionario disable trigger diccionario_recalculo")
        cur.executemany("insert into public.gth_empresas_diccionario (alias, tier, sector, exacto, origen) "
                        "values (%s, %s, %s, %s, 'base') on conflict (alias) do nothing",
                        [(a, t, s, e) for a, (t, s, e) in filas.items()])
        cur.execute("alter table public.gth_empresas_diccionario enable trigger diccionario_recalculo")
    cx.commit()
    print(f"Diccionario cargado: {len(filas)} nombres.")


if __name__ == "__main__":
    main()
