import { test, expect, type Page } from '@playwright/test';
import { avisoToJob } from '../../src/services/bumeranSync.ts';
import { INITIAL_APP_STATE } from '../../src/data/initialData.ts';
import { instalarSupabaseFicticio } from '../fixtures/supabaseMock.ts';
import { mkdir } from 'node:fs/promises';
const yoId = '00000000-0000-0000-0000-000000000001';
const adminId = '00000000-0000-0000-0000-000000000002';
const aviso = { aviso_id: 'salarios-prueba', titulo: 'Analista de prueba', publicado_el: '2026-10-01', recibidos: 1,
  detalle_texto: 'Requisitos:\nExperiencia en análisis', detalle_json: {}, url_publica: null,
  ultimo_csv_at: '2026-10-22T10:00:00Z', ranking_at: '2026-10-22T10:01:00Z' };
const job = avisoToJob(aviso);
async function preparar(page: Page, nivel = 'superadmin', sinOferta = false, multiples = false) {
  const state = structuredClone(INITIAL_APP_STATE);
  // El dato local viejo nunca debe imponerse sobre la oferta compartida.
  state.jobPostings = [{ ...job, offeredSalary: 99999 }]; state.activeJobPostingId = job.id;
  await instalarSupabaseFicticio(page, state);
  const perfiles = [
    { user_id: yoId, email: 'andrea@example.test', nombre: 'Andrea (prueba)', nivel, activo: true, debe_cambiar_clave: false, secciones: null, avisos: null },
    { user_id: adminId, email: 'admin@example.test', nombre: 'Administrador de prueba', nivel: 'maestro', activo: true, debe_cambiar_clave: false, secciones: null, avisos: null },
  ];
  let oferta: number | null = sinOferta ? null : 4000;
  let modo = 'estricto';
  let sinModo = false;
  let lecturasSueldo = 0;
  let fallar = false;
  let sinMigracion = false;
  const guardados: Record<string, unknown>[] = [];
  await page.route('https://gth-test.supabase.co/rest/v1/**', async route => {
    const url = new URL(route.request().url()); const table = url.pathname.split('/').at(-1);
    if (table === 'gth_perfiles') return route.fulfill({ json: url.searchParams.has('user_id') ? perfiles[0] : perfiles });
    if (table === 'avisos') return route.fulfill({ json: [aviso] });
    if (table === 'gth_sueldos_ofertados') {
      if (sinMigracion) return route.fulfill({ status: 404, json: { message: 'Migración ausente' } });
      if (sinModo && url.searchParams.get('select')?.includes('modo_sueldo')) return route.fulfill({ status: 400, json: { code: '42703', message: 'column modo_sueldo does not exist' } });
      if (route.request().method() === 'POST') {
        if (fallar) return route.fulfill({ status: 403, json: { message: 'Permiso revocado' } });
        const body = route.request().postDataJSON(); guardados.push(body);
        if ('monto' in body) oferta = body.monto;
        if ('modo_sueldo' in body) modo = body.modo_sueldo;
      } else lecturasSueldo++;
      return route.fulfill({ json: oferta === null && !guardados.length ? null : { monto: oferta, modo_sueldo: modo } });
    }
    if (table === 'v_postulaciones') return route.fulfill({ json: [
      { id_postulante: 'ana', datos_json: { Nombre: 'Ana', Apellido: 'Prueba', 'E-Mail': 'ana@example.test', 'Sueldo pretendido': 'S/ 3,500' } },
      ...(multiples ? [{ id_postulante: 'bruno', datos_json: { Nombre: 'Bruno', Apellido: 'Prueba', 'E-Mail': 'bruno@example.test', 'Sueldo pretendido': 'S/ 5,000' } }] : []),
    ] });
    if (table === 'ranking_embeddings') return route.fulfill({ json: [
      { id_postulante: 'ana', criterios_version: job.criteriaVersion, backend: 'e5', ranking: 1, score: .9, req_sims: [.9], req_fragmentos: ['Analista'], explicacion: 'Prueba', calculado_at: aviso.ranking_at },
      ...(multiples ? [{ id_postulante: 'bruno', criterios_version: job.criteriaVersion, backend: 'e5', ranking: 2, score: .6, req_sims: [.6], req_fragmentos: ['Analista'], explicacion: 'Prueba', calculado_at: aviso.ranking_at }] : []),
    ] });
    return route.fulfill({ json: [] });
  });
  await page.route('**/api/usuarios', async route => {
    const body = route.request().postDataJSON();
    if (body.accion === 'eliminar') { perfiles.splice(1,1); return route.fulfill({ json: { ok: true } }); }
    if (body.accion === 'crear') return route.fulfill({ json: { email: body.email, clave: 'Clave-2345-Temporal' } });
    return route.fulfill({ json: { usuarios: [] } });
  });
  return { guardados, lecturas: () => lecturasSueldo, rechazar: () => { fallar = true; }, sinMigracion: () => { sinMigracion = true; }, sinModo: () => { sinModo = true; } };
}
async function abrir(page: Page) {
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Ver sueldo de Ana Prueba', exact: true }).click();
  return page.getByRole('region', { name: 'Comparación salarial', exact: true });
}
test('oferta compartida, igualdad verde, superior rojo, fallo y recarga; escritorio y móvil', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const ctx = await preparar(page);
  let panel = await abrir(page);
  await expect(panel.getByText('Dentro del presupuesto', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver sueldo de Ana Prueba' }).getByRole('img', { name: 'Pretensión dentro del presupuesto' })).toBeVisible();
  const input = panel.getByLabel('Oferta mensual del aviso (S/)');
  await expect(input).toHaveValue('4000');
  await input.fill('3500'); await panel.getByRole('button', { name: 'Guardar oferta' }).click();
  await expect(panel.getByText('Oferta guardada para este aviso.', { exact: true })).toBeVisible();
  await expect(panel.getByText('Dentro del presupuesto', { exact: true })).toBeVisible();
  await input.fill('3000'); await panel.getByRole('button', { name: 'Guardar oferta' }).click();
  await expect(panel.getByText('Supera el presupuesto', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver sueldo de Ana Prueba' }).getByRole('img', { name: 'Pretensión superior al presupuesto' })).toBeVisible();
  await panel.screenshot({ path: 'test-results/sueldo-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 }); await panel.scrollIntoViewIfNeeded();
  expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await panel.screenshot({ path: 'test-results/sueldo-mobile.png' });
  ctx.rechazar(); await input.fill('5000'); await panel.getByRole('button', { name: 'Guardar oferta' }).click();
  await expect(panel.getByRole('alert')).toContainText('No se guardó');
  await expect(panel.getByText('Supera el presupuesto', { exact: true })).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'Ver sueldo de Ana Prueba', exact: true }).click();
  panel = page.getByRole('region', { name: 'Comparación salarial', exact: true });
  await expect(panel.getByLabel('Oferta mensual del aviso (S/)')).toHaveValue('3000');
  expect(ctx.guardados).toEqual([{ aviso_id: aviso.aviso_id, monto: 3500 }, { aviso_id: aviso.aviso_id, monto: 3000 }]);
  expect(errors).toEqual([]);
});
test('administrador consulta sin editar y no recibe controles para crear o eliminar admins', async ({ page }) => {
  await preparar(page, 'maestro');
  const panel = await abrir(page);
  await expect(panel.getByText('Dentro del presupuesto', { exact: true })).toBeVisible();
  await expect(panel.locator('input')).toHaveCount(0);
  await page.goto('/#view=usuarios_permisos');
  await page.getByRole('button', { name: 'Nueva cuenta', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Nivel')).toHaveCount(1);
  await expect(page.getByRole('dialog').getByLabel('Nivel').locator('option')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0);
});
test('superadministradora crea admins, elimina con confirmación y mantiene su cuenta protegida', async ({ page }) => {
  await preparar(page);
  await page.goto('/#view=usuarios_permisos');
  await expect(page.getByText('Superadministradora', { exact: true })).toBeVisible();
  const yo = page.getByRole('row').filter({ hasText: 'Andrea (prueba)' });
  await expect(yo.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nueva cuenta', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nivel').selectOption('maestro');
  await dialog.getByRole('textbox', { name: /Correo/ }).fill('nuevo@example.test');
  await dialog.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByText('Clave-2345-Temporal', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'Administrador de prueba' }).getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar cuenta', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Administrador de prueba' })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/superadmin-desktop.png' });
});
test('oferta ausente o migración faltante no usa los importes antiguos del navegador', async ({ page }) => {
  const ctx = await preparar(page, 'superadmin', true);
  let panel = await abrir(page);
  await expect(panel.getByText('Sin comparar', { exact: true })).toBeVisible();
  await expect(panel.getByLabel('Oferta mensual del aviso (S/)')).toHaveValue('');
  ctx.sinMigracion(); await page.reload(); await page.getByRole('button', { name: 'Ver sueldo de Ana Prueba', exact: true }).click();
  panel = page.getByRole('region', { name: 'Comparación salarial', exact: true });
  await expect(panel.getByRole('alert')).toContainText('migración');
  await expect(panel.getByText('Sin comparar', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Guardar oferta' })).toHaveCount(0);
});

test('criterio estricto por defecto, manejable solo tras guardar, indicadores y detalle fuera del perfil', async ({ page }) => {
  const ctx = await preparar(page, 'superadmin', false, true);
  const panel = await abrir(page);
  await panel.getByLabel('Oferta mensual del aviso (S/)').fill('3000');
  await panel.getByRole('button', { name: 'Guardar oferta' }).click();
  await expect(panel.getByText('Supera el presupuesto', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar modal', exact: true }).click();
  const sueldoAna = page.getByRole('button', { name: 'Ver sueldo de Ana Prueba', exact: true });
  await expect(page.getByRole('columnheader', { name: 'Sueldo', exact: true })).toHaveCount(1);
  const filaAna = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Ana Prueba', exact: true }) });
  await expect(filaAna.getByRole('cell')).toHaveCount(9);
  await expect(filaAna.getByRole('cell').nth(2).getByRole('button', { name: 'Ver sueldo de Ana Prueba' })).toHaveCount(0);
  await expect(filaAna.getByRole('cell').nth(6).getByRole('button', { name: 'Ver sueldo de Ana Prueba' })).toHaveCount(1);
  await expect(sueldoAna).toHaveText('');
  await expect(sueldoAna.getByRole('img', { name: 'Pretensión superior al presupuesto', exact: true })).toBeVisible();
  const lecturasAntes = ctx.lecturas();
  await page.getByRole('button', { name: 'Criterios y pesos', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Criterios y pesos', exact: true });
  await expect(dialog.getByRole('list', { name: 'Criterios de clasificación' }).getByRole('listitem')).toHaveText([
    'Experiencia laboral', 'Alta rotación laboral', 'Rubro o sector de experiencia',
    'Análisis de sobrecalificación', 'Categorización de empresas por escala y complejidad',
  ]);
  await expect(dialog.getByText('Pesos de los requisitos', { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Ver pesos', exact: true })).toHaveCount(0);
  await expect(dialog.locator('#modo-sueldo-ayuda')).toHaveCount(0);
  await expect(dialog.getByLabel('Indicadores salariales')).toHaveCount(0);
  await expect(dialog.getByLabel('Sueldo', { exact: true })).toHaveValue('estricto');
  await dialog.getByLabel('Sueldo', { exact: true }).selectOption('manejable');
  await expect(sueldoAna.getByRole('img', { name: 'Pretensión superior al presupuesto', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Guardar criterio', exact: true }).click();
  await expect(dialog.getByText('Criterio guardado para este aviso.', { exact: true })).toBeVisible();
  await expect(sueldoAna.getByRole('img', { name: /Negociación pendiente/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver sueldo de Bruno Prueba', exact: true }).getByRole('img', { name: 'Pretensión superior al presupuesto' })).toBeVisible();
  expect(ctx.guardados).toEqual([{ aviso_id: aviso.aviso_id, monto: 3000 }, { aviso_id: aviso.aviso_id, modo_sueldo: 'manejable' }]);
  // Una lectura por aviso, no una por fila o por indicador.
  expect(ctx.lecturas()).toBe(lecturasAntes);
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Ana Prueba', exact: true }).click();
  await expect(page.getByRole('tab', { name: /Sueldo/ })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Perfil', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(sueldoAna.getByRole('img', { name: /Negociación pendiente/ })).toBeVisible();
  await sueldoAna.click();
  await expect(page.getByRole('dialog', { name: 'Sueldo', exact: true }).getByLabel('Oferta mensual del aviso (S/)')).toHaveValue('3000');
  await page.keyboard.press('Escape');

  await mkdir('.impeccable/review', { recursive: true });
  // Primera inspección conjunta de los controles y estados, con los dos tamaños y temas.
  for (const [width, theme] of [[1440, 'light'], [390, 'dark']] as const) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    await expect(sueldoAna.getByRole('img', { name: /Negociación pendiente/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/review/ranking-${width}.png`, fullPage: true, animations: 'disabled' });
    if (width === 390) {
      await sueldoAna.scrollIntoViewIfNeeded();
      await page.screenshot({ path: '.impeccable/review/ranking-candidato-mobile.png', animations: 'disabled' });
    }
    await page.getByRole('button', { name: 'Criterios y pesos', exact: true }).click();
    await expect(dialog.getByLabel('Sueldo', { exact: true })).toHaveValue('manejable');
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/review/criterios-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await sueldoAna.click();
    await expect(page.getByRole('dialog', { name: 'Sueldo', exact: true }).getByText('Manejable · revisar', { exact: true })).toBeVisible();
    await page.screenshot({ path: `.impeccable/review/sueldo-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('checkbox', { name: 'Seleccionar Ana Prueba', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Seleccionar Bruno Prueba', exact: true }).check();
  await page.getByRole('button', { name: 'Comparador', exact: true }).click();
  const card = page.getByRole('article', { name: 'Ficha de Ana Prueba', exact: true });
  await expect(card.getByRole('button', { name: 'Ver sueldo de Ana Prueba' })).toContainText('Manejable');
  await page.screenshot({ path: '.impeccable/review/comparador-desktop.png', animations: 'disabled', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.impeccable/review/comparador-mobile.png', animations: 'disabled' });
  await card.getByRole('button', { name: 'Ver sueldo de Ana Prueba' }).click();
  await expect(page.getByRole('dialog', { name: 'Sueldo', exact: true }).getByLabel('Postulante')).toContainText('Ana Prueba');
});

test('migración de modo ausente conserva la comparación estricta y explica cómo habilitar el selector', async ({ page }) => {
  const ctx = await preparar(page); ctx.sinModo();
  await page.goto('/#view=mejores_candidatos');
  await expect(page.getByRole('button', { name: 'Ver sueldo de Ana Prueba' }).getByRole('img', { name: 'Pretensión dentro del presupuesto' })).toBeVisible();
  await page.getByRole('button', { name: 'Criterios y pesos', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Sueldo', { exact: true })).toHaveValue('estricto');
  await expect(dialog.getByLabel('Sueldo', { exact: true })).toBeDisabled();
  await expect(dialog.getByRole('alert')).toContainText('Falta aplicar la migración');
  await expect(dialog.getByRole('button', { name: 'Guardar criterio' })).toBeDisabled();
});

test('fallo al guardar el modo conserva estricto y el administrador solo consulta', async ({ page }) => {
  const ctx = await preparar(page);
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Criterios y pesos', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Sueldo', { exact: true })).toBeEnabled();
  await dialog.getByLabel('Sueldo', { exact: true }).selectOption('manejable'); ctx.rechazar();
  await dialog.getByRole('button', { name: 'Guardar criterio', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('No se guardó el criterio');
  await page.reload();
  await page.getByRole('button', { name: 'Criterios y pesos', exact: true }).click();
  await expect(dialog.getByLabel('Sueldo', { exact: true })).toHaveValue('estricto');
});
