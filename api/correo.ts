import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleCorreo } from '../server/correo.js';

/** Adaptador del formato Node (Vercel y servidor de desarrollo de Vite) a la API web usada por el servicio. */
export default async function handler(request: IncomingMessage & { body?: unknown }, response: ServerResponse) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
  }
  const method = request.method || 'GET';
  const url = new URL(request.url || '/api/correo', `https://${headers.get('host') || 'localhost'}`);
  let body: string | undefined;
  if (!['GET', 'HEAD'].includes(method)) {
    if (request.body !== undefined) body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    else { // Vite no interpreta el cuerpo: se lee del stream
      const partes: Buffer[] = [];
      for await (const parte of request) partes.push(parte as Buffer);
      body = Buffer.concat(partes).toString('utf8');
    }
  }
  const result = await handleCorreo(new Request(url, { method, headers, body }));
  response.statusCode = result.status;
  result.headers.forEach((value, name) => response.setHeader(name, value));
  response.end(await result.text());
}
