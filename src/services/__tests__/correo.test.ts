import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleCorreo, MAX_MENSAJES, validarMensajes } from '../../../server/correo.ts';
import { enviarCorreos } from '../correo.ts';

const SMTP = { SMTP_HOST: 'smtp.example.test', SMTP_USER: 'gth@example.test', SMTP_PASSWORD: 'x' };
const SUPA = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const mensaje = { destinatario: 'Ana@Example.test', asunto: 'Gracias', cuerpo: 'Hola', tipo: 'agradecimiento' };
const post = (body: unknown, headers: Record<string, string> = {}) => new Request('https://x/api/correo',
  { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('api/correo', () => {
  it('solo acepta POST', async () => {
    expect((await handleCorreo(new Request('https://x/api/correo'), { env: {} })).status).toBe(405);
  });
  it('sin la cuenta de correo configurada responde 503', async () => {
    const r = await handleCorreo(post({ mensajes: [mensaje] }), { env: SUPA });
    expect(r.status).toBe(503);
    expect((await r.json()).error).toContain('SMTP');
  });
  it('sin sesión responde 403 sin enviar nada', async () => {
    const sendMail = vi.fn();
    const r = await handleCorreo(post({ mensajes: [mensaje] }), { env: { ...SUPA, ...SMTP }, transporte: { sendMail } });
    expect(r.status).toBe(403);
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe('validarMensajes', () => {
  it('normaliza el correo y quita saltos de línea del asunto', () => {
    expect(validarMensajes([{ ...mensaje, asunto: 'Hola\r\nBcc: otro@x.test' }])[0]).toMatchObject(
      { destinatario: 'ana@example.test', asunto: 'Hola Bcc: otro@x.test' });
  });
  it('rechaza correos inválidos, tipos desconocidos, vacíos y lotes demasiado grandes', () => {
    expect(() => validarMensajes([{ ...mensaje, destinatario: 'no-es-correo' }])).toThrow('Correo inválido');
    expect(() => validarMensajes([{ ...mensaje, tipo: 'spam' }])).toThrow('Tipo de correo inválido');
    expect(() => validarMensajes([{ ...mensaje, cuerpo: '  ' }])).toThrow('Mensaje inválido');
    expect(() => validarMensajes([])).toThrow();
    expect(() => validarMensajes(Array(MAX_MENSAJES + 1).fill(mensaje))).toThrow(`hasta ${MAX_MENSAJES}`);
  });
});

describe('enviarCorreos', () => {
  const cliente = { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } } as unknown as SupabaseClient;
  afterEach(() => vi.unstubAllGlobals());

  it('envía en lotes y devuelve un resultado por correo en el mismo orden', async () => {
    const fetchMock = vi.fn(async (_: string, init: RequestInit) => {
      const lote = JSON.parse(String(init.body)).mensajes as unknown[];
      return new Response(JSON.stringify({ resultados: lote.map((_, indice) => ({ indice, ok: indice !== 1 })) }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const r = await enviarCorreos(cliente, Array(25).fill({ ...mensaje, tipo: 'agradecimiento' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r).toHaveLength(25);
    expect(r.filter((x) => !x.ok)).toHaveLength(2);   // el segundo de cada lote
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer t');
  });

  it('si el servidor rechaza un lote, ese y los siguientes quedan sin enviar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Solo una cuenta de GTH activa puede enviar correos.' }), { status: 403 })));
    const r = await enviarCorreos(cliente, Array(25).fill({ ...mensaje, tipo: 'perfil' }));
    expect(r).toHaveLength(25);
    expect(r.every((x) => !x.ok && x.error?.includes('cuenta de GTH'))).toBe(true);
  });
});
