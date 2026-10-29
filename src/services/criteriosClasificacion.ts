import type { SupabaseClient } from '@supabase/supabase-js';
import { PUESTO_TEC, type ClaveCriterio } from '../config/criteriosClasificacion.ts';

// «Criterios y pesos» por aviso (tabla gth_aviso_criterios). Sin fila guardada se usan los valores de base.
export type CriteriosAviso = Record<ClaveCriterio, number>;
export const CRITERIOS_BASE: CriteriosAviso = { experiencia: 100, rotacion: 0.5, rubro: 50, sobrecalificacion: 50, escala_empresa: 50 };

export const limitarLinea = (valor: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(valor) ? valor : 0)));
export const limitarPenalizacion = (valor: number) => Math.max(0, Math.min(1, Math.round((Number.isFinite(valor) ? valor : 0) * 100) / 100));

/** Score absoluto (scraping/ranking.py, PUNTOS_POR_DISTANCIA): un bono de una fracción `base` de la distancia del aviso
 *  suma base × 0.1 al score de la tabla, igual en todos los avisos. Los extras suman como máximo ±0.15. */
export const PUNTOS_POR_DISTANCIA = 0.1;
/** Lo que suma al score de la tabla una bonificación por experiencia con esa intensidad, y al revés. */
export const puntosDeBono = (intensidad: number, base: number) => base * intensidad / 50 * PUNTOS_POR_DISTANCIA;
export const intensidadDePuntos = (puntos: number, base: number) => limitarLinea(puntos / (base * PUNTOS_POR_DISTANCIA) * 50);
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
