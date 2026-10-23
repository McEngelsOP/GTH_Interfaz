import { useCargarTrayectoria } from './trayectoria.ts';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { analyzeCandidateTables } from './candidateImport.ts';
import { avisoToJob, fetchAvisos, fetchCorridas, fetchPostulantes, fetchRanking, postulantesToTable, rankingToMatches } from './bumeranSync.ts';
import type { CorridaRow } from './bumeranSync.ts';
import { supabase } from './supabase.ts';
import { fetchAvisosVisibles } from './permisos.ts';

type LoadState = { loading: boolean; error: string; checkedAt: string | null };
const initial: LoadState = { loading: false, error: '', checkedAt: null };
const REFRESCO_MS = 5 * 60 * 1000;

/** Relee datos ya guardados por el scraper; no inicia Selenium ni recalcula embeddings. */
export function useBumeranSync() {
  const app = useApp();
  const latest = useRef(app);
  latest.current = app;
  const [revision, setRevision] = useState(0);
  const [postings, setPostings] = useState(initial);
  const [applicants, setApplicants] = useState(initial);
  const [ranking, setRanking] = useState(initial);
  const [runs, setRuns] = useState<LoadState & { rows: CorridaRow[] }>({ ...initial, rows: [] });
  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    if (!supabase) return;
    const timer = window.setInterval(refresh, REFRESCO_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    setPostings((prev) => ({ ...prev, loading: true, error: '' }));
    Promise.all([fetchAvisos(supabase), fetchAvisosVisibles(supabase)]).then(([rows, visibles]) => {
      if (!alive) return;
      latest.current.handleSyncBumeranJobs(rows.map(avisoToJob), visibles);
      setPostings({ loading: false, error: '', checkedAt: new Date().toISOString() });
    }).catch(() => {
      if (alive) setPostings((prev) => ({ ...prev, loading: false, error: 'No se pudieron leer las convocatorias. Reintenta; si persiste, revisa los permisos de acceso.' }));
    });
    return () => { alive = false; };
  }, [revision]);

  // Corridas del proceso de extracción: última revisión de Bumeran y lo que trajo (página «Actualización de datos»)
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    setRuns((prev) => ({ ...prev, loading: true, error: '' }));
    fetchCorridas(supabase).then((rows) => {
      if (alive) setRuns({ loading: false, error: '', checkedAt: new Date().toISOString(), rows });
    }).catch(() => {
      if (alive) setRuns((prev) => ({ ...prev, loading: false, error: 'No se pudo leer el historial de revisiones.' }));
    });
    return () => { alive = false; };
  }, [revision]);

  const job = app.activeJob;
  const avisoId = job?.bumeran?.avisoId;
  const updatedAt = job?.bumeran?.updatedAt;
  useEffect(() => {
    setApplicants(initial);
    if (!supabase || !avisoId || !job) return;
    let alive = true;
    setApplicants({ ...initial, loading: true });
    fetchPostulantes(supabase, avisoId).then((rows) => {
      if (!alive) return;
      const analysis = analyzeCandidateTables([postulantesToTable(avisoId, rows)]);
      latest.current.handleSyncBumeranCandidates(job.id, analysis.rows);
      setApplicants({ loading: false, error: '', checkedAt: new Date().toISOString() });
    }).catch(() => {
      if (alive) setApplicants({ ...initial, error: 'No se pudieron incorporar los candidatos. Vuelve a cargar los datos.' });
    });
    return () => { alive = false; };
  }, [avisoId, updatedAt, revision]);

  const applicationIds = app.appState.applications.filter((a) => a.jobPostingId === job?.id).map((a) => a.id).sort().join('|');
  useEffect(() => {
    setRanking(initial);
    if (!supabase || !avisoId || !job || !applicationIds) return;
    let alive = true;
    setRanking({ ...initial, loading: true });
    fetchRanking(supabase, avisoId, job.criteriaVersion).then((rows) => {
      if (!alive) return;
      const current = latest.current;
      const results = rankingToMatches(job, current.appState.applications, current.appState.candidates, rows);
      if (Object.keys(results).length) current.handleApplyEmbeddingRanking(results);
      setRanking({ loading: false, error: '', checkedAt: new Date().toISOString() });
    }).catch(() => {
      if (alive) setRanking({ ...initial, error: 'No se pudo consultar el ranking. Vuelve a cargar los datos.' });
    });
    return () => { alive = false; };
  }, [avisoId, job?.criteriaVersion, job?.bumeran?.rankingAt, applicationIds, revision]);

  const trayectoria = useCargarTrayectoria(avisoId, JSON.stringify([updatedAt, revision, applicants.checkedAt]));
  return { trayectoria, configured: !!supabase, postings, applicants, ranking, runs, refresh };
}
