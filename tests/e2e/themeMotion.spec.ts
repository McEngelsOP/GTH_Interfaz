import { expect, test } from '@playwright/test';
import { estadoConConvocatoriaDePrueba } from '../fixtures/convocatoriaDePrueba.ts';

test.beforeEach(async ({ page }) => {
  const state = estadoConConvocatoriaDePrueba();
  state.candidates = ['Ana Prueba', 'Bruno Prueba', 'Carla Prueba'].map((name, i) => ({
    id: `motion-person-${i}`, name, email: null, phone: null, currentTitle: 'Analista de prueba',
    currentCompany: 'Empresa ficticia', source: 'Prueba', summary: '', rawCvText: '', savedInTalentPool: false,
  }));
  state.applications = state.candidates.map((candidate, i) => ({
    id: `motion-app-${i}`, candidateId: candidate.id, jobPostingId: state.activeJobPostingId,
    stage: 'postulado', llmScore: null, mandatoryRequirementStatus: 'sin_verificar',
    whyScoreNotes: { explanation: '', strengths: [], evidenceSummary: '' }, criteriaBreakdown: {}, createdAt: '', updatedAt: '',
    embeddingMatch: { score: 1 - i * .2, ranking: i + 1, requirementSims: {}, requirementEvidence: {},
      explanation: '', backend: 'e5', criteriaVersion: state.jobPostings[0].criteriaVersion, evaluatedAt: '' },
  }));
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
  await page.addInitScript(value => localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(value)), state);
});

test('la paleta y las filas cambian al mismo ritmo sin destello ni reinicio', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  await expect(page.getByRole('button', { name: 'Ana Prueba', exact: true })).toBeVisible();
  for (const direction of ['dark', 'light']) {
    const frames = await page.evaluate(async () => {
      const row = document.querySelector('tbody tr')!;
      const button = document.querySelector('.ui-button-primary')!;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const rgb = (color: string) => {
        ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      const values: { t: number; surface: number[]; row: number[]; expectedRow: number[]; button: number[]; expectedButton: number[] }[] = [];
      const start = performance.now();
      (document.querySelector('[aria-label="Cambiar tema de apariencia"]') as HTMLButtonElement).click();
      while (performance.now() - start < 850) {
        await new Promise(requestAnimationFrame);
        const root = getComputedStyle(document.documentElement);
        values.push({ t: Math.round(performance.now() - start), surface: rgb(root.getPropertyValue('--bg-base')),
          row: rgb(getComputedStyle(row).backgroundColor), expectedRow: rgb(root.getPropertyValue('--status-verified-bg')),
          button: rgb(getComputedStyle(button).backgroundColor), expectedButton: rgb(root.getPropertyValue('--primary-red')) });
      }
      return values;
    });
    const difference = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    const during = frames.filter(frame => frame.t > 40 && frame.t < 420);
    const worstRow = Math.max(...during.map(frame => difference(frame.row, frame.expectedRow)));
    const worstButton = Math.max(...during.map(frame => difference(frame.button, frame.expectedButton)));
    expect(worstRow).toBeLessThan(8);
    expect(worstButton).toBeLessThan(8);
    const luminance = frames.map(frame => frame.surface.slice(0, 3).reduce((a, b) => a + b) / 3);
    for (let i = 1; i < luminance.length; i++) {
      expect(direction === 'dark' ? luminance[i] - luminance[i - 1] : luminance[i - 1] - luminance[i]).toBeLessThan(3);
    }
    await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  }
});

test('compatibilidad sin propiedades registradas: fondos sincronizados en ambos sentidos', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(CSS, 'registerProperty', { value: undefined }); });
  await page.goto('/#view=mejores_candidatos');
  await expect(page.locator('.candidate-ranking-table')).toBeVisible();
  for (const direction of ['dark', 'light']) {
    const frames = await page.evaluate(async () => {
      const samples: { body: string; main: string }[] = [];
      (document.querySelector('[aria-label="Cambiar tema de apariencia"]') as HTMLButtonElement).click();
      const end = performance.now() + 600;
      while (performance.now() < end) {
        await new Promise(requestAnimationFrame);
        samples.push({ body: getComputedStyle(document.body).backgroundColor,
          main: getComputedStyle(document.querySelector('.app-main')!).backgroundColor });
      }
      return samples;
    });
    expect(new Set(frames.map(frame => frame.body)).size).toBeGreaterThan(4);
    expect(frames.every(frame => frame.body === frame.main)).toBe(true);
    expect(frames.at(-1)!.body).toBe(direction === 'dark' ? 'rgb(20, 23, 28)' : 'rgb(246, 243, 239)');
    await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  }
});

test('cambios rápidos de tema respetan la última elección en escritorio y móvil', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(async () => {
      const control = document.querySelector('[aria-label="Cambiar tema de apariencia"]') as HTMLButtonElement;
      for (let i = 0; i < 4; i++) { control.click(); await new Promise(resolve => setTimeout(resolve, 45)); }
    });
    await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
    // El primer grupo termina en oscuro; el siguiente termina en «sistema», que resuelve a claro.
    await expect(page.locator('body')).toHaveCSS('background-color', width === 1440 ? 'rgb(20, 23, 28)' : 'rgb(246, 243, 239)');
  }
});

test('secciones y pestañas animan el cambio sin perder búsqueda, densidad ni selección', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#view=mejores_candidatos');
  const search = page.getByPlaceholder('Buscar por nombre, puesto u organización...');
  await search.fill('Ana');
  await page.getByRole('button', { name: 'Compacta', exact: true }).click();
  await page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Ana Prueba', exact: true }) }).getByRole('checkbox').check();
  const motion = await page.evaluate(async () => {
    const tabs = document.querySelector('[role="tablist"]')!;
    (tabs.querySelectorAll('button')[1] as HTMLButtonElement).click();
    await new Promise(requestAnimationFrame);
    return {
      content: document.querySelector('.candidate-results')!.getAnimations().map(animation => Number(animation.effect?.getTiming().duration)),
      indicator: document.querySelector('.tabs-indicator')!.getAnimations().length,
    };
  });
  expect(motion.content.some(duration => duration >= 100 && duration <= 300)).toBe(true);
  expect(motion.indicator).toBeGreaterThan(0);
  await expect(search).toHaveValue('Ana');
  await expect(page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Ana Prueba', exact: true }) }).getByRole('checkbox')).toBeChecked();
  await expect(page.locator('.candidate-ranking-table')).toHaveCSS('font-size', '12.48px');
  await page.getByRole('tab', { name: /^Top-N/ }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: /^Todos/ })).toBeFocused();
  await expect(page.getByRole('tab', { name: /^Todos/ })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: /^En proceso/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Comparador', exact: true }).click();
  const routeAnimation = await page.evaluate(async () => {
    (document.querySelector('[aria-label="Avance de candidatos"]') as HTMLButtonElement).click();
    await new Promise(requestAnimationFrame);
    return document.querySelector('.view-content')!.getAnimations().map(animation => (animation as CSSAnimation).animationName);
  });
  expect(routeAnimation).toContain('viewChange');
  await expect(page.getByRole('heading', { name: 'Avance de candidatos', exact: true })).toBeVisible();
  const bannerMotion = await page.evaluate(async () => {
    (document.querySelectorAll('.workflow-stage')[1] as HTMLButtonElement).click();
    await new Promise(requestAnimationFrame);
    return document.querySelector('.workflow-banner-actions')!.getAnimations().length;
  });
  expect(bannerMotion).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Configurar Multitest', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('pestañas del perfil y sus indicadores se adaptan a móvil sin desplazar toda la página', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button', { name: 'Ana Prueba', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const motion = await dialog.evaluate(async element => {
    (element.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement).click();
    await new Promise(requestAnimationFrame);
    return element.querySelector('.candidate-tab-content')!.getAnimations().length;
  });
  expect(motion).toBeGreaterThan(0);
  await expect(dialog.getByText('Similitud del perfil con cada requisito del aviso (0-100 dentro del aviso) y la parte del perfil que la respalda.')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog.getByRole('tab', { name: 'Por qué este puntaje', exact: true }).focus();
  await page.keyboard.press('Home');
  await expect(dialog.getByRole('tab', { name: 'Perfil', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/gth-motion-profile-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('movimiento reducido cancela animaciones en curso y permite seguir cambiando pestañas', async ({ page }) => {
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('tab', { name: /^Top-N/ }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.locator('.candidate-results').evaluate(element => element.getAnimations().length)).toBe(0);
  await page.getByRole('tab', { name: /^Todos/ }).click();
  expect(await page.locator('.candidate-results').evaluate(element => element.getAnimations().length)).toBe(0);
  await page.getByRole('button', { name: 'Cambiar tema de apariencia' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await expect(page.getByRole('button', { name: 'Ana Prueba', exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/gth-motion-ranking-dark-desktop.png' });
});
