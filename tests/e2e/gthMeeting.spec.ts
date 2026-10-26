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

test('tablero usa cuatro etapas, avanza y mantiene la decisión tras recargar', async ({ page }) => {
  await page.goto('/#view=avance_candidatos');
  const stages = page.getByRole('navigation', { name: 'Etapas del proceso' });
  await expect(stages.getByRole('button')).toHaveCount(4);
  expect(await stages.getByRole('button').allTextContents()).toEqual([
    'Postulado5Recepción y revisión de perfiles', 'Preseleccionado1Invitación a Multitest',
    'En entrevista0Coordinación y cierre de selección', 'Contratado0Incorporación confirmada',
  ]);
  await page.getByRole('button', { name: 'Avanzar de etapa a Bruno Prueba', exact: true }).click();
  await expect.poll(async () => (await readState(page)).applications[1].stage).toBe('preseleccionado');
  expect((await readState(page)).decisionLogs[0].notes).toBe('Movido desde el tablero de avance');
  await stages.getByRole('button', { name: /^Preseleccionado/ }).click();
  await expect(page.getByRole('heading', { name: 'Bruno Prueba', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Avanzar de etapa a Bruno Prueba', exact: true }).click();
  await stages.getByRole('button', { name: /^En entrevista/ }).click();
  await expect(page.getByRole('heading', { name: 'Bruno Prueba', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Avanzar de etapa a Bruno Prueba', exact: true }).click();
  await expect.poll(async () => (await readState(page)).applications[1].stage).toBe('contratado');
  await page.reload();
  await stages.getByRole('button', { name: /^Contratado/ }).click();
  await expect(page.getByRole('heading', { name: 'Bruno Prueba', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Avanzar de etapa a Bruno Prueba', exact: true })).toBeDisabled();
  for (const target of ['en_entrevista', 'preseleccionado', 'postulado'] as const) {
    await expect(page.getByRole('button', { name: 'Volver de etapa a Bruno Prueba', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Volver de etapa a Bruno Prueba', exact: true }).click();
    await expect.poll(async () => (await readState(page)).applications[1].stage).toBe(target);
    await page.reload();
    expect((await readState(page)).applications[1].stage).toBe(target);
  }
  const result = await readState(page);
  expect(result.applications[1].embeddingMatch).toEqual(meetingState.applications[1].embeddingMatch);
  expect(result.decisionLogs.filter(log => log.applicationId === result.applications[1].id).slice(0, 3).map(log => [log.previousStage, log.newStage])).toEqual([
    ['preseleccionado', 'postulado'], ['en_entrevista', 'preseleccionado'], ['contratado', 'en_entrevista'],
  ]);
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

test('postulado filtra Top-N y nombre, Ctrl K enfoca búsqueda y Multitest queda configurable', async ({ page }) => {
  await page.goto('/#view=avance_candidatos');
  await page.getByRole('button', { name: 'Top-N', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Candidatos en Postulado', exact: true }).locator('.workflow-candidate')).toHaveCount(2);
  await page.getByLabel('Cantidad Top-N').fill('2');
  await expect(page.getByRole('region', { name: 'Candidatos en Postulado', exact: true }).locator('.workflow-candidate')).toHaveCount(1);
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByLabel('Buscar candidato por nombre').fill('carla');
  await expect(page.getByRole('region', { name: 'Candidatos en Postulado', exact: true }).locator('.workflow-candidate')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Carla Prueba', exact: true })).toBeVisible();
  const stages = page.getByRole('navigation', { name: 'Etapas del proceso' });
  await stages.getByRole('button', { name: /^Preseleccionado/ }).click();
  await expect(page.getByRole('button', { name: 'Enviar Multitest', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Configurar Multitest', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: 'Configurar Multitest' });
  await expect(dialogo.getByText(/^Puesto: /).first()).toBeVisible();
  await expect(dialogo.getByLabel('Enlace de Multitest')).toHaveCount(0);
  await dialogo.getByRole('combobox').first().selectOption('527');
  await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialogo).toHaveCount(0);
  await page.reload();
  await stages.getByRole('button', { name: /^Preseleccionado/ }).click();
  await page.getByRole('button', { name: 'Configurar Multitest', exact: true }).click();
  await expect(dialogo.getByRole('combobox').first()).toHaveValue('527');
  await dialogo.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await stages.getByRole('button', { name: /^En entrevista/ }).click();
  await expect(page.getByRole('button', { name: 'Agradecer a no seleccionados', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Agendar entrevista', exact: true })).toBeDisabled();
  await page.keyboard.press('Control+k');
  await expect(page.getByLabel('Buscar candidato por nombre')).toBeFocused();
  await page.getByLabel('Buscar candidato por nombre').fill('');
  await page.screenshot({ path: '/tmp/gth-workflow-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '/tmp/gth-workflow-mobile.png', fullPage: true });
});

test('etapas antiguas se muestran dentro de En entrevista sin perder perfiles', async ({ page }) => {
  const state = structuredClone(meetingState);
  state.applications[1].stage = 'en_evaluacion'; state.applications[2].stage = 'en_oferta';
  await page.addInitScript(state => localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(state)), state);
  await page.goto('/#view=avance_candidatos');
  await page.getByRole('navigation', { name: 'Etapas del proceso' }).getByRole('button', { name: /^En entrevista/ }).click();
  await expect(page.getByRole('region', { name: 'Candidatos en En entrevista', exact: true }).locator('.workflow-candidate')).toHaveCount(2);
  await page.getByRole('button', { name: 'Avanzar de etapa a Bruno Prueba', exact: true }).click();
  await expect.poll(async () => (await readState(page)).applications[1].stage).toBe('contratado');
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
  expect(await drawer.getByRole('tab').allTextContents()).toEqual(['Perfil', 'Puntaje', 'Rotación laboral', 'Sueldo', 'Postulaciones']);
  await drawer.getByRole('tab', { name: 'Puntaje', exact: true }).click();
  await expect(drawer.getByRole('tab', { name: 'Puntaje', exact: true })).toHaveAttribute('aria-selected', 'true');
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

test('descarte masivo conserva el perfil, la evaluación y las notas del banco tras el guardado asíncrono', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  for (const name of ['Bruno Prueba', 'Carla Prueba']) {
    await page.getByRole('row').filter({ has: page.getByRole('button', { name, exact: true }) }).getByRole('checkbox').check();
  }
  await page.getByRole('button', { name: 'Descartar marcados (2)', exact: true }).click();
  await page.getByLabel('Motivo del descarte', { exact: true }).fill('No cumplen con el perfil solicitado');
  await page.getByRole('button', { name: 'Confirmar descarte (2)', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(async () => (await readState(page)).applications[1].stage).toBe('no_continua');
  const after = await readState(page);
  expect(after.applications[2].stage).toBe('no_continua');
  expect(after.applications[1].embeddingMatch).toEqual(meetingState.applications[1].embeddingMatch);
  expect(after.candidates[1].savedInTalentPool).toBe(true);
  expect(after.candidates[1].talentPoolOriginJob).toBe(meetingState.jobPostings[0].title);
  expect(after.candidates[1].talentPoolNotes).toContain('No cumplen con el perfil solicitado');
  await page.reload();
  expect((await readState(page)).applications[1].stage).toBe('no_continua');
});


test('columnas permanecen visibles y las acciones cambian en la esquina derecha del banner', async ({ page }) => {
  await page.goto('/#view=avance_candidatos');
  const board = page.getByRole('region', { name: 'Tablero de avance de candidatos', exact: true });
  await expect(board.locator('.workflow-column')).toHaveCount(4);
  await expect(board.locator('.workflow-candidate')).toHaveCount(6);
  const stages = page.getByRole('navigation', { name: 'Etapas del proceso' });
  await stages.getByRole('button', { name: /^Preseleccionado/ }).click();
  const actions = page.getByLabel('Acciones de Preseleccionado', { exact: true });
  await expect(actions.getByRole('button', { name: 'Enviar Multitest', exact: true })).toBeVisible();
  const titleBox = await page.getByRole('heading', { name: 'Especialista en selección', exact: true }).boundingBox();
  const actionBox = await actions.boundingBox();
  expect(actionBox!.x).toBeGreaterThan(titleBox!.x);
  expect(actionBox!.y).toBeLessThan(titleBox!.y + titleBox!.height);
  await expect(board.getByRole('heading', { name: 'Bruno Prueba', exact: true })).toBeVisible();
  await expect(board.getByRole('heading', { name: 'Ana Prueba', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cambiar tema de apariencia', exact: true }).click();
  await page.screenshot({ path: '/tmp/gth-kanban-banner-desktop.png', fullPage: true });
  await stages.getByRole('button', { name: /^En entrevista/ }).click();
  await expect(page.getByLabel('Acciones de En entrevista', { exact: true }).getByRole('button', { name: 'Agendar entrevista', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar Multitest', exact: true })).toHaveCount(0);
  await stages.getByRole('button', { name: /^Contratado/ }).click();
  await expect(page.getByRole('button', { name: 'Agendar entrevista', exact: true })).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await expect(page.getByLabel('Buscar candidato por nombre')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '/tmp/gth-kanban-banner-mobile.png', fullPage: true });
  await board.scrollIntoViewIfNeeded();
  await board.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => board.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await page.screenshot({ path: '/tmp/gth-kanban-columns-mobile.png', fullPage: true });
});


test('cabeceras conservan los colores del sistema y la selección de columna', async ({ page }) => {
  await page.goto('/#view=avance_candidatos');
  const stages = page.getByRole('navigation', { name: 'Etapas del proceso' });
  const postulado = stages.getByRole('button', { name: /^Postulado/ });
  const preseleccionado = stages.getByRole('button', { name: /^Preseleccionado/ });
  const read = async () => stages.evaluate(el => {
    const buttons = el.querySelectorAll('button');
    const selected = getComputedStyle(buttons[0]);
    const normal = getComputedStyle(buttons[1]);
    return { selected: selected.backgroundColor, normal: normal.backgroundColor, align: selected.textAlign,
      title: getComputedStyle(buttons[0].querySelector('.workflow-stage-title')!).display,
      description: getComputedStyle(buttons[0].querySelector('.workflow-stage-description')!).display };
  });
  const styles = await read();
  expect(styles.selected).not.toBe(styles.normal); expect(styles.align).toBe('left');
  expect(styles.title).toBe('flex'); expect(styles.description).toBe('block');
  await preseleccionado.click();
  await expect(preseleccionado).toHaveAttribute('aria-pressed', 'true');
  await expect(postulado).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await read()).normal).toBe(styles.selected);
});


test('tarjetas compactas muestran datos breves sin controles ni enlaces de perfil', async ({ page }) => {
  await page.goto('/#view=avance_candidatos');
  const board = page.getByRole('region', { name: 'Tablero de avance de candidatos', exact: true });
  const card = board.getByRole('article', { name: 'Bruno Prueba', exact: true });
  await expect(card.getByRole('heading', { name: 'Bruno Prueba', exact: true })).toBeVisible();
  await expect(card).toContainText('Especialista');
  await expect(card.locator('strong').first()).toHaveText('Datos de prueba');
  await expect(card).toContainText('0.88'); await expect(card).toContainText('#2 del ranking');
  await expect(board.locator('.workflow-candidate').getByRole('button', { name: /perfil|ficha/i })).toHaveCount(0);
  await expect(board.getByRole('link')).toHaveCount(0);
  await expect(board.locator('.workflow-name button, button.workflow-name')).toHaveCount(0);
  expect(await card.getByRole('button').count()).toBe(2);
  expect(await card.getByRole('button').last().evaluate(el => getComputedStyle(el).borderStyle)).toBe('none');
  expect(await card.boundingBox().then(box => box!.height)).toBeLessThan(165);
  await card.getByRole('heading').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/gth-compact-cards-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await board.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '/tmp/gth-compact-cards-mobile.png', fullPage: true });
});
