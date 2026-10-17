import { createContext, useContext } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppStateData } from '../types/index.ts';
import { BUMERAN_PREFIX } from './bumeranSync.ts';

// Niveles de acceso (supabase/migrations/20261017120000_niveles_acceso.sql). Supabase filtra los avisos con RLS;
// aquí solo se decide qué secciones del menú se muestran y se limpian de la copia local los avisos que ya no se ven.

export type Nivel = 'maestro' | 'general';
export interface Perfil {
  user_id: string;
  email: string;
  nombre: string;
  nivel: Nivel;
  secciones: string[] | null;   // null = todas
  avisos: string[] | null;      // null = todos los no confidenciales
  debe_cambiar_clave: boolean;
  activo: boolean;
}

/** Secciones del menú que una cuenta maestra puede dar o quitar a las demás. */
export const SECCIONES = [
  { id: 'convocatorias', label: 'Convocatorias' },
  { id: 'mejores_candidatos', label: 'Candidatos y ranking' },
  { id: 'base_centralizada', label: 'Base centralizada' },
  { id: 'comparador', label: 'Comparador' },
  { id: 'avance_candidatos', label: 'Avance de candidatos' },
  { id: 'actualizacion_datos', label: 'Actualización de datos' },
] as const;
export const VISTA_ADMIN = 'usuarios_permisos';

// Pantallas a las que se llega desde otra sección (no están en el menú) y la sección de la que dependen.
const DEPENDE_DE: Record<string, string> = { nueva_convocatoria: 'convocatorias', agregar_archivos: 'mejores_candidatos' };

/** null = sin Supabase (instalación local): todo permitido. */
export function puedeVerSeccion(perfil: Perfil | null, vista: string): boolean {
  if (!perfil) return vista !== VISTA_ADMIN;
  if (perfil.nivel === 'maestro') return true;
  if (vista === VISTA_ADMIN) return false;
  const seccion = (DEPENDE_DE[vista] || vista).replaceAll('-', '_');
  return perfil.secciones === null || perfil.secciones.includes(seccion);
}

export const PerfilContext = createContext<Perfil | null>(null);
export const usePerfil = () => useContext(PerfilContext);

export async function fetchMiPerfil(client: SupabaseClient, userId: string): Promise<Perfil | null> {
  const { data, error } = await client.from('gth_perfiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Perfil | null;
}

/** Todos los avisos que el usuario puede ver (sin filtrar por la lista actual de Bumeran). */
export async function fetchAvisosVisibles(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client.from('avisos').select('aviso_id');
  if (error) throw new Error(error.message);
  return new Set((data || []).map((row) => row.aviso_id as string));
}

/**
 * Quita de la copia local las convocatorias de Bumeran que el usuario ya no puede ver (marcadas confidenciales o
 * fuera de su lista) junto con sus postulaciones, historial y comentarios. Las convocatorias manuales no se tocan.
 */
export function quitarAvisosNoVisibles(state: AppStateData, visibles: Set<string>): AppStateData {
  const fuera = new Set(state.jobPostings
    .filter((job) => job.id.startsWith(BUMERAN_PREFIX) && job.bumeran?.avisoId && !visibles.has(job.bumeran.avisoId))
    .map((job) => job.id));
  if (!fuera.size) return state;
  const avisosFuera = new Set(state.jobPostings.filter((job) => fuera.has(job.id)).map((job) => job.bumeran!.avisoId));
  const appsFuera = new Set(state.applications.filter((a) => fuera.has(a.jobPostingId)).map((a) => a.id));
  const applications = state.applications.filter((a) => !appsFuera.has(a.id));
  const conPostulacion = new Set(applications.map((a) => a.candidateId));
  const soloEnFuera = new Set(state.applications.filter((a) => appsFuera.has(a.id) && !conPostulacion.has(a.candidateId)).map((a) => a.candidateId));
  const jobPostings = state.jobPostings.filter((job) => !fuera.has(job.id));
  const comentariosInternos = state.comentariosInternos && Object.fromEntries(Object.entries(state.comentariosInternos)
    .filter(([clave]) => { try { return !avisosFuera.has(JSON.parse(clave)[0]); } catch { return true; } }));
  return {
    ...state,
    jobPostings,
    applications,
    candidates: state.candidates.filter((c) => !soloEnFuera.has(c.id)),
    activities: state.activities.filter((x) => !appsFuera.has(x.applicationId)),
    decisionLogs: state.decisionLogs.filter((x) => !fuera.has(x.jobPostingId)),
    emailDrafts: state.emailDrafts.filter((x) => !appsFuera.has(x.applicationId)),
    interviewRecords: state.interviewRecords.filter((x) => !appsFuera.has(x.applicationId)),
    ...(comentariosInternos ? { comentariosInternos } : {}),
    activeJobPostingId: fuera.has(state.activeJobPostingId) ? (jobPostings[0]?.id || '') : state.activeJobPostingId,
  };
}

// ------------------------------------------------------------------ administración (solo cuentas maestras)

export async function listarPerfiles(client: SupabaseClient): Promise<Perfil[]> {
  const { data, error } = await client.from('gth_perfiles').select('*').order('nivel').order('email');
  if (error) throw new Error(error.message);
  return (data || []) as Perfil[];
}

export async function guardarPerfil(client: SupabaseClient, userId: string, cambios: Partial<Pick<Perfil, 'nombre' | 'nivel' | 'secciones' | 'avisos'>>) {
  const { error } = await client.from('gth_perfiles').update(cambios).eq('user_id', userId);
  if (error) throw new Error(/propio nivel/.test(error.message) ? 'No puedes cambiar tu propio nivel.' : 'No se pudo guardar el cambio.');
}

export interface AvisoAdmin { aviso_id: string; titulo: string | null; creado_por: string | null; publicado_el: string | null; en_ultima_lista: number | null }

export async function listarAvisosAdmin(client: SupabaseClient): Promise<{ avisos: AvisoAdmin[]; confidenciales: Set<string> }> {
  const [avisos, conf] = await Promise.all([
    client.from('avisos').select('aviso_id, titulo, creado_por, publicado_el, en_ultima_lista').order('publicado_el', { ascending: false }),
    client.from('avisos_confidenciales').select('aviso_id'),
  ]);
  if (avisos.error || conf.error) throw new Error((avisos.error || conf.error)!.message);
  return { avisos: (avisos.data || []) as AvisoAdmin[], confidenciales: new Set((conf.data || []).map((r) => r.aviso_id as string)) };
}

export async function marcarConfidencial(client: SupabaseClient, avisoId: string, confidencial: boolean) {
  const { error } = confidencial
    ? await client.from('avisos_confidenciales').insert({ aviso_id: avisoId })
    : await client.from('avisos_confidenciales').delete().eq('aviso_id', avisoId);
  if (error) throw new Error('No se pudo cambiar la marca de confidencial.');
}

/** Acciones que requieren la clave service_role (api/usuarios.ts). */
export async function apiUsuarios<T = Record<string, unknown>>(client: SupabaseClient, accion: string, datos: Record<string, unknown> = {}): Promise<T> {
  const { data } = await client.auth.getSession();
  const respuesta = await fetch('/api/usuarios', {
    method: 'POST', cache: 'no-store', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
    body: JSON.stringify({ accion, ...datos }),
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(cuerpo.error || 'No se pudo conectar con el servidor.');
  return cuerpo as T;
}
