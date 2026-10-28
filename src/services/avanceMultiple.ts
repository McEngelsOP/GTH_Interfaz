import { useEffect, useMemo, useState } from 'react';
import type { Application, Candidate } from '../types/index.ts';
import { supabase } from './supabase.ts';

/** Etapas en que un postulante «avanza» en un proceso (gth_avance, compartido por el equipo). */
const AVANZA = ['preseleccionado', 'en_entrevista'] as const;
export type AvanceEnAviso = { avisoId: string; etapa: (typeof AVANZA)[number] };

/** Quiénes de la tabla avanzan (Preseleccionado o En entrevista) en 2 o más avisos: {ID postulante: sus avisos}. Así GTH
 *  ve que el mismo postulante avanza en varias ofertas. Solo incluye a los que avanzan en al menos 2. */
export function useAvanceMultiple(applications: Application[], candidates: Map<string, Candidate>) {
  const ids = useMemo(() => [...new Set(applications.map((a) => candidates.get(a.candidateId)?.importedProfile?.externalId)
    .filter((id): id is string => Boolean(id)))].sort(), [applications, candidates]);
  const key = JSON.stringify(ids);
  const [revision, setRevision] = useState(0);
  const [avances, setAvances] = useState<Record<string, AvanceEnAviso[]>>({});
  useEffect(() => {
    const refrescar = () => setRevision((r) => r + 1);
    window.addEventListener('focus', refrescar);
    return () => window.removeEventListener('focus', refrescar);
  }, []);
  useEffect(() => {
    if (!supabase || !ids.length) { setAvances({}); return; }
    const controller = new AbortController();
    supabase.from('gth_avance').select('aviso_id, id_postulante, etapa').in('id_postulante', ids).in('etapa', [...AVANZA])
      .abortSignal(controller.signal).then(({ data, error }) => {
        if (controller.signal.aborted || error) return;
        const por: Record<string, AvanceEnAviso[]> = {};
        for (const f of data || []) (por[f.id_postulante] ||= []).push({ avisoId: f.aviso_id, etapa: f.etapa });
        setAvances(Object.fromEntries(Object.entries(por).filter(([, a]) => new Set(a.map((x) => x.avisoId)).size >= 2)));
      });
    return () => controller.abort();
  }, [key, revision]);
  return avances;
}
