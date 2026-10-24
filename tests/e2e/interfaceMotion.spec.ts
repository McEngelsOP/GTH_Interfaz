import { expect, test } from '@playwright/test';
import { estadoConConvocatoriaDePrueba } from '../fixtures/convocatoriaDePrueba.ts';

const titles = ['Zootecnista', 'asistente 10', 'Ánalista de selección', 'asistente 2', 'Ñandú', 'Nutricionista'];
const orderedTitles = ['Ánalista de selección', 'asistente 2', 'asistente 10', 'Nutricionista', 'Ñandú', 'Zootecnista'];

test.beforeEach(async ({ page }) => {
  const state = estadoConConvocatoriaDePrueba();
  state.jobPostings = titles.map((title, index) => ({
    ...structuredClone(state.jobPostings[0]), id: `QA-MOTION-${index}`, code: `QA-${index}`, title,
  }));
  state.activeJobPostingId = state.jobPostings[0].id;
  await page.addInitScript((value) => {
    localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(value));
  }, state);
});

test('convocatorias y selector comparten orden alfabético en español, también al filtrar', async ({ page }) => {
  await page.goto('/#view=convocatorias');
  await expect(page.locator('.conv-fila-titulo')).toHaveText(orderedTitles);
  await page.screenshot({ path: '/tmp/gth-ui-convocatorias.png' });
  await page.getByRole('textbox', { name: 'Buscar convocatorias' }).fill('asistente');
  await expect(page.locator('.conv-fila-titulo')).toHaveText(['asistente 2', 'asistente 10']);
  await page.getByRole('button', { name: 'Ver candidatos de asistente 2', exact: true }).click();
  const select = page.getByRole('combobox', { name: 'Convocatoria activa' });
  await expect(select.locator('option')).toHaveText(orderedTitles.map((title) => `${title} · QA-${titles.indexOf(title)}`));
  await select.selectOption('QA-MOTION-2');
  await expect(page.getByRole('heading', { name: 'Ánalista de selección', exact: true })).toBeVisible();
});

test('sombrero y botón inferior expanden sin navegar, con teclado y cambios rápidos', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#view=convocatorias');
  const brand = page.locator('.sidebar-brand-toggle');
  const shell = page.locator('.sidebar-shell');
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await brand.click();
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(async () => Math.round((await shell.boundingBox())!.width)).toBe(68);
  await page.screenshot({ path: '/tmp/gth-ui-sidebar-compact.png' });
  await brand.focus();
  await page.keyboard.press('Enter');
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(async () => Math.round((await shell.boundingBox())!.width)).toBe(260);
  await brand.click();
  await page.locator('.sidebar-footer-toggle').click();
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await brand.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); element.click(); });
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(async () => Math.round((await shell.boundingBox())!.width)).toBe(68);
  await expect(page).toHaveURL(/view=convocatorias/);
  expect(errors).toEqual([]);
});

test('menú móvil muestra etiquetas tras contraer en escritorio, contiene el foco y cierra con Escape', async ({ page }) => {
  await page.goto('/#view=convocatorias');
  await page.locator('.sidebar-brand-toggle').click();
  await page.setViewportSize({ width: 390, height: 844 });
  const opener = page.getByRole('button', { name: 'Abrir menú de navegación' });
  await opener.click();
  const menu = page.getByRole('dialog', { name: 'Menú de navegación' });
  await expect(menu.getByText('Proceso de selección', { exact: true })).toBeVisible();
  await expect(menu.getByText('Candidatos y ranking', { exact: true })).toBeVisible();
  await expect.poll(async () => Math.round((await menu.boundingBox())!.x)).toBe(0);
  await page.screenshot({ path: '/tmp/gth-ui-sidebar-mobile.png' });
  await page.keyboard.press('Shift+Tab');
  expect(await menu.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole('navigation').getByRole('button', { name: 'Candidatos y ranking', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Menú de navegación' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Convocatoria activa' })).toBeVisible();
});

test('Top-N conserva controles y alineación en escritorio y móvil, sin desbordar su banner', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  const input = page.getByRole('spinbutton', { name: 'Cantidad Top-N' });
  await expect(input).toBeVisible();
  const previous = Number(await input.inputValue());
  await page.getByRole('button', { name: 'Aumentar Top-N' }).click();
  await expect(input).toHaveValue(String(previous + 1));
  await page.getByRole('button', { name: 'Reducir Top-N' }).click();
  await expect(input).toHaveValue(String(previous));
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await page.locator('.ranking-actions').evaluate(element => {
      const box = element.getBoundingClientRect();
      const cards = [...element.querySelectorAll('.ranking-dato')];
      return { fits: box.right <= innerWidth && box.left >= 0 && element.scrollWidth <= element.clientWidth + 1,
        centered: cards.every(card => getComputedStyle(card).alignItems === 'center' && getComputedStyle(card).textAlign === 'center') };
    });
    expect(result).toEqual({ fits: true, centered: true });
    const controlTops = await page.locator('.topn-stepper > *').evaluateAll(elements =>
      elements.map(element => Math.round(element.getBoundingClientRect().top)));
    expect(new Set(controlTops).size).toBe(1);
    if (width <= 768) await expect(page.locator('.sidebar-shell')).toBeHidden();
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: `/tmp/gth-ui-ranking-${width}.png` });
      await page.getByRole('button', { name: 'Cambiar tema de apariencia' }).click();
      await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
      await page.screenshot({ path: `/tmp/gth-ui-ranking-dark-${width}.png` });
      await page.getByRole('button', { name: 'Cambiar tema de apariencia' }).click();
      await page.getByRole('button', { name: 'Cambiar tema de apariencia' }).click();
      await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
    }
  }
});

test('movimiento reducido elimina desplazamientos y mantiene operativa la navegación', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#view=convocatorias');
  const brand = page.locator('.sidebar-brand-toggle');
  await brand.click();
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  const milliseconds = await page.locator('.sidebar-shell').evaluate(element =>
    getComputedStyle(element).transitionDuration.split(',').map(value => parseFloat(value) * 1000));
  expect(milliseconds.every(value => value < 1)).toBe(true);
  await brand.click();
  await page.getByRole('navigation').getByRole('button', { name: 'Candidatos y ranking', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Cantidad Top-N' })).toBeVisible();
});
