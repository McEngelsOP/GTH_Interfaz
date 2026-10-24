import type { SupabaseClient } from '@supabase/supabase-js';
import type { JobPosting } from '../types/index.ts';
import type { RankingRow } from './bumeranSync.ts';

// Pesos por requisito de cada aviso (tabla gth_aviso_requisitos). Cada peso va de 0 a 100 por sí mismo:
// añadir, quitar o desactivar un requisito no cambia los demás. El puntaje pondera con peso / suma de pesos,
// igual que matching/embeddings/matching_llm.py, así que todos con el mismo peso dan el ranking original.

export interface RequisitoPeso {
  etiqueta: string;
  peso: number;
  activo: boolean;
  origen: 'bumeran' | 'manual';
}

export const PESO_INICIAL = 50;
export const SIN_INFORMACION = 'CV sin información';

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

/** Peso de cada requisito del ranking según lo guardado; los que no están guardados usan el peso inicial. */
export function pesosParaCriterios(etiquetas: string[], guardados: RequisitoPeso[]): number[] {
  const porClave = new Map(guardados.map((r) => [clave(r.etiqueta), r]));
  return etiquetas.map((e) => {
    const r = porClave.get(clave(e));
    return !r ? PESO_INICIAL : r.activo ? r.peso : 0;
  });
}

/** Vuelve a puntuar y ordenar el ranking del aviso con los pesos guardados, con el mismo reescalado 0-1 por aviso
 *  del scraper. Parte del puntaje original (score_bruto, calculado con pesos iguales) y le suma solo el efecto del
 *  cambio de pesos sobre la similitud de cada requisito (req_sims_bruto): las similitudes de e5 están muy juntas
 *  y se guardan con 3 decimales, así que recalcular desde cero reordenaría por redondeo. Con todos los pesos
 *  iguales devuelve el ranking tal cual. Los requisitos manuales aún no tienen similitud y no cuentan. */
export function aplicarPesos(rows: RankingRow[], etiquetas: string[], guardados: RequisitoPeso[]): RankingRow[] {
  if (!guardados.length || !rows.length || !etiquetas.length) return rows;
  const pesos = pesosParaCriterios(etiquetas, guardados);
  const total = pesos.reduce((s, w) => s + w, 0);
  if (total <= 0 || pesos.every((w) => w === pesos[0])) return rows;
  const delta = pesos.map((w) => w / total - 1 / pesos.length);
  const valido = (r: RankingRow) => r.explicacion !== SIN_INFORMACION && Number.isFinite(r.score_bruto)
    && Array.isArray(r.req_sims_bruto) && delta.every((_, k) => Number.isFinite(r.req_sims_bruto![k]));
  if (!rows.some(valido)) return rows;

  const bruto = rows.map((r) => (valido(r) ? r.score_bruto! + delta.reduce((s, d, k) => s + d * r.req_sims_bruto![k]!, 0) : null));
  const validos = bruto.filter((b): b is number => b !== null);
  const lo = Math.min(...validos), hi = Math.max(...validos);
  const escalar = validos.length >= 2 && hi - lo >= 1e-9;
  const nuevos = rows.map((r, i) => {
    const b = bruto[i];
    return b === null ? { ...r, score: r.explicacion === SIN_INFORMACION ? r.score : null }
      : { ...r, score: escalar ? Math.round(((b - lo) / (hi - lo)) * 1e4) / 1e4 : b };
  });
  const orden = nuevos.map((r, i) => ({ i, s: bruto[i] ?? -Infinity, antes: r.ranking ?? Infinity }))
    .sort((a, b) => b.s - a.s || a.antes - b.antes);
  orden.forEach(({ i }, pos) => { nuevos[i] = { ...nuevos[i], ranking: pos + 1 }; });
  return nuevos;
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

/** Avisa al ranking que los pesos de un aviso cambiaron, para volver a aplicarlos. */
export const eventosPesos = new EventTarget();
export const avisarPesosGuardados = (aviso: string) => eventosPesos.dispatchEvent(new CustomEvent('guardados', { detail: aviso }));
