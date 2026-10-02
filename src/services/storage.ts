/* ==========================================================================
   TalentAI | GTHC · ESAN — Capa de Persistencia Local Versionada
   ========================================================================== */

import { AppStateData, Application } from '../types/index.ts';
import { INITIAL_APP_STATE } from '../data/initialData.ts';

export const STORAGE_KEY = 'GTH_ESAN_STAGE_I_STATE_V2';

const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: Record<string, any>, keys: string[]) => keys.every((key) => typeof value[key] === 'string');
const uniqueIds = (records: any[]) => new Set(records.map((r) => r.id)).size === records.length;
const initialState = () => structuredClone(INITIAL_APP_STATE);

export function parseStoredState(raw: string): AppStateData | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || !Array.isArray(value.jobPostings) || !Array.isArray(value.candidates) || !Array.isArray(value.applications)) return null;
    const data = { ...initialState(), ...value };
    if (!Array.isArray(data.jobPostings) || !data.jobPostings.length || !data.jobPostings.every((j: unknown) =>
      object(j) && strings(j, ['id', 'code', 'title', 'department', 'period', 'phase', 'knockoutRule', 'criteriaVersion', 'createdAt']) &&
      ['docente', 'administrativo', 'operativo', 'directivo'].includes(j.category) && ['activa', 'borrador'].includes(j.status) &&
      Number.isInteger(j.defaultTopN) && j.defaultTopN >= 1 && (j.vacancies === null || (Number.isInteger(j.vacancies) && j.vacancies >= 1)) &&
      (j.evaluationReference === undefined || (typeof j.evaluationReference === 'string' && j.evaluationReference.length <= 8000)) &&
      Array.isArray(j.criteria) && j.criteria.every((c: unknown) => object(c) && strings(c, ['id', 'label']) && ['ML', 'LLM'].includes(c.type) && Number.isFinite(c.weightPct) && c.weightPct >= 0 && c.weightPct <= 100)
    )) return null;
    if (!Array.isArray(data.candidates) || !data.candidates.every((c: unknown) => object(c) &&
      strings(c, ['id', 'name', 'currentTitle', 'currentCompany', 'source', 'summary', 'rawCvText']) && typeof c.savedInTalentPool === 'boolean' &&
      [c.email, c.phone].every((v) => v === null || typeof v === 'string') &&
      [c.talentPoolNotes, c.talentPoolOriginJob].every((v) => v === undefined || typeof v === 'string') &&
      (c.potentialOpportunities === undefined || (Array.isArray(c.potentialOpportunities) && c.potentialOpportunities.every((v: unknown) => typeof v === 'string'))) &&
      (c.importedProfile === undefined || (object(c.importedProfile) && strings(c.importedProfile, ['documentType', 'documentNumber', 'externalId']) &&
        (c.importedProfile.emails === undefined || (Array.isArray(c.importedProfile.emails) && c.importedProfile.emails.every((email: unknown) => typeof email === 'string'))) &&
        Array.isArray(c.importedProfile.records) && c.importedProfile.records.every((r: unknown) => object(r) && Object.values(r).every((v) => typeof v === 'string')))))) return null;
    if (!Array.isArray(data.applications) || !data.applications.every((a: unknown) => object(a) &&
      strings(a, ['id', 'jobPostingId', 'candidateId', 'createdAt', 'updatedAt']) &&
      ['postulado', 'preseleccionado', 'en_entrevista', 'en_evaluacion', 'en_oferta', 'contratado', 'no_continua'].includes(a.stage) &&
      ['verificado', 'parcial', 'no_cumple', 'sin_verificar'].includes(a.mandatoryRequirementStatus) &&
      [a.llmScore].every((s) => s === null || (typeof s === 'number' && Number.isFinite(s) && s >= 0 && s <= 100)) &&
      (a.llmEvaluation === undefined || (object(a.llmEvaluation) && strings(a.llmEvaluation, ['model', 'evaluatedAt', 'criteriaVersion', 'profileHash', 'privacyVersion']) && /^gemini-[\w.-]+$/.test(a.llmEvaluation.model) && Number.isFinite(Date.parse(a.llmEvaluation.evaluatedAt)) && /^[a-f0-9]{64}$/.test(a.llmEvaluation.profileHash) && Array.isArray(a.llmEvaluation.missingCriteria) && a.llmEvaluation.missingCriteria.every((id: unknown) => typeof id === 'string'))) &&
      object(a.whyScoreNotes) && strings(a.whyScoreNotes, ['explanation', 'evidenceSummary']) && Array.isArray(a.whyScoreNotes.strengths) &&
      a.whyScoreNotes.strengths.every((s: unknown) => typeof s === 'string') && object(a.criteriaBreakdown) &&
      Object.values(a.criteriaBreakdown).every((c) => object(c) && typeof c.evidence === 'string' && Number.isFinite(c.score) && c.score >= 0 && c.score <= 100)
    )) return null;
    if (![data.jobPostings, data.candidates, data.applications].every(uniqueIds)) return null;
    const jobs = new Set(data.jobPostings.map((j) => j.id)), candidates = new Set(data.candidates.map((c) => c.id));
    if (data.applications.some((a) => !jobs.has(a.jobPostingId) || !candidates.has(a.candidateId))) return null;
    if (![data.activities, data.decisionLogs, data.emailDrafts, data.interviewRecords].every((list) => Array.isArray(list) && list.every((r: unknown) => object(r) && typeof r.id === 'string'))) return null;
    if (!data.activities.every((a) => strings(a, ['applicationId', 'type', 'title', 'details', 'author', 'timestamp'])) ||
      !data.decisionLogs.every((d) => strings(d, ['jobPostingId', 'applicationId', 'candidateId', 'action', 'author', 'timestamp', 'criteriaVersion']) && object(d.evaluationContext)) ||
      !data.emailDrafts.every((d) => strings(d, ['applicationId', 'to', 'subject', 'body', 'templateType', 'lang', 'status', 'updatedAt'])) ||
      !data.interviewRecords.every((r) => strings(r, ['applicationId', 'title', 'scheduledAt', 'locationOrLink', 'status', 'createdAt']))) return null;
    data.activeJobPostingId = jobs.has(data.activeJobPostingId) ? data.activeJobPostingId : data.jobPostings[0].id;
    data.topN = Number.isFinite(data.topN) && data.topN >= 1 ? Math.floor(data.topN) : 5;
    data.jobPostings = data.jobPostings.map((job) => ({ ...job,
      criteria: job.criteria.map((criterion) => ({ ...criterion, type: 'LLM' as const })),
    }));
    data.applications = data.applications.map((record) => {
      const { mlScore: _retiredScore, ...app } = record as Application & { mlScore?: unknown };
      return app;
    });
    data.decisionLogs = data.decisionLogs.map((decision) => {
      const previousMethod: unknown = decision.evaluationContext.method;
      return { ...decision, evaluationContext: { llmScore: decision.evaluationContext.llmScore, method: 'LLM' as const },
        ...(previousMethod === 'ML' ? { metadata: { ...decision.metadata, legacyEvaluationMethod: previousMethod } } : {}),
      };
    });
    data.selectedMethod = 'LLM';
    data.theme = ['light', 'dark', 'system'].includes(data.theme) ? data.theme : 'light';
    data.reducedMotion = data.reducedMotion === true;
    return data;
  } catch { return null; }
}

export function loadAppState(): AppStateData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = initialState();
      // La nueva edición comienza sin perfiles de demostración y conserva la apariencia.
      const legacy = localStorage.getItem('GTH_ESAN_STATE_V1');
      const previous = legacy && parseStoredState(legacy);
      return previous ? { ...fresh, theme: previous.theme, reducedMotion: previous.reducedMotion,
        activeJobPostingId: fresh.jobPostings.some((j) => j.id === previous.activeJobPostingId) ? previous.activeJobPostingId : fresh.activeJobPostingId } : fresh;
    }
    return parseStoredState(raw) || initialState();
  } catch (error) {
    console.warn('[TalentAI Storage] No se pudo leer localStorage, usando estado inicial:', error);
    return initialState();
  }
}

export function saveAppState(state: AppStateData): { success: boolean; warning?: string } {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    return { success: true };
  } catch (error: any) {
    console.warn('[TalentAI Storage] Error al guardar en localStorage:', error);
    const isQuotaExceeded =
      error?.name === 'QuotaExceededError' ||
      error?.code === 22 ||
      error?.code === 1014;
    return {
      success: false,
      warning: isQuotaExceeded
        ? 'El almacenamiento local ha alcanzado su límite. Los cambios se mantendrán durante la sesión actual.'
        : 'No se pudo guardar en el almacenamiento local. Los cambios se mantendrán durante la sesión.',
    };
  }
}

export function resetAppState(): AppStateData {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Error al limpiar localStorage:', e);
  }
  return initialState();
}
