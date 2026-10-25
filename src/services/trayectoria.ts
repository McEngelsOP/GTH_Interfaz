import { createContext, useContext, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';

export type EstadoTrayectoria = 'patron_detectado' | 'sin_patron' | 'informacion_insuficiente' | 'no_aplica' | 'pendiente' | 'desactualizado';
export type RevisionTrayectoria = 'justificado' | 'dato_incorrecto' | 'revisado';
export const ETIQUETAS_REVISION: Record<RevisionTrayectoria, string> = {
  justificado: 'Cambios justificados', dato_incorrecto: 'Dato por corregir', revisado: 'Revisado por GTH',
};
export interface ResumenTrayectoria {
  id_postulante: string; analisis_id: string | null; estado: EstadoTrayectoria;
  calculado_at: string | null; revision: RevisionTrayectoria | null;
}
export interface DetalleTrayectoria {
  estado: EstadoTrayectoria; fecha_referencia: string;
  parametros: { transiciones: number; ventana_meses: number; horizonte_meses: number };
  experiencias: { indice: number; empresa: string; puesto: string; inicio: string; fin: string;
    fecha_inicio?: FechaTrayectoria; fecha_fin?: FechaTrayectoria;
    modalidad: string; motivo: string; evidencia: string; excluida: boolean }[];
  ventana: { inicio: string; fin: string; transiciones: { desde: number; hasta: number; min: string; max: string }[] } | null;
  ventana_posible?: DetalleTrayectoria['ventana']; notas?: string[];
  incidencias: string[]; total_transiciones: number; total_transiciones_posibles?: number;
}
export interface FechaTrayectoria {
  original: string; estado: 'valida' | 'ausente' | 'no_reconocida';
  precision: 'dia' | 'mes' | 'anio' | 'actualidad' | null; texto: string;
}
export const ESTADOS_TRAYECTORIA: Record<EstadoTrayectoria, string> = {
  patron_detectado: 'Revisar trayectoria', sin_patron: 'Sin patrón en los datos evaluables',
  informacion_insuficiente: 'Información insuficiente', no_aplica: 'No aplica',
  pendiente: 'Análisis pendiente', desactualizado: 'Análisis desactualizado',
};
/** Semáforo de «Cambios entre empleadores»: rojo si hay cambios frecuentes, verde si no hay riesgo, amarillo si no se
 *  pudo concluir (falta información o el análisis está pendiente). */
export type Semaforo = 'verde' | 'rojo' | 'amarillo';
export const semaforoTrayectoria = (estado: EstadoTrayectoria | undefined): Semaforo =>
  estado === 'patron_detectado' ? 'rojo' : estado === 'sin_patron' || estado === 'no_aplica' ? 'verde' : 'amarillo';
export const TEXTO_SEMAFORO: Record<Semaforo, string> = {
  verde: 'Sin riesgo', rojo: 'Con riesgo: cambios frecuentes', amarillo: 'No se pudo concluir',
};
const revisiones = ['justificado', 'dato_incorrecto', 'revisado'];
export async function cargarResumenTrayectoria(client: SupabaseClient, aviso: string): Promise<Record<string, ResumenTrayectoria>> {
  const rows: Record<string, ResumenTrayectoria> = Object.create(null);
  for (let desde = 0; ; desde += 500) {
    const { data, error } = await client.rpc('gth_trayectoria_resumen', { p_aviso: aviso, p_desde: desde });
    if (error) throw new Error('No se pudo consultar la trayectoria. Reintenta; si persiste, solicita verificar la migración.');
    if (!Array.isArray(data)) throw new Error('Respuesta de trayectoria inválida.');
    for (const row of data) {
      if (!row || typeof row.id_postulante !== 'string' || !Object.hasOwn(ESTADOS_TRAYECTORIA, row.estado)
        || !(row.analisis_id === null || typeof row.analisis_id === 'string')
        || !(row.revision === null || revisiones.includes(row.revision))) throw new Error('Respuesta de trayectoria inválida.');
      rows[row.id_postulante] = row;
    }
    if (data.length < 500) return rows;
  }
}
export async function cargarDetalleTrayectoria(client: SupabaseClient, id: string) {
  const { data, error } = await client.from('gth_trayectoria_analisis').select('id,detalle').eq('id', id).single();
  const d = data?.detalle;
  if (error || data?.id !== id || !d || !Array.isArray(d.experiencias) || !Array.isArray(d.incidencias)
    || !Object.hasOwn(ESTADOS_TRAYECTORIA, d.estado) || typeof d.fecha_referencia !== 'string'
    || !d.parametros || !['transiciones','ventana_meses','horizonte_meses'].every((k) => Number.isFinite(d.parametros[k]))
    || !d.incidencias.every((i: unknown) => typeof i === 'string')
    || !Number.isInteger(d.total_transiciones) || d.total_transiciones < 0
    || !(d.total_transiciones_posibles === undefined || (Number.isInteger(d.total_transiciones_posibles) && d.total_transiciones_posibles >= 0))
    || !(d.notas === undefined || (Array.isArray(d.notas) && d.notas.every((n: unknown) => typeof n === 'string')))
    || !(d.ventana_posible === undefined || d.ventana_posible === null || (typeof d.ventana_posible.inicio === 'string'
      && typeof d.ventana_posible.fin === 'string' && Array.isArray(d.ventana_posible.transiciones)))
    || !(d.ventana === null || (typeof d.ventana?.inicio === 'string' && typeof d.ventana?.fin === 'string' && Array.isArray(d.ventana?.transiciones)
      && d.ventana.transiciones.every((t: Record<string, unknown>) => t && Number.isInteger(t.desde) && Number.isInteger(t.hasta))))
    || !d.experiencias.every((e: Record<string, unknown>) => e && Number.isInteger(e.indice) && typeof e.excluida === 'boolean'
      && ['empresa','puesto','inicio','fin','motivo','evidencia'].every((k) => typeof e[k] === 'string')
      && ['fecha_inicio','fecha_fin'].every((k) => e[k] === undefined || fechaValida(e[k]))))
    throw new Error('No se pudo cargar la evidencia. Vuelve a consultar la trayectoria.');
  return d as DetalleTrayectoria;
}
function fechaValida(value: unknown): value is FechaTrayectoria {
  if (!value || typeof value !== 'object') return false;
  const f = value as FechaTrayectoria;
  return typeof f.original === 'string' && typeof f.texto === 'string'
    && ['valida', 'ausente', 'no_reconocida'].includes(f.estado)
    && (f.precision === null || ['dia', 'mes', 'anio', 'actualidad'].includes(f.precision));
}
export async function guardarRevisionTrayectoria(client: SupabaseClient, id: string, estado: RevisionTrayectoria, value: string) {
  const texto = value.trim();
  if (!revisiones.includes(estado) || texto.length < 5 || texto.length > 2000) throw new Error('Escribe un motivo de entre 5 y 2000 caracteres.');
  const { error } = await client.from('gth_trayectoria_revisiones').insert({ analisis_id: id, estado, texto });
  if (error) throw new Error('No se guardó la revisión. Recarga la trayectoria para comprobar su vigencia y tus permisos.');
}
export interface RevisionRegistrada { id: string; estado: RevisionTrayectoria; texto: string; creada_at: string }
export async function cargarRevisionesTrayectoria(client: SupabaseClient, id: string): Promise<RevisionRegistrada[]> {
  const { data, error } = await client.from('gth_trayectoria_revisiones').select('id,estado,texto,creada_at')
    .eq('analisis_id', id).order('creada_at', { ascending: false }).order('id', { ascending: false }).limit(10);
  if (error || !Array.isArray(data) || !data.every((r) => r && revisiones.includes(r.estado) && typeof r.texto === 'string' && typeof r.creada_at === 'string'))
    throw new Error('No se pudo consultar el historial de revisiones. Actualiza la trayectoria.');
  return data;
}
type TrayectoriaState = { aviso: string | undefined; rows: Record<string, ResumenTrayectoria>; loading: boolean; error: string; refresh: () => void };
export const TrayectoriaContext = createContext<TrayectoriaState>({ aviso: undefined, rows: {}, loading: false, error: '', refresh: () => {} });
export const useTrayectoria = () => useContext(TrayectoriaContext);
export function useCargarTrayectoria(aviso: string | undefined, token: string) {
  const [revision, setRevision] = useState(0);
  const scope = JSON.stringify([aviso, token, revision]);
  const [state, setState] = useState({ scope: '', rows: {} as Record<string, ResumenTrayectoria>, loading: false, error: '' });
  useEffect(() => {
    let alive = true;
    if (!supabase || !aviso) return;
    setState({ scope, rows: {}, loading: true, error: '' });
    cargarResumenTrayectoria(supabase, aviso).then((rows) => {
      if (alive) setState({ scope, rows, loading: false, error: '' });
    }).catch((e: Error) => { if (alive) setState({ scope, rows: {}, loading: false, error: e.message }); });
    return () => { alive = false; };
  }, [scope, aviso]);
  return { aviso, rows: state.scope === scope ? state.rows : {}, loading: !!supabase && !!aviso && (state.scope !== scope || state.loading),
    error: state.scope === scope ? state.error : '', refresh: () => setRevision((r) => r + 1) };
}
