import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.ts';
import type { Application, Candidate, JobPosting } from '../types/index.ts';

// Marca «En revisión» del ranking. Se guarda en Supabase (tabla en_revision) para que todo el equipo de GTH vea
// las mismas marcas desde cualquier PC. Sin Supabase configurado, la marca vive solo mientras la página esté abierta.

export type MarcaRevision = { email: string | null; at: string };

const REFRESCO_MS = 60 * 1000;
const claveAviso = (job: JobPosting) => job.bumeran?.avisoId || job.id;
const clavePostulante = (cand: Candidate) => cand.importedProfile?.externalId || cand.id;

export function useEnRevision(job: JobPosting | null | undefined, applications: Application[], candidates: Candidate[]) {
  // id_postulante → marca
  const [marcas, setMarcas] = useState<Map<string, MarcaRevision>>(new Map());
  const [error, setError] = useState('');
  const aviso = job ? claveAviso(job) : null;

  const cargar = useCallback(async () => {
    if (!supabase || !aviso) return;
    const { data, error: err } = await supabase.from('en_revision')
      .select('id_postulante, marcado_por_email, marcado_at').eq('aviso_id', aviso);
    if (err) { setError(err.message); return; }
    setError('');
    setMarcas(new Map((data || []).map((r) => [r.id_postulante as string, { email: r.marcado_por_email as string | null, at: r.marcado_at as string }])));
  }, [aviso]);

  useEffect(() => {
    setMarcas(new Map());
    void cargar();
    const timer = window.setInterval(() => void cargar(), REFRESCO_MS);
    return () => window.clearInterval(timer);
  }, [cargar]);

  // Por id de postulación, que es lo que usa la tabla
  const porAplicacion = useMemo(() => {
    const cands = new Map(candidates.map((c) => [c.id, c]));
    const res = new Map<string, MarcaRevision>();
    for (const app of applications) {
      const cand = cands.get(app.candidateId);
      const marca = cand && marcas.get(clavePostulante(cand));
      if (marca) res.set(app.id, marca);
    }
    return res;
  }, [applications, candidates, marcas]);

  /** Marca o desmarca; devuelve el mensaje de error si Supabase lo rechazó. */
  const alternar = useCallback(async (cand: Candidate): Promise<string | null> => {
    if (!aviso) return null;
    const id = clavePostulante(cand);
    const marcado = marcas.has(id);
    setMarcas((prev) => {
      const next = new Map(prev);
      if (marcado) next.delete(id); else next.set(id, { email: null, at: new Date().toISOString() });
      return next;
    });
    if (!supabase) return null;
    const { error: err } = marcado
      ? await supabase.from('en_revision').delete().eq('aviso_id', aviso).eq('id_postulante', id)
      : await supabase.from('en_revision').insert({ aviso_id: aviso, id_postulante: id });
    await cargar();
    return err ? err.message : null;
  }, [aviso, marcas, cargar]);

  return { porAplicacion, alternar, error };
}
