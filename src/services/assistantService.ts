import { AppStateData, JobPosting } from '../types/index.ts';
import { calculateJobMetrics, getScoreByMethod, isEligibleForTopN } from './recruitmentRules.ts';
import { compareCandidateNames } from './candidateOrdering.ts';

export interface AssistantMessage { role: 'user' | 'assistant'; text: string }
export interface AssistantConfiguration { configured: boolean; model: string; provider: 'Google Gemini' }
export interface AssistantReply { text: string; model: string }

/** Solo la convocatoria activa y campos explícitos; nunca se serializa AppState completo. */
export function buildAssistantContext(state: AppStateData, job: JobPosting, includeCandidates = false) {
  const applications = state.applications.filter((app) => app.jobPostingId === job.id);
  const candidates = new Map(state.candidates.map((candidate) => [candidate.id, candidate]));
  const requirements = { verificado: 0, sin_verificar: 0, parcial: 0, no_cumple: 0 };
  applications.forEach((app) => requirements[app.mandatoryRequirementStatus]++);
  const sorted = [...applications].sort((a, b) =>
    (getScoreByMethod(b, 'LLM') ?? -1) - (getScoreByMethod(a, 'LLM') ?? -1) ||
    compareCandidateNames(candidates.get(a.candidateId)?.name || '', candidates.get(b.candidateId)?.name || '')
  );
  return {
    job: { code: job.code, title: job.title, status: job.status, department: job.department,
      knockoutRule: job.knockoutRule, criteriaVersion: job.criteriaVersion, vacancies: job.vacancies,
      criteria: job.criteria.map((criterion) => ({ label: criterion.label, weightPct: criterion.weightPct })) },
    metrics: calculateJobMetrics(applications, 'LLM'), requirements,
    evaluations: { pending: applications.filter((app) => getScoreByMethod(app, 'LLM') === null).length,
      eligibleForTopN: applications.filter((app) => isEligibleForTopN(app, 'LLM').eligible).length },
    candidatesShared: includeCandidates,
    candidateSummariesTotal: applications.length,
    candidateSummaries: includeCandidates ? sorted.slice(0, 50).map((app) => ({
      name: candidates.get(app.candidateId)?.name || 'Nombre no registrado', stage: app.stage,
      llmScore: getScoreByMethod(app, 'LLM'), requirementStatus: app.mandatoryRequirementStatus,
    })) : [],
  };
}

async function requestAssistant<T>(options: RequestInit, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(45_000);
  const response = await fetch('/api/chat', { ...options, signal: signal ? AbortSignal.any([signal, timeout]) : timeout, cache: 'no-store', credentials: 'same-origin' });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) throw new Error(body?.error || 'No se pudo contactar al asistente. Prueba de nuevo.');
  return body as T;
}

export function getAssistantConfiguration(signal?: AbortSignal) {
  return requestAssistant<AssistantConfiguration>({ method: 'GET' }, signal);
}

export function testAssistantConnection(signal?: AbortSignal) {
  return requestAssistant<AssistantReply>({ method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'check' }) }, signal);
}

export function askAssistant(question: string, history: AssistantMessage[], context: ReturnType<typeof buildAssistantContext>, signal?: AbortSignal) {
  let recent = history.slice(-12);
  let body = JSON.stringify({ action: 'chat', question, history: recent, context });
  while (new TextEncoder().encode(body).length > 55_000 && recent.length) {
    recent = recent.slice(2);
    body = JSON.stringify({ action: 'chat', question, history: recent, context });
  }
  return requestAssistant<AssistantReply>({ method: 'POST', headers: { 'Content-Type': 'application/json' },
    body }, signal);
}
