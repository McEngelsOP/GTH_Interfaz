import { test, expect, type Page } from '@playwright/test';
import { avisoToJob } from '../../src/services/bumeranSync.ts';
import { INITIAL_APP_STATE } from '../../src/data/initialData.ts';
import { instalarSupabaseFicticio } from '../fixtures/supabaseMock.ts';
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
  const criteriosGuardados: Record<string, unknown>[] = [];
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
    if (table === 'gth_aviso_criterios') {
      if (route.request().method() === 'POST') { criteriosGuardados.push(route.request().postDataJSON()); return route.fulfill({ status: 201, json: [] }); }
      return route.fulfill({ json: null });
    }
    if (table === 'v_postulaciones') return route.fulfill({ json: [
      { id_postulante: 'ana', datos_json: { Nombre: 'Ana', Apellido: 'Prueba', 'E-Mail': 'ana@example.test', 'Sueldo pretendido': 'S/ 3,500',
        '¿Tienes portafolio? Adjunta el link': 'Mi portafolio: https://behance.net/ana-prueba' } },
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
  return { guardados, criteriosGuardados, lecturas: () => lecturasSueldo, rechazar: () => { fallar = true; }, sinMigracion: () => { sinMigracion = true; }, sinModo: () => { sinModo = true; } };
}
async function abrirSueldo(page: Page) {
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Sueldo', exact: true }).click();
  return page.getByRole('dialog', { name: 'Sueldo', exact: true });
}
const celdaAna = (page: Page) => page.getByRole('button', { name: 'Ver sueldo de Ana Prueba', exact: true });

test('sueldo pretendido en el ranking y oferta en «Sueldo»: verde, rojo y Estricto descarta', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const ctx = await preparar(page, 'superadmin', true);
  const dialog = await abrirSueldo(page);
  // Sin oferta, la columna muestra el monto que pidió el postulante, sin estado
  await expect(page.getByRole('columnheader', { name: 'Sueldo pretendido', exact: true })).toHaveCount(1);
  await expect(celdaAna(page)).toContainText('3,500');
  await expect(celdaAna(page).getByRole('img')).toHaveCount(0);
  const oferta = dialog.getByLabel('Sueldo ofertado mensual (S/)');
  await expect(oferta).toHaveValue('');
  await expect(dialog.getByLabel('Criterio salarial')).toHaveValue('estricto');
  await expect(dialog.getByText(/se descarta/)).toBeVisible();
  await oferta.fill('4000'); await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(celdaAna(page).getByRole('img', { name: 'Pretensión dentro del presupuesto' })).toBeVisible();
  await oferta.fill('3000'); await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(celdaAna(page).getByRole('img', { name: 'Pretensión superior al presupuesto' })).toBeVisible();
  // El recálculo corre en la laptop de GTH: sin su latido, el botón queda deshabilitado
  await expect(dialog.getByRole('button', { name: 'Recalcular puntaje' })).toBeDisabled();
  await expect(dialog.getByText(/Servidor apagado/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(ctx.guardados).toEqual([{ aviso_id: aviso.aviso_id, monto: 4000 }, { aviso_id: aviso.aviso_id, monto: 3000 }]);
  expect(errors).toEqual([]);
});

test('manejable se guarda en «Sueldo» y marca para negociar a quien tiene puntaje alto', async ({ page }) => {
  const ctx = await preparar(page, 'superadmin', false, true);
  const dialog = await abrirSueldo(page);
  await dialog.getByLabel('Sueldo ofertado mensual (S/)').fill('3000');
  await dialog.getByLabel('Criterio salarial').selectOption('manejable');
  await expect(dialog.getByText(/se marca para negociar/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(celdaAna(page).getByRole('img', { name: /Negociación pendiente/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver sueldo de Bruno Prueba', exact: true }).getByRole('img', { name: 'Pretensión superior al presupuesto' })).toBeVisible();
  expect(ctx.guardados).toEqual([{ aviso_id: aviso.aviso_id, monto: 3000 }, { aviso_id: aviso.aviso_id, modo_sueldo: 'manejable' }]);
  await page.keyboard.press('Escape');
  // El comparador conserva la comparación por postulante
  await page.getByRole('checkbox', { name: 'Seleccionar Ana Prueba', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Seleccionar Bruno Prueba', exact: true }).check();
  await page.getByRole('button', { name: 'Comparador', exact: true }).click();
  const card = page.getByRole('article', { name: 'Ficha de Ana Prueba', exact: true });
  await card.getByRole('button', { name: 'Ver sueldo de Ana Prueba' }).click();
  await expect(page.getByRole('dialog', { name: 'Sueldo', exact: true }).getByLabel('Postulante')).toContainText('Ana Prueba');
});

test('administrador consulta el sueldo sin editar y no recibe controles para crear o eliminar admins', async ({ page }) => {
  await preparar(page, 'maestro');
  const dialog = await abrirSueldo(page);
  await expect(dialog.getByLabel('Sueldo ofertado mensual (S/)')).toHaveValue('4000');
  await expect(dialog.getByLabel('Sueldo ofertado mensual (S/)')).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Guardar', exact: true })).toHaveCount(0);
  await page.goto('/#view=usuarios_permisos');
  await page.getByRole('button', { name: 'Nueva cuenta', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Nivel')).toHaveCount(1);
  await expect(page.getByRole('dialog').getByLabel('Nivel').locator('option')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0);
});

test('superadministradora crea admins, ve «Enviar credenciales al correo» y mantiene su cuenta protegida', async ({ page }) => {
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
  await expect(page.getByRole('button', { name: 'Enviar credenciales al correo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'Administrador de prueba' }).getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar cuenta', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Administrador de prueba' })).toHaveCount(0);
});

test('migración faltante: «Sueldo» avisa y no guarda; la columna sigue mostrando lo pretendido', async ({ page }) => {
  const ctx = await preparar(page, 'superadmin', true); ctx.sinMigracion();
  const dialog = await abrirSueldo(page);
  await expect(dialog.getByRole('alert')).toContainText('migración');
  await expect(dialog.getByRole('button', { name: 'Guardar', exact: true })).toBeDisabled();
  await expect(celdaAna(page)).toContainText('3,500');
});

test('«Criterios y pesos»: experiencia en 100, bonos en puntos del score, herramientas en % y la rotación como penalización', async ({ page }) => {
  const ctx = await preparar(page);
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Criterios y pesos', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Criterios y pesos', exact: true });
  await expect(dialog.getByRole('listitem')).toHaveCount(5);
  await expect(dialog.getByLabel('Control de intensidad de Experiencia laboral')).toHaveValue('100');
  // Score absoluto: rubro +0.025 y empresa +0.0125 por experiencia, en todos los avisos
  await expect(dialog.getByLabel('Bonificación por experiencia de Rubro o sector de experiencia')).toHaveValue('0.025');
  await expect(dialog.getByLabel('Bonificación por experiencia de Categorización de empresas por escala y complejidad')).toHaveValue((0.0125).toFixed(3));
  await expect(dialog.getByLabel('Peso de Análisis de sobrecalificación')).toHaveValue('50');   // 0-100, 50 = peso actual
  await expect(dialog.getByLabel('Control de intensidad de Rubro o sector de experiencia')).toHaveValue('50');   // barra junto al número
  await expect(dialog.getByLabel('Penalización por Alta rotación laboral')).toHaveValue('0.5');
  await expect(dialog.getByLabel('Criterio salarial')).toHaveCount(0);   // el sueldo vive en «Sueldo»
  await dialog.getByLabel('Bonificación por experiencia de Rubro o sector de experiencia').fill('0.04');   // = intensidad 80
  await expect(dialog.getByRole('button', { name: 'Recalcular puntaje' })).toBeDisabled();   // primero guardar
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect.poll(() => ctx.criteriosGuardados.length).toBe(1);
  expect(ctx.criteriosGuardados[0]).toMatchObject({ aviso_id: aviso.aviso_id, rubro: 80, experiencia: 100, rotacion: 0.5 });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('«Preguntas» del perfil muestra las preguntas del aviso y sus enlaces', async ({ page }) => {
  await preparar(page);
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Ana Prueba', exact: true }).click();
  await page.getByRole('tab', { name: 'Preguntas', exact: true }).click();
  await expect(page.getByText('¿Tienes portafolio? Adjunta el link', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'https://behance.net/ana-prueba' })).toHaveAttribute('href', 'https://behance.net/ana-prueba');
});
