import { test, expect, Page } from '@playwright/test';

const settings = '/#view=ajustes_generales&job=REQ-2026-DOC-088';
const appearance = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(name) });
const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const settled = (page: Page) => expect(page.locator('html')).not.toHaveClass(/theme-transition/);

async function captureThemeChange(page: Page) {
  return page.evaluate(async () => {
    const values = [getComputedStyle(document.body).backgroundColor];
    (document.querySelector('[aria-label="Cambiar tema de apariencia"]') as HTMLButtonElement).click();
    const end = performance.now() + 750;
    while (performance.now() < end) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      values.push(getComputedStyle(document.body).backgroundColor);
    }
    return values;
  });
}

for (const fallback of [false, true]) {
  test(`tema cambia gradualmente en ambas direcciones${fallback ? ' con compatibilidad alternativa' : ''}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
    if (fallback) await page.addInitScript(() => { Object.defineProperty(CSS, 'registerProperty', { value: undefined }); });
    await page.goto(settings);
    const light = await background(page);
    const towardDark = await captureThemeChange(page);
    expect(new Set(towardDark).size).toBeGreaterThan(4);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const dark = await background(page);
    expect(dark).not.toBe(light);
    // Dark -> system resolves to light on this device.
    const towardLight = await captureThemeChange(page);
    expect(new Set(towardLight).size).toBeGreaterThan(4);
    await settled(page);
    expect(await background(page)).toBe(light);
    await page.reload();
    expect(await background(page)).toBe(light);
  });
}

test('sincronización sigue al sistema y respeta las elecciones manuales', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
  await page.goto(settings);
  await appearance(page, 'Sincronizar con Sistema').click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveClass(/theme-transition/);
  await settled(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await settled(page);
  await appearance(page, 'Modo Oscuro').click();
  await settled(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
});

test('cambios rápidos conservan el último tema en escritorio y celular', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(settings);
    await appearance(page, 'Modo Claro').click();
    await settled(page);
    await appearance(page, 'Modo Oscuro').click();
    await page.waitForTimeout(120);
    await appearance(page, 'Modo Claro').click();
    await page.waitForTimeout(120);
    await appearance(page, 'Modo Oscuro').click();
    await settled(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('GTH_ESAN_STATE_V1')!).theme)).toBe('dark');
  }
});

test('tema guardado se aplica antes de cargar React, sin destello claro', async ({ page }) => {
  await page.goto(settings);
  await appearance(page, 'Modo Oscuro').click();
  await settled(page);
  // Hold back the application module to inspect the actual pre-render page.
  await page.route('**/src/main.tsx*', (route) => route.abort());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.locator('#root').textContent()).toBe('');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(20, 23, 28)');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('GTH_ESAN_STATE_V1')!);
    state.theme = 'system';
    localStorage.setItem('GTH_ESAN_STATE_V1', JSON.stringify(state));
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(20, 23, 28)');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(246, 243, 239)');
});

test('reducción de movimiento del sistema y de la app desactiva la transición', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto(settings);
  await appearance(page, 'Modo Oscuro').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('switch').check();
  await appearance(page, 'Modo Claro').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await page.getByRole('switch').uncheck();
  await appearance(page, 'Modo Oscuro').click();
  await expect(page.locator('html')).toHaveClass(/theme-transition/);
  // A preference change during a running transition also stops it.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
});

test('almacenamiento corrupto o bloqueado permite iniciar y cambiar tema', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('GTH_ESAN_STATE_V1', '{invalid'); } catch {} });
  await page.goto(settings);
  await appearance(page, 'Modo Oscuro').click();
  await settled(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.goto(settings);
  await appearance(page, 'Modo Oscuro').click();
  await settled(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
