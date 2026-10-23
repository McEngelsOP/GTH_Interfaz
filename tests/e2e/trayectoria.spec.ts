import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { avisoToJob } from '../../src/services/bumeranSync.ts';
import { INITIAL_APP_STATE } from '../../src/data/initialData.ts';
import { instalarSupabaseFicticio } from '../fixtures/supabaseMock.ts';

const detalle = JSON.parse(execFileSync('python', ['-c', 'import json; from scraping.test_trayectoria import patron, HOY; from scraping.trayectoria import analizar; print(json.dumps(analizar(patron(),HOY)))'], { encoding: 'utf8' }));
const aviso = { aviso_id: 'trayectoria-demo', titulo: 'Analista de prueba', publicado_el: '2026-10-01', recibidos: 2,
  detalle_texto: 'Requisitos:\nExperiencia en análisis\nFunciones:\nAnalizar información', detalle_json: {}, url_publica: null,
  ultimo_csv_at: '2026-10-22T10:00:00Z', ranking_at: '2026-10-22T10:01:00Z' };
const job = avisoToJob(aviso);

async function preparar(page: Page, unavailable = false) {
  const state = structuredClone(INITIAL_APP_STATE);
  state.jobPostings = [job]; state.activeJobPostingId = job.id;
  await instalarSupabaseFicticio(page, state);
  let summaryCalls = 0;
  const reviews: Record<string, unknown>[] = [];
  let status = 'patron_detectado';
  await page.route('https://gth-test.supabase.co/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1);
    if (table === 'gth_perfiles') return route.fulfill({ json: { user_id: '00000000-0000-0000-0000-000000000001', email: 'qa@example.test', nombre: 'QA', nivel: 'maestro', activo: true, debe_cambiar_clave: false, secciones: null, avisos: null } });
    if (table === 'gth_trayectoria_resumen') {
      summaryCalls++;
      if (unavailable) return route.fulfill({ status: 404, json: { code: 'PGRST202', message: 'Missing test function' } });
      return route.fulfill({ json: [{ id_postulante: 'ana', analisis_id: 'analysis-a', estado: status, calculado_at: '2026-10-22T10:00:00Z', revision: reviews.length ? 'justificado' : null },
        { id_postulante: 'bruno', analisis_id: null, estado: 'pendiente', calculado_at: null, revision: null }] });
    }
    if (table === 'gth_trayectoria_analisis') return route.fulfill({ json: { id: 'analysis-a', detalle } });
    if (table === 'gth_trayectoria_revisiones') {
      if (route.request().method() === 'POST') { reviews.push(route.request().postDataJSON()); return route.fulfill({ status: 201, json: [] }); }
      return route.fulfill({ json: reviews.map((r,i) => ({ ...r,id: `review-${i}`,creada_at: '2026-10-22T10:00:00Z' })) });
    }
    if (table === 'avisos') return route.fulfill({ json: [aviso] });
    if (table === 'v_postulaciones') return route.fulfill({ json: ['ana','bruno'].map((id, i) => ({ id_postulante: id, datos_json: {
      Nombre: i ? 'Bruno' : 'Ana', Apellido: 'Prueba', 'E-Mail': `${id}@example.test`, 'Exp[1] Puesto': 'Analista', 'Exp[1] Empresa': 'Empresa ficticia' } })) });
    if (table === 'ranking_embeddings') return route.fulfill({ json: ['ana','bruno'].map((id, i) => ({ id_postulante: id, criterios_version: job.criteriaVersion, backend: 'e5', ranking: i + 1, score: .9 - i * .1,
      req_sims: [.9], req_fragmentos: ['Analista'], explicacion: 'Evidencia de prueba', calculado_at: aviso.ranking_at })) });
    return route.fulfill({ json: [] });
  });
  return { reviews, summaryCalls: () => summaryCalls, stale: () => { status = 'desactualizado'; } };
}

test('aviso, evidencia y revisión conservan ranking; escritorio y móvil', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  let aiCalls = 0; page.on('request', (r) => { if (/\/api\/(evaluate|chat)/.test(r.url())) aiCalls++; });
  const ctx = await preparar(page);
  await page.goto('/#view=mejores_candidatos');
  const alert = page.getByRole('button', { name: 'Revisar trayectoria de Ana Prueba' });
  await expect(alert).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revisar trayectoria de Bruno Prueba' })).toHaveCount(0);
  const names = await page.locator('.candidate-ranking-table tbody tr').allTextContents();
  expect(names[0]).toContain('Ana'); expect(names[1]).toContain('Bruno');
  const summaryBefore = ctx.summaryCalls();
  await alert.click();
  const panel = page.getByRole('region', { name: 'Trayectoria laboral' });
  await expect(panel.getByText(/Ventana detectada/)).toBeVisible();
  expect(ctx.summaryCalls()).toBe(summaryBefore);
  await panel.getByText('Exp[1] · Analista · Empresa A', { exact: true }).click();
  await expect(panel.getByText('2026-01-01 — 2026-01-31', { exact: true })).toBeVisible();
  await panel.getByLabel('Motivo y evidencia revisada').fill('Contrato revisado con evidencia documental');
  await panel.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect.poll(() => ctx.reviews.length).toBe(1);
  expect(ctx.reviews[0]).toEqual({ analisis_id: 'analysis-a', estado: 'justificado', texto: 'Contrato revisado con evidencia documental' });
  await expect(panel.getByText(/Revisión registrada: Cambios justificados/)).toBeVisible();
  await panel.screenshot({ path: 'test-results/trayectoria-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.getByLabel('Motivo y evidencia revisada').scrollIntoViewIfNeeded();
  await expect(panel.getByLabel('Motivo y evidencia revisada')).toBeVisible();
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/trayectoria-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  ctx.stale(); await panel.getByRole('button', { name: 'Actualizar trayectoria' }).click();
  await expect(panel.getByText('Análisis desactualizado', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Guardar revisión' })).toHaveCount(0);
  expect(aiCalls).toBe(0); expect(errors).toEqual([]);
});

test('migración ausente mantiene accesibles candidatos y ranking', async ({ page }) => {
  await preparar(page, true);
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Ana Prueba', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Trayectoria laboral' });
  await expect(panel.getByRole('alert')).toContainText('migración');
  await expect(panel.getByRole('button', { name: 'Actualizar trayectoria' })).toBeEnabled();
  await expect(page.locator('.candidate-ranking-table')).toContainText('Bruno');
});
