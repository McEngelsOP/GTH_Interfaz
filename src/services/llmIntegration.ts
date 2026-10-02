import { AppStateData, CriteriaScore } from '../types/index.ts';
import { isValidScore } from './recruitmentRules.ts';

// Contrato del motor del equipo; ninguna evaluación se fabrica al importar perfiles.
export interface LlmEvaluationResult {
  applicationId: string;
  candidateId: string;
  jobPostingId: string;
  criteriaVersion: string;
  llmScore: number;
  explanation: string;
  strengths: string[];
  evidenceSummary: string;
  criteriaBreakdown: Record<string, CriteriaScore>;
}

export function getLlmEvaluationRequest(state: AppStateData, applicationId: string) {
  const application = state.applications.find((app) => app.id === applicationId && app.stage === 'postulado');
  const job = state.jobPostings.find((posting) => posting.id === application?.jobPostingId && posting.status === 'activa');
  const candidate = state.candidates.find((person) => person.id === application?.candidateId);
  if (!application || !job || !candidate) throw new Error('El expediente no está disponible para evaluación.');
  return { applicationId: application.id, candidateId: candidate.id, jobPostingId: job.id,
    criteriaVersion: job.criteriaVersion, method: 'LLM' as const,
    profileText: candidate.rawCvText, jobTitle: job.title,
    mandatoryRequirement: job.knockoutRule, criteria: job.criteria.map((criterion) => ({ ...criterion })),
  };
}

export function applyLlmEvaluationResult(state: AppStateData, value: unknown): AppStateData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Resultado LLM inválido.');
  const result = value as LlmEvaluationResult;
  const request = getLlmEvaluationRequest(state, result.applicationId);
  if (result.candidateId !== request.candidateId || result.jobPostingId !== request.jobPostingId || result.criteriaVersion !== request.criteriaVersion) {
    throw new Error('El resultado no corresponde al candidato, puesto o versión de criterios vigente.');
  }
  if (!isValidScore(result.llmScore) || typeof result.explanation !== 'string' || !result.explanation.trim() ||
    typeof result.evidenceSummary !== 'string' || !result.evidenceSummary.trim() ||
    !Array.isArray(result.strengths) || !result.strengths.every((strength) => typeof strength === 'string') ||
    !result.criteriaBreakdown || Array.isArray(result.criteriaBreakdown) || typeof result.criteriaBreakdown !== 'object' ||
    Object.keys(result.criteriaBreakdown).length !== request.criteria.length || request.criteria.some((criterion) => {
      const item = result.criteriaBreakdown[criterion.id];
      return !item || !isValidScore(item.score) || typeof item.evidence !== 'string' || !item.evidence.trim();
    })) throw new Error('Se requiere un puntaje entre 0 y 100 y explicación con evidencias para todos los criterios.');
  return { ...state, applications: state.applications.map((app) => app.id === result.applicationId ? {
    ...app, llmScore: result.llmScore, updatedAt: new Date().toISOString(),
    whyScoreNotes: { explanation: result.explanation, strengths: [...result.strengths], evidenceSummary: result.evidenceSummary },
    criteriaBreakdown: structuredClone(result.criteriaBreakdown),
    // La validación del requisito obligatorio sigue siendo una decisión de GTH.
  } : app) };
}
