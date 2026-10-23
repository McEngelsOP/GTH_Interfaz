import type { SupabaseClient } from '@supabase/supabase-js';

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

/** La fuente es el CSV del aviso; no se deducen importes del texto libre del CV. */
export function extraerSueldoPretendido(records: Record<string, string>[]): number | null {
  for (const record of records) for (const [key, value] of Object.entries(record)) {
    const campo = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_-]/g, ' ');
    if (!/^(?:pretension(?: salarial)?|sueldo (?:bruto )?(?:pretendido|deseado)|remuneracion pretendida|expectativa salarial|salario (?:bruto )?(?:pretendido|deseado))(?:\s*\((?:s\/\.?|pen|soles)\))?$/i.test(campo.trim())) continue;
    if (typeof value !== 'string') continue;
    const monto = leerSueldo(value);
    if (monto !== null) return monto;
  }
  return null;
}
export function compararSueldo(ofertado?: number | null, pretendido?: number | null): 'dentro' | 'supera' | 'pendiente' {
  if (!sueldoValido(ofertado) || !sueldoValido(pretendido)) return 'pendiente';
  return pretendido <= ofertado ? 'dentro' : 'supera';
}
export const formatearSueldo = (monto: number | null) => monto === null ? 'No registrado' :
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(monto);

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
