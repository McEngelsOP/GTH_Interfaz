import type { SupabaseClient } from '@supabase/supabase-js';
import type { Application, JobPosting } from '../types/index.ts';
import { embeddingVigente } from './rankingEmbeddings.ts';

export const MAX_SUELDO = 1_000_000;
export const sueldoValido = (valor: unknown): valor is number => typeof valor === 'number' &&
  Number.isFinite(valor) && valor > 0 && valor <= MAX_SUELDO && Math.abs(valor * 100 - Math.round(valor * 100)) < 0.000001;

/** Solo montos mensuales en soles. Rangos, otras monedas y texto ambiguo quedan pendientes. */
export function leerSueldo(valor: string): number | null {
  let texto = valor.trim().replace(/\u00a0/g, ' ');
  if (!texto || /USD|US\$|\$|d[oó]lar|EUR|anual|a[nñ]o|quincen|seman|diari|hora/i.test(texto)) return null;
  texto = texto.replace(/^(?:S\/\.?|PEN|soles)\s*/i, '').replace(/\s*(?:PEN|soles)?\s*(?:mensual(?:es)?|al mes)?$/i, '').trim();
  if (!/^(?:\d+|\d{1,3}(?:[ ,.]\d{3})+)(?:[.,]\d{1,2})?$/.test(texto)) return null;
  const decimal = texto.match(/[.,](\d{1,2})$/)?.[0];
  const entero = (decimal ? texto.slice(0, -decimal.length) : texto).replace(/[ ,.]/g, '');
  const numero = Number(entero + (decimal ? '.' + decimal.slice(1) : ''));
  return sueldoValido(numero) ? numero : null;
}

// Columna est\u00e1ndar del CSV de Bumeran (\u00abPreferencia Salarial\u00bb) y otros nombres de la pretensi\u00f3n.
const CAMPO_SUELDO = /^(?:preferencia salarial|pretension(?: salarial)?|sueldo (?:bruto )?(?:pretendido|deseado)|remuneracion pretendida|expectativa salarial|salario (?:bruto )?(?:pretendido|deseado))(?:\s*\((?:s\/\.?|pen|soles)\))?$/i;
// Preguntas del aviso: \u00ab\u00bfCu\u00e1l es tu expectativa salarial\u2026?\u00bb, \u00ab\u00bfCu\u00e1les son tus pretensiones salariales?\u00bb
const PREGUNTA_SUELDO = /\b(?:expectativas? salarial(?:es)?|pretensi(?:on|ones) salarial(?:es)?)\b/i;

/** La fuente es el CSV del aviso; no se deducen importes del texto libre del CV. Primero la columna de Bumeran y,
 *  si no trae un monto v\u00e1lido, la respuesta a la pregunta salarial del aviso. */
export function extraerSueldoPretendido(records: Record<string, string>[]): number | null {
  const campos = records.flatMap((record) => Object.entries(record)).map(([key, value]) =>
    ({ campo: key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_-]/g, ' ').trim(), value }));
  for (const coincide of [(c: string) => CAMPO_SUELDO.test(c), (c: string) => PREGUNTA_SUELDO.test(c)]) {
    for (const { campo, value } of campos) {
      if (!coincide(campo) || typeof value !== 'string') continue;
      const monto = leerSueldo(value);
      if (monto !== null) return monto;
    }
  }
  return null;
}
export function compararSueldo(ofertado?: number | null, pretendido?: number | null): 'dentro' | 'supera' | 'pendiente' {
  if (!sueldoValido(ofertado) || !sueldoValido(pretendido)) return 'pendiente';
  return pretendido <= ofertado ? 'dentro' : 'supera';
}
export const formatearSueldo = (monto: number | null) => monto === null ? 'No registrado' :
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(monto);

export type ModoSueldo = 'estricto' | 'manejable';
export interface CriterioSalarial { monto: number | null; modo: ModoSueldo; admiteModo: boolean }
export type AjusteSalarial = 'dentro' | 'supera' | 'manejable' | 'pendiente';
// Misma referencia de similitud alta que ya muestra el comparador. No equivale a aprobar una oferta.
export const SCORE_SUELDO_MANEJABLE = 0.70;
export function evaluarAjusteSalarial(criterio: CriterioSalarial | null, app: Application, job: JobPosting): AjusteSalarial {
  const comparacion = compararSueldo(criterio?.monto, app.expectedSalary);
  if (comparacion !== 'supera' || criterio?.modo !== 'manejable') return comparacion;
  const score = embeddingVigente(app, job)?.score;
  return typeof score === 'number' && Number.isFinite(score) && score >= SCORE_SUELDO_MANEJABLE && score <= 1
    ? 'manejable' : 'supera';
}

export async function cargarCriterioSalarial(client: SupabaseClient, avisoId: string): Promise<CriterioSalarial> {
  const { data, error } = await client.from('gth_sueldos_ofertados').select('monto, modo_sueldo').eq('aviso_id', avisoId).maybeSingle();
  // Una instalación anterior conserva la comparación estricta y la edición del importe hasta aplicar el SQL.
  if (error && ['42703', 'PGRST204'].includes(error.code) && /modo_sueldo/.test(error.message)) {
    return { monto: await cargarSueldoOfertado(client, avisoId), modo: 'estricto', admiteModo: false };
  }
  if (error) throw new Error('No se pudo leer la oferta. Reintenta; si persiste, comprueba la migración de sueldos en GTHC.');
  const monto = data?.monto == null ? null : Number(data.monto);
  if (monto !== null && !sueldoValido(monto)) throw new Error('La oferta registrada no es válida. Pide su revisión.');
  if (data?.modo_sueldo != null && !['estricto', 'manejable'].includes(data.modo_sueldo)) throw new Error('El criterio salarial registrado no es válido. Pide su revisión.');
  return { monto, modo: data?.modo_sueldo === 'manejable' ? 'manejable' : 'estricto', admiteModo: true };
}

export async function guardarModoSueldo(client: SupabaseClient, avisoId: string, modo: ModoSueldo): Promise<ModoSueldo> {
  if (!['estricto', 'manejable'].includes(modo)) throw new Error('Selecciona Estricto o Manejable.');
  // No envía monto: cambiar el criterio nunca sobrescribe una oferta editada por otra persona.
  const { data, error } = await client.from('gth_sueldos_ofertados').upsert({ aviso_id: avisoId, modo_sueldo: modo }, { onConflict: 'aviso_id' }).select('modo_sueldo').single();
  if (error || !data || data.modo_sueldo !== modo) throw new Error('No se guardó el criterio. Revisa la conexión, tus permisos y la migración de criterios salariales.');
  return data.modo_sueldo;
}

export async function cargarSueldoOfertado(client: SupabaseClient, avisoId: string): Promise<number | null> {
  const { data, error } = await client.from('gth_sueldos_ofertados').select('monto').eq('aviso_id', avisoId).maybeSingle();
  if (error) throw new Error('No se pudo leer la oferta. Reintenta; si persiste, comprueba la migración de sueldos en GTHC.');
  const monto = data?.monto == null ? null : Number(data.monto);
  if (monto !== null && !sueldoValido(monto)) throw new Error('La oferta registrada no es válida. Pide su revisión.');
  return monto;
}
export async function guardarSueldoOfertado(client: SupabaseClient, avisoId: string, monto: number | null): Promise<number | null> {
  if (monto !== null && !sueldoValido(monto)) throw new Error('Ingresa un monto mayor que cero, hasta S/ 1 000 000 y con dos decimales como máximo.');
  const { data, error } = await client.from('gth_sueldos_ofertados').upsert({ aviso_id: avisoId, monto }, { onConflict: 'aviso_id' }).select('monto').single();
  if (error) throw new Error('No se guardó la oferta. Comprueba la conexión y que tu cuenta siga siendo superadministradora.');
  return data.monto == null ? null : Number(data.monto);
}
