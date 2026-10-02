import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { IS_STAGE_ONE } from '../../src/config/edition.ts';

test('ranking, ficha, comparador y CSV muestran únicamente evaluación LLM', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  await expect(page.getByRole('columnheader', { name: 'LLM Score', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'ML Score', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ML', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Marcia Samin', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('LLM', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('dialog').getByText('ML', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exportar todos/ }).click();
  const downloaded = await download;
  const csv = await readFile((await downloaded.path())!, 'utf8');
  const header = csv.split(/\r?\n/)[0];
  expect(header).toContain('Puntaje según LLM');
  expect(header).not.toMatch(/Machine Learning|Puntaje ML|Score ML/);
  expect(header.split(';')).toHaveLength(12);
  await page.goto('/#view=comparador');
  await page.getByRole('button', { name: 'Comparar los 3 mejores perfiles', exact: true }).click();
  await expect(page.getByText('Puntaje según LLM (Embeddings)', { exact: true })).toBeVisible();
  await expect(page.getByText('Puntaje según Machine Learning (ML)', { exact: true })).toHaveCount(0);
});

test('ETAPA-I limita menú y rutas y mantiene el cambio de convocatoria', async ({ page }) => {
  test.skip(!IS_STAGE_ONE, 'Solo corresponde a ETAPA-I.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#view=convocatorias');
  await expect(page).toHaveURL(/view=mejores_candidatos/);
  await expect(page.locator('aside').getByRole('button', { name: /Cargar CV/ })).toBeVisible();
  for (const name of ['Mejores candidatos', 'Comparador', 'Avance de candidatos']) {
    await expect(page.locator('aside').getByRole('button', { name: new RegExp(name) })).toBeVisible();
  }
  for (const name of ['Convocatorias', 'Perfiles de puestos', 'Nueva convocatoria', 'Banco de Talento', 'Criterios de evaluación', 'Historial de decisiones', 'Resultados del proceso', 'Ajustes generales', 'Resumen general']) {
    await expect(page.locator('aside').getByRole('button', { name: new RegExp(name) })).toHaveCount(0);
  }
  await expect(page.getByRole('button', { name: 'Asistente GTH', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cambiar puesto', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Convocatoria activa' }).selectOption('REQ-2026-ADM-032');
  await expect(page).toHaveURL(/job=REQ-2026-ADM-032/);
  for (const view of ['banco_talento', 'ajustes_generales', 'criterios_evaluacion', 'resumen_general']) {
    await page.goto(`/#view=${view}&job=REQ-2026-ADM-032`);
    await expect(page).toHaveURL(/view=mejores_candidatos/);
  }
  expect(errors).toEqual([]);
});

import { INITIAL_APP_STATE } from '../fixtures/recruitmentData.ts';
test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')) localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(state));
  }, INITIAL_APP_STATE);
});
