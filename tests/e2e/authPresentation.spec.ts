import { expect, test, type Page } from '@playwright/test';

// Ejecutar con GTH_TEST_AUTH=1, VITE_SUPABASE_URL=https://auth-preview.supabase.co
// y VITE_SUPABASE_ANON_KEY=auth-preview. Todas las respuestas se simulan en el navegador.
test.skip(process.env.GTH_TEST_AUTH !== '1', 'Requiere el servidor con la configuración ficticia de autenticación.');

async function mockAuth(page: Page, options: { temporal?: boolean; sinPerfil?: boolean } = {}) {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'prueba@example.com', aud: 'authenticated',
    role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const jwt = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
  let temporal = options.temporal ?? false;
  const requests: { url: string; method: string; body: any }[] = [];
  await page.route('https://auth-preview.supabase.co/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? request.postDataJSON() : null;
    requests.push({ url: path, method: request.method(), body });
    if (path === '/auth/v1/token') {
      if (body.password === 'incorrecta') return route.fulfill({ status: 400, json: { error: 'invalid_grant', message: 'Invalid login credentials' } });
      return route.fulfill({ json: { access_token: jwt, refresh_token: 'refresh-test', token_type: 'bearer', expires_in: 3600, user } });
    }
    if (path === '/auth/v1/user') return route.fulfill({ json: { user } });
    if (path === '/rest/v1/gth_perfiles') return route.fulfill({ json: options.sinPerfil ? null : {
      user_id: user.id, email: user.email, nombre: 'Cuenta de prueba', nivel: 'general',
      secciones: null, avisos: null, activo: true, debe_cambiar_clave: temporal,
    } });
    if (path === '/rest/v1/rpc/gth_clave_cambiada') { temporal = false; return route.fulfill({ json: null }); }
    return route.fulfill({ json: [] });
  });
  return requests;
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`acceso a ${viewport.width}×${viewport.height}: introducción, tamaño y controles`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await mockAuth(page);
    await page.goto('/');
    const screen = page.locator('.auth-screen');
    await expect(screen).toHaveClass(/auth-intro/);
    await expect(page.locator('.auth-card')).toHaveAttribute('inert', '');
    const started = Date.now();
    await expect(screen).not.toHaveClass(/auth-intro/, { timeout: 4000 });
    expect(Date.now() - started).toBeGreaterThan(1800);
    await expect(page.locator('.auth-card')).not.toHaveAttribute('inert');
    const layout = await page.evaluate(() => {
      const brand = document.querySelector('.auth-lockup')!.getBoundingClientRect();
      const card = document.querySelector('.auth-card')!.getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth,
        overlap: brand.left < card.right && brand.right > card.left && brand.top < card.bottom && brand.bottom > card.top,
        autoFocus: document.activeElement?.tagName === 'INPUT',
        controls: Array.from(document.querySelectorAll('.auth-card input, .auth-card button')).map(el => ({
          width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
          font: parseFloat(getComputedStyle(el).fontSize),
        })) };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.overlap).toBe(false);
    expect(layout.autoFocus).toBe(false);
    for (const control of layout.controls) { expect(control.height).toBeGreaterThanOrEqual(44); expect(control.width).toBeGreaterThan(200); }
    expect(layout.controls[0].font).toBeGreaterThanOrEqual(16);
    await page.getByLabel('Correo').fill('prueba@example.com');
    await page.getByLabel('Contraseña', { exact: false }).fill('incorrecta');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
    await page.screenshot({ path: info.outputPath('login.png'), fullPage: true });
  });
}

test('inicio → cambio de clave → aplicación, sin repetir introducción', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await mockAuth(page, { temporal: true });
  await page.goto('/');
  await expect(page.locator('.auth-screen')).not.toHaveClass(/auth-intro/, { timeout: 5000 });
  await page.getByLabel('Correo').fill('prueba@example.com');
  await page.getByLabel('Contraseña', { exact: false }).fill('temporal-prueba');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const form = page.getByRole('form', { name: 'Cambiar contraseña' });
  await expect(form).toBeVisible();
  await expect(page.locator('.auth-screen')).not.toHaveClass(/auth-intro/);
  await form.getByLabel('Nueva contraseña').fill('clave-nueva-123');
  await form.getByLabel('Repite la contraseña').fill('no-coincide');
  await form.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByRole('alert')).toHaveText('Las contraseñas no coinciden.');
  expect(requests.filter(r => r.url === '/auth/v1/user' && r.method === 'PUT')).toHaveLength(0);
  await form.getByLabel('Repite la contraseña').fill('clave-nueva-123');
  await form.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.locator('.auth-screen')).toHaveCount(0);
  await expect(page.locator('.app-main')).toBeVisible();
  expect(requests.find(r => r.url === '/auth/v1/user' && r.method === 'PUT')?.body.password).toBe('clave-nueva-123');
  expect(requests.some(r => r.url === '/rest/v1/rpc/gth_clave_cambiada')).toBe(true);
});

test('movimiento reducido y tema oscuro: formulario inmediato y legible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify({ theme: 'dark' })));
  await mockAuth(page);
  await page.goto('/');
  await expect(page.locator('.auth-screen')).not.toHaveClass(/auth-intro/);
  await expect(page.locator('.auth-card')).not.toHaveAttribute('inert');
  await expect(page.getByLabel('Correo')).toHaveCSS('color', 'rgb(31, 36, 48)');
  await expect(page.getByLabel('Correo')).toHaveCSS('background-color', 'rgb(255, 254, 253)');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Correo')).toBeFocused();
});

test('cuenta sin perfil activo conserva la presentación y permite salir', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = await mockAuth(page, { sinPerfil: true });
  await page.goto('/');
  await page.getByLabel('Correo').fill('prueba@example.com');
  await page.getByLabel('Contraseña', { exact: false }).fill('temporal-prueba');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Sin acceso' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
  expect(requests.some(r => r.url === '/auth/v1/logout')).toBe(true);
});
