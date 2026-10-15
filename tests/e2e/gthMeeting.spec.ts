import { test, expect, Page } from '@playwright/test';
import { meetingState } from '../fixtures/gthMeetingData.ts';
import type { AppStateData } from '../../src/types/index.ts';

const storageKey = 'GTH_ESAN_STAGE_I_STATE_V2';
async function readState(page: Page): Promise<AppStateData> {
  return page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gth-talentai', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const raw = await new Promise<string>((resolve, reject) => {
      const request = db.transaction('estado').objectStore('estado').get(key);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    db.close(); return JSON.parse(raw);
  }, storageKey);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('meeting-qa-seeded')) {
      localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem('meeting-qa-seeded', '1');
    }
    (window as any).__opened = [];
    window.open = (url) => { (window as any).__opened.push(String(url)); return null; };
  }, { key: storageKey, state: meetingState });
});

test('tablero avanza directamente, guarda motivo fijo y mantiene validaciones', async ({ page }) => {
  await page.goto('/#view=avance_candidatos');
  const card = page.locator('[draggable="true"]').filter({ has: page.getByRole('button', { name: 'Bruno Prueba', exact: true }) });
  await card.getByRole('button', { name: 'Avanzar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(async () => (await readState(page)).applications[1].stage).toBe('preseleccionado');
  expect((await readState(page)).decisionLogs[0].notes).toBe('Movido desde el tablero de avance');
  const dragged = page.locator('[draggable="true"]').filter({ has: page.getByRole('button', { name: 'Carla Prueba', exact: true }) });
  await dragged.dragTo(card.locator('..').locator('..'), { targetPosition: { x: 80, y: 30 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(async () => (await readState(page)).applications[2].stage).toBe('preseleccionado');
  await page.reload();
  await expect(card).toBeVisible();
  expect((await readState(page)).applications[1].stage).toBe('preseleccionado');
});

test('revisados tiene contador y selección independiente de las casillas', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  for (const name of ['Bruno Prueba', 'Carla Prueba']) await page.getByRole('button', { name: `Marcar como revisado a ${name}`, exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Revisados 2', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Revisados 2', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByText('Revisados: marca compartida con todo el equipo.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Quitar marca de revisado de Bruno Prueba', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Revisados 1', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Marcados 0', exact: true })).toBeVisible();
});

test('agradecimiento permite elegir, buscar y reabrir con todos marcados', async ({ page }) => {
  await page.goto('/#view=avance_candidatos');
  const open = page.getByRole('button', { name: 'Agradecer a no seleccionados (5)', exact: true });
  await open.click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('5 de 5 seleccionados', { exact: true })).toBeVisible();
  for (const name of ['Bruno Prueba', 'Diego Prueba']) await modal.getByRole('checkbox', { name: `Incluir a ${name}`, exact: true }).uncheck();
  await expect(modal.getByText('3 de 5 seleccionados', { exact: true })).toBeVisible();
  await modal.getByLabel('Buscar destinatario por nombre').fill('Carla');
  await expect(modal.getByRole('checkbox')).toHaveCount(1);
  await modal.getByRole('button', { name: /Abrir en Gmail/ }).click();
  const url = new URL(await page.evaluate(() => (window as any).__opened[0]));
  expect(url.searchParams.get('bcc')).toBe('persona2@example.com,persona4@example.com');
  await modal.getByLabel('Buscar destinatario por nombre').fill('');
  await modal.getByRole('button', { name: 'Desmarcar todos', exact: true }).click();
  await expect(modal.getByRole('button', { name: 'Copiar correos', exact: true })).toBeDisabled();
  await modal.getByRole('button', { name: 'Listo', exact: true }).click();
  await open.click(); await expect(modal.getByText('5 de 5 seleccionados', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await modal.evaluate((el) => {
    const bounds = el.getBoundingClientRect();
    return [...el.querySelectorAll('button')].every((button) => {
      const rect = button.getBoundingClientRect(); return rect.left >= bounds.left && rect.right <= bounds.right;
    });
  })).toBe(true);
});

test('WhatsApp usa el destinatario correcto y aparece también en la ficha', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Abrir WhatsApp para Ana Prueba', exact: true }).click();
  const url = new URL(await page.evaluate(() => (window as any).__opened[0]));
  expect(url.pathname).toBe('/51987654321');
  expect(url.searchParams.get('text')).toContain('Hola, Ana Prueba.');
  expect(url.searchParams.get('text')).toContain('«Especialista en selección»');
  await expect(page.getByRole('button', { name: 'Sin celular registrado para Fabio Prueba', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Ana Prueba', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Abrir WhatsApp para Ana Prueba', exact: true })).toBeVisible();
});

test('comentario se edita, persiste tras recargar y se puede borrar', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  const edit = page.getByRole('button', { name: 'Editar comentario de Bruno Prueba', exact: true });
  await edit.click();
  await expect(page.getByRole('dialog')).toContainText('Solo se guarda en esta computadora');
  await page.getByLabel('Comentario', { exact: true }).fill('Llamar el viernes');
  await page.getByRole('button', { name: 'Guardar comentario', exact: true }).click();
  await expect(edit).toHaveText('Llamar el viernes');
  await expect.poll(async () => Object.values((await readState(page)).comentariosInternos || {})[0]?.texto).toBe('Llamar el viernes');
  await page.reload(); await edit.click();
  await expect(page.getByLabel('Comentario', { exact: true })).toHaveValue('Llamar el viernes');
  await page.getByLabel('Comentario', { exact: true }).fill('Contactado');
  await page.getByRole('button', { name: 'Guardar comentario', exact: true }).click();
  await expect(edit).toHaveText('Contactado');
  await edit.click(); await page.getByLabel('Comentario', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Eliminar comentario', exact: true }).click();
  await expect(edit).toHaveText('Agregar');
});

test('gráfico compara requisitos, conserva colores y distingue falta de evidencia', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#view=mejores_candidatos');
  for (const name of ['Ana Prueba', 'Bruno Prueba', 'Carla Prueba', 'Diego Prueba']) {
    await page.getByRole('row').filter({ has: page.getByRole('button', { name, exact: true }) }).getByRole('checkbox').check();
  }
  await page.getByRole('button', { name: 'Comparador', exact: true }).click();
  const chart = page.getByRole('region', { name: 'Comparación visual de candidatos', exact: true });
  await expect(chart.getByRole('list', { name: 'Leyenda de candidatos' }).locator('li')).toHaveCount(4);
  await expect(chart.getByRole('heading', { name: 'Score general', exact: true })).toBeVisible();
  await expect(chart.getByRole('heading', { name: 'Requisitos para orientar la entrevista', exact: true })).toBeVisible();
  await expect(chart.getByRole('cell', { name: 'R2 · Gestión de indicadores: Bruno Prueba, Sin datos', exact: true })).toBeVisible();
  await expect(chart.locator('.comparison-chart-row, .comparison-coverage-track')).toHaveCount(0);
  await expect(chart.locator('.comparison-donut svg')).toHaveCount(4);
  await expect(chart.getByRole('img', { name: 'Bruno Prueba: 1 de similitud alta, 0 media, 0 baja y 1 sin datos', exact: true })).toBeVisible();
  const colors = await chart.getByRole('list', { name: 'Leyenda de candidatos' }).locator('li > span').evaluateAll((items) => items.map((el) => getComputedStyle(el).backgroundColor));
  expect(new Set(colors).size).toBe(4);
  await page.getByRole('button', { name: 'Quitar Ana Prueba de la comparación', exact: true }).click();
  expect(await chart.getByRole('list', { name: 'Leyenda de candidatos' }).locator('li > span').evaluateAll((items) => items.map((el) => getComputedStyle(el).backgroundColor))).toEqual(colors.slice(1));
  await chart.evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: '/tmp/gth-chart-light-desktop.png', fullPage: true });
  await chart.locator('.comparison-heatmap').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: '/tmp/gth-heatmap-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Cambiar tema de apariencia', exact: true }).click();
  await page.screenshot({ path: '/tmp/gth-chart-dark-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(chart).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await chart.evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: '/tmp/gth-chart-dark-mobile.png', fullPage: true });
  await chart.locator('.comparison-heatmap').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: '/tmp/gth-heatmap-mobile.png', fullPage: true });
  const scroll = chart.locator('.comparison-heatmap-scroll');
  await scroll.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => scroll.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});


test('ficha abre en Perfil y tabla centra cabeceras y controles', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  const table = page.locator('.candidate-ranking-table');
  await expect(table.getByRole('columnheader', { name: 'Score ↓', exact: true })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Puntaje', exact: true })).toBeVisible();
  expect(await table.locator('thead th').evaluateAll(items => items.every(el => getComputedStyle(el).textAlign === 'center'))).toBe(true);
  const row = table.getByRole('row').filter({ has: page.getByRole('button', { name: 'Ana Prueba', exact: true }) });
  expect(await row.locator('td').nth(2).evaluate(el => getComputedStyle(el).textAlign)).toBe('left');
  expect(await row.locator('td').last().evaluate(el => getComputedStyle(el).textAlign)).toBe('center');
  await page.screenshot({ path: '/tmp/gth-ranking-desktop.png', fullPage: true });
  await row.getByRole('button', { name: 'Ver puntaje', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Explicación del ranking');
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar modal', exact: true }).click();
  await row.getByRole('button', { name: 'Ver perfil', exact: true }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('tab', { name: 'Perfil', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(drawer.getByRole('tab', { name: 'Historial', exact: true })).toHaveCount(0);
  expect(await drawer.getByRole('tab').allTextContents()).toEqual(['Perfil', 'Por qué este puntaje']);
  await drawer.getByRole('tab', { name: 'Por qué este puntaje', exact: true }).click();
  await expect(drawer.getByRole('tab', { name: 'Por qué este puntaje', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/gth-profile-mobile.png', fullPage: true });
});


test('comparador distingue cero de pendiente y refleja los conteos en las donas', async ({ page }) => {
  await page.route('**/api/embeddings', route => route.fulfill({ status: 503, json: { error: 'Servicio desactivado en esta prueba' } }));
  const state = structuredClone(meetingState);
  state.applications[0].embeddingMatch!.score = 0;
  state.applications[0].embeddingMatch!.requirementSims = { r1: 0, r2: 0 };
  delete state.applications[1].embeddingMatch;
  await page.addInitScript(state => localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(state)), state);
  await page.goto('/#view=mejores_candidatos');
  for (const name of ['Ana Prueba', 'Bruno Prueba']) {
    await page.getByRole('row').filter({ has: page.getByRole('button', { name, exact: true }) }).getByRole('checkbox').check();
  }
  await page.getByRole('button', { name: 'Comparador', exact: true }).click();
  const chart = page.getByRole('region', { name: 'Comparación visual de candidatos', exact: true });
  await expect(chart.getByRole('cell', { name: 'R1 · Experiencia en selección de personal: Ana Prueba, 0 %', exact: true })).toHaveClass('heatmap-low');
  await expect(chart.getByRole('cell', { name: 'R1 · Experiencia en selección de personal: Bruno Prueba, Sin datos', exact: true })).toHaveClass('heatmap-missing');
  await expect(chart.getByRole('img', { name: 'Ana Prueba: 0 de similitud alta, 0 media, 2 baja y 0 sin datos', exact: true })).toBeVisible();
  await expect(chart.getByRole('img', { name: 'Bruno Prueba: 0 de similitud alta, 0 media, 0 baja y 2 sin datos', exact: true })).toBeVisible();
});
