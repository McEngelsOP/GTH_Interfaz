import { ActivityLog, AppStateData, Application, Criterion, DecisionLog, EvaluationMethod, JobPosting, Stage } from '../types/index.ts';
import { pipelineStage } from './sharedWorkflow.ts';
import { advanceApplications, releaseApplication, simulateScoreRecalculation } from './recruitmentRules.ts';

export const STAGE_ORDER: Stage[] = ['postulado', 'preseleccionado', 'en_entrevista', 'contratado'];

/** Descarte por lote: valida todos los expedientes antes de cambiar el estado. */
export function releaseSelectedApplications(state: AppStateData, jobId: string, ids: string[], reason: string): AppStateData {
  const job = state.jobPostings.find(item => item.id === jobId);
  const selected = new Set(ids);
  const targets = state.applications.filter(app => selected.has(app.id));
  const candidates = new Map(state.candidates.map(candidate => [candidate.id, candidate]));
  if (!job || job.status !== 'activa' || state.activeJobPostingId !== jobId || !reason.trim() || !selected.size || targets.length !== selected.size || targets.some(app =>
    app.jobPostingId !== jobId || app.stage === 'no_continua' || app.stage === 'contratado' || !candidates.has(app.candidateId)
  )) return state;
  const updates = new Map<string, Application>();
  const activities: ActivityLog[] = [], decisions: DecisionLog[] = [];
  for (const target of targets) {
    const result = releaseApplication({ applicationId: target.id, applications: [target], candidates: [candidates.get(target.candidateId)!],
      jobPostingTitle: job.title, criteriaVersion: job.criteriaVersion, method: state.selectedMethod, reason: reason.trim() });
    if (!result) return state;
    updates.set(target.id, result.updatedApplications[0]); candidates.set(target.candidateId, result.updatedCandidates[0]);
    activities.push(result.newActivity); decisions.push(result.newDecision);
  }
  return { ...state, applications: state.applications.map(app => updates.get(app.id) || app),
    candidates: state.candidates.map(candidate => candidates.get(candidate.id)!),
    activities: [...activities, ...state.activities], decisionLogs: [...decisions, ...state.decisionLogs] };
}

export function validateStageTransition(app: Application, target: Stage, method: EvaluationMethod): string | null {
  const currentIndex = STAGE_ORDER.indexOf(pipelineStage(app.stage));
  const targetIndex = STAGE_ORDER.indexOf(target);
  if (currentIndex < 0 || targetIndex < 0) return 'La postulación está cerrada.';
  if (Math.abs(currentIndex - targetIndex) !== 1) return 'Mueva el expediente a la etapa anterior o siguiente, sin omitir etapas.';
  // El tablero es una decisión manual de GTHC con motivo registrado: con el ranking por embeddings ya no hay
  // verificación de requisitos ni puntaje LLM que exigir para avanzar.
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
      elegiblesPorRanking: new Set([app.id]),
    });
    const { viaTopN: _viaTopN, ...contexto } = result.newDecisions[0]?.evaluationContext ?? {};
    return { ...state, applications: result.updatedApplications, candidates: result.updatedCandidates,
      activities: [...result.newActivities.map((a) => ({ ...a, details: `Avance manual desde el tablero de GTHC: ${reason.trim()}` })), ...state.activities],
      decisionLogs: [...result.newDecisions.map((d) => ({ ...d, evaluationContext: contexto as typeof d.evaluationContext, notes: reason.trim() })), ...state.decisionLogs],
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
