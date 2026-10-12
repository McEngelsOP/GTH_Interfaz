"""Navegación por el portal de empresas de Bumeran.

Selectores elegidos a partir de la estructura real del portal (11-10-2026):
  - Lista de avisos (React, clases aleatorias): se usan ids numéricos de fila, atributos name de
    los íconos y textos visibles, nunca las clases "sc-xxxx".
  - Lista de postulantes (Bootstrap/jQuery): clases estables (card-listadocv, card-trigger,
    pdfLink, exportar-adjunto, pagination__page-btn...).
  - Aviso público (/empleos/...-ID.html): #descripcion-aviso, #section-detalle.
Si Bumeran cambia su página, normalmente solo hay que ajustar este archivo.
"""
import logging
import re
import time

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC

from . import config
from .navegador import (EsperaDescarga, cerrar_pestanas_extra, clic, esperar,
                        mover, pausa, reintentar, volcar_debug)

log = logging.getLogger("scraper")

ESTADOS_CONOCIDOS = {"publicado", "finalizado", "pausado", "borrador", "pendiente", "vencido", "suspendido"}


class SesionError(Exception):
    pass


# =============================================================================== sesión
def _hay_captcha(driver) -> bool:
    return bool(driver.find_elements(By.CSS_SELECTOR,
                                     "iframe[src*='recaptcha'], iframe[src*='hcaptcha'], iframe[title*='captcha' i]"))


def _en_lista_avisos(driver) -> bool:
    return "/empresas/avisos" in driver.current_url and bool(driver.find_elements(By.ID, "estadoTipo"))


def _esperar_lista_avisos(driver, timeout):
    try:
        esperar(driver, lambda d: _en_lista_avisos(d), timeout)
        return True
    except TimeoutException:
        return False


def _escribir(campo, texto):
    campo.click()
    campo.send_keys(Keys.CONTROL, "a")
    campo.send_keys(Keys.DELETE)
    campo.send_keys(texto)


def _login_automatico(driver, usuario, clave):
    """Flujo de ingreso de Bumeran empresas:
    /empresas/ingreso -> #user y #password -> botón 'Ingresar' -> ESC para cerrar el aviso de
    'contraseña débil' -> lista de avisos."""
    from selenium.webdriver.common.action_chains import ActionChains
    driver.get(config.URL_INGRESO)
    campo_usuario = esperar(driver, EC.element_to_be_clickable((By.ID, "user")),
                            mensaje="No apareció el campo de usuario en la página de ingreso")
    _escribir(campo_usuario, usuario)
    _escribir(driver.find_element(By.ID, "password"), clave)
    botones = driver.find_elements(By.XPATH, "//button[normalize-space()='Ingresar'] | //*[@type='submit']")
    botones = [b for b in botones if b.is_displayed()]
    if botones:
        clic(driver, botones[0])
    else:
        driver.find_element(By.ID, "password").send_keys(Keys.ENTER)
    log.info("Credenciales enviadas; esperando a que cargue el portal...")
    # Cerrar el diálogo de "contraseña débil" (y cualquier otro modal) con ESC
    try:
        esperar(driver, lambda d: "/empresas/ingreso" not in d.current_url, 30)
    except TimeoutException:
        pass
    for _ in range(3):
        time.sleep(1.5)
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()


def _cerrar_dialogos(driver):
    from selenium.webdriver.common.action_chains import ActionChains
    for _ in range(2):
        try:
            ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        except Exception:
            pass
        time.sleep(0.8)


def asegurar_sesion(driver, reingresar=False):
    """Abre la lista de avisos; si no hay sesión, ingresa con las credenciales de scraping/.env.
    Con reingresar=True borra la sesión guardada y siempre ingresa con usuario y contraseña.
    Si no hay credenciales o aparece un captcha, espera a que la persona ingrese a mano en la ventana."""
    from .credenciales import obtener
    if reingresar:
        driver.get(config.URL_BASE)
        driver.delete_all_cookies()
        log.info("Ingresando a Bumeran con las credenciales...")
    else:
        driver.get(config.URL_AVISOS)
        if _esperar_lista_avisos(driver, 15):
            log.info("Sesión activa.")
            return
    creds = obtener()
    if not creds:
        log.warning("No hay credenciales: crea scraping/.env con BUMERAN_USUARIO y BUMERAN_CLAVE.")
    else:
        try:
            _login_automatico(driver, *creds)
        except Exception as e:
            log.warning("El ingreso automático falló: %s", e)
            volcar_debug(driver, "login")
        if _hay_captcha(driver):
            log.warning("Bumeran muestra un captcha: resuélvelo en la ventana de Chrome.")
        else:
            driver.get(config.URL_AVISOS)
            if _esperar_lista_avisos(driver, config.TIMEOUT_CARGA):
                _cerrar_dialogos(driver)
                log.info("Ingreso automático correcto.")
                return
    print("\n>>> Ingresa a Bumeran manualmente en la ventana de Chrome. "
          f"Espero hasta {config.TIMEOUT_LOGIN_MANUAL // 60} minutos...\n")
    if not _esperar_lista_avisos(driver, config.TIMEOUT_LOGIN_MANUAL):
        driver.get(config.URL_AVISOS)
        if not _esperar_lista_avisos(driver, config.TIMEOUT_CARGA):
            raise SesionError("No se pudo iniciar sesión en Bumeran.")
    log.info("Sesión iniciada.")


# =============================================================================== lista de avisos
JS_FILAS = r"""
const filas=[...document.querySelectorAll('div[id]')].filter(d=>/^\d{5,}$/.test(d.id)
            && d.querySelector('[name="icon-light-more-vertical"]'));
const t=e=>e?(e.innerText||e.textContent||'').trim():'';
return filas.map(d=>{
  const c=[...d.children];
  let btn=null;
  if(c[2]) btn=[...c[2].querySelectorAll('button')].find(b=>!b.querySelector('[name="icon-light-more-vertical"]'));
  const fecha=c[4]?(c[4].querySelector('span')||c[4]):null;
  return {aviso_id:d.id, titulo:t(btn), estado:t(c[3]), publicado_el:t(fecha), creado_por:t(c[5]),
          visitas:t(c[c.length-3]), recibidos:t(c[c.length-2]), no_leidos:t(c[c.length-1]), n_celdas:c.length};
});
"""

JS_SIGUIENTE_AVISOS = r"""
const cur=document.querySelector('nav button[aria-current="page"]');
if(!cur) return null;
const btns=[...cur.closest('nav').querySelectorAll(':scope > button')];
const next=btns[btns.length-1];
if(!next||next.disabled||next.getAttribute('aria-disabled')==='true') return null;
return next;
"""


def _fecha_iso(texto):
    m = re.match(r"(\d{2})-(\d{2})-(\d{4})", texto or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else texto


def _ids_filas(driver):
    return [f["aviso_id"] for f in driver.execute_script(JS_FILAS)]


def _esperar_cambio(driver, funcion_valor, antes, timeout=15):
    try:
        esperar(driver, lambda d: funcion_valor(d) != antes, timeout)
    except TimeoutException:
        pass
    time.sleep(1.0)


def _esperar_filas(driver):
    esperar(driver, lambda d: _en_lista_avisos(d), mensaje="No cargó la lista de avisos")
    try:
        esperar(driver, lambda d: len(_ids_filas(d)) > 0, 20)
    except TimeoutException:
        log.info("La lista de avisos está vacía (o tardó demasiado).")


def _aplicar_filtro_estado(driver, estado):
    # En el desplegable las opciones van en plural: "Todos", "Publicados", "Finalizados"...
    etiqueta = estado if estado.endswith("s") else estado + "s"
    try:
        actual = driver.find_elements(By.CSS_SELECTOR, "#estadoTipo .select__single-value")
        if actual and actual[0].text.strip().lower() == etiqueta.lower():
            return True
        antes = _ids_filas(driver)
        clic(driver, driver.find_element(By.CSS_SELECTOR, "#estadoTipo .select__control"))
        opcion = esperar(driver, EC.element_to_be_clickable(
            (By.XPATH, f"//*[contains(@class,'select__option') and normalize-space()='{etiqueta}']")), 10)
        clic(driver, opcion)
        _esperar_cambio(driver, _ids_filas, antes)
        return True
    except Exception as e:
        log.warning("No se pudo aplicar el filtro '%s' (se filtrará en código): %s", estado, e)
        return False


def _pagina_actual_avisos(driver):
    el = driver.find_elements(By.CSS_SELECTOR, "nav button[aria-current='page']")
    return el[0].text.strip() if el else None


def _siguiente_pagina_avisos(driver) -> bool:
    boton = driver.execute_script(JS_SIGUIENTE_AVISOS)
    if not boton:
        return False
    antes = _pagina_actual_avisos(driver)
    clic(driver, boton)
    _esperar_cambio(driver, _pagina_actual_avisos, antes)
    return True


def leer_avisos(driver, estado=config.ESTADO_OBJETIVO) -> list[dict]:
    """Lee todas las páginas de la lista de avisos y devuelve los que están en `estado`."""
    driver.get(config.URL_AVISOS)
    _esperar_filas(driver)
    _aplicar_filtro_estado(driver, estado)
    vistos = {}
    for _ in range(100):
        for f in driver.execute_script(JS_FILAS):
            f["publicado_el"] = _fecha_iso(f["publicado_el"])
            if f["estado"].lower() not in ESTADOS_CONOCIDOS:
                log.warning("Estado no reconocido en aviso %s: %r (¿cambió la tabla?)", f["aviso_id"], f["estado"])
            vistos[f["aviso_id"]] = f
        if not _siguiente_pagina_avisos(driver):
            break
    avisos = [a for a in vistos.values() if a["estado"].lower() == estado.lower()]
    log.info("Lista de avisos: %d leídos, %d en estado %s", len(vistos), len(avisos), estado)
    return avisos


def _ubicar_fila(driver, aviso):
    """Abre la lista, filtra y devuelve el elemento fila del aviso (busca por título y pagina)."""
    driver.get(config.URL_AVISOS)
    _esperar_filas(driver)
    _aplicar_filtro_estado(driver, config.ESTADO_OBJETIVO)
    try:
        caja = driver.find_element(By.ID, "titulo")
        antes = _ids_filas(driver)
        caja.clear()
        caja.send_keys((aviso.get("titulo") or "")[:60])
        caja.send_keys(Keys.ENTER)
        _esperar_cambio(driver, _ids_filas, antes, timeout=8)
    except Exception as e:
        log.debug("Búsqueda por título no disponible: %s", e)
    for _ in range(100):
        filas = driver.find_elements(By.CSS_SELECTOR, f"div[id='{aviso['aviso_id']}']")
        if filas:
            return filas[0]
        if not _siguiente_pagina_avisos(driver):
            break
    raise LookupError(f"No se encontró el aviso {aviso['aviso_id']} en la lista")


def _clic_opcion_menu(driver, fila, texto):
    boton = fila.find_element(By.XPATH, ".//button[.//*[@name='icon-light-more-vertical']]")
    clic(driver, boton)
    xpath = f".//span[normalize-space()='{texto}']"

    def _visible(d):
        for raiz in (fila, d):
            for e in raiz.find_elements(By.XPATH, xpath if raiz is fila else xpath[1:]):
                if e.is_displayed():
                    return e
        return False

    opcion = esperar(driver, _visible, 10, mensaje=f"No apareció la opción '{texto}'")
    clic(driver, opcion)


def exportar_csv(driver, aviso):
    """Exporta el CSV de postulaciones del aviso y lo deja en data/csv/<aviso>_<fecha>.csv"""
    principal = driver.current_window_handle
    fila = _ubicar_fila(driver, aviso)
    espera = EsperaDescarga()
    _clic_opcion_menu(driver, fila, "Exportar postulaciones (CSV)")
    try:
        ruta = espera.esperar(extension=".csv")
    finally:
        cerrar_pestanas_extra(driver, principal)
    destino = config.CSV_DIR / f"{aviso['aviso_id']}_{time.strftime('%Y%m%d_%H%M%S')}.csv"
    return mover(ruta, destino)


# =============================================================================== aviso público
JS_DETALLE = r"""
const t=s=>{const e=document.querySelector(s);return e?e.innerText.trim():null};
const desc=document.querySelector('#descripcion-aviso');
const items=[...document.querySelectorAll('#section-detalle ul[aria-label] li')]
             .map(li=>li.innerText.trim()).filter(Boolean);
const ubic=document.querySelector('#section-detalle a[href*="/en-"] h2');
return {url:location.href, titulo:t('#header-component h1'), empresa:t('#header-component h2'),
        ubicacion:ubic?ubic.innerText.trim():null, caracteristicas:items,
        descripcion_texto:(desc&&desc.innerText.trim())||t('#section-detalle'),
        descripcion_html:desc?desc.innerHTML:null,
        migas:[...document.querySelectorAll('nav[aria-label="Breadcrumb"] a')].map(a=>a.innerText.trim())};
"""


def obtener_detalle(driver, aviso, url_publica=None) -> dict:
    principal = driver.current_window_handle
    if url_publica:
        driver.get(url_publica)
    else:
        fila = _ubicar_fila(driver, aviso)
        antes = set(driver.window_handles)
        _clic_opcion_menu(driver, fila, "Ver aviso publicado")
        try:
            esperar(driver, lambda d: len(d.window_handles) > len(antes), 15)
            nueva = (set(driver.window_handles) - antes).pop()
            driver.switch_to.window(nueva)
        except TimeoutException:
            pass  # se abrió en la misma pestaña
    try:
        esperar(driver, EC.presence_of_element_located((By.CSS_SELECTOR, "#descripcion-aviso, #section-detalle")),
                mensaje="No cargó el aviso público")
        datos = driver.execute_script(JS_DETALLE)
    finally:
        cerrar_pestanas_extra(driver, principal)
    m = re.search(r"-(\d+)\.html", datos.get("url") or "")
    if m and m.group(1) != aviso["aviso_id"]:
        log.warning("La URL pública termina en %s pero el aviso es %s", m.group(1), aviso["aviso_id"])
    return datos


# =============================================================================== postulantes y CVs
JS_IDS_CARDS = "return [...document.querySelectorAll('div.card.card-listadocv')].map(c=>c.id)"

JS_PERFIL = r"""
const q=s=>document.querySelector(s);
const pdf=q('#cv a.pdfLink'); const href=pdf?pdf.getAttribute('href'):'';
const m=href.match(/idPostulacion=(\d+)&idCv=(\d+)/)||[];
const ic=q('#cv .icon-id_card'); let doc=null;
if(ic){// el texto es "DNI 12345678": se toma la última palabra que tenga dígitos, no la etiqueta
       const m=(ic.parentElement.innerText||'').match(/([A-Za-z0-9-]*\d[A-Za-z0-9-]*)\s*$/);
       doc=m?m[1]:null;}
const dv=q('#cv div.datosVer'); const em=q('#datosPersonalesEmail'); const nom=q('#datosPersonalesNombre');
const tel=s=>{const i=q('#cv '+s);return i&&i.parentElement?i.parentElement.innerText.replace(/\D/g,''):null};
// El botón real es <a class="exportar-adjunto" data-idcv="...">; el <li> del menú no trae el id.
const adj=q('.exportar-adjunto[data-idcv]');
return {href_pdf:href, id_postulacion:m[1]||null, id_cv:m[2]||((q('#idCv')||{}).value)||null,
        documento:doc, tipo_documento:ic?ic.getAttribute('title'):null, email:em?em.value:null,
        tiene_adjunto:dv?dv.getAttribute('data-adjunto')==='true':false,
        boton_adjunto:!!adj, nombre_completo:nom?nom.value:null,
        celular:(()=>{const w=q('#cv a.numero-whatsapp');   // el celular sale como WhatsApp o con ícono de móvil
                      const d=w?(w.innerText||'').replace(/\D/g,''):'';return d||tel('.icon-mobile');})(),
        otro_telefono:tel('.icon-call'), id_cv_adjunto:adj?adj.getAttribute('data-idcv'):null};
"""

# Lo mismo que hace el botón "Descarga adjunto": pide la URL temporal del archivo.
JS_URL_ADJUNTO = r"""
const cb=arguments[arguments.length-1];
fetch('/empresas/postulaciones/descargarCvAdjunto?idCv='+encodeURIComponent(arguments[0]),
      {credentials:'include', headers:{'X-Requested-With':'XMLHttpRequest'}})
  .then(r=>r.ok?r.json():Promise.reject('HTTP '+r.status))
  .then(j=>cb({url:j.cvFileName||null}))
  .catch(e=>cb({error:String(e)}));
"""


class SinArchivoError(Exception):
    """Bumeran marca que hay adjunto pero no devuelve archivo."""
    reintentable = False

JS_SIGUIENTE_POSTULANTES = r"""
const pag=document.querySelector('div.pagination');
if(!pag) return null;
const ch=pag.querySelector('span.icon-chevron-right');
let a=ch?ch.closest('a'):null;
if(!a){
  const act=pag.querySelector('a.pagination__page-btn.active');
  if(act) a=pag.querySelector('a.pagination__page-btn[id="'+(parseInt(act.id,10)+1)+'"]');
}
if(!a||a.classList.contains('disable')||a.classList.contains('disabled')) return null;
return a;
"""


def _primer_card(driver):
    ids = driver.execute_script(JS_IDS_CARDS)
    return ids[0] if ids else None


def _esperar_postulantes(driver):
    esperar(driver, EC.presence_of_element_located((By.ID, "content-postulaciones")),
            mensaje="No cargó la lista de postulantes")
    try:
        esperar(driver, lambda d: d.execute_script(JS_IDS_CARDS), 25)
    except TimeoutException:
        log.info("No se ven postulantes en la lista (¿aviso sin postulaciones o filtros?).")
    time.sleep(1.0)


def _id_aviso_en_pagina(driver):
    return driver.execute_script("const e=document.querySelector('input.idAviso');return e?e.value:null")


def abrir_postulantes(driver, bd, aviso):
    aviso_id = aviso["aviso_id"]
    guardado = bd.aviso(aviso_id)
    url = guardado["url_postulantes"] if guardado else None
    if url:
        driver.get(url)
        _esperar_postulantes(driver)
        if _id_aviso_en_pagina(driver) in (aviso_id, None, ""):
            return
        log.info("La URL guardada no corresponde al aviso; se entra desde la lista.")
    principal = driver.current_window_handle
    fila = _ubicar_fila(driver, aviso)
    boton = fila.find_element(By.XPATH, ".//button[.//span and not(.//*[@name='icon-light-more-vertical'])]")
    antes = set(driver.window_handles)
    clic(driver, boton)
    time.sleep(2)
    nuevas = set(driver.window_handles) - antes
    if nuevas:                                  # si abrió otra pestaña, se usa su URL en la principal
        driver.switch_to.window(nuevas.pop())
        url = driver.current_url
        cerrar_pestanas_extra(driver, principal)
        driver.get(url)
    esperar(driver, lambda d: "/empresas/avisos/listado" not in d.current_url, mensaje="No se abrió el aviso")
    _esperar_postulantes(driver)
    bd.marcar(aviso_id, url_postulantes=driver.current_url)
    log.info("Postulantes del aviso %s: %s", aviso_id, driver.current_url)


def _limpiar_filtros(driver):
    links = [e for e in driver.find_elements(By.CSS_SELECTOR, "#clean-filtros a") if e.is_displayed()]
    if links:
        antes = _primer_card(driver)
        clic(driver, links[0])
        _esperar_cambio(driver, _primer_card, antes)
        log.info("Filtros de la lista de postulantes eliminados.")
    for _ in range(2):  # toggles "cumplen requisitos" / "respondieron preguntas"
        marcados = [c for c in driver.find_elements(
            By.CSS_SELECTOR, "input.requisitos-cumple, input.preguntas-respondidas") if c.is_selected()]
        if not marcados:
            break
        antes = _primer_card(driver)
        driver.execute_script("arguments[0].click();", marcados[0])
        _esperar_cambio(driver, _primer_card, antes)


# Ventana "Algo no fue bien" de Bumeran (#Mod-warning): aparece cuando su servidor falla al cargar un
# perfil ("upstream connect error ... connection termination"). Es un error temporal de Bumeran.
JS_MODAL_ERROR = r"""
const m=document.getElementById('Mod-warning');
if(!m) return null;
const st=getComputedStyle(m);
if(st.display==='none' || st.visibility==='hidden') return null;
const texto=(m.innerText||'').trim().slice(0,200);
const b=[...m.querySelectorAll('button, a.btn, [data-dismiss="modal"]')].find(x=>/aceptar|cerrar|×/i.test(x.innerText||x.getAttribute('aria-label')||'×'));
if(b) b.click();
try{ if(window.jQuery) jQuery(m).modal('hide'); }catch(e){}
return texto||'(sin texto)';
"""


class ErrorBumeran(Exception):
    """Bumeran mostró su ventana de error; se reintenta."""


def cerrar_modal_error(driver) -> bool:
    """Cierra la ventana de error de Bumeran si está abierta. True si había una."""
    try:
        texto = driver.execute_script(JS_MODAL_ERROR)
    except Exception:
        return False
    if texto:
        log.warning("Bumeran mostró 'Algo no fue bien' (error temporal de su servidor); se cerró y se reintenta")
        time.sleep(1.5)
        return True
    return False


def _abrir_perfil(driver, card_id):
    cerrar_modal_error(driver)
    card = driver.find_element(By.CSS_SELECTOR, f"div.card.card-listadocv[id='{card_id}']")
    email_card = driver.execute_script(
        "const e=arguments[0].querySelector('input[id^=\"email\"]');return e?(e.value||'').trim().toLowerCase():''", card)
    href_antes = driver.execute_script("const a=document.querySelector('#cv a.pdfLink');return a?a.getAttribute('href'):''")
    clic(driver, card.find_element(By.CSS_SELECTOR, "a.card-trigger"))

    def _cargo(d):
        if cerrar_modal_error(d):
            raise ErrorBumeran(f"Bumeran falló al abrir el perfil de la tarjeta {card_id}")
        p = d.execute_script(JS_PERFIL)
        if not p["href_pdf"]:
            return False
        if email_card and p["email"]:
            return (p["email"] or "").strip().lower() == email_card and p
        return p["href_pdf"] != href_antes and p

    perfil = esperar(driver, _cargo, mensaje=f"No cargó el perfil de la tarjeta {card_id}")
    time.sleep(0.4)
    return driver.execute_script(JS_PERFIL) or perfil


def _extension(content_disposition, content_type):
    m = re.search(r"filename\*?=(?:UTF-8'')?\"?([^\";]+)", content_disposition or "", re.I)
    if m and "." in m.group(1):
        ext = "." + m.group(1).rsplit(".", 1)[1].strip().lower()
        if re.fullmatch(r"\.[a-z0-9]{2,5}", ext):
            return ext
    return {"application/msword": ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx"}.get(
        (content_type or "").split(";")[0].strip().lower(), ".pdf")


def _nombre_archivo(bd, aviso_id, card_id, perfil, carpeta, usar_csv=True):
    """El PDF se llama como el ID del postulante (alopez888 = inicial + primer apellido + 3 últimos
    dígitos del celular), armado con los datos de su perfil en Bumeran. Con usar_csv=True, si la persona
    ya está en el CSV importado se usa el ID que se le asignó ahí, para que PDF y fila coincidan siempre.
    Si el nombre ya lo usa otra persona del aviso, se le agrega un número (alopez8882)."""
    from .csv_bumeran import id_desde_perfil
    if usar_csv:
        fila = bd.buscar_postulacion(aviso_id, perfil.get("documento"), perfil.get("email"))
        if fila and fila.get("id_postulante"):
            return fila["id_postulante"]
    base = id_desde_perfil(perfil.get("nombre_completo"), perfil.get("celular"),
                           perfil.get("otro_telefono"), perfil.get("documento"))
    usados = {p.stem for p in carpeta.glob("*")} if carpeta.exists() else set()
    nombre, n = base, 1
    while nombre in usados:
        n += 1
        nombre = f"{base}{n}"
    return nombre


def _descargar_adjunto(driver, carpeta, nombre, perfil):
    """Pide a Bumeran la URL temporal del adjunto (como el botón 'Descarga adjunto') y la baja por HTTP.
    Lo guarda como <carpeta>/<nombre>.<ext>."""
    import urllib.request
    id_cv = perfil.get("id_cv_adjunto") or perfil.get("id_cv")
    if not id_cv:
        raise RuntimeError("El perfil no trae idCv")
    res = driver.execute_async_script(JS_URL_ADJUNTO, id_cv)
    if res.get("error"):
        raise RuntimeError(f"Bumeran no entregó la URL del adjunto: {res['error']}")
    url = res.get("url")
    if not url or url.endswith("file=null"):
        raise SinArchivoError("Bumeran no tiene el archivo adjunto")
    pedido = urllib.request.Request(url, headers={"User-Agent": driver.execute_script("return navigator.userAgent"),
                                                   "Referer": config.URL_BASE + "/"})
    with urllib.request.urlopen(pedido, timeout=config.TIMEOUT_DESCARGA) as resp:
        datos = resp.read()
        ext = _extension(resp.headers.get("content-disposition"), resp.headers.get("content-type"))
    if not datos:
        raise RuntimeError("El adjunto llegó vacío")
    destino = carpeta / f"{nombre}{ext}"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(datos)
    return destino


def _siguiente_pagina_postulantes(driver) -> bool:
    cerrar_modal_error(driver)
    enlace = driver.execute_script(JS_SIGUIENTE_POSTULANTES)
    if not enlace:
        return False
    antes = _primer_card(driver)
    clic(driver, enlace)
    _esperar_cambio(driver, _primer_card, antes, timeout=25)
    return _primer_card(driver) != antes


def descargar_cvs(driver, bd, aviso, max_nuevos=None, detener=None, usar_csv=True) -> dict:
    """Recorre todos los postulantes del aviso y descarga el CV adjunto de los que aún no se tienen."""
    aviso_id = aviso["aviso_id"]
    carpeta = config.carpeta_aviso(aviso_id, aviso.get("titulo"))
    abrir_postulantes(driver, bd, aviso)
    if config.LIMPIAR_FILTROS_POSTULANTES:
        _limpiar_filtros(driver)
    total_bumeran = driver.execute_script("const e=document.getElementById('cantResultadosCVs');return e?e.value:null")
    log.info("Aviso %s: %s postulantes según la lista", aviso_id, total_bumeran)

    est = {"descargados": 0, "sin_adjunto": 0, "errores": 0, "ya_tenia": 0}
    procesados = 0
    for pagina in range(1, 500):
        for card_id in driver.execute_script(JS_IDS_CARDS):
            if detener and detener():
                log.info("Detenido por el usuario.")
                return est
            if bd.cv_resuelto(aviso_id, card_id):
                est["ya_tenia"] += 1
                continue
            if max_nuevos is not None and procesados >= max_nuevos:
                log.info("Límite de %d postulantes alcanzado (--max-cvs).", max_nuevos)
                return est
            procesados += 1
            perfil = {}
            try:
                perfil = reintentar(_abrir_perfil, driver, card_id, nombre=f"perfil {card_id}", driver=driver)
                if perfil["tiene_adjunto"]:
                    nombre = _nombre_archivo(bd, aviso_id, card_id, perfil, carpeta, usar_csv)
                    try:
                        ruta = reintentar(_descargar_adjunto, driver, carpeta, nombre, perfil,
                                          nombre="descarga adjunto", driver=driver)
                    except SinArchivoError as e:
                        log.info("Postulante %s: %s", card_id, e)
                        bd.guardar_cv(aviso_id, card_id, **perfil, estado="sin_adjunto", error=str(e))
                        est["sin_adjunto"] += 1
                    else:
                        bd.guardar_cv(aviso_id, card_id, **perfil, archivo=str(ruta), estado="descargado")
                        est["descargados"] += 1
                else:
                    bd.guardar_cv(aviso_id, card_id, **perfil, estado="sin_adjunto")
                    est["sin_adjunto"] += 1
            except KeyboardInterrupt:
                raise
            except Exception as e:
                log.error("Postulante %s: %s", card_id, e)
                bd.guardar_cv(aviso_id, card_id, **{k: v for k, v in perfil.items() if k != "estado"},
                              estado="error", error=str(e)[:500])
                est["errores"] += 1
            pausa(config.PAUSA_CV)
        if not _siguiente_pagina_postulantes(driver):
            break
        log.info("Aviso %s: página %d de postulantes", aviso_id, pagina + 1)
    return est
