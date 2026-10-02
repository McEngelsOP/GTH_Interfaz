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
  mlScore: 95,
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
  mlScore: 80,
  llmScore: 92,
  mandatoryRequirementStatus: 'verificado',
  whyScoreNotes: { explanation: 'Exp', strengths: [], evidenceSummary: 'Ev' },
  criteriaBreakdown: {},
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

const mockAppMissingML: Application = {
  id: 'app-3',
  jobPostingId: 'REQ-1',
  candidateId: 'cand-003',
  stage: 'postulado',
  mlScore: null,
  llmScore: 88,
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
  mlScore: 99,
  llmScore: 99,
  mandatoryRequirementStatus: 'sin_verificar',
  whyScoreNotes: { explanation: 'Exp', strengths: [], evidenceSummary: 'Ev' },
  criteriaBreakdown: {},
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

describe('recruitmentRules · TalentAI GTH ESAN', () => {
  it('valida elegibilidad para Top-N correctamente', () => {
    // App 1 es elegible para ML y LLM
    expect(isEligibleForTopN(mockApp1, 'ML').eligible).toBe(true);
    expect(isEligibleForTopN(mockApp1, 'LLM').eligible).toBe(true);

    // App con ML null NO es elegible para ML, pero sí para LLM
    expect(isEligibleForTopN(mockAppMissingML, 'ML').eligible).toBe(false);
    expect(isEligibleForTopN(mockAppMissingML, 'LLM').eligible).toBe(true);

    // App sin verificar NO es elegible aunque tenga 99 de score
    expect(isEligibleForTopN(mockAppUnverified, 'ML').eligible).toBe(false);
  });

  it('ordena y selecciona mejores candidatos según método independiente', () => {
    const list = [mockApp1, mockApp2, mockAppMissingML, mockAppUnverified];

    // Por ML: mockApp1 (95) > mockApp2 (80). mockAppMissingML y mockAppUnverified quedan excluidos.
    const topML = getTopCandidates(list, 'ML', 5);
    expect(topML.length).toBe(2);
    expect(topML[0].id).toBe('app-1');
    expect(topML[1].id).toBe('app-2');

    // Por LLM: mockApp2 (92) > mockAppMissingML (88) > mockApp1 (85)
    const topLLM = getTopCandidates(list, 'LLM', 5);
    expect(topLLM.length).toBe(3);
    expect(topLLM[0].id).toBe('app-2');
    expect(topLLM[1].id).toBe('app-3');
    expect(topLLM[2].id).toBe('app-1');
  });

  it('calcula métricas de convocatoria fielmente a partir de los registros', () => {
    const list = [mockApp1, mockApp2, mockAppMissingML, mockAppUnverified];
    const metrics = calculateJobMetrics(list, 'ML');

    expect(metrics.totalProcessed).toBe(4);
    expect(metrics.totalActive).toBe(4);
    expect(metrics.verifiedCount).toBe(3);
    // Promedio ML de los que tienen valor: (95 + 80 + 99) / 3 = 91.3
    expect(metrics.avgScore).toBe(91.3);
  });

  it('avanza candidatos a preseleccionado sin eliminarlos del sistema', () => {
    const result = advanceApplications({
      selectedAppIds: ['app-1'], jobPostingId: 'REQ-1', criteriaVersion: 'v3.0',
      applications: [mockApp1, mockApp2],
      candidates: [mockCandidate],
      jobPostingTitle: 'Docente TI',
      method: 'ML',
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

