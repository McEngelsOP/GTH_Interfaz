import { test, expect, Page } from '@playwright/test';
import { AppStateData } from '../../src/types/index.ts';
import { IS_STAGE_ONE } from '../../src/config/edition.ts';
import { VIEWS } from '../../src/services/navigation.ts';

const readState = (page: Page): Promise<AppStateData> => page.evaluate(() => JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!));
const navigate = async (page: Page, view: string, job = 'REQ-2026-DOC-088') => {
  await page.goto(`/#view=${view}&job=${job}`);
  await expect.poll(async () => (await readState(page)).activeJobPostingId).toBe(job);
};

test('ficha y Top-N avanzan expedientes correctos sin cerrar otras convocatorias', async ({ page }) => {
  await navigate(page, 'mejores_candidatos');
  const before = await readState(page);
  await page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Carlos Mendoza', exact: true }) }).getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Marcia Samin', exact: true }).click();
  await page.getByRole('button', { name: 'Avanzar a Preseleccionado', exact: true }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: /Confirmar avance/ }).click();
  await expect.poll(async () => (await readState(page)).applications.find((a) => a.id === 'app-001')?.stage).toBe('preseleccionado');
  expect((await readState(page)).applications.find((a) => a.id === 'app-002')?.stage).toBe('postulado');
  await expect(page.getByRole('dialog').getByText('Preseleccionado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Cantidad Top-N' }).fill('2');
  await page.getByRole('button', { name: 'Elegir los mejores', exact: true }).click();
  await page.getByRole('button', { name: 'Decidir con borrador...', exact: true }).click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('dialog').getByRole('button', { name: /Confirmar avance/ }).click();
  await expect.poll(async () => (await readState(page)).applications.find((a) => a.id === 'app-002')?.stage).toBe('preseleccionado');
  const after = await readState(page);
  expect(after.applications.filter((a) => a.jobPostingId !== before.activeJobPostingId)).toEqual(before.applications.filter((a) => a.jobPostingId !== before.activeJobPostingId));
  expect(after.applications.find((a) => a.id === 'app-007')?.stage).toBe('postulado');
  const closed = after.applications.filter((a) => a.jobPostingId === before.activeJobPostingId && a.stage === 'no_continua');
  expect(closed.length).toBeGreaterThan(0);
  for (const app of closed) {
    expect(after.candidates.find((c) => c.id === app.candidateId)?.savedInTalentPool).toBe(true);
    expect(after.emailDrafts.some((d) => d.applicationId === app.id && d.templateType === 'cierre')).toBe(true);
  }
  await page.reload(); expect((await readState(page)).applications).toEqual(after.applications);
});

test('tablero persiste etapas y exige confirmación y motivo', async ({ page }) => {
  await navigate(page, 'avance_candidatos');
  const card = page.locator('[draggable="true"]').filter({ has: page.getByRole('button', { name: 'Marcia Samin', exact: true }) });
  await card.getByTitle('Avanzar a Preseleccionado').click();
  await expect(page.getByRole('button', { name: 'Confirmar cambio', exact: true })).toBeDisabled();
  await page.getByRole('dialog').getByRole('textbox').fill('Revisión curricular aprobada por GTHC.');
  await page.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  await expect.poll(async () => (await readState(page)).applications.find((a) => a.id === 'app-001')?.stage).toBe('preseleccionado');
  await card.getByTitle('Avanzar a En entrevista').click();
  await page.getByRole('dialog').getByRole('textbox').fill('Se coordina entrevista con el comité.');
  await page.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  await expect.poll(async () => (await readState(page)).applications.find((a) => a.id === 'app-001')?.stage).toBe('en_entrevista');
  await page.reload(); await expect(page).toHaveURL(/view=avance_candidatos/);
  expect((await readState(page)).applications.find((a) => a.id === 'app-001')?.stage).toBe('en_entrevista');
});

test('Banco guarda personas y vincula evaluaciones pendientes sin perder perfiles', async ({ page }) => {
  test.skip(IS_STAGE_ONE, 'Banco de Talento pertenece a la versión completa.');
  await navigate(page, 'banco_talento');
  await page.getByRole('row').filter({ hasText: 'Milagros Paredes' }).getByRole('button', { name: 'Ficha', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Banco de Talento · Perfil sin postulación', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
  await navigate(page, 'mejores_candidatos');
  await page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Marcia Samin', exact: true }) }).getByTitle('Conservar en Banco de Talento').click();
  await expect.poll(async () => (await readState(page)).candidates.find((c) => c.id === 'cand-001')?.savedInTalentPool).toBe(true);
  await navigate(page, 'banco_talento');
  await page.getByRole('row').filter({ hasText: 'Marcia Samin' }).getByRole('button', { name: 'Vincular a puesto', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox').selectOption('REQ-2026-ADM-032');
  await page.getByRole('button', { name: 'Crear nueva postulación', exact: true }).click();
  await expect.poll(async () => (await readState(page)).applications.filter((a) => a.candidateId === 'cand-001' && a.jobPostingId === 'REQ-2026-ADM-032').length).toBe(1);
  const state = await readState(page), linked = state.applications.find((a) => a.candidateId === 'cand-001' && a.jobPostingId === 'REQ-2026-ADM-032')!;
  expect(linked.llmScore).toBeNull();
  expect(linked.mandatoryRequirementStatus).toBe('sin_verificar');
  expect(state.candidates.find((c) => c.id === 'cand-001')?.savedInTalentPool).toBe(true);
});

test('vistas, criterios, tema y navegación móvil conservan contexto', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  for (const view of VIEWS) {
    await navigate(page, view); await expect(page.locator('main')).not.toBeEmpty();
  }
  if (!IS_STAGE_ONE) {
  await navigate(page, 'criterios_evaluacion');
  await navigate(page, 'criterios_evaluacion', 'REQ-2026-ADM-032');
  const expected = (await readState(page)).jobPostings.find((j) => j.id === 'REQ-2026-ADM-032')!.criteria.map((c) => c.weightPct);
  await expect.poll(() => page.locator('input[type="range"]').evaluateAll((elements) => elements.map((e) => Number((e as HTMLInputElement).value)))).toEqual(expected);
  }
  await navigate(page, 'mejores_candidatos');
  await page.getByRole('button', { name: 'Cambiar tema de apariencia', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 }); await expect(page.locator('aside')).toBeHidden();
  await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).click(); await expect(page.locator('aside')).toBeVisible();
  await page.locator('aside').getByRole('button', { name: /Mejores candidatos/ }).click(); await expect(page.locator('aside')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

import { INITIAL_APP_STATE } from '../fixtures/recruitmentData.ts';
test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')) localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(state));
  }, INITIAL_APP_STATE);
});
