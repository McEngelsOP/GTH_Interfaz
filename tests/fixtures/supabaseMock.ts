import type { Page } from '@playwright/test';
import type { AppStateData } from '../../src/types/index.ts';
import { agruparPersonas, paginaLocal, SIN_FILTROS, type FilaBase } from '../../src/services/baseCentralizada.ts';

// Cliente y respuestas inventados exclusivamente para pruebas de navegador.
export async function instalarSupabaseFicticio(page: Page, state?: AppStateData) {
  await page.route('**/src/services/supabase.ts', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll('import.meta.env.VITE_SUPABASE_URL', JSON.stringify('https://gth-test.supabase.co'))
      .replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY', JSON.stringify('test-public-key'));
    await route.fulfill({ response, body });
  });
  await page.addInitScript((state) => {
    localStorage.setItem('sb-gth-test-auth-token', JSON.stringify({ access_token: 'test-access-token', refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: '00000000-0000-0000-0000-000000000001', email: 'qa@example.test' } }));
    if (state && !sessionStorage.getItem('gth-qa-seeded')) {
      localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(state)); sessionStorage.setItem('gth-qa-seeded', '1');
    }
  }, state);
  await page.route('https://gth-test.supabase.co/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1);
    await route.fulfill({ json: table === 'gth_perfiles' ? {
      user_id: '00000000-0000-0000-0000-000000000001',email: 'qa@example.test',nombre: 'QA',nivel: 'maestro',
      activo: true,debe_cambiar_clave: false,secciones: null,avisos: null,
    } : table === 'gth_colaboradores' ? { user_id: '00000000-0000-0000-0000-000000000001' } : [] });
  });
}

export async function responderBaseFicticia(page: Page, rows: FilaBase[]) {
  const personas = agruparPersonas(rows);
  const requests: Record<string, unknown>[] = [];
  await page.route('**/rest/v1/rpc/gth_base_centralizada', async (route) => {
    const args = route.request().postDataJSON(); requests.push(args);
    const result = paginaLocal(personas, { ...SIN_FILTROS, ...args.p_filtros }, args.p_pagina, args.p_por_pagina);
    await route.fulfill({ json: { personas: result.personas, total: result.total,
      resumen: args.p_incluir_resumen ? result.resumen : null, opciones: args.p_incluir_resumen ? result.opciones : null } });
  });
  return requests;
}
