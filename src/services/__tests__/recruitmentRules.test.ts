import { describe, it, expect } from 'vitest';
import {
  isEligibleForTopN,
  getTopCandidates,
  calculateJobMetrics,
  advanceApplications,
  releaseApplication,
} from '../recruitmentRules.ts';
import { Application, Candidate } from '../../types/index.ts';

const mockCandidate: Candidate = {
  id: 'cand-001',
  name: 'Test Candidate',
  email: 'test@esan.edu.pe',
  phone: '+51 999 888 777',
  currentTitle: 'Ingeniero',
  currentCompany: 'ESAN',
  source: 'Bolsa',
  summary: 'Summary',
  rawCvText: 'CV',
  savedInTalentPool: false,
};

const mockApp1: Application = {
  id: 'app-1',
  jobPostingId: 'REQ-1',
  candidateId: 'cand-001',
  stage: 'postulado',
  llmScore: 85,
  mandatoryRequirementStatus: 'verificado',
  whyScoreNotes: { explanation: 'Exp', strengths: [], evidenceSummary: 'Ev' },
  criteriaBreakdown: {},
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

const mockApp2: Application = {
  id: 'app-2',
  jobPostingId: 'REQ-1',
  candidateId: 'cand-002',
  stage: 'postulado',
  llmScore: 92,
  mandatoryRequirementStatus: 'verificado',
  whyScoreNotes: { explanation: 'Exp', strengths: [], evidenceSummary: 'Ev' },
  criteriaBreakdown: {},
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

const mockAppMissingScore: Application = {
  id: 'app-3',
  jobPostingId: 'REQ-1',
  candidateId: 'cand-003',
  stage: 'postulado',
  llmScore: null,
  mandatoryRequirementStatus: 'verificado',
  whyScoreNotes: { explanation: 'Exp', strengths: [], evidenceSummary: 'Ev' },
  criteriaBreakdown: {},
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

const mockAppUnverified: Application = {
  id: 'app-4',
  jobPostingId: 'REQ-1',
  candidateId: 'cand-004',
  stage: 'postulado',
  llmScore: 99,
  mandatoryRequirementStatus: 'sin_verificar',
  whyScoreNotes: { explanation: 'Exp', strengths: [], evidenceSummary: 'Ev' },
  criteriaBreakdown: {},
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

describe('recruitmentRules · TalentAI GTH ESAN', () => {
  it('requiere puntaje LLM y requisitos verificados para Top-N', () => {
    expect(isEligibleForTopN(mockApp1, 'LLM').eligible).toBe(true);
    expect(isEligibleForTopN(mockAppMissingScore, 'LLM').eligible).toBe(false);
    expect(isEligibleForTopN(mockAppUnverified, 'LLM').eligible).toBe(false);
  });

  it('ordena exclusivamente por LLM y excluye resultados pendientes', () => {
    const top = getTopCandidates([mockApp1, mockApp2, mockAppMissingScore, mockAppUnverified], 'LLM', 5);
    expect(top.map((app) => app.id)).toEqual(['app-2', 'app-1']);
  });

  it('calcula el promedio LLM sin tratar pendientes como cero', () => {
    const metrics = calculateJobMetrics([mockApp1, mockApp2, mockAppMissingScore, mockAppUnverified], 'LLM');
    expect(metrics.totalProcessed).toBe(4);
    expect(metrics.totalActive).toBe(4);
    expect(metrics.verifiedCount).toBe(3);
    expect(metrics.avgScore).toBe(92);
  });

  it('avanza candidatos a preseleccionado sin eliminarlos del sistema', () => {
    const result = advanceApplications({
      selectedAppIds: ['app-1'], jobPostingId: 'REQ-1', criteriaVersion: 'v3.0',
      applications: [mockApp1, mockApp2],
      candidates: [mockCandidate],
      jobPostingTitle: 'Docente TI',
      method: 'LLM',
    });

    const updatedApp1 = result.updatedApplications.find((a) => a.id === 'app-1');
    expect(updatedApp1?.stage).toBe('preseleccionado');
    expect(result.newActivities.length).toBe(1);
    expect(result.newDecisions.length).toBe(1);
    expect(result.newDrafts.length).toBe(1);
    expect(result.newDrafts[0].status).toBe('borrador');
  });

  it('libera postulación pasándola a no_continua y conservando en Banco de Talento', () => {
    const result = releaseApplication({
      applicationId: 'app-1',
      applications: [mockApp1, mockApp2],
      candidates: [mockCandidate],
      jobPostingTitle: 'Docente TI',
      reason: 'Liberación de prueba',
    });

    expect(result).not.toBeNull();
    if (!result) throw new Error('Expected release result');
    const updatedApp1 = result.updatedApplications.find((a) => a.id === 'app-1');
    expect(updatedApp1?.stage).toBe('no_continua');

    const updatedCand = result.updatedCandidates.find((c) => c.id === 'cand-001');
    expect(updatedCand?.savedInTalentPool).toBe(true);
    expect(result.newActivity.type).toBe('stage_change');
    expect(result.newDecision.action).toContain('Liberar');
  });
});

