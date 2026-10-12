import { test, expect } from '@playwright/test';
import { avisoToJob } from '../../src/services/bumeranSync.ts';

const aviso = { aviso_id: 'demo-sync', titulo: 'Asistente de admisión', publicado_el: '2026-10-12', recibidos: 1,
  detalle_texto: 'Requisitos:\nExperiencia en atención al cliente\nFunciones:\nAtender consultas',
  detalle_json: { caracteristicas: ['Presencial', 'Atención al Cliente'] }, url_publica: null,
  ultimo_csv_at: '2026-10-12T10:00:00Z', ranking_at: '2026-10-12T10:01:00Z' };
const job = avisoToJob(aviso);

test('recupera una consulta fallida e incorpora candidatos y ranking sin duplicarlos', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // El cliente real consulta endpoints simulados; no se usan credenciales ni candidatos reales.
  await page.route('**/src/services/supabase.ts', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll('import.meta.env.VITE_SUPABASE_URL', JSON.stringify('https://gth-test.supabase.co'))
      .replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY', JSON.stringify('test-public-key'));
    await route.fulfill({ response, body });
  });
  await page.addInitScript(() => {
    localStorage.setItem('sb-gth-test-auth-token', JSON.stringify({ access_token: 'test-access-token', refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: '00000000-0000-0000-0000-000000000001', email: 'qa@example.test' } }));
  });
  let fail = true;
  await page.route('https://gth-test.supabase.co/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1);
    if (table === 'avisos' && fail) { await route.fulfill({ status: 403, json: { message: 'Test: permission denied' } }); return; }
    const rows = table === 'avisos' ? [aviso] : table === 'v_postulaciones' ? [{ id_postulante: 'ana001', datos_json: {
      Nombre: 'Ana', Apellido: 'Prueba', 'E-Mail': 'ana@example.test', 'Nro. Documento': '10000001', 'Exp[1] Puesto': 'Asistente' } }] : [{
      id_postulante: 'ana001', criterios_version: job.criteriaVersion, backend: 'e5', ranking: 1, score: .9,
      req_sims: [.9], req_fragmentos: ['Asistente'], explicacion: 'Experiencia relacionada', calculado_at: aviso.ranking_at }];
    await route.fulfill({ json: rows });
  });
  await page.goto('/#view=convocatorias');
  await expect(page.getByRole('alert')).toContainText('No se pudieron leer las convocatorias');
  fail = false;
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('heading', { name: aviso.titulo, exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Convocatoria activa' }).selectOption(job.id);
  await page.locator('aside').getByRole('button', { name: /Candidatos y ranking/ }).click();
  await expect(page.getByRole('button', { name: 'Ana Prueba', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Sincronización de Bumeran' })).toContainText('1 candidato incorporado · 1 con ranking');
  await page.getByRole('button', { name: 'Volver a cargar datos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Volver a cargar datos', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Ana Prueba', exact: true })).toHaveCount(1);
  await page.screenshot({ path: 'test-results/bumeran-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Volver a cargar datos', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/bumeran-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
