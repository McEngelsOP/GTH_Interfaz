import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { analyzeCandidateTables } from './candidateImport.ts';
import { avisoToJob, fetchAvisos, fetchPostulantes, fetchRanking, postulantesToTable, rankingToMatches } from './bumeranSync.ts';
import { embeddingTargets } from './embeddingMatching.ts';
import { supabase } from './supabase.ts';

const REFRESCO_MS = 5 * 60 * 1000;

/** Trae de Supabase los avisos publicados (al iniciar y cada 5 min) y, al abrir un aviso, sus postulantes
 *  y el ranking por embeddings que calculó el scraper (tabla ranking_embeddings).
 *  Sin elementos visibles propios: si Supabase no responde, la interfaz sigue igual y se registra en consola. */
export function useBumeranSync() {
  const { activeJob, appState, handleSyncBumeranJobs, handleSyncBumeranCandidates, handleApplyEmbeddingRanking } = useApp();
  const synced = useRef(new Set<string>());

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let alive = true;
    const load = () => fetchAvisos(client)
      .then((rows) => { if (alive) handleSyncBumeranJobs(rows.map(avisoToJob)); })
      .catch((error) => console.info(`[bumeran] No se pudieron leer los avisos. ${error instanceof Error ? error.message : ''}`));
    void load();
    const timer = window.setInterval(load, REFRESCO_MS);
    return () => { alive = false; window.clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aviso = activeJob?.bumeran;
  const key = aviso ? `${activeJob!.id}|${aviso.updatedAt || ''}` : '';
  useEffect(() => {
    if (!supabase || !aviso || synced.current.has(key)) return;
    synced.current.add(key);
    const jobId = activeJob!.id;
    fetchPostulantes(supabase, aviso.avisoId)
      .then((rows) => {
        const analysis = analyzeCandidateTables([postulantesToTable(aviso.avisoId, rows)]);
        console.info(`[bumeran] Aviso ${aviso.avisoId}: ${rows.length} postulantes en la base de datos`);
        handleSyncBumeranCandidates(jobId, analysis.rows);
      })
      .catch((error) => {
        synced.current.delete(key);
        console.info(`[bumeran] No se pudieron leer los postulantes. ${error instanceof Error ? error.message : ''}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // El ranking se lee cuando el scraper lo recalcula (ranking_at) o cuando llegan postulaciones nuevas al aviso.
  const rankedJob = aviso ? activeJob! : null;
  const targets = rankedJob ? embeddingTargets(rankedJob, appState.applications, appState.candidates).length : 0;
  const rankingKey = rankedJob && targets ? `${rankedJob.id}|${rankedJob.criteriaVersion}|${aviso!.rankingAt || ''}|${targets}` : '';
  const ranked = useRef(new Set<string>());
  useEffect(() => {
    if (!supabase || !rankedJob || !rankingKey || ranked.current.has(rankingKey)) return;
    ranked.current.add(rankingKey);
    fetchRanking(supabase, rankedJob.bumeran!.avisoId, rankedJob.criteriaVersion)
      .then((rows) => {
        const results = rankingToMatches(rankedJob, appState.applications, appState.candidates, rows);
        console.info(`[bumeran] Ranking de embeddings: ${Object.keys(results).length} de ${targets} postulaciones`);
        if (Object.keys(results).length) handleApplyEmbeddingRanking(results);
      })
      .catch((error) => {
        ranked.current.delete(rankingKey);
        console.info(`[bumeran] No se pudo leer el ranking de embeddings. ${error instanceof Error ? error.message : ''}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingKey]);
}
