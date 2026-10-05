import { test, expect, Page } from '@playwright/test';
import { INITIAL_APP_STATE } from '../../src/data/initialData.ts';
import { AppStateData, Application } from '../../src/types/index.ts';

// Personas inventadas: reproducen una importación sin evaluar ni verificar.
const names = ['Zoe Prueba', 'Óscar Prueba', 'Beatriz Prueba', 'Álvaro Prueba', 'natalia Ejemplo', 'Ñora Prueba', 'Carlos Prueba', 'ana Ejemplo'];
const alphabeticalNames = ['Álvaro Prueba', 'ana Ejemplo', 'Beatriz Prueba', 'Carlos Prueba', 'natalia Ejemplo', 'Ñora Prueba', 'Óscar Prueba', 'Zoe Prueba'];
const fixture: AppStateData = {
  ...INITIAL_APP_STATE,
  candidates: names.map((name, index) => ({
    id: `person-test-${index}`, name, email: `persona${index}@example.com`, phone: '',
    currentTitle: 'Perfil de prueba', currentCompany: 'Empresa ficticia', source: 'Prueba',
    summary: '', rawCvText: 'Perfil inventado para pruebas.', savedInTalentPool: false,
  })),
  applications: names.map((_, index): Application => ({
    id: `application-test-${index}`, candidateId: `person-test-${index}`, jobPostingId: INITIAL_APP_STATE.activeJobPostingId,
    stage: 'postulado', llmScore: null, mandatoryRequirementStatus: 'sin_verificar',
    whyScoreNotes: { explanation: '', strengths: [], evidenceSummary: '' }, criteriaBreakdown: {},
    createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z',
  })),
};
const key = 'GTH_ESAN_STAGE_I_STATE_V2';
const readState = (page: Page): Promise<AppStateData> => page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key);
const writeState = async (page: Page, state: AppStateData) => {
  await page.evaluate(({ storageKey, value }) => localStorage.setItem(storageKey, JSON.stringify(value)), { storageKey: key, value: state });
  await page.reload();
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ storageKey, value }) => {
    if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify(value));
  }, { storageKey: key, value: fixture });
});

test('perfiles pendientes deshabilitan Top-N y aparecen de A a Z en el selector', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#view=mejores_candidatos');
  await expect(page.getByRole('button', { name: 'Elegir los mejores', exact: true })).toBeDisabled();
  await expect(page.locator('#top-n-availability')).toHaveText('Evalúa al menos un perfil con evidencia puntuable y sin requisitos descartados.');
  await expect(page.locator('tbody tr td:nth-child(3) button')).toHaveText(alphabeticalNames);
  await page.screenshot({ path: '../candidate-selection.png', fullPage: true });
  await page.goto('/#view=comparador');
  const selector = page.getByRole('combobox', { name: 'Candidato para comparar' });
  await expect(selector.locator('option').filter({ hasText: 'LLM:' })).toHaveText(alphabeticalNames.map((name) => `${name} (LLM: Pendiente)`));
  await expect(page.getByRole('button', { name: 'Cargar 3 mejores activos', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Comparar los 3 mejores perfiles', exact: true })).toBeDisabled();
  await page.screenshot({ path: '../candidate-comparison.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '../candidate-comparison-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  // La comparación manual sigue disponible aunque falte una evaluación.
  await selector.selectOption('application-test-3');
  await page.getByRole('button', { name: 'Añadir', exact: true }).click();
  await expect(selector.locator('option').filter({ hasText: 'Álvaro Prueba' })).toHaveCount(0);
  await selector.selectOption('application-test-7');
  await page.getByRole('button', { name: 'Añadir', exact: true }).click();
  await expect(page.getByRole('columnheader').filter({ hasText: 'Álvaro Prueba' })).toBeVisible();
  await expect(page.getByRole('columnheader').filter({ hasText: 'ana Ejemplo' })).toBeVisible();
  expect((await readState(page)).applications.every((app) => app.llmScore === null)).toBe(true);
  expect(errors).toEqual([]);
});

test('Top-N para revisión usa puntajes disponibles y mantiene prioridad por puntaje', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  const evaluated = await readState(page);
  evaluated.applications[0].llmScore = 95;
  await writeState(page, evaluated);
  await expect(page.getByRole('button', { name: 'Elegir los mejores', exact: true })).toBeEnabled();
  evaluated.applications[0].mandatoryRequirementStatus = 'verificado';
  await writeState(page, evaluated);
  await expect(page.getByRole('button', { name: 'Elegir los mejores', exact: true })).toBeEnabled();
  await expect(page.locator('tbody tr td:nth-child(3) button').first()).toHaveText('Zoe Prueba');
  await page.getByRole('button', { name: 'Elegir los mejores', exact: true }).click();
  await expect(page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Zoe Prueba', exact: true }) }).getByRole('checkbox')).toBeChecked();
  await page.goto('/#view=comparador');
  await expect(page.getByRole('button', { name: 'Comparar los 3 mejores perfiles', exact: true })).toBeDisabled();
  await expect(page.locator('#comparison-availability')).toContainText('al menos dos perfiles con puntaje disponible');
  evaluated.applications[2].llmScore = 80;
  evaluated.applications[2].mandatoryRequirementStatus = 'verificado';
  await writeState(page, evaluated);
  await expect(page.getByRole('button', { name: 'Comparar los 3 mejores perfiles', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Comparar los 3 mejores perfiles', exact: true }).click();
  await expect(page.getByRole('columnheader').filter({ hasText: 'Zoe Prueba' })).toBeVisible();
  await expect(page.getByRole('columnheader').filter({ hasText: 'Beatriz Prueba' })).toBeVisible();
});
