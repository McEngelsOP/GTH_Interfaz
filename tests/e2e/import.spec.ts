import { test, expect, Page } from '@playwright/test';
import { xlsxFixture } from '../fixtures/xlsx.ts';
import { AppStateData } from '../../src/types/index.ts';
import { INITIAL_APP_STATE as LEGACY_DEMO } from '../fixtures/recruitmentData.ts';

const state = (page: Page): Promise<AppStateData> => page.evaluate(() => JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!));
const upload = (page: Page, csv: string) => page.getByLabel('Archivo de candidatos').setInputFiles({ name: 'perfiles-ficticios-prueba.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
const headers = ['Nombre', 'Apellido', 'E-Mail', 'Tipo Documento', 'Nro. Documento', 'Exp[1] Puesto', 'Exp[1] Empresa', 'Exp[1] Descripción', 'Est[1] Titulo'];
const csv = 'Aviso de prueba\nProceso de prueba\nFecha de prueba\n\n' + headers.join(';') + '\nAna;Ejemplo;ana@example.com;DNI;00000001;Analista;Empresa ficticia;"Funciones; con detalle\ny varias líneas";Ingeniería\nAna;Ejemplo;ANA@EXAMPLE.COM;DNI;00000001;Analista;Empresa ficticia;"Funciones; con detalle\ny varias líneas";Ingeniería\nLeo;Prueba;leo@example.com;DNI;00000002;Coordinador;Otra empresa;Coordinación;Administración';

test('inicio sin demo, carga CSV real, duplicados, persistencia y otra convocatoria', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#view=mejores_candidatos');
  await expect(page.getByRole('button', { name: 'Importar perfiles', exact: true })).toBeVisible();
  expect((await state(page)).candidates).toEqual([]);
  await page.getByRole('button', { name: 'Importar perfiles', exact: true }).click();
  await expect(page.getByRole('button', { name: /Simulación|Generar lote/ })).toHaveCount(0);
  await upload(page, csv);
  await expect(page.getByText(/Encabezado en fila 5/)).toBeVisible();
  await expect(page.locator('.import-stats').getByText('Repetidos en el lote').locator('..').getByText('1', { exact: true })).toBeVisible();
  expect((await state(page)).candidates).toEqual([]);
  await page.getByRole('button', { name: 'Incorporar perfiles válidos', exact: true }).click();
  await expect(page.getByText('Carga completada', { exact: true })).toBeVisible();
  await expect.poll(async () => (await state(page)).candidates.length).toBe(2);
  const first = await state(page);
  expect(first.applications).toHaveLength(2);
  expect(first.applications.every((app) => app.llmScore === null && app.mandatoryRequirementStatus === 'sin_verificar')).toBe(true);
  expect(first.candidates[0].rawCvText).toContain('varias líneas');
  expect(first.candidates[0].importedProfile?.documentNumber).toBe('00000001');
  await page.getByRole('button', { name: 'Ver candidatos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ana Ejemplo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ana Ejemplo', exact: true }).click();
  await page.getByRole('tab', { name: 'Ver CV', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(/Est\[1\] Titulo: Ingeniería/)).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  await page.reload();
  expect((await state(page)).candidates).toEqual(first.candidates);
  await page.goto('/#view=agregar_archivos');
  await upload(page, csv);
  await expect(page.getByRole('button', { name: 'Incorporar perfiles válidos', exact: true })).toBeDisabled();
  expect((await state(page)).applications).toHaveLength(2);
  await page.getByRole('combobox', { name: 'Convocatoria activa' }).selectOption('REQ-2026-ADM-032');
  await upload(page, csv);
  await page.getByRole('button', { name: 'Incorporar perfiles válidos', exact: true }).click();
  await expect.poll(async () => (await state(page)).applications.length).toBe(4);
  expect((await state(page)).candidates).toHaveLength(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '../import-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('Excel con encabezados en fila 5 consolida experiencia y omite identidades contradictorias', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#view=agregar_archivos');
  const rows = [['Aviso de prueba'], ['Proceso de prueba'], ['Fecha de prueba'], [], headers,
    ['Mía', 'Prueba', 'mia@example.com', 'DNI', '00000005', 'Analista', 'Empresa A', 'Experiencia A', 'Ingeniería'],
    ['Mía', 'Prueba', 'MIA@EXAMPLE.COM', 'DNI', '00000005', 'Analista sénior', 'Empresa B', 'Experiencia B', 'Maestría'],
    ['Persona', 'Distinta', 'mia@example.com', 'DNI', '00000006', 'Otra', '', '', '']];
  await page.getByLabel('Archivo de candidatos').setInputFiles({ name: 'candidatos-prueba.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: xlsxFixture(rows) });
  await expect(page.getByText(/Encabezado en fila 5/)).toBeVisible();
  await expect(page.locator('.import-stats').getByText('Conflictos de identidad').locator('..').getByText('1', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.screenshot({ path: '../import-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Incorporar perfiles válidos', exact: true }).click();
  await expect.poll(async () => (await state(page)).candidates.length).toBe(1);
  const imported = (await state(page)).candidates[0];
  expect(imported.importedProfile?.documentNumber).toBe('00000005');
  expect(imported.rawCvText).toContain('Experiencia A'); expect(imported.rawCvText).toContain('Experiencia B');
  expect(imported.importedProfile?.records).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('lote CSV de 500 perfiles y errores de formato no incorporan registros silenciosamente', async ({ page }) => {
  await page.goto('/#view=agregar_archivos');
  await upload(page, 'ID;Perfil;Categoría;Requisito\n1;Docente;docente;Maestría');
  await expect(page.getByRole('alert')).toContainText('no se identificaron columnas de candidatos');
  await expect(page.getByRole('button', { name: 'Incorporar perfiles válidos', exact: true })).toBeDisabled();
  const lot = 'Nombre;E-Mail;DNI\n' + Array.from({ length: 500 }, (_, index) => `Persona Prueba ${index};persona${index}@example.com;${String(index).padStart(8, '0')}`).join('\n');
  await upload(page, lot);
  await page.getByRole('button', { name: 'Incorporar perfiles válidos', exact: true }).click();
  await expect.poll(async () => (await state(page)).candidates.length).toBe(500);
  expect((await state(page)).applications.every((app) => app.llmScore === null)).toBe(true);
  await page.reload(); expect((await state(page)).candidates).toHaveLength(500);
  await page.getByLabel('Archivo de candidatos').setInputFiles({ name: 'no-procesado.pdf', mimeType: 'application/pdf', buffer: Buffer.from('Prueba ficticia') });
  await expect(page.getByRole('alert')).toContainText('se necesita conectar la extracción documental');
  expect((await state(page)).candidates).toHaveLength(500);
  await page.getByLabel('Archivo de candidatos').setInputFiles({ name: 'archivo-invalido.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('No es un Excel') });
  await expect(page.getByRole('alert')).toContainText('archivo-invalido.xlsx');
  expect((await state(page)).candidates).toHaveLength(500);
});

test('la nueva edición conserva apariencia previa y comienza sin personas ficticias', async ({ page }) => {
  await page.addInitScript((legacy) => localStorage.setItem('GTH_ESAN_STATE_V1', JSON.stringify({ ...legacy, theme: 'dark' })), LEGACY_DEMO);
  await page.goto('/#view=agregar_archivos');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect((await state(page)).candidates).toEqual([]);
  await page.getByRole('button', { name: 'Cambiar tema de apariencia', exact: true }).click();
  await page.reload();
  expect((await state(page)).theme).toBe('system');
});
