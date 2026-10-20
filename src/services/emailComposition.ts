import type { Application, Candidate } from '../types/index.ts';

export function correosSeleccionados(applications: Application[], candidates: Map<string, Candidate>): string[] {
  return [...new Set(applications.map((app) => candidates.get(app.candidateId)?.email?.trim().toLowerCase()).filter((email): email is string => Boolean(email)))];
}

export function dividirTandas(correos: string[], size = 50): string[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error('El tamaño de tanda debe ser un entero positivo.');
  return Array.from({ length: Math.ceil(correos.length / size) }, (_, i) => correos.slice(i * size, (i + 1) * size));
}

/** Solo prepara una redacción. Abrir Gmail no acredita que se haya enviado. */
/** `cuenta`: correo con el que se envía; Gmail abre el borrador en esa cuenta si tiene sesión iniciada en el navegador. */
export function gmailComposeUrl(correos: string[], asunto: string, mensaje: string, cuenta?: string): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', bcc: correos.join(','), su: asunto, body: mensaje });
  if (cuenta?.trim()) params.set('authuser', cuenta.trim());
  return `https://mail.google.com/mail/?${params}`;
}

/** Cuenta emisora elegida en este navegador (se recuerda entre envíos). */
const CLAVE_CUENTA = 'GTH_CUENTA_EMISORA';
export const cuentaEmisoraValida = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
export function cargarCuentaEmisora(): string {
  try { return localStorage.getItem(CLAVE_CUENTA) || ''; } catch { return ''; }
}
export function guardarCuentaEmisora(correo: string) {
  try { localStorage.setItem(CLAVE_CUENTA, correo.trim()); } catch { /* sin almacenamiento: solo para este envío */ }
}

/** Base para Multitest. No selecciona etapas ni asume enlaces comunes o individuales. */
export function prepararCorreoMultitest({ puesto, enlace, plazo }: { puesto: string; enlace: string; plazo: string }): { asunto: string; mensaje: string } {
  const url = new URL(enlace.trim());
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error('El enlace de Multitest debe ser una URL HTTPS válida.');
  if (!plazo.trim()) throw new Error('Indica el plazo para rendir las pruebas.');
  return {
    asunto: `Pruebas Multitest · ${puesto} · Universidad ESAN`,
    mensaje: `Estimado(a) postulante:\n\nLe invitamos a rendir las pruebas de Multitest para la convocatoria «${puesto}».\n\nEnlace: ${url.href}\nPlazo para rendir las pruebas: ${plazo.trim()}\n\nAtentamente,\nEquipo de GTHC · Universidad ESAN`,
  };
}
