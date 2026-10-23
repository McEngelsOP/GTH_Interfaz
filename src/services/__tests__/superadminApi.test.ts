import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleUsuarios } from '../../../server/usuarios.ts';
const actor = '11111111-1111-4111-8111-111111111111';
const destino = '22222222-2222-4222-8222-222222222222';
const env = { SUPABASE_URL: 'https://gth-api.example.test', SUPABASE_SERVICE_ROLE_KEY: 'server-test-key' };
const post = (body: unknown) => new Request('https://gth.example.test/api/usuarios', {
  method: 'POST', headers: { Authorization: 'Bearer test-jwt', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
function servidor(nivel: string, destinoNivel = 'maestro', opciones = { activo: true, falloPerfil: false, falloBaja: false }) {
  const calls: { path: string; method: string; body: Record<string, unknown> | null }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method || 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    calls.push({ path: url.pathname, method, body });
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/auth/v1/user') return json({ id: actor, email: 'actor@example.test' });
    if (url.pathname === '/rest/v1/gth_perfiles' && method === 'GET') {
      return json(url.searchParams.get('user_id') === `eq.${actor}` ? { nivel, activo: opciones.activo } : { nivel: destinoNivel });
    }
    if (url.pathname === '/rest/v1/gth_perfiles' && method === 'POST' && opciones.falloPerfil) return json({ message: 'Fallo de perfil de prueba' }, 500);
    if (url.pathname === '/auth/v1/admin/users' && method === 'POST') return json({ id: destino, email: body?.email });
    if (url.pathname === `/auth/v1/admin/users/${destino}` && method === 'DELETE' && opciones.falloBaja) return json({ message: 'Baja de Auth falló' }, 500);
    if (url.pathname.startsWith('/auth/v1/admin/users/')) return json({ id: destino });
    return json(null);
  }));
  return calls;
}
afterEach(() => vi.unstubAllGlobals());
describe('superadministración validada por API', () => {
  it('un maestro no puede crear administradores aunque manipule la petición', async () => {
    const calls = servidor('maestro');
    const r = await handleUsuarios(post({ accion: 'crear', email: 'nuevo@example.test', nivel: 'maestro' }), { env });
    expect(r.status).toBe(403);
    expect(calls.some(c => c.path === '/auth/v1/admin/users')).toBe(false);
  });
  it.each(['restablecer_clave', 'desactivar', 'activar', 'eliminar'])('un maestro no puede ejecutar %s sobre otro administrador', async accion => {
    const calls = servidor('maestro');
    expect((await handleUsuarios(post({ accion, user_id: destino }), { env })).status).toBe(403);
    expect(calls.every(c => c.method === 'GET')).toBe(true);
  });
  it('la superadministradora crea administradores reales con clave temporal', async () => {
    const calls = servidor('superadmin');
    const r = await handleUsuarios(post({ accion: 'crear', email: 'nuevo@example.test', nombre: 'Equipo', nivel: 'maestro' }), { env });
    expect(r.status).toBe(200);
    expect((await r.json()).clave).toMatch(/^[\w]+-[\d]+-[\w]+$/);
    expect(calls.find(c => c.path === '/rest/v1/gth_perfiles' && c.method === 'POST')?.body).toMatchObject({ nivel: 'maestro', debe_cambiar_clave: true });
  });
  it('elimina el acceso antes del borrado lógico y conserva referencias históricas', async () => {
    const calls = servidor('superadmin');
    const r = await handleUsuarios(post({ accion: 'eliminar', user_id: destino }), { env });
    expect(r.status).toBe(200);
    const baja = calls.findIndex(c => c.path === '/rest/v1/gth_perfiles' && c.body?.activo === false);
    const borrado = calls.findIndex(c => c.path.startsWith('/auth/v1/admin/users/') && c.method === 'DELETE');
    expect(baja).toBeGreaterThan(-1); expect(borrado).toBeGreaterThan(baja);
    expect(calls[borrado].body).toEqual({ should_soft_delete: true });
    expect(calls.some(c => c.path === '/rest/v1/gth_colaboradores' && c.method === 'DELETE')).toBe(true);
  });
  it('protege a otras superadministradoras y a la propia cuenta', async () => {
    let calls = servidor('superadmin', 'superadmin');
    expect((await handleUsuarios(post({ accion: 'eliminar', user_id: destino }), { env })).status).toBe(403);
    expect(calls.every(c => c.method === 'GET')).toBe(true);
    calls = servidor('superadmin');
    expect((await handleUsuarios(post({ accion: 'eliminar', user_id: actor }), { env })).status).toBe(403);
    expect(calls.every(c => c.method === 'GET')).toBe(true);
  });
  it('compensa un alta incompleta sin informar éxito', async () => {
    const calls = servidor('superadmin', 'maestro', { activo: true, falloPerfil: true, falloBaja: false });
    expect((await handleUsuarios(post({ accion: 'crear', email: 'nuevo@example.test', nivel: 'maestro' }), { env })).status).toBe(400);
    expect(calls.some(c => c.path === `/auth/v1/admin/users/${destino}` && c.method === 'DELETE')).toBe(true);
  });
  it('una baja parcial mantiene permisos revocados y permite reintentar', async () => {
    const calls = servidor('superadmin', 'maestro', { activo: true, falloPerfil: false, falloBaja: true });
    expect((await handleUsuarios(post({ accion: 'eliminar', user_id: destino }), { env })).status).toBe(400);
    expect(calls.some(c => c.path === '/rest/v1/gth_perfiles' && c.body?.activo === false)).toBe(true);
    expect(calls.some(c => c.path === '/rest/v1/gth_perfiles' && c.method === 'DELETE')).toBe(false);
  });
  it('rechaza cuentas desactivadas y no admite altas de superadmin desde la web', async () => {
    servidor('superadmin', 'general', { activo: false, falloPerfil: false, falloBaja: false });
    expect((await handleUsuarios(post({ accion: 'crear' }), { env })).status).toBe(403);
    servidor('superadmin');
    expect((await handleUsuarios(post({ accion: 'crear', email: 'nuevo@example.test', nivel: 'superadmin' }), { env })).status).toBe(400);
  });
});
