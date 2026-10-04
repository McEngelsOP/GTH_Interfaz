import type { AppStateData, RequirementStatus } from '../types/index.ts';
export function reviewRequirement(state: AppStateData, id: string, status: RequirementStatus, justification: string): AppStateData {
  const application = state.applications.find((app) => app.id === id);
  if (!application || !['verificado','parcial','no_cumple','sin_verificar'].includes(status) || !justification.trim() || justification.length > 2000) throw new Error('Selecciona un estado y registra la evidencia o motivo de la revisión.');
  const now = new Date().toISOString();
  return { ...state, applications: state.applications.map((app) => app.id === id ? { ...app, mandatoryRequirementStatus: status,
    requirementJustification: justification.trim(), updatedAt: now } : app),
    activities: [{ id:crypto.randomUUID(), applicationId:id, type:'note', title:'Revisión humana del requisito obligatorio',
      details:`Estado: ${status}. ${justification.trim()}`, author:'Equipo de GTHC', timestamp:now }, ...state.activities] };
}

export function updateEvaluationReference(state: AppStateData, jobId: string, reference: string): AppStateData {
  const job = state.jobPostings.find((job) => job.id === jobId && job.status === 'activa');
  if (!job || reference.length > 8000) throw new Error('Referencia demasiado extensa o convocatoria no disponible.');
  if ((job.evaluationReference || '') === reference.trim()) return state;
  const now = new Date().toISOString();
  const version = `${job.criteriaVersion.split(' · ref ')[0]} · ref ${Date.now()}`;
  return { ...state, jobPostings:state.jobPostings.map((item) => item.id === jobId ? { ...item,evaluationReference:reference.trim(),criteriaVersion:version }:item),
    applications:state.applications.map((app) => app.jobPostingId === jobId && app.stage === 'postulado' ? { ...app,llmScore:null,llmEvaluation:undefined,evaluationIssue:undefined,criteriaBreakdown:{},updatedAt:now,
      whyScoreNotes:{ explanation:'La referencia del puesto cambió. Evaluación LLM pendiente.',strengths:[],evidenceSummary:'Requiere evaluación contra la referencia vigente.' } }:app) };
}
