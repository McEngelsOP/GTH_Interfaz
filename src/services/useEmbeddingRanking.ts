import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { embeddingTargets, needsEmbeddingRanking, requestEmbeddingRanking } from './embeddingMatching.ts';

/** Calcula el ranking de embeddings de la convocatoria activa cuando faltan resultados. Sin elementos visibles:
 *  si el servicio local no responde, la tabla queda igual y solo se registra en consola. */
export function useEmbeddingRanking() {
  const { activeJob, appState, handleApplyEmbeddingRanking } = useApp();
  const attempted = useRef(new Set<string>());
  const job = activeJob && activeJob.status === 'activa' ? activeJob : null;
  const pending = job && needsEmbeddingRanking(job, appState.applications, appState.candidates);
  const key = job ? `${job.id}|${job.criteriaVersion}|${embeddingTargets(job, appState.applications, appState.candidates).length}` : '';

  useEffect(() => {
    if (!job || !pending || attempted.current.has(key)) return;
    attempted.current.add(key);
    // Sin cancelar al desmontar: cada resultado lleva su criteriaVersion y la vista ignora los que quedan obsoletos.
    requestEmbeddingRanking(job, appState.applications, appState.candidates)
      .then(({ backend, results }) => {
        console.info(`[embeddings] ${Object.keys(results).length} perfiles puntuados · backend=${backend}`);
        handleApplyEmbeddingRanking(results);
      })
      .catch((error) => console.info(`[embeddings] Servicio no disponible; se omite el score de embeddings. ${error instanceof Error ? error.message : ''}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pending]);
}
