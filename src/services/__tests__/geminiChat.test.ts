import { describe, expect, it, vi } from 'vitest';
import { handleGeminiChat, sanitizeContext } from '../../../server/geminiChat.ts';
import { buildAssistantContext } from '../assistantService.ts';
import { estadoConConvocatoriaDePrueba } from '../../../tests/fixtures/convocatoriaDePrueba.ts';

const estado = estadoConConvocatoriaDePrueba();
const context = buildAssistantContext(estado, estado.jobPostings[0]);
const request = (body: unknown, ip = 'test-default') => new Request('https://example.com/api/chat', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com', 'x-forwarded-for': ip }, body: JSON.stringify(body),
});
const payload = { action: 'chat', question: '¿Qué falta para elegir Top-N?', history: [], context };
const env = { GEMINI_API_KEY: 'FAKE_KEY_FOR_TEST_ONLY', GEMINI_MODEL: 'gemini-3.5-flash-lite' };

describe('Gemini server', () => {
  it('informa configuración sin mostrar secretos y no contacta Google si falta la clave', async () => {
    const mockFetch = vi.fn();
    const status = await handleGeminiChat(new Request('https://example.com/api/chat'), { env });
    expect(await status.json()).toEqual({ provider: 'Google Gemini', configured: true, model: env.GEMINI_MODEL });
    const missing = await handleGeminiChat(request(payload), { env: {}, fetch: mockFetch });
    expect(missing.status).toBe(503); expect(await missing.text()).not.toContain(env.GEMINI_API_KEY);
    expect(mockFetch).not.toHaveBeenCalled();
  });
  it('solo permite solicitudes válidas y rechaza origen cruzado, tamaño excesivo e historial inválido', async () => {
    const mockFetch = vi.fn();
    const foreign = new Request('https://example.com/api/chat', { method: 'POST', headers: { Origin: 'https://another.example', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    expect((await handleGeminiChat(foreign, { env, fetch: mockFetch })).status).toBe(403);
    expect((await handleGeminiChat(request({ ...payload, question: 'x'.repeat(2001) }), { env, fetch: mockFetch })).status).toBe(400);
    expect((await handleGeminiChat(request({ ...payload, history: [{ role: 'assistant', text: 'dato' }] }), { env, fetch: mockFetch })).status).toBe(400);
    expect((await handleGeminiChat(request({ ...payload, extra: 'x'.repeat(60_000) }), { env, fetch: mockFetch })).status).toBe(413);
    expect((await handleGeminiChat(new Request('https://example.com/api/chat', { method: 'DELETE' }), { env })).status).toBe(405);
    expect(mockFetch).not.toHaveBeenCalled();
  });
  it('envía contexto permitido e historial a Google y filtra pensamientos internos', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [
      { thought: true, text: 'Pensamiento interno' }, { text: 'Falta la evaluación LLM.' },
    ] } }] }), { status: 200 }));
    const enriched = { ...context, rawCvText: 'NEVER_SEND_CV', email: 'NEVER_SEND_EMAIL' };
    const response = await handleGeminiChat(request({ ...payload, context: enriched, history: [{ role: 'user', text: 'Hola' }, { role: 'assistant', text: 'Hola, equipo' }] }, 'test-success'), { env, fetch: mockFetch });
    expect(await response.json()).toEqual({ text: 'Falta la evaluación LLM.', model: env.GEMINI_MODEL });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    expect(options.headers['x-goog-api-key']).toBe(env.GEMINI_API_KEY);
    expect(options.body).not.toContain(env.GEMINI_API_KEY);
    expect(options.body).not.toMatch(/NEVER_SEND/);
    expect(JSON.parse(options.body).contents[1].role).toBe('model');
    expect(JSON.parse(options.body).store).toBe(false);
  });
  it.each([400, 401, 403, 404, 429, 500])('mapea error %i del proveedor sin exponer su respuesta', async (status) => {
    const response = await handleGeminiChat(request(payload, `test-error-${status}`), { env, fetch: vi.fn().mockResolvedValue(new Response(env.GEMINI_API_KEY, { status })) });
    expect(response.status).toBe(status === 429 ? 429 : 502);
    const body = await response.json(); expect(body.error).toBeTruthy(); expect(body.error).not.toContain(env.GEMINI_API_KEY);
  });
  it('detecta respuestas vacías, bloqueo y tiempo de espera', async () => {
    const empty = await handleGeminiChat(request(payload, 'test-empty'), { env, fetch: vi.fn().mockResolvedValue(new Response('{}')) });
    expect(empty.status).toBe(502);
    const blocked = await handleGeminiChat(request(payload, 'test-blocked'), { env, fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }))) });
    expect(blocked.status).toBe(422);
    const timeout = await handleGeminiChat(request(payload, 'test-timeout'), { env, fetch: vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')) });
    expect(timeout.status).toBe(504); expect((await timeout.json()).error).toContain('tardó demasiado');
  });
  it('la prueba de conexión no envía perfiles y limita consultas consecutivas', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Conexión correcta.' }] } }] })));
    for (let i = 0; i < 8; i++) expect((await handleGeminiChat(request({ action: 'check' }, 'test-rate'), { env, fetch: mockFetch, now: () => 1_000_000 })).status).toBe(200);
    const limited = await handleGeminiChat(request({ action: 'check' }, 'test-rate'), { env, fetch: mockFetch, now: () => 1_000_000 });
    expect(limited.status).toBe(429); expect(limited.headers.get('Retry-After')).toBe('60');
    expect(mockFetch).toHaveBeenCalledTimes(8);
    expect(mockFetch.mock.calls[0][1].body).not.toContain('candidateSummaries');
    expect((await handleGeminiChat(request({ action: 'check' }, 'test-rate'), { env, fetch: mockFetch, now: () => 1_060_001 })).status).toBe(200);
  });
  it('elimina nombres si no se autorizó compartirlos y descarta contactos y documentos', () => {
    const fake = { name: 'Persona Ejemplo', stage: 'postulado', llmScore: null, requirementStatus: 'sin_verificar', email: 'secret@example.com', document: 'FAKE_DOCUMENT' };
    expect(sanitizeContext({ ...context, candidateSummaries: [fake] }).candidateSummaries).toEqual([]);
    const sanitized = sanitizeContext({ ...context, candidatesShared: true, candidateSummaries: [fake] });
    expect(sanitized.candidateSummaries[0].name).toBe('Persona Ejemplo');
    expect(JSON.stringify(sanitized)).not.toMatch(/secret@example|FAKE_DOCUMENT/);
  });
});
