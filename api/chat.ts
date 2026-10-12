import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleGeminiChat } from '../server/geminiChat.js';

/** Adaptador del formato Node de Vercel a la API web usada por el servicio. */
export default async function handler(request: IncomingMessage & { body?: unknown }, response: ServerResponse) {
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
    }
    const method = request.method || 'GET';
    const host = headers.get('host') || 'localhost';
    const protocol = headers.get('x-forwarded-proto') === 'http' ? 'http' : 'https';
    const url = new URL(request.url || '/api/chat', `${protocol}://${host}`);
    const body = ['GET', 'HEAD'].includes(method) ? undefined
      : typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? {});
    const result = await handleGeminiChat(new Request(url, { method, headers, body }));
    response.statusCode = result.status;
    result.headers.forEach((value, name) => response.setHeader(name, value));
    response.end(await result.text());
  } catch {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ error: 'No se pudo leer la consulta. Reabre el asistente y vuelve a intentar.' }));
  }
}
