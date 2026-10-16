import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { meetingState } from '../fixtures/gthMeetingData.ts';

const user1 = '11111111-1111-1111-1111-111111111111';
const user2 = '22222222-2222-2222-2222-222222222222';
let db: PGlite;
let queue = Promise.resolve();
const localQuery = (userId: string, query: string, values: unknown[]) => {
  const result = queue.then(() => db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [userId]);
    return tx.query(query, values);
  }));
  queue = result.then(() => undefined, () => undefined);
  return result;
};
async function wire(context: BrowserContext, userId: string) {
  await context.addInitScript(({ state, userId }) => {
    localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2', JSON.stringify(state));
    const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: `${userId.slice(0, 1)}@test.example`, app_metadata: {}, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' };
    const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`;
    localStorage.setItem('sb-workflow-test-auth-token', JSON.stringify({ access_token: token, refresh_token: 'test-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }));
    (window as any).__opened = [];
    window.open = (url) => { (window as any).__opened.push(String(url)); return { opener: null } as any; };
  }, { state: meetingState, userId });
  await context.route('https://workflow-test.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    const fulfill = (body: unknown, status = 200) => route.fulfill({ status, json: body, headers: { 'access-control-allow-origin': '*' } });
    if (url.pathname === '/auth/v1/user') return fulfill({ id: userId, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', app_metadata: {}, user_metadata: {} });
    try {
      const body = route.request().postDataJSON();
      const rpc = url.pathname.split('/rpc/')[1];
      if (rpc) {
        if (rpc === 'gth_iniciar_avance') await localQuery(userId, 'select public.gth_iniciar_avance($1,$2::jsonb)', [body.p_aviso, JSON.stringify(body.p_filas)]);
        else if (rpc === 'gth_mover_etapas') await localQuery(userId, 'select public.gth_mover_etapas($1,$2::jsonb)', [body.p_aviso, JSON.stringify(body.p_cambios)]);
        else if (rpc === 'gth_preparar_accion') await localQuery(userId, 'select public.gth_preparar_accion($1,$2,$3::jsonb)', [body.p_aviso, body.p_accion, JSON.stringify(body.p_destinatarios)]);
        else if (rpc === 'gth_finalizar_accion') await localQuery(userId, 'select public.gth_finalizar_accion($1,$2,$3::text[],$4)', [body.p_aviso, body.p_accion, body.p_ids, body.p_cancelar]);
        else throw new Error('RPC inesperado');
        return fulfill(null);
      }
      const table = url.pathname.split('/rest/v1/')[1];
      if (table === 'gth_avance' || table === 'gth_acciones') {
        const result = await localQuery(userId, `select * from public.${table} where aviso_id=$1 order by id_postulante`, [url.searchParams.get('aviso_id')?.replace(/^eq\./, '')]);
        return fulfill(result.rows);
      }
      if (table === 'gth_colaboradores') return fulfill({ user_id: userId });
      return fulfill([]);
    } catch (error) { return fulfill({ message: String(error), code: 'P0001' }, 409); }
  });
}
const banner = (page: Page, name: string) => page.getByRole('navigation', { name: 'Etapas del proceso' }).getByRole('button', { name: new RegExp(`^${name}`) });

test.beforeEach(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated; insert into auth.users values('${user1}'),('${user2}');`);
  await db.exec(readFileSync('supabase/migrations/20261015230000_comentarios_internos.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261016001000_avance_compartido.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261016004500_retroceso_desde_contratado.sql', 'utf8'));
  await db.exec(`insert into public.gth_colaboradores values('${user1}'),('${user2}');`);
});
test.afterEach(async () => { await queue; await db.close(); });

test('dos colaboradores comparten reservas, envíos y descartes sin repetir acciones', async ({ browser }) => {
  const first = await browser.newContext(); const second = await browser.newContext();
  await wire(first, user1); await wire(second, user2);
  const a = await first.newPage(); const b = await second.newPage();
  const errors: string[] = []; a.on('pageerror', e => errors.push(e.message)); b.on('pageerror', e => errors.push(e.message));
  await a.goto('/#view=avance_candidatos'); await b.goto('/#view=avance_candidatos');
  for (const page of [a, b]) {
    await banner(page, 'Preseleccionado').click();
    await page.getByRole('button', { name: 'Configurar Multitest', exact: true }).click();
    await page.getByLabel('Enlace de Multitest', { exact: true }).fill('https://example.com/multitest');
    await page.getByLabel('Plazo para rendir las pruebas', { exact: true }).fill('48 horas');
    await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Enviar Multitest', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Enviar Multitest', exact: true }).click();
  }
  // Ambos abrieron con el mismo estado: el segundo conserva una selección obsoleta.
  await a.getByRole('button', { name: 'Preparar correo (1)', exact: true }).click();
  await expect(a.getByRole('region', { name: 'Comunicaciones preparadas' })).toBeVisible();
  await b.getByRole('button', { name: 'Preparar correo (1)', exact: true }).click();
  await expect(b.getByRole('dialog').getByRole('alert')).toContainText('otro colaborador');
  await expect(b.getByRole('checkbox', { name: 'Incluir a Ana Prueba' })).toBeDisabled();
  await expect(a.getByRole('button', { name: 'Confirmar envío realizado (1)', exact: true })).toBeDisabled();
  await a.getByRole('button', { name: 'Abrir Gmail', exact: true }).click();
  const url = new URL(await a.evaluate(() => (window as any).__opened[0]));
  expect(url.searchParams.get('bcc')).toBe('persona0@example.com');
  expect(url.searchParams.get('body')).toContain('https://example.com/multitest');
  expect((await db.query("select estado from public.gth_acciones where accion='multitest'")).rows[0].estado).toBe('preparado');
  await a.getByRole('button', { name: 'Confirmar envío realizado (1)', exact: true }).click();
  await expect(a.getByText('Envío confirmado', { exact: true })).toBeVisible();
  await a.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await b.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await b.getByRole('button', { name: 'Actualizar avance', exact: true }).click();
  await b.getByRole('button', { name: 'Enviar Multitest', exact: true }).click();
  await expect(b.getByRole('checkbox', { name: 'Incluir a Ana Prueba' })).toBeDisabled();
  await expect(b.getByText('Envío confirmado', { exact: true })).toBeVisible();
  await b.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await a.getByRole('button', { name: 'Avanzar de etapa a Ana Prueba', exact: true }).click();
  await banner(a, 'En entrevista').click();
  await a.getByRole('button', { name: 'Agendar entrevista', exact: true }).click();
  await a.getByRole('combobox', { name: 'Canal', exact: true }).selectOption('whatsapp');
  await a.getByLabel('Fecha y hora local', { exact: true }).fill('2099-10-20T10:00');
  await a.getByLabel('Lugar o enlace', { exact: true }).fill('https://meet.example/entrevista');
  await a.getByRole('radio', { name: 'Incluir a Ana Prueba' }).check();
  await a.getByRole('button', { name: 'Preparar WhatsApp (1)', exact: true }).click();
  await a.getByRole('button', { name: 'Abrir WhatsApp', exact: true }).click();
  const whatsapp = new URL(await a.evaluate(() => (window as any).__opened[1]));
  expect(whatsapp.pathname).toBe('/51987654321'); expect(whatsapp.searchParams.get('text')).toContain('https://meet.example/entrevista');
  await a.getByRole('button', { name: 'Confirmar envío realizado (1)', exact: true }).click();
  await a.getByRole('button', { name: 'Cerrar', exact: true }).click();
  // Regresión: contratado puede retroceder, y las comunicaciones confirmadas no se liberan.
  await a.getByRole('button', { name: 'Avanzar de etapa a Ana Prueba', exact: true }).click();
  await expect(a.getByRole('region', { name: 'Candidatos en Contratado', exact: true }).getByRole('heading', { name: 'Ana Prueba', exact: true })).toBeVisible();
  await b.getByRole('button', { name: 'Actualizar avance', exact: true }).click();
  await expect(b.getByRole('region', { name: 'Candidatos en Contratado', exact: true }).getByRole('heading', { name: 'Ana Prueba', exact: true })).toBeVisible();
  await a.getByRole('button', { name: 'Volver de etapa a Ana Prueba', exact: true }).click();
  await expect(a.getByRole('region', { name: 'Candidatos en En entrevista', exact: true }).getByRole('heading', { name: 'Ana Prueba', exact: true })).toBeVisible();
  await b.getByRole('button', { name: 'Actualizar avance', exact: true }).click();
  await expect(b.getByRole('region', { name: 'Candidatos en En entrevista', exact: true }).getByRole('heading', { name: 'Ana Prueba', exact: true })).toBeVisible();
  for (const target of ['preseleccionado', 'postulado']) {
    await a.getByRole('button', { name: 'Volver de etapa a Ana Prueba', exact: true }).click();
    await expect.poll(async () => (await db.query("select etapa from public.gth_avance where id_postulante='qa-external-0'")).rows[0].etapa).toBe(target);
  }
  await a.reload();
  await expect(a.getByRole('region', { name: 'Candidatos en Postulado', exact: true }).getByRole('heading', { name: 'Ana Prueba', exact: true })).toBeVisible();
  for (const target of ['preseleccionado', 'en_entrevista']) {
    await a.getByRole('button', { name: 'Avanzar de etapa a Ana Prueba', exact: true }).click();
    await expect.poll(async () => (await db.query("select etapa from public.gth_avance where id_postulante='qa-external-0'")).rows[0].etapa).toBe(target);
    if (target === 'preseleccionado') {
      await banner(a, 'Preseleccionado').click();
      await a.getByRole('button', { name: 'Enviar Multitest', exact: true }).click();
      await expect(a.getByRole('checkbox', { name: 'Incluir a Ana Prueba', exact: true })).toBeDisabled();
      await expect(a.getByText('Envío confirmado', { exact: true })).toBeVisible();
      await a.getByRole('button', { name: 'Cerrar', exact: true }).click();
    }
  }
  await banner(a, 'Preseleccionado').click();
  // El registro mantiene ambos envíos aunque el candidato haya vuelto de etapa.
  expect((await db.query("select accion,estado from public.gth_acciones where id_postulante='qa-external-0' order by accion")).rows).toEqual([
    { accion: 'entrevista', estado: 'confirmado' }, { accion: 'multitest', estado: 'confirmado' },
  ]);
  await banner(a, 'En entrevista').click();
  await a.getByRole('button', { name: 'Agradecer a no seleccionados', exact: true }).click();
  await a.getByRole('button', { name: 'Preparar correo (4)', exact: true }).click();
  await a.getByRole('button', { name: 'Abrir Gmail', exact: true }).click();
  await a.getByRole('button', { name: 'Confirmar envío realizado (4)', exact: true }).click();
  await expect(a.getByRole('checkbox', { name: 'Incluir a Bruno Prueba' })).toBeDisabled();
  await a.screenshot({ path: '/tmp/gth-workflow-communication-desktop.png', fullPage: true });
  await a.setViewportSize({ width: 390, height: 844 });
  expect(await a.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await a.screenshot({ path: '/tmp/gth-workflow-communication-mobile.png', fullPage: true });
  await a.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await b.getByRole('button', { name: 'Actualizar avance', exact: true }).click();
  await banner(b, 'Postulado').click();
  await expect(b.getByRole('heading', { name: 'Bruno Prueba', exact: true })).toHaveCount(0);
  expect((await db.query("select etapa from public.gth_avance where id_postulante='qa-external-1'")).rows[0].etapa).toBe('no_continua');
  expect(errors).toEqual([]);
  await first.close(); await second.close();
});
