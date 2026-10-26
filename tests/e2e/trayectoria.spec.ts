import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { avisoToJob } from '../../src/services/bumeranSync.ts';
import { INITIAL_APP_STATE } from '../../src/data/initialData.ts';
import { instalarSupabaseFicticio } from '../fixtures/supabaseMock.ts';

const detalle = JSON.parse(execFileSync('python', ['-c', 'import json; from scraping.test_trayectoria import patron, HOY; from scraping.trayectoria import analizar; print(json.dumps(analizar(patron(),HOY)))'], { encoding: 'utf8' }));
const regresion = JSON.parse(execFileSync('python', ['-c', 'import json; from scraping.test_fechas_trayectoria import perfil_regresion, HOY; from scraping.trayectoria import analizar; print(json.dumps(analizar(perfil_regresion(),HOY)))'], { encoding: 'utf8' }));
const provisional = JSON.parse(execFileSync('python', ['-c', 'import json; from scraping.test_trayectoria import patron, HOY; from scraping.trayectoria import analizar; d=patron(); d={k:"" if k.endswith("Modalidad") else v for k,v in d.items()}; print(json.dumps(analizar(d,HOY)))'], { encoding: 'utf8' }));
const incompleto = JSON.parse(execFileSync('python', ['-c', 'import json; from scraping.test_fechas_trayectoria import perfil_regresion, HOY; from scraping.trayectoria import analizar; d=perfil_regresion(); d["Exp[1] Puesto"]="Analista comercial"; d["Exp[1] Empresa"]="Empresa actual"; d["Exp[1] Fecha Inicio"]="2025-03-01"; print(json.dumps(analizar(d,HOY)))'], { encoding: 'utf8' }));
const aviso = { aviso_id: 'trayectoria-demo', titulo: 'Analista de prueba', publicado_el: '2026-10-01', recibidos: 2,
  detalle_texto: 'Requisitos:\nExperiencia en análisis\nFunciones:\nAnalizar información', detalle_json: {}, url_publica: null,
  ultimo_csv_at: '2026-10-22T10:00:00Z', ranking_at: '2026-10-22T10:01:00Z' };
const job = avisoToJob(aviso);

async function preparar(page: Page, unavailable = false, evidencia = detalle) {
  const state = structuredClone(INITIAL_APP_STATE);
  state.jobPostings = [job]; state.activeJobPostingId = job.id;
  await instalarSupabaseFicticio(page, state);
  let summaryCalls = 0;
  const reviews: Record<string, unknown>[] = [];
  let status = evidencia.estado;
  let rechazarRevision = false;
  await page.route('https://gth-test.supabase.co/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1);
    if (table === 'gth_perfiles') return route.fulfill({ json: { user_id: '00000000-0000-0000-0000-000000000001', email: 'qa@example.test', nombre: 'QA', nivel: 'maestro', activo: true, debe_cambiar_clave: false, secciones: null, avisos: null } });
    if (table === 'gth_trayectoria_resumen') {
      summaryCalls++;
      if (unavailable) return route.fulfill({ status: 404, json: { code: 'PGRST202', message: 'Missing test function' } });
      return route.fulfill({ json: [{ id_postulante: 'ana', analisis_id: 'analysis-a', estado: status, calculado_at: '2026-10-22T10:00:00Z', revision: reviews.at(-1)?.estado || null },
        { id_postulante: 'bruno', analisis_id: null, estado: 'pendiente', calculado_at: null, revision: null }] });
    }
    if (table === 'gth_trayectoria_analisis') return route.fulfill({ json: { id: 'analysis-a', detalle: evidencia } });
    if (table === 'gth_trayectoria_revisiones') {
      if (route.request().method() === 'POST') { if (rechazarRevision) return route.fulfill({ status: 403, json: { message: 'Fallo simulado de permisos' } }); reviews.push(route.request().postDataJSON()); return route.fulfill({ status: 201, json: [] }); }
      return route.fulfill({ json: reviews.map((r,i) => ({ ...r,id: `review-${i}`,creada_at: '2026-10-22T10:00:00Z' })) });
    }
    if (table === 'avisos') return route.fulfill({ json: [aviso] });
    if (table === 'v_postulaciones') return route.fulfill({ json: ['ana','bruno'].map((id, i) => ({ id_postulante: id, datos_json: {
      Nombre: i ? 'Bruno' : 'Ana', Apellido: 'Prueba', 'E-Mail': `${id}@example.test`,
      ...Object.fromEntries(evidencia.experiencias.flatMap((e: { indice: number; empresa: string; puesto: string; inicio: string; fin: string }) =>
        Object.entries({ Empresa: e.empresa, Puesto: e.puesto, 'Fecha Inicio': e.inicio, 'Fecha Fin': e.fin, 'Descripción': `Funciones de ${e.empresa}.` })
          .map(([campo, valor]) => [`Exp[${e.indice}] ${campo}`, valor]))) } })) });
    if (table === 'ranking_embeddings') return route.fulfill({ json: ['ana','bruno'].map((id, i) => ({ id_postulante: id, criterios_version: job.criteriaVersion, backend: 'e5', ranking: i + 1, score: .9 - i * .1,
      req_sims: [.9], req_fragmentos: ['Analista'], explicacion: 'Evidencia de prueba', calculado_at: aviso.ranking_at })) });
    return route.fulfill({ json: [] });
  });
  return { reviews, summaryCalls: () => summaryCalls, stale: () => { status = 'desactualizado'; }, rechazarRevision: (value: boolean) => { rechazarRevision = value; } };
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
  const panel = page.getByRole('region', { name: 'Cambios entre empleadores' });
  // «Revisar trayectoria» abre el perfil directamente en su pestaña, sin repetir la experiencia laboral.
  await expect(page.getByRole('tab', { name: /Rotación laboral/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /Rotación laboral/ }).getByRole('img', { name: 'Con riesgo: cambios frecuentes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Experiencia laboral', exact: true })).toHaveCount(0);
  await expect(panel.getByText('Se detectaron 3 transiciones en un intervalo de 6 meses.', { exact: true })).toBeVisible();
  await expect(panel.getByText(/Criterio:/)).toBeHidden();
  await expect(panel.getByText(/Ventana detectada/)).toBeHidden();
  await expect(panel.getByLabel('Motivo y evidencia revisada')).toHaveCount(0);
  expect(ctx.summaryCalls()).toBe(summaryBefore);
  await panel.getByRole('button', { name: 'Ver análisis', exact: true }).click();
  await expect(panel.getByText(/Ventana detectada/)).toBeVisible();
  await panel.getByText('Fechas originales de Exp[1]', { exact: true }).click();
  await expect(panel.getByText('01/01/2026 — 31/01/2026', { exact: true })).toBeVisible();
  await expect(panel.getByText('Inicio «2026-01-01»; fin «2026-01-31».', { exact: true })).toBeVisible();
  await expect(panel.locator('p').filter({ hasText: 'Resultado:' })).toContainText('3 transiciones acreditadas');
  await expect(page.getByText('Funciones de Empresa A.', { exact: true })).toHaveCount(0);
  await expect(panel.locator('blockquote')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Registrar revisión', exact: true }).click();
  await expect(panel.getByLabel('Resultado de la revisión')).toHaveValue('');
  await panel.getByLabel('Resultado de la revisión').selectOption('justificado');
  await panel.getByLabel('Motivo y evidencia revisada').fill('Contrato revisado con evidencia documental');
  await panel.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect.poll(() => ctx.reviews.length).toBe(1);
  expect(ctx.reviews[0]).toEqual({ analisis_id: 'analysis-a', estado: 'justificado', texto: 'Contrato revisado con evidencia documental' });
  await expect(panel.getByText(/Revisión registrada: Cambios justificados/)).toBeVisible();
  await expect(panel.getByLabel('Motivo y evidencia revisada')).toHaveCount(0);
  await panel.screenshot({ path: 'test-results/trayectoria-compacta-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.scrollIntoViewIfNeeded();
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/trayectoria-compacta-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel.getByRole('button', { name: 'Ver análisis', exact: true }).click();
  await panel.getByText('Últimas revisiones registradas', { exact: true }).click();
  await expect(panel.getByText('Contrato revisado con evidencia documental', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Registrar revisión', exact: true }).click();
  await panel.getByLabel('Motivo y evidencia revisada').scrollIntoViewIfNeeded();
  await expect(panel.getByLabel('Motivo y evidencia revisada')).toBeVisible();
  await page.screenshot({ path: 'test-results/trayectoria-revision-mobile.png' });
  ctx.stale(); await panel.getByRole('button', { name: 'Actualizar análisis' }).click();
  await expect(panel.getByText('Análisis desactualizado', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Guardar revisión' })).toHaveCount(0);
  expect(aiCalls).toBe(0); expect(errors).toEqual([]);
});

test('fechas válidas no se atribuyen a datos faltantes por modalidad', async ({ page }) => {
  await preparar(page, false, regresion);
  await page.goto('/#view=mejores_candidatos');
  await expect(page.getByRole('button', { name: 'Revisar trayectoria de Ana Prueba' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ana Prueba', exact: true }).click();
  await page.getByRole('tab', { name: /Rotación laboral/ }).click();
  const panel = page.getByRole('region', { name: 'Cambios entre empleadores' });
  await expect(panel.getByText('Sin patrón en los datos evaluables', { exact: true })).toBeVisible();
  await expect(panel.getByRole('img', { name: 'Sin riesgo' })).toBeVisible();
  await expect(panel.getByText('No se alcanza el umbral con la información evaluable.', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Ver análisis', exact: true }).click();
  await expect(panel.locator('p').filter({ hasText: 'Resultado:' })).toContainText('0 transiciones acreditadas');
  await expect(panel.getByText('Exp[1]: fecha de fin no registrada en la fuente', { exact: true })).toBeVisible();
  await expect(panel.getByText(/fechas, empresa o modalidad insuficientes/)).toHaveCount(0);
  await expect(panel.getByText('La fuente no especifica la modalidad contractual de 3 experiencias. No se presume empleo dependiente.', { exact: true })).toBeVisible();
  await expect(panel.getByText(/Exp\[2\]: modalidad contractual/)).toHaveCount(0);
  await panel.getByRole('button', { name: 'Registrar revisión', exact: true }).click();
  await expect(panel.getByLabel('Resultado de la revisión')).toHaveValue('');
  await expect(panel.getByRole('option', { name: 'Cambios justificados' })).toHaveCount(0);
  await panel.getByLabel('Resultado de la revisión').selectOption('revisado');
  await panel.getByLabel('Motivo y evidencia revisada').fill('Revisión sin patrón de cambios frecuentes');
  await panel.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect(panel.getByText(/Revisión registrada: Revisado por GTH/)).toBeVisible();
});

test('modalidad desconocida no se presenta como patrón confirmado', async ({ page }) => {
  await preparar(page, false, provisional);
  await page.goto('/#view=mejores_candidatos');
  await expect(page.getByRole('button', { name: 'Revisar trayectoria de Ana Prueba' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ana Prueba', exact: true }).click();
  await page.getByRole('tab', { name: /Rotación laboral/ }).click();
  const panel = page.getByRole('region', { name: 'Cambios entre empleadores' });
  await expect(panel.getByText('No concluyente', { exact: true })).toBeVisible();
  await expect(panel.getByRole('img', { name: 'No se pudo concluir' })).toBeVisible();
  await panel.getByRole('button', { name: 'Ver análisis', exact: true }).click();
  await expect(panel.getByText('Posibles cambios frecuentes: confirmar modalidad.', { exact: true })).toBeVisible();
  await expect(panel.locator('p').filter({ hasText: 'Resultado:' })).toContainText('Otras 3 transiciones posibles');
  await expect(panel.getByText(/Ventana detectada/)).toHaveCount(0);
});

test('migración ausente mantiene accesibles candidatos y ranking', async ({ page }) => {
  await preparar(page, true);
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Ana Prueba', exact: true }).click();
  await page.getByRole('tab', { name: /Rotación laboral/ }).click();
  const panel = page.getByRole('region', { name: 'Cambios entre empleadores' });
  await expect(panel.getByRole('alert')).toContainText('migración');
  await expect(panel.getByRole('button', { name: 'Actualizar análisis' })).toBeEnabled();
  await expect(page.locator('.candidate-ranking-table')).toContainText('Bruno');
});


test('resume el dato pendiente y permite cancelar o reintentar sin duplicar la experiencia', async ({ page }) => {
  const ctx = await preparar(page, false, incompleto);
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Ana Prueba', exact: true }).click();
  await page.getByRole('tab', { name: /Rotación laboral/ }).click();
  const panel = page.getByRole('region', { name: 'Cambios entre empleadores' });
  await expect(panel.getByText('Falta confirmar la fecha de fin en Empresa actual.', { exact: true })).toBeVisible();
  await expect(page.getByText('Funciones de Empresa actual.', { exact: true })).toHaveCount(0);
  await expect(panel.getByText(/Criterio:/)).toBeHidden();
  await panel.getByRole('button', { name: 'Registrar revisión', exact: true }).click();
  await expect(panel.getByLabel('Resultado de la revisión')).toHaveValue('');
  await panel.getByLabel('Motivo y evidencia revisada').fill('Borrador que se cancela');
  await expect(panel.getByRole('button', { name: 'Guardar revisión' })).toBeDisabled();
  await panel.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Registrar revisión', exact: true })).toBeFocused();
  await expect(panel.getByLabel('Motivo y evidencia revisada')).toHaveCount(0);
  expect(ctx.reviews).toEqual([]);
  await panel.getByRole('button', { name: 'Registrar revisión', exact: true }).click();
  await expect(panel.getByLabel('Motivo y evidencia revisada')).toHaveValue('');
  await panel.getByLabel('Resultado de la revisión').selectOption('dato_incorrecto');
  await panel.getByLabel('Motivo y evidencia revisada').fill('Fecha de fin pendiente de confirmar');
  ctx.rechazarRevision(true);
  await panel.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('No se guardó');
  await expect(panel.getByLabel('Motivo y evidencia revisada')).toHaveValue('Fecha de fin pendiente de confirmar');
  ctx.rechazarRevision(false);
  await panel.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect.poll(() => ctx.reviews.length).toBe(1);
  expect(ctx.reviews[0]).toEqual({ analisis_id: 'analysis-a', estado: 'dato_incorrecto', texto: 'Fecha de fin pendiente de confirmar' });
});
