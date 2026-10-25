import type { SupabaseClient } from '@supabase/supabase-js';
import type { JobPosting } from '../types/index.ts';

// Pesos por requisito de cada aviso (tabla gth_aviso_requisitos). Cada peso va de 0 a 100 por sí mismo:
// añadir, quitar o desactivar un requisito no cambia los demás. El servidor pondera con peso / suma de pesos
// (scraping/ranking.py), así que todos con el mismo peso dan el ranking original.

export interface RequisitoPeso {
  etiqueta: string;
  peso: number;
  activo: boolean;
  origen: 'bumeran' | 'manual';
}

export const PESO_INICIAL = 50;

export const normalizarEtiqueta = (texto: string) => texto.replace(/\s+/g, ' ').trim();
const clave = (texto: string) => normalizarEtiqueta(texto).toLocaleLowerCase('es');
export const limitarPeso = (valor: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(valor) ? valor : 0)));

export function cambiarPeso(items: RequisitoPeso[], indice: number, valor: number): RequisitoPeso[] {
  return items.map((r, i) => (i === indice ? { ...r, peso: limitarPeso(valor) } : r));
}

export function alternarActivo(items: RequisitoPeso[], indice: number): RequisitoPeso[] {
  return items.map((r, i) => (i === indice ? { ...r, activo: !r.activo } : r));
}

/** Añade un requisito manual con el peso inicial. Devuelve null si está vacío o ya existe. */
export function agregarRequisito(items: RequisitoPeso[], texto: string): RequisitoPeso[] | null {
  const etiqueta = normalizarEtiqueta(texto).slice(0, 500);
  if (!etiqueta || items.some((r) => clave(r.etiqueta) === clave(etiqueta))) return null;
  return [...items, { etiqueta, peso: PESO_INICIAL, activo: true, origen: 'manual' }];
}

/** El puntaje necesita al menos un requisito activo con peso mayor que 0. */
export const pesosValidos = (items: RequisitoPeso[]) => items.some((r) => r.activo && r.peso > 0);

/** Parte del puntaje que representa cada requisito activo (peso / suma), en %. */
export function participacion(items: RequisitoPeso[]): number[] {
  const total = items.reduce((s, r) => s + (r.activo ? r.peso : 0), 0);
  return items.map((r) => (r.activo && total > 0 ? Math.round((r.peso * 100) / total) : 0));
}

export const avisoDeJob = (job: JobPosting) => job.bumeran?.avisoId || job.id;

/** Requisitos de partida: los del aviso, todos con el mismo peso (equivale al ranking actual). */
export function requisitosDelJob(job: JobPosting): RequisitoPeso[] {
  const origen = job.bumeran ? 'bumeran' : 'manual';
  return job.criteria.map((c) => ({ etiqueta: normalizarEtiqueta(c.label).slice(0, 500), peso: PESO_INICIAL, activo: true, origen }));
}

export async function cargarRequisitos(client: SupabaseClient, aviso: string): Promise<RequisitoPeso[]> {
  const { data, error } = await client.from('gth_aviso_requisitos')
    .select('etiqueta, peso, activo, origen').eq('aviso_id', aviso).order('orden');
  if (error) throw error;
  return (data || []) as RequisitoPeso[];
}

/** Guarda la lista completa y borra los requisitos manuales quitados. */
export async function guardarRequisitos(client: SupabaseClient, aviso: string, items: RequisitoPeso[], quitados: string[]) {
  if (!pesosValidos(items)) throw new Error('Debe haber al menos un requisito activo con peso mayor que 0.');
  const filas = items.map((r, orden) => ({ aviso_id: aviso, etiqueta: r.etiqueta, peso: limitarPeso(r.peso), activo: r.activo, origen: r.origen, orden }));
  const guardado = await client.from('gth_aviso_requisitos').upsert(filas, { onConflict: 'aviso_id,etiqueta' });
  if (guardado.error) throw guardado.error;
  if (quitados.length) {
    const borrado = await client.from('gth_aviso_requisitos').delete().eq('aviso_id', aviso).in('etiqueta', quitados);
    if (borrado.error) throw borrado.error;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// «Recalcular puntaje»: la web deja el pedido en ranking_recalculos y el servidor de la laptop de GTH (el mismo de
// Multitest, scraping/multitest_servidor.py) recalcula el ranking e5 con los requisitos y pesos guardados.
// ---------------------------------------------------------------------------------------------------------------
export type EstadoRecalculo = 'pendiente' | 'en_curso' | 'ok' | 'error';
export type Recalculo = { id: number; estado: EstadoRecalculo; mensaje: string | null; creado_at: string };

/** Último pedido de recálculo del aviso (de cualquier usuario), para mostrar si hay uno en cola o calculando. */
export async function ultimoRecalculo(client: SupabaseClient, aviso: string): Promise<Recalculo | null> {
  const { data, error } = await client.from('ranking_recalculos').select('id, estado, mensaje, creado_at')
    .eq('aviso_id', aviso).order('creado_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error('No se pudo consultar el recálculo del puntaje.');
  return (data as Recalculo | null) ?? null;
}

export async function encolarRecalculo(client: SupabaseClient, aviso: string): Promise<number> {
  const { data, error } = await client.from('ranking_recalculos').insert({ aviso_id: aviso }).select('id').single();
  if (error || !data) throw new Error('No se pudo dejar el recálculo en la cola del servidor.');
  return data.id as number;
}

/** Espera a que el servidor termine el pedido; avisa cada cambio de estado (en cola → calculando). */
export async function esperarRecalculo(client: SupabaseClient, id: number, alCambiar: (estado: EstadoRecalculo) => void,
  intervaloMs = 3000, limiteMs = 30 * 60_000): Promise<{ estado: 'ok' | 'error'; mensaje: string | null }> {
  const inicio = Date.now();
  let anterior = '';
  while (Date.now() - inicio < limiteMs) {
    const { data } = await client.from('ranking_recalculos').select('estado, mensaje').eq('id', id).maybeSingle();
    if (data && data.estado !== anterior) { anterior = data.estado; alCambiar(data.estado as EstadoRecalculo); }
    if (data?.estado === 'ok' || data?.estado === 'error') return { estado: data.estado, mensaje: data.mensaje };
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
  throw new Error('El servidor no terminó el recálculo a tiempo. Revisa más tarde el ranking.');
}

/** Avisa al ranking que el servidor recalculó un aviso, para releerlo. */
export const eventosPesos = new EventTarget();
export const avisarRecalculado = (aviso: string) => eventosPesos.dispatchEvent(new CustomEvent('recalculado', { detail: aviso }));
