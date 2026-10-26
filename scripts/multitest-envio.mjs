// Registra preseleccionados en Multitest (apps.multitestresources.com) con Playwright y el Chrome instalado.
// Pasos tomados de la grabación (npm run multitest:grabar): ingresar → Proceso → <proceso> → Preparación → «+» → formulario
// → «Agregar», para todos los candidatos de cada proceso, y al final «Continuar» → «Enviar» una sola vez por proceso:
// con eso Multitest envía a cada candidato el correo con su prueba.
// La lanza el botón «Enviar Multitest» (Avance de candidatos) vía /api/multitest en localhost, o a mano:
//   node scripts/multitest-envio.mjs registros.json [resultados.json]
//   registros.json = { "registros": [ { id, proceso, dni, edad, genero, nombres, apellidos, correo } ] }
// Pruebas: MULTITEST_SOLO_LLENAR=1 llena el formulario sin presionar «Agregar»; MULTITEST_HEADLESS=1 sin ventana.
// Credenciales en .env.local (nunca en git): MULTITEST_USUARIO y MULTITEST_CLAVE.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const URL_LOGIN = 'https://apps.multitestresources.com/es/auth/login';
const SMART = /smartevaluation\.multitestresources\.com/;
const CARPETA = join('automatizacion', 'multitest');
const SESION = join(CARPETA, '.sesion.json');

function leerEnvLocal() {
  if (!existsSync('.env.local')) return;
  for (const linea of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*(MULTITEST_[A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const visible = (locator, timeout = 5000) => locator.waitFor({ state: 'visible', timeout }).then(() => true, () => false);

/** Espera a que Smart Evaluation cargue en esta pestaña o en una nueva; devuelve esa pestaña o null. */
async function esperarSmart(page, timeout) {
  const mismaPestana = page.waitForURL(SMART, { timeout }).then(() => page);
  const pestanaNueva = page.context().waitForEvent('page', { timeout })
    .then(async (nueva) => { await nueva.waitForURL(SMART, { timeout }); return nueva; });
  return Promise.any([mismaPestana, pestanaNueva]).catch(() => null);
}

/** En el lanzador «¿Qué vamos a usar hoy?» abre Smart Evaluation. Multitest cambió su lanzador (25/10): se prueba el
 *  enlace, el título, el logo y la tarjeta; si nada abre, guarda la página en lanzador.html para revisarla. */
async function abrirSmartEvaluation(page) {
  const enlace = await page.locator('a[href*="smartevaluation"]').first().getAttribute('href', { timeout: 2000 }).catch(() => null);
  const intentos = [
    enlace && (() => page.goto(new URL(enlace, page.url()).href)),
    () => page.getByText('Smart Evaluation', { exact: true }).first().click(),
    () => page.locator('img[alt*="smart" i], img[src*="smart" i]').first().click(),
    () => page.getByText('Smart Evaluation Descubre las').click(),
  ].filter(Boolean);
  for (const intento of intentos) {
    const destino = esperarSmart(page, 12000);
    if (await intento().then(() => true, () => false)) {
      const abierta = await destino;
      if (abierta) {
        if (abierta !== page) await page.close();
        await abierta.waitForLoadState('domcontentloaded').catch(() => {});
        return abierta;
      }
    }
  }
  writeFileSync(join(CARPETA, 'lanzador.html'), await page.content().catch(() => ''));
  throw new Error('Smart Evaluation no se abrió desde el lanzador de Multitest (ver automatizacion/multitest/lanzador.html)');
}

async function ingresar(page) {
  await page.goto(URL_LOGIN);
  const usuario = page.getByRole('textbox', { name: 'user@mail.com' });
  if (await visible(usuario)) {
    if (!process.env.MULTITEST_USUARIO || !process.env.MULTITEST_CLAVE) throw new Error('Faltan MULTITEST_USUARIO y MULTITEST_CLAVE en .env.local');
    await usuario.fill(process.env.MULTITEST_USUARIO);
    await page.getByRole('textbox', { name: 'Mi contraseña' }).fill(process.env.MULTITEST_CLAVE);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  }
  // Tras ingresar se elige el producto Smart Evaluation (otro dominio) y, en su pantalla de opciones, la empresa (logo).
  if (await visible(page.getByText('¿Qué vamos a usar hoy?'), 10000)) page = await abrirSmartEvaluation(page);
  if (page.url().includes('/login/opciones')) {
    await page.getByRole('img', { name: 'Logo' }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  return page;
}

async function abrirPreparacion(page, proceso) {
  await page.locator('#proceso').click();                        // menú lateral «Proceso»
  await page.getByRole('link', { name: proceso }).click();
  await page.waitForLoadState('networkidle').catch(() => {});      // sin esperar, la pestaña aún no responde
  await page.locator('#n_prep').click();                          // pestaña «Preparación»
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function llenarFormulario(page, r) {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('[id="_txtdni"]').waitFor({ state: 'visible' });
  if (r.dni) await page.locator('[id="_txtdni"]').fill(r.dni);
  if (r.edad) await page.locator('#edad').fill(r.edad);
  if (r.genero) await page.locator('#genero').selectOption(r.genero);
  await page.locator('#nombres').fill(r.nombres);
  await page.locator('#apellidos').fill(r.apellidos);
  await page.locator('#correo').fill(r.correo);
  await page.locator('#notificar').check();
}

/** «Agregar»: se da por registrado cuando el formulario se cierra; si sigue abierto, Multitest lo rechazó. */
async function agregar(page) {
  await page.getByRole('button', { name: 'Agregar' }).click();
  try { await page.locator('#nombres').waitFor({ state: 'hidden', timeout: 20000 }); }
  catch { throw new Error('Multitest no aceptó el registro (¿ya estaba agregado o falta un dato?)'); }
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** «Continuar» → «Enviar» una vez por proceso, con todos ya agregados: Multitest manda el correo con la prueba a los
 *  evaluados en «Ingresado» (pasan a «Enviado»). */
async function enviarProceso(page) {
  await page.waitForTimeout(3000);                                 // Multitest tarda en habilitar «Continuar»
  await page.locator('#btnEnviar').click();                        // «Continuar»
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('#_sendProcso').click();                      // «Enviar»
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);                                 // deja terminar el envío antes de cerrar la pestaña
}

const [archivo, salida] = process.argv.slice(2);
if (!archivo) { console.error('Uso: node scripts/multitest-envio.mjs registros.json [resultados.json]'); process.exit(1); }
const { registros } = JSON.parse(readFileSync(archivo, 'utf8'));
if (!Array.isArray(registros) || !registros.length) { console.error('No hay registros.'); process.exit(1); }
leerEnvLocal();
mkdirSync(CARPETA, { recursive: true });

const headless = process.env.MULTITEST_HEADLESS === '1';
const soloLlenar = process.env.MULTITEST_SOLO_LLENAR === '1';
const browser = await chromium.launch({ channel: 'chrome', headless });
const context = await browser.newContext(existsSync(SESION) ? { storageState: SESION } : {});
const resultados = [];
const primeraLinea = (e) => e.message.split('\n')[0];
const captura = (page, nombre) => page.screenshot({ path: join(CARPETA, `${nombre}.png`) }).catch(() => {});
// En grupo: por cada proceso se agrega primero a todos sus candidatos y al final se envía una sola vez
const porProceso = Map.groupBy(registros, (r) => r.proceso);
let n = 0, primera = true;
for (const [proceso, grupo] of porProceso) {
  let page = await context.newPage();
  const agregados = [];
  try {
    page = await ingresar(page);   // puede seguir en otra pestaña (Smart Evaluation)
    if (primera) { await context.storageState({ path: SESION }); primera = false; }   // las siguientes corridas entran sin login
    await abrirPreparacion(page, proceso);
  } catch (e) {
    console.error(`${proceso}: ERROR al abrir el proceso: ${primeraLinea(e)}`);
    await captura(page, `error_${proceso.replace(/\W+/g, '_')}`);
    for (const r of grupo) resultados.push({ id: r.id, ok: false, error: `No se pudo abrir el proceso: ${primeraLinea(e)}` });
    n += grupo.length;
    continue;
  }
  for (const r of grupo) {
    const etiqueta = `[${++n}/${registros.length}] ${r.nombres} ${r.apellidos} → ${proceso}`;
    try {
      await llenarFormulario(page, r);
      if (soloLlenar) { await captura(page, `formulario_${n}`); await page.reload(); await abrirPreparacion(page, proceso); }
      else await agregar(page);
      agregados.push(r);
      console.log(`${etiqueta}: ${soloLlenar ? 'formulario lleno (sin agregar)' : 'agregado'}`);
    } catch (e) {
      resultados.push({ id: r.id, ok: false, error: primeraLinea(e) });
      console.error(`${etiqueta}: ERROR ${primeraLinea(e)}`);
      await captura(page, `error_${n}`);
      await page.reload().then(() => abrirPreparacion(page, proceso)).catch(() => {});   // cierra el formulario rechazado
    }
  }
  if (!agregados.length) { await page.close(); continue; }
  try {
    if (!soloLlenar) await enviarProceso(page);
    for (const r of agregados) resultados.push({ id: r.id, ok: true });
    console.log(`${proceso}: ${soloLlenar ? 'sin enviar (prueba)' : `enviado a ${agregados.length}; Multitest manda los correos`}`);
    await page.close();
  } catch (e) {
    // Ya están agregados en Multitest pero sin enviar: GTH debe presionar «Continuar» → «Enviar» en ese proceso
    for (const r of agregados) resultados.push({ id: r.id, ok: false, error: `Agregado en Multitest pero no se pudo enviar: ${primeraLinea(e)}` });
    console.error(`${proceso}: ERROR al enviar: ${primeraLinea(e)}`);
    await captura(page, `error_envio_${proceso.replace(/\W+/g, '_')}`);
  }
}
if (salida) writeFileSync(salida, JSON.stringify({ resultados }));
const fallidos = resultados.filter((r) => !r.ok).length;
console.log(`Listo: ${resultados.length - fallidos} ${soloLlenar ? 'llenos' : 'agregados'}, ${fallidos} con error.`);
await browser.close();
process.exit(fallidos ? 1 : 0);
