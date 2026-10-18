import { test, expect } from '@playwright/test';
import { instalarSupabaseFicticio, responderBaseFicticia } from '../fixtures/supabaseMock.ts';
import type { FilaBase } from '../../src/services/baseCentralizada.ts';

const fila = (extra: Partial<FilaBase>): FilaBase => ({
  persona_id: 'qa-base-1', aviso_id: 'qa-aviso-1', aviso_titulo: 'Especialista en Gestión del Talento Humano y Desarrollo Organizacional',
  aviso_area: 'Gestión del Talento Humano', id_postulante: 'qa-1', nombre: 'Ana', apellido: 'Prueba', email: 'ana@example.test', telefono: null,
  fecha_postulacion: '2026-10-14', ciudad: 'Lima', puesto_actual: 'Especialista en selección', empresa_actual: 'Empresa de prueba',
  area_experiencia: 'Recursos humanos', estudio: 'Administración', nivel_estudio: 'Universitario', estado_estudio: 'Graduado',
  institucion: 'Universidad de prueba', idiomas: 'Inglés - Intermedio / Español - Nativo', cv_url: null, sin_cv: true, ...extra,
});
const rows = [fila({}), fila({ aviso_id: 'qa-aviso-2', aviso_titulo: 'Analista de operaciones', aviso_area: 'Operaciones' }),
  fila({ persona_id: 'qa-base-2', id_postulante: 'qa-2', nombre: 'Bruno', email: 'bruno@example.test', ciudad: 'Arequipa', idiomas: 'Español - Nativo' }),
  fila({ persona_id: 'qa-base-3', id_postulante: 'qa-3', nombre: 'Carla', email: 'carla@example.test', ciudad: 'Lima', idiomas: 'Inglés - Avanzado' })];

test('base centralizada organiza filtros sin estrecharlos y conserva búsqueda y selección', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await instalarSupabaseFicticio(page);
  await responderBaseFicticia(page, rows);
  await page.goto('/#view=base_centralizada');
  const panel = page.getByRole('region', { name: 'Búsqueda y filtros de postulantes', exact: true });
  await expect(panel.getByRole('status')).toHaveText('Mostrando 3 de 3 personas');
  await expect(panel.getByLabel('Área del aviso', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/gth-base-collapsed-desktop.png', fullPage: true });
  await panel.getByRole('button', { name: 'Filtros', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Filtros', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await panel.getByLabel('Ciudad o distrito', { exact: true }).selectOption('Lima');
  await expect(panel.getByRole('status')).toHaveText('Mostrando 2 de 3 personas');
  await panel.getByLabel('Idioma', { exact: true }).selectOption('Inglés');
  await panel.getByLabel('Nivel de idioma', { exact: true }).selectOption('Avanzado');
  await expect(panel.getByRole('status')).toHaveText('Mostrando 1 de 3 personas');
  await panel.getByRole('button', { name: 'Filtros (3)', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Quitar filtro Ciudad: Lima', exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Quitar filtro Idioma: Inglés', exact: true }).click();
  await expect(panel.getByRole('button', { name: /Quitar filtro Nivel de idioma/ })).toHaveCount(0);
  await expect(panel.getByRole('status')).toHaveText('Mostrando 2 de 3 personas');
  await panel.getByLabel('Buscar postulantes', { exact: true }).fill('Ana');
  await expect(panel.getByRole('status')).toHaveText('Mostrando 1 de 3 personas');
  await panel.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('Mostrando 3 de 3 personas');
  await panel.getByRole('button', { name: 'Filtros', exact: true }).click();
  await page.screenshot({ path: '/tmp/gth-base-expanded-light-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Cambiar tema de apariencia', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await page.screenshot({ path: '/tmp/gth-base-expanded-dark-desktop.png', fullPage: true });
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await panel.locator('select').evaluateAll((items) => items.every((item) => item.getBoundingClientRect().width >= 220))).toBe(true);
    await page.screenshot({ path: `/tmp/gth-base-expanded-dark-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});
