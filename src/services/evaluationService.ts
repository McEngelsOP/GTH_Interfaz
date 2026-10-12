import type { AppStateData } from '../types/index.ts';
import { prepareEvaluationProfile, PRIVACY_VERSION } from './profilePrivacy.ts';
import type { DepuratedProfile } from './profilePrivacy.ts';
import { validateEvaluationPayload, validateEvaluationOutput } from './evaluationContract.ts';
import type { EvaluationPayload, EvaluationReply } from './evaluationContract.ts';

export class EvaluationError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number, public readonly retryAfterMs?: number) {
    super(message); this.name = 'EvaluationError';
  }
  get isProfileIssue() {
    return this.status === 422 || ['PROFILE_CHANGED', 'INVALID_RESPONSE'].includes(this.code);
  }
}

export function recordEvaluationIssue(state: AppStateData, applicationId: string, error: EvaluationError): AppStateData {
  const application = state.applications.find((app) => app.id === applicationId);
  if (!application || application.stage !== 'postulado' || application.llmEvaluation || !error.isProfileIssue) return state;
  const now = new Date().toISOString();
  return { ...state, applications: state.applications.map((app) => app.id === applicationId ? { ...app,
    evaluationIssue: { code: error.code, message: error.message, attempts: (app.evaluationIssue?.attempts || 0) + 1, lastAttemptAt: now },
    updatedAt: now } : app),
    activities: [{ id: crypto.randomUUID(), applicationId, type: 'note', title: 'Caso especial de evaluación',
      details: error.message, author: 'Evaluador · apoyo a GTHC', timestamp: now }, ...state.activities] };
}

export interface PreparedEvaluation {
  applicationId: string; candidateId: string; candidateName: string; jobId: string;
  snapshot: string; privacy: DepuratedProfile; payload: EvaluationPayload | null;
}
function records(state: AppStateData, id: string) {
  const application = state.applications.find((app) => app.id === id && app.stage === 'postulado');
  const job = state.jobPostings.find((job) => job.id === application?.jobPostingId && job.status === 'activa');
  const candidate = state.candidates.find((candidate) => candidate.id === application?.candidateId);
  if (!application || !job || !candidate) throw new Error('El perfil ya no está disponible para evaluar.');
  return { application, job, candidate };
}
export function evaluationSnapshot(state: AppStateData, id: string) {
  const { application,job,candidate } = records(state,id);
  return JSON.stringify({ id: application.id, stage: application.stage, llmScore: application.llmScore, llmEvaluation: application.llmEvaluation, candidateId: candidate.id, rawCvText: candidate.rawCvText,
    importedProfile: candidate.importedProfile, name: candidate.name, email: candidate.email, phone: candidate.phone,
    criteria: job.criteria, criteriaVersion: job.criteriaVersion, title: job.title, knockoutRule: job.knockoutRule, reference: job.evaluationReference });
}
export function prepareEvaluation(state: AppStateData, id: string): PreparedEvaluation {
  const { application, job, candidate } = records(state,id);
  const privacy = prepareEvaluationProfile(candidate);
  let payload: EvaluationPayload | null = null;
  try {
    if (!privacy.issues.length) payload = validateEvaluationPayload({ requestId: crypto.randomUUID(), profile: privacy.fields,
      job: { title: job.title, reference: job.evaluationReference || '', criteria: job.criteria.map((criterion,index) => ({ key: `criterion-${index + 1}`, label: [criterion.label,criterion.description].filter(Boolean).join(' · '), weightPct: criterion.weightPct })) } });
  } catch (error) { privacy.issues.push(error instanceof Error ? error.message : 'La convocatoria requiere revisión.'); }
  return { applicationId: application.id, candidateId: candidate.id, candidateName: candidate.name, jobId: job.id,
    snapshot: evaluationSnapshot(state,id), privacy, payload };
}
export function applyPreparedEvaluation(state: AppStateData, prepared: PreparedEvaluation, reply: EvaluationReply, hash: string): AppStateData {
  if (!prepared.payload || evaluationSnapshot(state,prepared.applicationId) !== prepared.snapshot) throw new Error('El perfil o los criterios cambiaron. Prepara una nueva vista previa.');
  if (reply.requestId !== prepared.payload.requestId || typeof reply.model !== 'string' || !/^gemini-[\w.-]{1,80}$/.test(reply.model) || !Number.isFinite(Date.parse(reply.evaluatedAt))) throw new Error('La respuesta no corresponde a esta evaluación.');
  const validated = validateEvaluationOutput({ explanation: reply.explanation, strengths: reply.strengths,
    evidenceSummary: reply.evidenceSummary, criteria: reply.criteria }, prepared.payload);
  if (validated.llmScore !== reply.llmScore) throw new Error('El puntaje no coincide con las ponderaciones.');
  const { job } = records(state,prepared.applicationId);
  const breakdown = Object.fromEntries(validated.criteria.flatMap((item,index) => item.score === null ? [] : [[job.criteria[index].id, { score: item.score, evidence: item.evidence! }]]));
  const metadata = { model: reply.model, evaluatedAt: reply.evaluatedAt, criteriaVersion: job.criteriaVersion,
    profileHash: hash, privacyVersion: PRIVACY_VERSION,
    missingCriteria: validated.criteria.flatMap((item,index) => item.score === null ? [job.criteria[index].id] : []) };
  return { ...state, applications: state.applications.map((app) => app.id === prepared.applicationId ? { ...app,
    llmScore: validated.llmScore, evaluationIssue: undefined, criteriaBreakdown: breakdown, updatedAt: reply.evaluatedAt, llmEvaluation: metadata,
    whyScoreNotes: { explanation: validated.explanation, strengths: validated.strengths, evidenceSummary: validated.evidenceSummary } } : app),
    activities: [{ id: crypto.randomUUID(), applicationId: prepared.applicationId, type: 'note', title: 'Evaluación LLM recibida',
      details: validated.llmScore === null ? 'Evidencia insuficiente para el puntaje ponderado. Revisión pendiente.' : `Puntaje ponderado: ${validated.llmScore}. Revisión humana del requisito por separado.`,
      author: 'Google Gemini · apoyo a GTHC', timestamp: reply.evaluatedAt }, ...state.activities] };
}
export async function evaluatePreparedProfile(prepared: PreparedEvaluation, signal: AbortSignal): Promise<{ reply: EvaluationReply; hash: string }> {
  if (!prepared.payload || prepared.privacy.issues.length) throw new Error('Este perfil requiere revisión local.');
  // Únicamente el objeto explícito depurado se serializa; el snapshot nunca cruza la red.
  const payload = validateEvaluationPayload(prepared.payload);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prepared.snapshot));
  const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2,'0')).join('');
  const response = await fetch('/api/evaluate', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.any([signal, AbortSignal.timeout(55_000)]) });
  const result = await response.json().catch(() => null);
  if (response.ok && !result) throw new EvaluationError('La respuesta de evaluación tiene un formato inválido.', 'INVALID_RESPONSE', response.status);
  const retryAfter = response.headers.get('retry-after');
  const seconds = retryAfter === null ? NaN : Number(retryAfter);
  const retryAfterMs = Number.isFinite(seconds) ? Math.max(1000,seconds * 1000) : retryAfter ? Math.max(1000,Date.parse(retryAfter) - Date.now()) : undefined;
  if (!response.ok) throw new EvaluationError(
    typeof result?.error === 'string' ? result.error : 'No se pudo evaluar el perfil. Intenta de nuevo.',
    typeof result?.code === 'string' ? result.code : 'EVALUATION_UNAVAILABLE', response.status,
    Number.isFinite(retryAfterMs) ? retryAfterMs : undefined);
  return { reply: result as EvaluationReply, hash };
}
