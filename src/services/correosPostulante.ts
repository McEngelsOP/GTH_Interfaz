import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppStateData } from '../types/index.ts';

/** Correo corregido de un postulante (tabla gth_correos_postulante, por su ID de Bumeran): vale en todos sus avisos y
 *  reemplaza al del CSV de Bumeran, aunque el scraper lo vuelva a bajar con el correo anterior. */
export const correoValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254;

export async function guardarCorreo(client: SupabaseClient, idPostulante: string, email: string) {
  const { error } = await client.from('gth_correos_postulante')
    .upsert({ id_postulante: idPostulante, email: email.trim().toLowerCase() }, { onConflict: 'id_postulante' });
  if (error) throw new Error('No se guardó el correo. Comprueba tu sesión y la migración del 29/10.');
}

/** {ID postulante: correo corregido} de los IDs dados (en lotes, para no superar el largo de la URL). */
export async function cargarCorreos(client: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unicos = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unicos.length; i += 200) {
    const { data, error } = await client.from('gth_correos_postulante').select('id_postulante, email').in('id_postulante', unicos.slice(i, i + 200));
    if (error) return out;   // sin la tabla (migración pendiente) se usa el correo de Bumeran
    for (const r of data || []) out.set(r.id_postulante, r.email);
  }
  return out;
}

/** Aplica el correo corregido a todas las fichas de ese postulante (su fila más reciente y `email`), en todos sus avisos. */
export function aplicarCorreo(state: AppStateData, idPostulante: string, email: string): AppStateData {
  const correo = email.trim().toLowerCase();
  let cambio = false;
  const candidates = state.candidates.map((c) => {
    if ((c.importedProfile?.externalId || c.id) !== idPostulante) return c;
    cambio = true;
    const records = c.importedProfile?.records || [];
    return {
      ...c, email: correo,
      importedProfile: c.importedProfile && {
        ...c.importedProfile,
        emails: [...new Set([correo, ...(c.importedProfile.emails || [])])],
        records: records.length ? [...records.slice(0, -1), { ...records[records.length - 1], 'E-Mail': correo }] : records,
      },
    };
  });
  return cambio ? { ...state, candidates } : state;
}
