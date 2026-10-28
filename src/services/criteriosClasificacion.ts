import type { SupabaseClient } from '@supabase/supabase-js';
import { PUESTO_TEC, type ClaveCriterio } from '../config/criteriosClasificacion.ts';

// «Criterios y pesos» por aviso (tabla gth_aviso_criterios). Sin fila guardada se usan los valores de base.
export type CriteriosAviso = Record<ClaveCriterio, number>;
export const CRITERIOS_BASE: CriteriosAviso = { experiencia: 100, rotacion: 0.5, rubro: 50, sobrecalificacion: 50, escala_empresa: 50 };

export const limitarLinea = (valor: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(valor) ? valor : 0)));
export const limitarPenalizacion = (valor: number) => Math.max(0, Math.min(1, Math.round((Number.isFinite(valor) ? valor : 0) * 100) / 100));

/** Factor de la escala bruta del ranking al score de la tabla del aviso: los bonos se calculan como fracción de la
 *  distancia entre los puntajes altos y bajos (percentiles 90 y 10 de score_bruto) y la tabla reescala el aviso a 0-1.
 *  Sin ranking guardado, el de un aviso típico (los 3 validados con GTH dan 0,55-0,58). */
export const FACTOR_TIPICO = 0.56;
export function factorScore(brutos: number[]): number {
  const v = brutos.filter((b) => Number.isFinite(b) && b > 0).sort((a, b) => a - b);
  if (v.length < 5) return FACTOR_TIPICO;
  const rango = v[v.length - 1] - v[0];
  const distancia = v[Math.floor(0.9 * v.length)] - v[Math.floor(0.1 * v.length)];
  return rango > 0 && distancia > 0 ? distancia / rango : FACTOR_TIPICO;
}
/** Lo que suma al score de la tabla una bonificación por experiencia con esa intensidad, y al revés. */
export const puntosDeBono = (intensidad: number, base: number, factor: number) => base * intensidad / 50 * factor;
export const intensidadDePuntos = (puntos: number, base: number, factor: number) => limitarLinea(puntos / (base * factor) * 50);
/** Peso de partida de los requisitos de herramientas: la mitad en los puestos que no son de tecnología. */
export const pesoBaseHerramientas = (titulo: string) =>
  PUESTO_TEC.test(titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()) ? 1 : 0.5;
export const porcentajeDePeso = (intensidad: number, base: number) => Math.round(intensidad / 50 * base * 100);
export const intensidadDePorcentaje = (porcentaje: number, base: number) => limitarLinea(porcentaje / 100 / base * 50);

export async function cargarCriterios(client: SupabaseClient, aviso: string): Promise<{ criterios: CriteriosAviso; guardados: boolean }> {
  const { data, error } = await client.from('gth_aviso_criterios')
    .select('experiencia, rotacion, rubro, sobrecalificacion, escala_empresa').eq('aviso_id', aviso).maybeSingle();
  if (error) throw new Error('No se pudieron leer los criterios. Si persiste, comprueba la migración de criterios en GTHC.');
  return data ? { criterios: { ...CRITERIOS_BASE, ...data, rotacion: Number(data.rotacion) }, guardados: true }
    : { criterios: { ...CRITERIOS_BASE }, guardados: false };
}

export async function guardarCriterios(client: SupabaseClient, aviso: string, criterios: CriteriosAviso) {
  const fila = {
    aviso_id: aviso, experiencia: limitarLinea(criterios.experiencia), rotacion: limitarPenalizacion(criterios.rotacion),
    rubro: limitarLinea(criterios.rubro), sobrecalificacion: limitarLinea(criterios.sobrecalificacion),
    escala_empresa: limitarLinea(criterios.escala_empresa),
  };
  const { error } = await client.from('gth_aviso_criterios').upsert(fila, { onConflict: 'aviso_id' });
  if (error) throw new Error('No se guardaron los criterios. Comprueba la conexión y que tu cuenta sea superadministradora.');
}
