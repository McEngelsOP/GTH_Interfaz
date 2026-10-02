import { expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import handler from '../../../api/chat.ts';

function output() {
  const headers: Record<string, string> = {};
  let body = '';
  const response = { statusCode: 0, setHeader: (name: string, value: string) => { headers[name] = value; }, end: (value: string) => { body = value; } };
  return { response: response as unknown as ServerResponse, headers, get body() { return body; } };
}

it('el adaptador Node responde estado de configuración sin exponer una clave', async () => {
  vi.stubEnv('GEMINI_API_KEY', '');
  try {
    const result = output();
    await handler({ method: 'GET', url: '/api/chat', headers: { host: 'example.com' } } as IncomingMessage, result.response);
    expect(result.response.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ provider: 'Google Gemini', configured: false });
    expect(result.headers['cache-control']).toBe('no-store');
    expect(JSON.parse(result.body)).not.toHaveProperty('apiKey');
  } finally { vi.unstubAllEnvs(); }
});

it('el adaptador devuelve JSON para claves ausentes y cuerpos que Vercel no puede leer', async () => {
  vi.stubEnv('GEMINI_API_KEY', '');
  try {
    const request = { method: 'POST', url: '/api/chat', headers: { host: 'example.com', origin: 'https://example.com', 'content-type': 'application/json' }, body: { action: 'check' } };
    const missing = output();
    await handler(request as unknown as IncomingMessage, missing.response);
    expect(missing.response.statusCode).toBe(503);
    expect(JSON.parse(missing.body).code).toBe('NOT_CONFIGURED');
    Object.defineProperty(request, 'body', { get() { throw new Error('invalid JSON'); } });
    const malformed = output();
    await handler(request as unknown as IncomingMessage, malformed.response);
    expect(malformed.response.statusCode).toBe(400);
    expect(JSON.parse(malformed.body).error).toContain('No se pudo leer');
  } finally { vi.unstubAllEnvs(); }
});
