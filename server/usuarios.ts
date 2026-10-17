import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';

// Administración de cuentas de GTH. Crear cuentas, cambiar contraseñas y desactivar requiere la clave service_role,
// que solo existe en el servidor (Vercel o el servidor de desarrollo). Solo atiende a cuentas maestras activas;
// los permisos (secciones y avisos) los edita la web directamente, protegidos por el RLS de gth_perfiles.

type Env = Record<string, string | undefined>;
const NIVELES = ['maestro', 'general'];
const MAX_BODY_BYTES = 10_000;

function reply(status: number, body: object) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}

/** Contraseña temporal legible (sin 0/O ni 1/l) para dictarla o enviarla por chat. */
export function claveTemporal() {
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', digitos = '23456789';
  const parte = (n: number, s: string) => Array.from({ length: n }, () => s[randomInt(s.length)]).join('');
  return `${parte(4, letras)}-${parte(4, digitos)}-${parte(4, letras)}`;
}

const correo = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || text.length > 200) throw new Error('Correo inválido.');
  return text;
};
const uuid = (value: unknown) => {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) throw new Error('Usuario inválido.');
  return value;
};

async function maestro(admin: SupabaseClient, request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null;
  const { data: perfil } = await admin.from('gth_perfiles').select('nivel, activo').eq('user_id', data.user.id).maybeSingle();
  return perfil?.activo && perfil.nivel === 'maestro' ? data.user : null;
}

async function activar(admin: SupabaseClient, id: string, activo: boolean) {
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: activo ? 'none' : '876000h' });
  if (error) throw error;
  await admin.from('gth_perfiles').update({ activo }).eq('user_id', id).throwOnError();
  if (activo) await admin.from('gth_colaboradores').upsert({ user_id: id }).throwOnError();
  else await admin.from('gth_colaboradores').delete().eq('user_id', id).throwOnError();
}

export async function handleUsuarios(request: Request, { env = process.env as Env } = {}) {
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido.' });
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return reply(503, { error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.' });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const yo = await maestro(admin, request);
  if (!yo) return reply(403, { error: 'Solo una cuenta maestra puede administrar usuarios.' });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new Error();
    body = JSON.parse(raw || '{}');
  } catch { return reply(400, { error: 'Consulta inválida.' }); }

  try {
    switch (body.accion) {
      case 'listar': {
        const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
        if (error) throw error;
        return reply(200, { usuarios: data.users.map((u) => ({ user_id: u.id, ultimo_ingreso: u.last_sign_in_at ?? null })) });
      }
      case 'crear': {
        const email = correo(body.email);
        const nivel = NIVELES.includes(body.nivel as string) ? body.nivel as string : 'general';
        const nombre = typeof body.nombre === 'string' ? body.nombre.trim().slice(0, 120) : '';
        const clave = claveTemporal();
        const { data, error } = await admin.auth.admin.createUser({ email, password: clave, email_confirm: true });
        if (error) return reply(409, { error: /already|registered|exists/i.test(error.message) ? 'Ya existe una cuenta con ese correo.' : 'No se pudo crear la cuenta.' });
        const id = data.user.id;
        await admin.from('gth_perfiles').insert({ user_id: id, email, nombre, nivel, debe_cambiar_clave: true }).throwOnError();
        await admin.from('gth_colaboradores').upsert({ user_id: id }).throwOnError();
        return reply(200, { user_id: id, email, clave });
      }
      case 'restablecer_clave': {
        const id = uuid(body.user_id), clave = claveTemporal();
        const { error } = await admin.auth.admin.updateUserById(id, { password: clave });
        if (error) throw error;
        await admin.from('gth_perfiles').update({ debe_cambiar_clave: true }).eq('user_id', id).throwOnError();
        return reply(200, { clave });
      }
      case 'activar':
      case 'desactivar': {
        const id = uuid(body.user_id);
        if (id === yo.id) return reply(400, { error: 'No puedes desactivar tu propia cuenta.' });
        await activar(admin, id, body.accion === 'activar');
        return reply(200, { ok: true });
      }
      default: return reply(400, { error: 'Acción desconocida.' });
    }
  } catch (error) {
    return reply(400, { error: error instanceof Error && error.message.length < 80 ? error.message : 'No se pudo completar la acción.' });
  }
}
