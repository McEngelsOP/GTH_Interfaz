import { test, expect, Page } from '@playwright/test';
import { INITIAL_APP_STATE } from '../../src/data/initialData.ts';
import { createPendingApplication } from '../../src/services/workflow.ts';
import { Candidate } from '../../src/types/index.ts';

const people: Candidate[] = [
  { id: 'fake-chat-1', name: 'Ana Ejemplo', email: 'PRIVATE_EMAIL@example.com', phone: 'PRIVATE_PHONE', currentTitle: 'Analista', currentCompany: 'Empresa inventada', source: 'Prueba', summary: '', rawCvText: 'PRIVATE_CV', savedInTalentPool: false },
  { id: 'fake-chat-2', name: 'Zoe Prueba', email: 'OTHER_PRIVATE_EMAIL@example.com', phone: 'OTHER_PRIVATE_PHONE', currentTitle: 'Analista', currentCompany: 'Empresa inventada', source: 'Prueba', summary: '', rawCvText: 'OTHER_PRIVATE_CV', savedInTalentPool: false },
];
const job = INITIAL_APP_STATE.jobPostings.find((item) => item.id === INITIAL_APP_STATE.activeJobPostingId)!;
const fixture = { ...INITIAL_APP_STATE, candidates: people, applications: people.map((person) => createPendingApplication(person.id, job)) };
const open = async (page: Page) => { await page.goto('/#view=mejores_candidatos'); await page.getByRole('button', { name: 'Asistente GTH', exact: true }).click(); };
const configuration = { configured: true, model: 'gemini-3.5-flash-lite', provider: 'Google Gemini' };

test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')) localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(state));
  }, fixture);
});

test('chatbot reactivado muestra guía y bloquea envío cuando falta la clave', async ({ page }) => {
  await page.route('**/api/chat', (route) => route.fulfill({ json: { ...configuration, configured: false } }));
  await open(page);
  const dialog = page.getByRole('dialog', { name: 'Asistente GTH · Gemini' });
  await expect(dialog.getByText('Pendiente de configurar', { exact: true })).toBeVisible();
  await expect(dialog.getByText('GEMINI_API_KEY', { exact: true })).toBeVisible();
  await expect(dialog.getByText('etapa_1 → Settings → Environment Variables', { exact: true })).toBeVisible();
  await dialog.getByLabel('Pregunta al asistente', { exact: true }).fill('Hola');
  await expect(dialog.getByRole('button', { name: 'Enviar consulta', exact: true })).toBeDisabled();
  await expect(dialog.locator('input[type="password"]')).toHaveCount(0);
  await page.screenshot({ path: '../gemini-setup.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByLabel('Pregunta al asistente', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '../gemini-mobile.png', fullPage: true });
});

test('conexión, conversación e inclusión opcional envían solo el contexto permitido', async ({ page }) => {
  const requests: any[] = [];
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: configuration });
    const body = route.request().postDataJSON(); requests.push(body);
    return route.fulfill({ json: { text: body.action === 'check' ? 'Conexión correcta.' : 'Hay dos perfiles pendientes de evaluación LLM.', model: configuration.model } });
  });
  await open(page);
  const dialog = page.getByRole('dialog', { name: 'Asistente GTH · Gemini' });
  await expect(dialog.getByRole('region', { name: 'Ayuda de conexión' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Opciones del asistente', exact: true }).click();
  await dialog.getByRole('button', { name: 'Probar conexión', exact: true }).click();
  await expect(dialog.getByText('Conexión verificada', { exact: true })).toBeVisible();
  expect(requests[0]).toEqual({ action: 'check' });
  await dialog.getByLabel('Pregunta al asistente', { exact: true }).fill('¿Cuántos candidatos hay?');
  await dialog.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await expect(dialog.getByRole('log')).toContainText('Hay dos perfiles pendientes');
  await expect(dialog.getByRole('region', { name: 'Ayuda de conexión' })).toHaveCount(0);
  await expect(dialog.getByText('GEMINI_API_KEY', { exact: true })).toHaveCount(0);
  expect(requests[1].context.metrics.totalProcessed).toBe(2);
  expect(requests[1].context.candidateSummaries).toEqual([]);
  await dialog.getByLabel('Pregunta al asistente', { exact: true }).fill('¿Qué hace falta?');
  await dialog.getByLabel('Pregunta al asistente', { exact: true }).press('Enter');
  await expect(dialog.getByRole('log').getByText('¿Qué hace falta?', { exact: true })).toBeVisible();
  expect(requests[2].history).toHaveLength(2);
  await dialog.getByRole('checkbox').check();
  await expect(dialog.locator('.assistant-message')).toHaveCount(0);
  await dialog.getByLabel('Pregunta al asistente', { exact: true }).fill('¿Quiénes están pendientes?');
  await dialog.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await expect(dialog.getByRole('log')).toContainText('¿Quiénes están pendientes?');
  expect(requests[3].history).toEqual([]);
  expect(requests[3].context.candidateSummaries.map((person: any) => person.name)).toEqual(['Ana Ejemplo', 'Zoe Prueba']);
  expect(JSON.stringify(requests)).not.toMatch(/PRIVATE_EMAIL|PRIVATE_PHONE|PRIVATE_CV|GEMINI_API_KEY/);
  await page.screenshot({ path: '../gemini-conversation.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  await page.getByRole('combobox', { name: 'Convocatoria activa' }).selectOption('REQ-2026-ADM-032');
  await page.getByRole('button', { name: 'Asistente GTH', exact: true }).click();
  await expect(dialog.locator('.assistant-message')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Opciones del asistente', exact: true }).click();
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
});

test('errores de Gemini conservan la pregunta y permiten reintentar sin inventar respuestas', async ({ page }) => {
  let fail = true;
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: configuration });
    if (fail) return route.fulfill({ status: 429, json: { error: 'Gemini alcanzó el límite de consultas o cuota de tu proyecto.' } });
    return route.fulfill({ json: { text: 'La evaluación sigue pendiente.', model: configuration.model } });
  });
  await open(page);
  const dialog = page.getByRole('dialog', { name: 'Asistente GTH · Gemini' });
  const question = dialog.getByLabel('Pregunta al asistente', { exact: true });
  await question.fill('¿Qué falta para elegir Top-N?');
  await dialog.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('cuota');
  await expect(dialog.getByRole('region', { name: 'Ayuda de conexión' })).toHaveCount(0);
  await expect(question).toHaveValue('¿Qué falta para elegir Top-N?');
  await expect(dialog.locator('.assistant-message')).toHaveCount(0);
  fail = false;
  await dialog.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await expect(dialog.getByRole('log')).toContainText('La evaluación sigue pendiente.');
  await expect(dialog.getByRole('alert')).toHaveCount(0);
});

test('cerrar una consulta en curso cancela su respuesta y deja el asistente listo', async ({ page }) => {
  let resolveRequest: (() => void) | undefined;
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: configuration });
    await new Promise<void>((resolve) => { resolveRequest = resolve; });
    await route.fulfill({ json: { text: 'Respuesta de una consulta cancelada.', model: configuration.model } }).catch(() => {});
  });
  await open(page);
  const dialog = page.getByRole('dialog', { name: 'Asistente GTH · Gemini' });
  await dialog.getByLabel('Pregunta al asistente', { exact: true }).fill('Prueba de cancelación');
  await dialog.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('preparando');
  await expect.poll(() => Boolean(resolveRequest)).toBe(true);
  await dialog.getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  resolveRequest!();
  await page.getByRole('button', { name: 'Asistente GTH', exact: true }).click();
  await expect(dialog.getByText('Clave configurada', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await expect(dialog.getByRole('log')).not.toContainText('Respuesta de una consulta cancelada.');
});


test('la guía aparece al perder conexión y desaparece tras un reintento correcto', async ({ page }) => {
  let fail = true;
  await page.route('**/api/chat', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: configuration });
    return fail ? route.fulfill({ status: 502, json: { error: 'No se pudo conectar con Gemini.' } })
      : route.fulfill({ json: { text: 'La conexión se recuperó.', model: configuration.model } });
  });
  await open(page);
  const dialog = page.getByRole('dialog', { name: 'Asistente GTH · Gemini' });
  await expect(dialog.getByRole('region', { name: 'Ayuda de conexión' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Avance de candidatos', exact: true }).click();
  await expect(dialog.getByText('Sin conexión', { exact: true })).toBeVisible();
  await dialog.getByText('Revisar conexión con Gemini', { exact: true }).click();
  await expect(dialog.getByText('GEMINI_API_KEY', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Pregunta al asistente', { exact: true })).toHaveValue('¿Cuántos candidatos hay y en qué etapas están?');
  fail = false;
  await dialog.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await expect(dialog.getByRole('log')).toContainText('La conexión se recuperó.');
  await expect(dialog.getByRole('region', { name: 'Ayuda de conexión' })).toHaveCount(0);
  await expect(dialog.getByText('GEMINI_API_KEY', { exact: true })).toHaveCount(0);
});

test('guía desaparece al configurar la clave y el chat conserva espacio en móvil', async ({ page }) => {
  let configured = false;
  await page.route('**/api/chat', (route) => route.request().method() === 'GET'
    ? route.fulfill({ json: { ...configuration, configured } })
    : route.fulfill({ json: { text: 'Resultado registrado. '.repeat(200), model: configuration.model } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const dialog = page.getByRole('dialog', { name: 'Asistente GTH · Gemini' });
  await expect(dialog.getByText('GEMINI_API_KEY', { exact: true })).toBeVisible();
  configured = true;
  await dialog.getByRole('button', { name: 'Volver a revisar', exact: true }).click();
  await expect(dialog.getByText('Clave configurada', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Ayuda de conexión' })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Probar conexión', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('log')).toBeVisible();
  await page.screenshot({ path: '../chatbot-design-mobile.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Criterios de evaluación', exact: true }).click();
  await expect(dialog.getByRole('log')).toContainText('Resultado registrado.');
  const composer = dialog.getByLabel('Pregunta al asistente', { exact: true });
  const box = await composer.boundingBox();
  expect(box!.y + box!.height).toBeLessThan(844);
  const log = dialog.getByRole('log');
  expect(await log.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(await dialog.evaluate((el) => el.contains(document.elementFromPoint(innerWidth - 40, 30)))).toBe(true);
  await page.screenshot({ path: '../chatbot-design-mobile-conversation.png', fullPage: true });
});
