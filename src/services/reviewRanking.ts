import type { Application, Candidate, Criterion } from '../types/index.ts';
import { evaluationSummary } from './evaluationSummary.ts';
import { getScoreByMethod } from './recruitmentRules.ts';
import { compareCandidateNames } from './candidateOrdering.ts';

/** Puntaje disponible para revisión humana; no modifica el total ni el avance. */
export function reviewEvaluation(application: Application, criteria: Criterion[]) {
  const complete = getScoreByMethod(application, 'LLM');
  if (application.evaluationIssue) return null;
  if (complete !== null) return { score: complete, coverage: 100, partial: false };
  const summary = evaluationSummary(application, criteria);
  return summary.evaluated && summary.partialScore !== null
    ? { score: summary.partialScore, coverage: summary.coverage, partial: true } : null;
}

export function compareReviewScores(a: Application, b: Application, criteria: Criterion[]) {
  const first = reviewEvaluation(a, criteria), second = reviewEvaluation(b, criteria);
  return (second?.score ?? -1) - (first?.score ?? -1) || (second?.coverage ?? 0) - (first?.coverage ?? 0);
}

export function getReviewCandidates(applications: Application[], criteria: Criterion[], count: number, candidates: Candidate[] = []) {
  if (!Number.isFinite(count) || count < 1) return [];
  const names = new Map(candidates.map(candidate => [candidate.id, candidate.name]));
  return applications.filter(app => app.stage === 'postulado' && app.mandatoryRequirementStatus !== 'no_cumple' && reviewEvaluation(app, criteria))
    .sort((a,b) => compareReviewScores(a,b,criteria) || compareCandidateNames(names.get(a.candidateId) || '', names.get(b.candidateId) || '') || a.id.localeCompare(b.id))
    .slice(0, Math.floor(count));
}

export function reviewAvailability(applications: Application[], criteria: Criterion[]) {
  const count = getReviewCandidates(applications, criteria, applications.length).length;
  return { count, hint: count > 0
    ? 'Selección para revisión: usa puntajes completos o parciales. Revisa cobertura y requisitos antes de avanzar.'
    : !applications.length ? 'Carga perfiles para comenzar la revisión y evaluación.'
    : !applications.some(app => app.stage === 'postulado') ? 'No hay postulaciones pendientes de una primera decisión.'
    : 'Evalúa al menos un perfil con evidencia puntuable y sin requisitos descartados.' };
}
