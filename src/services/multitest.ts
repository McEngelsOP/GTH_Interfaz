import type { SupabaseClient } from '@supabase/supabase-js';
import type { Candidate } from '../types/index.ts';

// Registro de preseleccionados en Multitest (apps.multitestresources.com). La web arma la lista y la deja en la cola
// (tabla multitest_envios); el servidor de la laptop de GTH (scraping/multitest_servidor.py) corre la automatización
// (scripts/multitest-envio.mjs, con Playwright): agrega a todos al proceso elegido y Multitest les envía el correo.

/** Procesos abiertos en el «Panel de Procesos» de Multitest. El nombre debe coincidir con el enlace del panel. */
export const PROCESOS_MULTITEST = [
  { id: '532', nombre: 'Asistente De Gestión Académica' },
  { id: '531', nombre: 'Asistente De Soporte Técnico' },
  { id: '529', nombre: 'Asesor De Atención Al Cliente' },
  { id: '527', nombre: 'Técnico De Mantenimiento' },
  { id: '526', nombre: 'Auxiliar De Innovación' },
  { id: '525', nombre: 'Asistente De Marketing Digital' },
  { id: '524', nombre: 'Practicante 2026' },
] as const;

export type ProcesoMultitest = (typeof PROCESOS_MULTITEST)[number];
/** Proceso elegido por postulación (applicationId → id del proceso). */
export type AsignacionMultitest = Record<string, string>;
export type RegistroMultitest = {
  proceso: string; dni: string; edad: string; genero: 'M' | 'F' | ''; nombres: string; apellidos: string; correo: string;
};

const normalizar = (texto: string) => texto.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const limpiar = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Proceso cuyo nombre está contenido en el título del aviso (p. ej. aviso «Asistente de Gestión Académica»
 *  → proceso 532). Vacío si ninguno coincide: GTH lo elige a mano. */
export function procesoSugerido(tituloAviso: string): string {
  const titulo = normalizar(tituloAviso);
  return PROCESOS_MULTITEST.find((p) => titulo.includes(normalizar(p.nombre)))?.id || '';
}

export function nombreProceso(id: string): string {
  return PROCESOS_MULTITEST.find((p) => p.id === id)?.nombre || '';
}

/** Datos que pide el formulario «+» del proceso, tomados del CSV de Bumeran (o del perfil si no hay CSV).
 *  Cada sincronización que trae datos distintos agrega su fila al final de `records`: se usa la más reciente. */
export function registroMultitest(candidate: Candidate, procesoId: string): RegistroMultitest {
  const d = (candidate.importedProfile?.records?.at(-1) || {}) as Record<string, string>;
  const partes = limpiar(candidate.name).split(' ');
  const nombres = limpiar(d.Nombre) || partes.slice(0, Math.max(1, partes.length - 2)).join(' ');
  const apellidos = limpiar(d.Apellido) || partes.slice(Math.max(1, partes.length - 2)).join(' ');
  const genero = normalizar(d['Género'] || d.Genero || '');
  const edad = limpiar(d.Edad).match(/\d+/)?.[0] || '';
  return {
    proceso: nombreProceso(procesoId), nombres, apellidos, edad,
    dni: limpiar(d['Nro. Documento'] || candidate.importedProfile?.documentNumber),
    genero: genero.startsWith('m') ? 'M' : genero.startsWith('f') ? 'F' : '',
    correo: limpiar(d['E-Mail'] || candidate.email),
  };
}

/** Lo que falta para registrar a alguien; Multitest necesita al menos nombre, apellido y correo. */
export function faltantesRegistro(r: RegistroMultitest): string[] {
  return [!r.proceso && 'proceso', !r.nombres && 'nombre', !r.apellidos && 'apellido',
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.correo) && 'correo'].filter((f): f is string => !!f);
}

export function cargarAsignacion(clave: string): AsignacionMultitest {
  try {
    const valor = JSON.parse(localStorage.getItem(clave) || 'null');
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
  } catch { return {}; }
}

export function guardarAsignacion(clave: string, asignacion: AsignacionMultitest) {
  try { localStorage.setItem(clave, JSON.stringify(asignacion)); } catch { /* sin almacenamiento: queda solo en pantalla */ }
}

/** Registro con el ID del avance compartido, para marcar luego a quién se le envió. */
export type EnvioMultitest = RegistroMultitest & { id: string };
export type ResultadoMultitest = { id: string; ok: boolean; error?: string };

export const SERVIDOR_APAGADO_TRAS_MS = 90_000;   // el servidor marca su latido cada 15 s

/** El servidor de Multitest (laptop de GTH, python -m scraping.multitest_servidor) está prendido si marcó su latido
 *  hace menos de 90 s. */
export async function servidorEncendido(client: SupabaseClient, ahora = Date.now()): Promise<boolean> {
  const { data, error } = await client.from('servidor_latido').select('visto_at').eq('servicio', 'multitest').maybeSingle();
  if (error) throw new Error('No se pudo consultar el servidor de Multitest.');
  return !!data?.visto_at && ahora - Date.parse(data.visto_at) < SERVIDOR_APAGADO_TRAS_MS;
}

export type EstadoEnvio = 'pendiente' | 'en_curso' | 'ok' | 'error';

/** Deja el pedido en la cola; el servidor lo toma, agrega a todos en Multitest y confirma en el avance compartido
 *  a los agregados (aunque esta página se cierre). Devuelve el id del pedido. */
export async function encolarEnvio(client: SupabaseClient, avisoId: string, registros: EnvioMultitest[]): Promise<number> {
  const { data, error } = await client.from('multitest_envios').insert({ aviso_id: avisoId, registros }).select('id').single();
  if (error || !data) throw new Error('No se pudo dejar el envío en la cola del servidor de Multitest.');
  return data.id as number;
}

/** Espera a que el servidor termine el pedido; avisa cada cambio de estado (en cola → enviando). */
export async function esperarEnvio(client: SupabaseClient, id: number, alCambiar: (estado: EstadoEnvio) => void,
  intervaloMs = 4000, limiteMs = 35 * 60_000): Promise<{ resultados: ResultadoMultitest[]; mensaje: string | null }> {
  const inicio = Date.now();
  let anterior = '';
  while (Date.now() - inicio < limiteMs) {
    const { data } = await client.from('multitest_envios').select('estado, resultados, mensaje').eq('id', id).maybeSingle();
    if (data && data.estado !== anterior) { anterior = data.estado; alCambiar(data.estado as EstadoEnvio); }
    if (data?.estado === 'ok' || data?.estado === 'error') return { resultados: data.resultados || [], mensaje: data.mensaje };
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
  throw new Error('El servidor de Multitest no terminó a tiempo. Revisa más tarde en Avance de candidatos.');
}
