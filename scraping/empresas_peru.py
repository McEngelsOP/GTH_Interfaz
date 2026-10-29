"""Categorización de empresas por escala (criterio de Andrea, 26/10/2026): diccionario de empresas del Perú.

Tier 1   corporativo o grande: bancos, mineras, retail, consumo masivo, telecomunicaciones, seguros, energía, Big Four,
         universidades e institutos grandes, clínicas y entidades públicas nacionales.
Tier 1.5 startup tecnológica o de escalamiento rápido.
Las demás quedan «Por determinar»: el CSV de Bumeran no trae tamaño ni número de colaboradores, y la matriz pide no
clasificar solo por el nombre. Por eso no se penaliza a nadie por trabajar en una empresa que no está en la lista: el
criterio solo suma a quien trabajó en una empresa reconocida.

Cada alias se busca como palabras completas en el nombre normalizado (sin tildes, en minúsculas). Desde el 29/10/2026
el diccionario vigente está en Supabase (gth_empresas_diccionario) y el equipo lo edita en la web; esta lista es la
carga inicial (cargar_diccionario.py) y el respaldo si la tabla no responde.
"""
import hashlib
import re
import time
import unicodedata

TIER_1 = {
    "Banca y finanzas": [
        "bcp", "banco de credito", "credicorp", "interbank", "intercorp", "bbva", "scotiabank", "banbif",
        "banco interamericano de finanzas", "banco pichincha", "banco falabella", "banco ripley", "mibanco",
        "banco de la nacion", "banco central de reserva", "bcrp", "citibank", "santander", "gnb", "alfin banco",
        "compartamos", "caja arequipa", "caja huancayo", "caja piura", "caja cusco", "caja trujillo",
        "caja municipal", "financiera oh", "financiera confianza", "financiera efectiva", "diners club", "visanet",
        "niubiz", "izipay", "procesos de medios de pago", "prima afp", "afp integra", "profuturo", "afp habitat",
        "credicorp capital", "kallpa securities", "bolsa de valores de lima", "cavali", "superintendencia de banca", ],
    "Seguros y salud": [
        "rimac", "pacifico seguros", "pacifico salud", "mapfre", "la positiva", "interseguro", "chubb", "qualitas",
        "sanitas", "auna", "oncosalud", "clinica internacional", "clinica ricardo palma", "clinica san pablo",
        "clinica delgado", "clinica anglo americana", "clinica javier prado", "clinica san felipe", "sanna",
        "clinica el golf", "clinica limatambo", "essalud", "minsa", "ministerio de salud", "inkafarma", "mifarma",
        "boticas y salud", "farmacias peruanas", "quimica suiza", "medifarma", "laboratorios portugal", "roche",
        "pfizer", "bayer", "abbott", "novartis", "sanofi", "astrazeneca", "johnson & johnson", "johnson and johnson",
    ],
    "Minería, energía e hidrocarburos": [
        "southern peru", "southern copper", "antamina", "cerro verde", "freeport", "buenaventura", "volcan",
        "las bambas", "minsur", "milpo", "nexa", "glencore", "anglo american", "quellaveco", "barrick",
        "newmont", "yanacocha", "hochschild", "shougang", "chinalco", "poderosa", "marcobre", "gold fields",
        "petroperu", "repsol", "pluspetrol", "primax", "pecsa", "petroleos del peru", "engie", "kallpa", "enel",
        "pluz", "luz del sur", "statkraft", "electroperu", "electroandes", "orazul", "cálidda", "calidda",
        "contugas", "isa rep", "red de energia del peru", "osinergmin",
    ],
    "Retail y consumo masivo": [
        "falabella", "saga falabella", "tottus", "sodimac", "ripley", "oechsle", "plaza vea",
        "supermercados peruanos", "inretail", "intercorp retail", "vivanda", "makro", "wong", "cencosud", "promart", "mall plaza", "real plaza", "jockey plaza", "parque arauco", "hiraoka",
        "topitop", "conecta retail", "curacao", "coolbox", "adidas", "nike", "zara", "inditex",
        "h&m", "falabella financiero", "alicorp", "backus", "ab inbev", "ambev", "aje", "gloria", "laive",
        "nestle", "procter & gamble", "procter and gamble", "p&g", "unilever", "kimberly-clark", "kimberly clark",
        "colgate", "arca continental", "lindley", "coca-cola", "coca cola", "pepsico", "san fernando", "redondos",
        "molitalia", "costeño", "costeno", "ajinomoto", "mondelez", "nestle peru", "belcorp", "yanbal",
        "natura", "avon", "loreal", "l'oreal", "cbc peruana", "corporacion lindley", "pacasmayo", "cementos lima",
        "unacem", "cementos pacasmayo", "aceros arequipa", "siderperu", "corporacion aceros arequipa", "tecnologica de alimentos", "danper", "camposol", "virú", "viru s.a", "agrokasa", "sociedad agricola drokasa",
        "kfc", "delosi", "starbucks", "mcdonald", "arcos dorados", "bembos", "pizza hut", "burger king",
        "papa john", "chilis", "ngr", "rokys", "pardos chicken", "norky", "oxxo", "repsol market", "hipermercados tottus", "tiendas peruanas", "tiendas por departamento ripley",
        "footloose", "continental standford", "continental stanford",
    ],
    "Telecomunicaciones y tecnología": [
        "telefonica", "movistar", "claro", "america movil", "entel", "bitel", "viettel", "optical networks",
        "ibm", "microsoft", "oracle", "sap", "google", "amazon", "aws", "hewlett packard", "hp inc", "dell",
        "cisco", "huawei", "samsung", "lg electronics", "everis", "ntt data", "accenture", "indra", "minsait",
        "tata consultancy", "globant", "stefanini", "canvia", "gmd", "intcomex", "deltron", "mercado libre",
        "mercadolibre", "gilat", "gilat networks", "gilat satellite",
    ],
    "Servicios, logística y construcción": [
        "pwc", "pricewaterhousecoopers", "ernst & young", "ernst and young", "deloitte", "kpmg", "grant thornton", "mckinsey", "boston consulting", "bcg", "korn ferry", "adecco", "manpower",
        "manpowergroup", "randstad", "michael page", "page group", "hays", "kelly services", "atento", "konecta",
        "teleperformance", "allus", "ransa", "dp world", "apm terminals", "neptunia",
        "tramarsa", "talma", "latam airlines", "sky airline", "jetsmart", "avianca", "lima airport partners", "olva", "shalom", "dhl", "fedex", "scharff", "cruz del sur", "oltursa", "civa", "aenza",
        "grana y montero", "graña y montero", "cosapi", "jjc", "odebrecht", "ferreyros", "ferreycorp", "unimaq",
        "komatsu", "mitsui", "toyota", "derco", "hyundai", "volvo", "scania", "caterpillar", "g4s",
        "prosegur", "liderman", "securitas", "sodexo", "compass group", "aramark", "cushman", "jll", "cbre",
        "edelnor", "sedapal", "sunat", "sunafil", "sunarp", "reniec", "indecopi", "ositran", "osiptel", "migraciones",
        "ministerio de economia", "ministerio de educacion", "minedu", "ministerio del interior",
        "ministerio de trabajo", "ministerio de la produccion", "ministerio de justicia", "presidencia del consejo de ministros", "contraloria", "poder judicial", "ministerio publico", "municipalidad metropolitana de lima", "gobierno regional", "proinversion", "promperu", "devida",
        "defensoria del pueblo", ],
    "Educación": [
        "pucp", "pontificia universidad catolica", "upc", "universidad peruana de ciencias aplicadas", "usil",
        "universidad san ignacio de loyola", "utp", "universidad tecnologica del peru", "universidad del pacifico",
        "universidad de lima", "ulima", "esan", "universidad esan", "cayetano heredia", "upch", "unmsm",
        "universidad nacional mayor de san marcos", "universidad nacional de ingenieria", "la molina",
        "universidad nacional agraria", "usmp", "universidad de san martin de porres", "ucv", "cesar vallejo",
        "upn", "universidad privada del norte", "ucsur", "cientifica del sur", "universidad continental",
        "upao", "antenor orrego", "udep", "universidad de piura", "ucsm", "catolica de santa maria", "urp",
        "ricardo palma", "uarm", "antonio ruiz de montoya", "universidad autonoma", "norbert wiener", "utec",
        "universidad de ingenieria y tecnologia", "centrum", "certus", "toulouse lautrec", "senati", "tecsup",
        "idat", "cibertec", "isil", "zegel", "sise", "ucal", "britanico", "icpna", "alianza francesa",
        "innova schools", "trilce", "pamer", "saco oliveros", "markham", "newton college", "san silvestre",
    ],
}

TIER_15 = {
    "Startups y tecnología de escalamiento rápido": [
        "rappi", "yape", "culqi", "kambista", "rextie", "crehana", "chazki", "fitco", "joinnus", "kushki",
        "tunki", "cabify", "uber", "didi", "indriver", "pedidosya", "glovo", "laboratoria", "platzi",
        "fintual", "tenpo", "apprecio", "keynua", "prestamype",
        "mesa 247", "nuvia", "bitinka", "buenbit", "mercado pago", "nubank", "tpaga", "truora", "nowports", "frubana", ],
}

# Siglas cortas que también son palabras comunes: solo cuentan si son el nombre completo de la empresa
# (con o sin «S.A.», «S.A.C.», «Perú»…), nunca dentro de otro nombre.
EXACTOS = {
    "Tier 1": ["ey", "bdo", "sbs", "smv", "onp", "onpe", "jne", "pcm", "mef", "tcs", "mmg", "kia", "lan", "uni",
               "maestro", "metro", "mass", "tambo", "efe", "estilos", "win", "wom", "tasa", "unique", "bain", "lap", "latam"],
    "Tier 1.5": ["plin", "agora", "ligo", "hapi"],
}

TIER_VALOR = {"Tier 1": 1.0, "Tier 1.5": 0.75}


def _normalizar(texto):
    sin_tildes = "".join(c for c in unicodedata.normalize("NFD", str(texto or "").lower()) if unicodedata.category(c) != "Mn")
    return " ".join(re.sub(r"[^a-z0-9&'\-. ]", " ", sin_tildes).split())


def _patron(aliases):
    return re.compile(r"(?<![a-z0-9])(?:" + "|".join(re.escape(_normalizar(a)) for a in sorted(set(aliases), key=len, reverse=True)) + r")(?![a-z0-9])")


_TIERS = [("Tier 1", sector, _patron(nombres)) for sector, nombres in TIER_1.items()] + \
         [("Tier 1.5", sector, _patron(nombres)) for sector, nombres in TIER_15.items()]
_EXACTOS = {tier: {_normalizar(s) for s in siglas} for tier, siglas in EXACTOS.items()}
_cargado_at = 0.0


def cargar(bd, cada=60):
    """Usa el diccionario de Supabase (gth_empresas_diccionario, editable en la web) en lugar del de este archivo, que
    queda como respaldo si la tabla no existe o está vacía. Se relee como mucho cada `cada` segundos."""
    global _TIERS, _EXACTOS, _cargado_at
    if bd.motor != "supabase" or time.time() - _cargado_at < cada:
        return
    try:
        filas = bd.consultar("SELECT alias, tier, sector, exacto FROM gth_empresas_diccionario")
    except Exception:
        return
    _cargado_at = time.time()
    if not filas:
        return
    grupos, exactos = {}, {"Tier 1": set(), "Tier 1.5": set()}
    for f in filas:
        if f["exacto"]:
            exactos[f["tier"]].add(_normalizar(f["alias"]))
        else:
            grupos.setdefault((f["tier"], f["sector"]), []).append(f["alias"])
    _TIERS = [(t, sector, _patron(nombres)) for (t, sector), nombres in sorted(grupos.items(), key=lambda g: (g[0][0] != "Tier 1", g[0][1]))]
    _EXACTOS = exactos


def huella(empresas):
    """Resumen de qué empresas del aviso son Tier 1 o 1.5: cambia solo si se agrega o quita una que trabajó alguno de
    sus postulantes (entra en la versión del ranking del aviso)."""
    marcadas = sorted({(_normalizar(e), t[0]) for e in empresas if (t := tier_de_empresa(e))})
    return hashlib.sha1(repr(marcadas).encode()).hexdigest()[:8]


SUFIJOS = re.compile(r"\b(?:s\.?a\.?c?\.?|s\.?r\.?l\.?|e\.?i\.?r\.?l\.?|sac|srl|eirl|peru|del peru|corp|group|grupo)\b\.?")


def tier_de_empresa(nombre):
    """(«Tier 1» | «Tier 1.5», sector) si la empresa está en el diccionario; None si no (por determinar)."""
    texto = _normalizar(nombre)
    if not texto:
        return None
    for tier, sector, patron in _TIERS:
        if patron.search(texto):
            return tier, sector
    base = " ".join(SUFIJOS.sub(" ", texto).split())
    for tier, siglas in _EXACTOS.items():
        if base in siglas:
            return tier, "Sigla reconocida"
    return None
