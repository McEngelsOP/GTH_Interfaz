import { createClient, SupabaseClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Envío de correos a postulantes desde la cuenta de GTH (SMTP_* en .env.local y en Vercel; nunca llegan al navegador).
// Solo atiende a cuentas de GTH activas. Cada postulante recibe su propio correo (no ve a los demás destinatarios) y
// cada envío queda registrado en gth_correos_enviados (sin el cuerpo del mensaje).

type Env = Record<string, string | undefined>;
export type TipoCorreo = 'agradecimiento' | 'entrevista' | 'perfil';
export type MensajeCorreo = { destinatario: string; asunto: string; cuerpo: string; tipo: TipoCorreo; aviso_id?: string; id_postulante?: string };
export type Transporte = { sendMail(opciones: Record<string, unknown>): Promise<unknown> };

const TIPOS: TipoCorreo[] = ['agradecimiento', 'entrevista', 'perfil'];
export const MAX_MENSAJES = 20;   // ~1-2 s por correo: entra holgado en los 60 s de Vercel
const MAX_BODY_BYTES = 400_000;

function reply(status: number, body: object) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}

const texto = (value: unknown, max: number, campo: string) => {
  const t = typeof value === 'string' ? value.trim() : '';
  if (!t || t.length > max) throw new Error(`${campo} inválido.`);
  return t;
};
const opcional = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 250) : undefined);

export function validarMensajes(value: unknown): MensajeCorreo[] {
  if (!Array.isArray(value) || !value.length) throw new Error('No hay correos que enviar.');
  if (value.length > MAX_MENSAJES) throw new Error(`Se pueden enviar hasta ${MAX_MENSAJES} correos por vez.`);
  return value.map((m: Record<string, unknown>) => {
    const destinatario = texto(m?.destinatario, 200, 'Correo').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) throw new Error('Correo inválido.');
    if (!TIPOS.includes(m?.tipo as TipoCorreo)) throw new Error('Tipo de correo inválido.');
    // Sin saltos de línea en el asunto: evita inyectar cabeceras
    return { destinatario, asunto: texto(m.asunto, 300, 'Asunto').replace(/[\r\n]+/g, ' '), cuerpo: texto(m.cuerpo, 20_000, 'Mensaje'),
      tipo: m.tipo as TipoCorreo, aviso_id: opcional(m.aviso_id), id_postulante: opcional(m.id_postulante) };
  });
}

async function colaborador(admin: SupabaseClient, request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null;
  const { data: perfil } = await admin.from('gth_perfiles').select('activo').eq('user_id', data.user.id).maybeSingle();
  return perfil?.activo ? data.user : null;
}

export async function handleCorreo(request: Request, { env = process.env as Env, transporte }: { env?: Env; transporte?: Transporte } = {}) {
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido.' });
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return reply(503, { error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.' });
  const remitente = env.SMTP_FROM || env.SMTP_USER;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !remitente)
    return reply(503, { error: 'Falta configurar la cuenta de correo de GTH (SMTP_*) en el servidor.' });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let yo: Awaited<ReturnType<typeof colaborador>>;
  try { yo = await colaborador(admin, request); } catch { return reply(503, { error: 'No se pudieron comprobar los permisos. Intenta nuevamente.' }); }
  if (!yo) return reply(403, { error: 'Solo una cuenta de GTH activa puede enviar correos.' });

  let mensajes: MensajeCorreo[];
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new Error('Los correos son demasiado largos.');
    mensajes = validarMensajes(JSON.parse(raw || '{}').mensajes);
  } catch (error) {
    return reply(400, { error: error instanceof Error && error.message.length < 80 ? error.message : 'Consulta inválida.' });
  }

  // Una sola conexión para todo el lote, cerrada al terminar
  const smtp = transporte ? null : nodemailer.createTransport({
    pool: true, maxConnections: 1, host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 587, secure: env.SMTP_SECURE === 'true',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  const correo: Transporte = transporte ?? smtp!;
  const desde = `"${env.SMTP_FROM_NAME || 'Equipo de GTHC · Universidad ESAN'}" <${remitente}>`;
  const resultados: { indice: number; ok: boolean; error?: string }[] = [];
  for (const [indice, m] of mensajes.entries()) {
    try {
      // Uno por uno: cada postulante recibe su propio correo y responde a la cuenta de GTH
      await correo.sendMail({ from: desde, to: m.destinatario, replyTo: remitente, subject: m.asunto, text: m.cuerpo });
      resultados.push({ indice, ok: true });
    } catch {
      resultados.push({ indice, ok: false, error: 'El servidor de correo no aceptó el envío.' });
    }
  }
  const { error } = await admin.from('gth_correos_enviados').insert(mensajes.map((m, i) => ({
    creado_por: yo.id, tipo: m.tipo, aviso_id: m.aviso_id ?? null, id_postulante: m.id_postulante ?? null,
    destinatario: m.destinatario, asunto: m.asunto, estado: resultados[i].ok ? 'enviado' : 'error', error: resultados[i].error ?? null,
  })));
  smtp?.close();
  return reply(200, { resultados, registrado: !error });
}
