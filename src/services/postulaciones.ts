import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppStateData, Application, Candidate, JobPosting } from '../types/index.ts';
import { supabase } from './supabase.ts';
import { faltaConsultaPostulaciones } from './supabaseQueries.ts';

export interface PostulacionHistorica {
  aviso_id: string;
  titulo: string | null;
  fecha: string | null;
  score: number | null;
  backend: string | null;
  criterios_version: string | null;
}

export async function fetchHistorialPostulaciones(client: SupabaseClient, aviso: string, postulante: string, signal?: AbortSignal): Promise<PostulacionHistorica[]> {
  let request = client.rpc('gth_historial_postulaciones', { p_aviso_id: aviso, p_id_postulante: postulante });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw new Error(faltaConsultaPostulaciones(error)
    ? 'El historial completo todavía no está disponible. Intenta de nuevo más tarde.'
    : 'No se pudieron cargar las postulaciones. Revisa tu conexión y vuelve a intentarlo.');
  return data || [];
}

export function historialLocal(candidate: Candidate, state: AppStateData): PostulacionHistorica[] {
  const jobs = new Map(state.jobPostings.map((j) => [j.id, j]));
  const porAviso = new Map<string, PostulacionHistorica>();
  for (const app of state.applications.filter((a) => a.candidateId === candidate.id)) {
    const job = jobs.get(app.jobPostingId);
    if (!job) continue;
    const emb = app.embeddingMatch?.criteriaVersion === job.criteriaVersion ? app.embeddingMatch : null;
    porAviso.set(job.bumeran?.avisoId || job.id, {
      aviso_id: job.bumeran?.avisoId || job.id, titulo: job.title, fecha: app.createdAt?.slice(0, 10) || null,
      score: emb?.score ?? null, backend: emb?.backend ?? null, criterios_version: emb?.criteriaVersion ?? null,
    });
  }
  return [...porAviso.values()].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || a.aviso_id.localeCompare(b.aviso_id));
}

export function useHistorialPostulaciones(candidate: Candidate, job: JobPosting, state: AppStateData) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ rows: PostulacionHistorica[]; loading: boolean; error: string }>({ rows: [], loading: true, error: '' });
  const aviso = job.bumeran?.avisoId;
  const id = candidate.importedProfile?.externalId;
  const remoto = Boolean(supabase && aviso);
  useEffect(() => {
    const controller = new AbortController();
    setResult({ rows: [], loading: true, error: '' });
    if (!remoto) {
      setResult({ rows: historialLocal(candidate, state), loading: false, error: '' });
    } else if (!id) {
      setResult({ rows: [], loading: false, error: 'Este perfil aún no tiene un identificador de Bumeran para consultar su historial.' });
    } else {
      fetchHistorialPostulaciones(supabase!, aviso!, id, controller.signal).then((rows) => {
        if (!controller.signal.aborted) setResult({ rows, loading: false, error: '' });
      }).catch((error: Error) => {
        if (!controller.signal.aborted) setResult({ rows: [], loading: false, error: error.message });
      });
    }
    return () => controller.abort();
  }, [candidate, state.applications, state.jobPostings, aviso, id, remoto, revision]);
  return { ...result, remoto, reload: () => setRevision((r) => r + 1) };
}

export function useResumenPostulaciones(job: JobPosting | undefined, applications: Application[], candidates: Map<string, Candidate>) {
  const ids = useMemo(() => [...new Set(applications.map((a) => candidates.get(a.candidateId)?.importedProfile?.externalId).filter((id): id is string => Boolean(id)))].sort(), [applications, candidates]);
  const key = JSON.stringify(ids);
  const aviso = job?.bumeran?.avisoId;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; totals: Record<string, number>; error: string }>({ key: '', totals: {}, error: '' });
  const requestKey = `${aviso || ''}:${key}`;
  useEffect(() => {
    const refresh = () => setRevision((r) => r + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (!supabase || !aviso || !ids.length) { setResult({ key: requestKey, totals: {}, error: '' }); return; }
    supabase.rpc('gth_resumen_postulaciones', { p_aviso_id: aviso, p_ids: ids }).abortSignal(controller.signal).then(({ data, error }) => {
      if (controller.signal.aborted) return;
      const totals: Record<string, number> = {};
      if (!error) for (const row of data || []) totals[row.id_postulante] = row.total;
      setResult({ key: requestKey, totals, error: error && !faltaConsultaPostulaciones(error) ? 'No se pudo comprobar la recurrencia de los postulantes.' : '' });
    });
    return () => controller.abort();
  }, [aviso, key, revision, job?.bumeran?.updatedAt]);
  return { totals: result.key === requestKey ? result.totals : {}, error: result.key === requestKey ? result.error : '', reload: () => setRevision((r) => r + 1) };
}
