/* ==========================================================================
   TalentAI | GTHC · ESAN — Tipos de Dominio
   ========================================================================== */

export type JobCategory = 'docente' | 'administrativo' | 'operativo' | 'directivo';

export type JobStatus = 'activa' | 'borrador';

export type Stage =
  | 'postulado'
  | 'preseleccionado'
  | 'en_entrevista'
  | 'en_evaluacion'
  | 'en_oferta'
  | 'contratado'
  | 'no_continua';

export type RequirementStatus = 'verificado' | 'parcial' | 'no_cumple' | 'sin_verificar';

export type EvaluationMethod = 'LLM';

export interface Criterion {
  id: string;
  label: string;
  weightPct: number;
  type: EvaluationMethod;
  description?: string;
}

export interface JobPosting {
  id: string; // e.g. REQ-2026-DOC-088
  code: string;
  title: string;
  category: JobCategory;
  department: string;
  period: string;
  status: JobStatus;
  phase: string;
  vacancies: number | null; // null if "No registrado"
  knockoutRule: string;
  criteria: Criterion[];
  criteriaVersion: string;
  defaultTopN: number;
  templateId?: string;
  evaluationReference?: string;
  createdAt: string;
}

export interface Candidate {
  id: string; // stable candidateId e.g. "cand-001"
  name: string;
  email: string | null; // honest contact: null if absent
  phone: string | null;
  currentTitle: string;
  currentCompany: string;
  source: string; // e.g. "LinkedIn", "Bolsa ESAN", "Referencia"
  summary: string;
  rawCvText: string;
  savedInTalentPool: boolean;
  talentPoolNotes?: string;
  talentPoolOriginJob?: string;
  potentialOpportunities?: string[];
  importedProfile?: {
    documentType: string;
    documentNumber: string;
    externalId: string;
    emails?: string[];
    records: Record<string, string>[];
  };
}

export interface CriteriaScore {
  score: number;
  evidence: string;
}

export interface EvaluationIssue {
  code: string;
  message: string;
  attempts: number;
  lastAttemptAt: string;
}

export interface Application {
  id: string; // stable applicationId e.g. "app-001"
  jobPostingId: string;
  candidateId: string;
  stage: Stage;
  llmScore: number | null; // 0-100 or null if pending
  evaluationIssue?: EvaluationIssue;
  llmEvaluation?: { model: string; evaluatedAt: string; criteriaVersion: string; profileHash: string;
    privacyVersion: string; missingCriteria: string[] };
  mandatoryRequirementStatus: RequirementStatus;
  requirementJustification?: string;
  whyScoreNotes: {
    explanation: string;
    strengths: string[];
    evidenceSummary: string;
  };
  criteriaBreakdown: Record<string, CriteriaScore>;
  suggestedRoles?: string[];
  createdAt: string;
  updatedAt: string;
  isManualSelection?: boolean;
}

export interface ActivityLog {
  id: string;
  applicationId: string;
  type: 'stage_change' | 'note' | 'interview' | 'draft_email';
  title: string;
  details: string;
  author: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DecisionLog {
  id: string;
  jobPostingId: string;
  applicationId: string;
  candidateId: string;
  action: string;
  previousStage?: Stage;
  newStage?: Stage;
  author: string;
  timestamp: string;
  criteriaVersion: string;
  evaluationContext: {
    llmScore: number | null;
    method: EvaluationMethod;
  };
  notes?: string;
  reason?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailDraft {
  id: string;
  applicationId: string;
  to: string;
  cc?: string;
  templateType: 'personal' | 'avance' | 'cierre' | 'entrevista';
  lang: 'es' | 'en';
  subject: string;
  body: string;
  status: 'borrador';
  updatedAt: string;
}

export interface InterviewRecord {
  id: string;
  applicationId: string;
  title: string;
  scheduledAt: string;
  locationOrLink: string;
  notes?: string;
  status: 'invitacion_pendiente' | 'confirmada' | 'realizada';
  createdAt: string;
}

export interface ProfileTemplate {
  id: string;
  code: string;
  name: string;
  category: JobCategory;
  description: string;
  knockoutRule: string;
  criteria: Criterion[];
}

export interface AppStateData {
  jobPostings: JobPosting[];
  candidates: Candidate[];
  applications: Application[];
  activities: ActivityLog[];
  decisionLogs: DecisionLog[];
  emailDrafts: EmailDraft[];
  interviewRecords: InterviewRecord[];
  activeJobPostingId: string;
  selectedMethod: EvaluationMethod;
  topN: number;
  theme: 'light' | 'dark' | 'system';
  reducedMotion: boolean;
}
