import { test, expect } from '@playwright/test';
import { estadoConConvocatoriaDePrueba } from '../fixtures/convocatoriaDePrueba.ts';

function fixture(criteriaCount = 4) {
  const state = estadoConConvocatoriaDePrueba();
  const job = state.jobPostings[0];
  job.criteria = Array.from({ length: criteriaCount }, (_, i) => ({ id: `r${i}`, label: `Requisito de prueba ${i + 1}`, weightPct: 100 / (criteriaCount || 1), type: 'LLM' as const }));
  state.candidates = ['Ana Prueba', 'Bruno Prueba', 'Carla Prueba'].map((name, i) => ({ id: `comparison-person-${i}`, name, email: null, phone: null, currentTitle: 'Analista de prueba', currentCompany: 'Empresa ficticia', source: 'Prueba', summary: '', rawCvText: '', savedInTalentPool: false }));
  state.applications = state.candidates.map((candidate, i) => ({ id: `comparison-app-${i}`, candidateId: candidate.id, jobPostingId: job.id, stage: 'postulado', llmScore: null, mandatoryRequirementStatus: 'sin_verificar', whyScoreNotes: { explanation: '', strengths: [], evidenceSummary: '' }, criteriaBreakdown: {}, createdAt: '', updatedAt: '', embeddingMatch: { score: 1 - i * .2, ranking: i + 1, requirementSims: Object.fromEntries(job.criteria.map((r, k) => [r.id, [.88, .58, 0, null][k % 4]])), requirementEvidence: {}, explanation: '', backend: 'e5', criteriaVersion: job.criteriaVersion, evaluatedAt: '' } }));
  return state;
}

for (const count of [4, 0, 1, 16]) {
  test(`referencia compacta con ${count} requisitos conserva detalle y acciones`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(state => localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(state)), fixture(count));
    await page.goto('/#view=comparador');
    await page.getByRole('button', { name: 'Comparar los 3 mejores perfiles', exact: true }).click();
    await expect(page.locator('.comparison-card')).toHaveCount(3);
    await expect(page.getByRole('columnheader').filter({ hasText: 'Ana Prueba' })).toBeVisible();
    await expect(page.getByText('Experiencia reciente', { exact: true })).toBeVisible();
    await expect(page.getByText('Estudios (mayor nivel)', { exact: true })).toBeVisible();
    await expect(page.getByText('Idiomas', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mapa de similitud por requisito' })).toHaveCount(0);
    await expect(page.locator('.comparison-ring-arc')).toHaveCount(count * 3);
    if (count === 4) {
      await expect(page.locator('.comparison-score strong')).toHaveText(['1.00', '0.80', '0.60']);
      await expect(page.locator('.comparison-card').first().locator('.comparison-ring-value')).toHaveText('1/4');
      await expect(page.locator('.comparison-card').first().getByLabel('R3: Requisito de prueba 3, 0 %', { exact: true })).toBeVisible();
      await expect(page.locator('.comparison-card').first().getByLabel('R4: Requisito de prueba 4, sin datos', { exact: true })).toBeVisible();

      // Reagregar al candidato con mayor score al final no debe cambiar el orden del comparador.
      await page.locator('.comparison-card').first().getByRole('button', { name: 'Quitar Ana Prueba de la comparación', exact: true }).click();
      await page.getByLabel('Candidato para comparar').selectOption('comparison-app-0');
      await page.getByRole('button', { name: 'Añadir', exact: true }).click();
      await expect(page.locator('.comparison-score strong')).toHaveText(['1.00', '0.80', '0.60']);
      await expect(page.locator('table thead tr').first().locator('th').nth(1)).toContainText('Ana Prueba');

      await page.locator('.comparison-chart').screenshot({ path: 'test-results/comparison-reference-desktop.png' });
      await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('.comparison-card').first().screenshot({ path: 'test-results/comparison-reference-mobile-dark.png' });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await page.locator('.comparison-card').first().getByRole('button', { name: 'Ver perfil', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.comparison-card').first().getByRole('button', { name: 'Quitar Ana Prueba de la comparación', exact: true }).click();
    await expect(page.locator('.comparison-card')).toHaveCount(2);
    await page.getByRole('button', { name: 'Reiniciar', exact: true }).click();
    await expect(page.locator('.comparison-card')).toHaveCount(3);
    await page.getByRole('button', { name: 'Decidir quién avanza (3)', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
