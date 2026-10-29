import type { SupabaseClient } from '@supabase/supabase-js';

/** Diccionario de empresas Tier 1 / Tier 1.5 (tabla gth_empresas_diccionario). El servidor de GTH lo usa para la
 *  bonificación de «Categorización de empresas»; agregar o quitar una empresa deja con cambios por recalcular solo los
 *  avisos con postulantes que trabajaron en ella. */
export type Tier = 'Tier 1' | 'Tier 1.5';
export interface EmpresaDiccionario { alias: string; tier: Tier; sector: string; exacto: boolean; origen: 'base' | 'equipo' }

/** Misma normalización que scraping/empresas_peru.py: minúsculas, sin tildes y solo letras, números y & ' - . */
export const normalizarEmpresa = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9&'\-. ]/g, ' ').split(/\s+/).filter(Boolean).join(' ');

export async function listarDiccionario(client: SupabaseClient): Promise<EmpresaDiccionario[]> {
  const filas: EmpresaDiccionario[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await client.from('gth_empresas_diccionario').select('alias, tier, sector, exacto, origen')
      .order('alias').range(desde, desde + 999);
    if (error) throw new Error('No se pudo leer el diccionario de empresas. Comprueba la migración del 29/10.');
    filas.push(...((data || []) as EmpresaDiccionario[]));
    if (!data || data.length < 1000) return filas;
  }
}

export async function agregarEmpresa(client: SupabaseClient, nombre: string, tier: Tier, sector: string) {
  const alias = normalizarEmpresa(nombre);
  if (alias.length < 2) throw new Error('Escribe el nombre de la empresa (al menos 2 letras).');
  const { error } = await client.from('gth_empresas_diccionario').insert({ alias, tier, sector: sector.trim(), exacto: false, origen: 'equipo' });
  if (error) throw new Error(error.code === '23505' ? `«${alias}» ya está en el diccionario.` : 'No se pudo agregar. Comprueba que tengas permiso para editar el diccionario.');
  return alias;
}

export async function quitarEmpresa(client: SupabaseClient, alias: string) {
  const { data, error } = await client.from('gth_empresas_diccionario').delete().eq('alias', alias).select('alias');
  if (error || !data?.length) throw new Error('No se pudo quitar. Comprueba que tengas permiso para editar el diccionario.');
}
