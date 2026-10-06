import type { Application, Candidate, EmbeddingMatch, JobPosting } from '../types/index.ts';

// Solo viajan al servicio los campos que el matching usa (experiencias, estudios, idiomas).
// Nombre, edad, género, dirección, contacto y documento nunca salen del navegador.
const EMBEDDING_FIELD = /^(Exp\[\d+\] (Puesto|Area|SubArea|Industria|Descripci[oó]n)|Est\[\d+\] (Titulo|Nivel|Estado|Area)|Idiomas)$/;

export const EMBEDDINGS_ENDPOINT = '/api/embeddings';

export type EmbeddingRequest = {
  oferta: { titulo: string; requisitos: [string, number][] };
  candidatos: { candidato_id: string; campos: Record<string, string> }[];
};

type EmbeddingReply = {
  backend: 'e5' | 'tfidf';
  ranking: { candidato_id: string; ranking: number; score_embeddings: number; req_sims: (number | null)[];
    req_fragmentos: string[]; explicacion: string }[];
};

export function embeddingFields(candidate: Candidate): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const record of candidate.importedProfile?.records || []) {
    for (const [label, value] of Object.entries(record)) {
      if (EMBEDDING_FIELD.test(label) && value.trim() && !fields[label]) fields[label] = value;
    }
  }
  return fields;
}

/** Postulaciones de la convocatoria con perfil importado; candidato_id = Candidate.id. */
export function embeddingTargets(job: JobPosting, applications: Application[], candidates: Candidate[]) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return applications.filter((app) => app.jobPostingId === job.id && byId.get(app.candidateId)?.importedProfile)
    .map((app) => ({ app, candidate: byId.get(app.candidateId)! }));
}

export function needsEmbeddingRanking(job: JobPosting, applications: Application[], candidates: Candidate[]) {
  return embeddingTargets(job, applications, candidates)
    .some(({ app }) => app.embeddingMatch?.criteriaVersion !== job.criteriaVersion);
}

export function buildEmbeddingRequest(job: JobPosting, applications: Application[], candidates: Candidate[]): EmbeddingRequest {
  const targets = embeddingTargets(job, applications, candidates);
  const seen = new Set<string>();
  return {
    oferta: { titulo: job.title, requisitos: job.criteria.map((c) => [[c.label, c.description].filter(Boolean).join(' · '), c.weightPct]) },
    candidatos: targets.filter(({ candidate }) => !seen.has(candidate.id) && seen.add(candidate.id))
      .map(({ candidate }) => ({ candidato_id: candidate.id, campos: embeddingFields(candidate) })),
  };
}

/** Resultado por applicationId, listo para guardar en Application.embeddingMatch. */
export function mapEmbeddingReply(job: JobPosting, applications: Application[], reply: EmbeddingReply, now = new Date().toISOString()) {
  const byCandidate = new Map(reply.ranking.map((row) => [row.candidato_id, row]));
  const results: Record<string, EmbeddingMatch> = {};
  for (const app of applications) {
    const row = app.jobPostingId === job.id ? byCandidate.get(app.candidateId) : undefined;
    if (!row || !Number.isFinite(row.score_embeddings)) continue;
    results[app.id] = {
      score: row.score_embeddings, ranking: row.ranking, explanation: row.explicacion, backend: reply.backend,
      requirementSims: Object.fromEntries(job.criteria.map((c, k) => [c.id, row.req_sims[k] ?? null])),
      requirementEvidence: Object.fromEntries(job.criteria.map((c, k) => [c.id, row.req_fragmentos[k] || ''])),
      criteriaVersion: job.criteriaVersion, evaluatedAt: now,
    };
  }
  return results;
}

export async function requestEmbeddingRanking(job: JobPosting, applications: Application[], candidates: Candidate[]) {
  const response = await fetch(EMBEDDINGS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildEmbeddingRequest(job, applications, candidates)) });
  if (!response.ok) throw new Error(`Servicio de embeddings respondió ${response.status}`);
  const reply = await response.json() as EmbeddingReply;
  if (!Array.isArray(reply?.ranking)) throw new Error('Respuesta de embeddings inválida');
  return { backend: reply.backend, results: mapEmbeddingReply(job, applications, reply) };
}

export const formatEmbeddingScore = (score: number) => score.toFixed(2);
