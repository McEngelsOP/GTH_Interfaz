import { AppStateData, Application, Criterion, EvaluationMethod, JobPosting, Stage } from '../types/index.ts';
import { advanceApplications, isEligibleForTopN, simulateScoreRecalculation } from './recruitmentRules.ts';

export const STAGE_ORDER: Stage[] = ['postulado', 'preseleccionado', 'en_entrevista', 'en_evaluacion', 'en_oferta', 'contratado'];

export function validateStageTransition(app: Application, target: Stage, method: EvaluationMethod): string | null {
  const currentIndex = STAGE_ORDER.indexOf(app.stage);
  const targetIndex = STAGE_ORDER.indexOf(target);
  if (currentIndex < 0 || targetIndex < 0 || app.stage === 'contratado') return 'La postulación está cerrada.';
  if (Math.abs(currentIndex - targetIndex) !== 1) return 'Mueva el expediente a la etapa anterior o siguiente, sin omitir etapas.';
  if (targetIndex > currentIndex) {
    if (app.stage === 'postulado') return isEligibleForTopN(app, method).reason || null;
    if (app.mandatoryRequirementStatus !== 'verificado') return 'Verifique el requisito obligatorio antes de avanzar.';
  }
  return null;
}

export function moveApplicationStage(state: AppStateData, applicationId: string, target: Stage, reason: string): AppStateData {
  const app = state.applications.find((a) => a.id === applicationId);
  const job = state.jobPostings.find((j) => j.id === app?.jobPostingId);
  if (!app || !job || job.status !== 'activa' || !reason.trim() || validateStageTransition(app, target, state.selectedMethod)) return state;
  if (app.stage === 'postulado') {
    const result = advanceApplications({
      selectedAppIds: [app.id], applications: state.applications, candidates: state.candidates,
      jobPostingId: job.id, jobPostingTitle: job.title, criteriaVersion: job.criteriaVersion, method: state.selectedMethod,
    });
    return { ...state, applications: result.updatedApplications, candidates: result.updatedCandidates,
      activities: [...result.newActivities, ...state.activities],
      decisionLogs: [...result.newDecisions.map((d) => ({ ...d, notes: reason.trim() })), ...state.decisionLogs],
      emailDrafts: [...result.newDrafts, ...state.emailDrafts] };
  }
  const now = new Date().toISOString();
  const id = `stage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return { ...state,
    applications: state.applications.map((a) => a.id === app.id ? { ...a, stage: target, updatedAt: now } : a),
    activities: [{ id: `act-${id}`, applicationId: app.id, type: 'stage_change',
      title: `Cambio de etapa: ${target}`, details: reason.trim(), author: 'Equipo de GTHC', timestamp: now }, ...state.activities],
    decisionLogs: [{ id: `dec-${id}`, jobPostingId: job.id, applicationId: app.id, candidateId: app.candidateId,
      action: `Cambio de etapa a ${target}`, previousStage: app.stage, newStage: target,
      author: 'Equipo de GTHC', timestamp: now, criteriaVersion: job.criteriaVersion,
      evaluationContext: { llmScore: app.llmScore, method: state.selectedMethod },
      notes: reason.trim() }, ...state.decisionLogs] };
}

export function createPendingApplication(candidateId: string, job: JobPosting): Application {
  const now = new Date().toISOString();
  return { id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, candidateId, jobPostingId: job.id,
    stage: 'postulado', llmScore: null, mandatoryRequirementStatus: 'sin_verificar',
    requirementJustification: 'Pendiente de verificación para esta convocatoria.',
    whyScoreNotes: { explanation: 'Nueva postulación. Evaluación LLM pendiente para este puesto.',
      strengths: [], evidenceSummary: 'Perfil vinculado desde el Banco de Talento; todavía no evaluado para esta convocatoria.' },
    criteriaBreakdown: {}, createdAt: now, updatedAt: now };
}

export function hasValidCriteria(criteria: Criterion[]): boolean {
  return criteria.length > 0 && new Set(criteria.map((c) => c.id)).size === criteria.length &&
    criteria.every((c) => c.id && c.label.trim() && c.type === 'LLM' && Number.isFinite(c.weightPct) && c.weightPct >= 0 && c.weightPct <= 100) &&
    Math.abs(criteria.reduce((sum, c) => sum + c.weightPct, 0) - 100) < 0.000001;
}

export function updateJobCriteria(state: AppStateData, jobId: string, criteria: Criterion[]): AppStateData {
  const job = state.jobPostings.find((j) => j.id === jobId);
  if (!job || !hasValidCriteria(criteria)) return state;
  const now = new Date().toISOString();
  const sameDefinitions = criteria.length === job.criteria.length && criteria.every((criterion) => job.criteria.some((old) => old.id === criterion.id && old.label === criterion.label && old.description === criterion.description));
  const criteriaVersion = `v${((parseFloat(job.criteriaVersion.replace(/[^0-9.]/g, '')) || 1) + 0.1).toFixed(1)}`;
  return { ...state,
    jobPostings: state.jobPostings.map((j) => j.id === jobId ? { ...j, criteria: criteria.map((c) => ({ ...c })), criteriaVersion } : j),
    applications: state.applications.map((app) => app.jobPostingId === jobId && app.stage === 'postulado' ? {
      ...app,
      llmScore: sameDefinitions ? simulateScoreRecalculation(criteria, app.criteriaBreakdown, 'LLM') : null,
      llmEvaluation: undefined, evaluationIssue: undefined, criteriaBreakdown: sameDefinitions ? app.criteriaBreakdown : {}, updatedAt: now,
    } : app),
    decisionLogs: [{ id: `dec-criteria-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      jobPostingId: jobId, applicationId: '', candidateId: '', action: 'Actualización de Criterios y Ponderaciones',
      author: 'Equipo de GTHC', timestamp: now, criteriaVersion,
      evaluationContext: { llmScore: null, method: state.selectedMethod },
      notes: 'Pesos ajustados se recalculan con evidencias existentes; cambios en la definición de criterios requieren una nueva evaluación.' }, ...state.decisionLogs] };
}
