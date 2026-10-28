import type { AppStateData, Candidate, JobPosting } from '../types/index.ts';

export const COMMENT_MAX_LENGTH = 4000;
/** Red flag / green flag del comentario (por defecto, ninguna). */
export type Bandera = 'roja' | 'verde';

/** Identidad externa estable ante reimportaciones; cada convocatoria conserva su propia nota. */
export function internalCommentKey(job: JobPosting, candidate: Candidate): string {
  return JSON.stringify([job.bumeran?.avisoId || job.id, candidate.importedProfile?.externalId || candidate.id]);
}

export function updateInternalComment(state: AppStateData, applicationId: string, value: string, bandera: Bandera | null = null): AppStateData {
  const app = state.applications.find((item) => item.id === applicationId);
  const job = state.jobPostings.find((item) => item.id === app?.jobPostingId);
  const candidate = state.candidates.find((item) => item.id === app?.candidateId);
  if (!app || !job || !candidate) return state;
  const texto = value.trim().slice(0, COMMENT_MAX_LENGTH);
  const key = internalCommentKey(job, candidate);
  const comentariosInternos = { ...state.comentariosInternos };
  if (texto || bandera) comentariosInternos[key] = { texto, at: new Date().toISOString(), ...(bandera ? { bandera } : {}) };
  else delete comentariosInternos[key];
  return { ...state, comentariosInternos };
}
