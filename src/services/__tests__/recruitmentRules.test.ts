import { describe, it, expect } from 'vitest';
import {
  isEligibleForTopN,
  getTopCandidates,
  calculateJobMetrics,
  advanceApplications,
  releaseApplication,
  getTopNAvailability,
} from '../recruitmentRules.ts';
import { Application, Candidate, Criterion } from '../../types/index.ts';

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

const partialCriteria: Criterion[] = [
  { id: 'experience', label: 'Experiencia', weightPct: 40, type: 'LLM' },
  { id: 'technology', label: 'Tecnología', weightPct: 60, type: 'LLM' },
];
const mockPartial: Application = {
  ...mockAppMissingScore,
  criteriaBreakdown: { experience: { score: 80, evidence: 'Experiencia declarada.' } },
  llmEvaluation: { model: 'gemini-test', evaluatedAt: '2026-10-04T20:00:00Z', criteriaVersion: 'v1',
    profileHash: 'a'.repeat(64), privacyVersion: 'v1', missingCriteria: ['technology'] },
};

describe('recruitmentRules · TalentAI GTH ESAN', () => {
  it('requiere puntaje LLM y requisitos verificados para Top-N', () => {
    expect(isEligibleForTopN(mockApp1, 'LLM').eligible).toBe(true);
    expect(isEligibleForTopN(mockAppMissingScore, 'LLM').eligible).toBe(false);
    expect(isEligibleForTopN(mockAppUnverified, 'LLM').eligible).toBe(false);
  });

  it('explica qué falta para habilitar Top-N sin aceptar perfiles incompletos', () => {
    const bothPending = { ...mockAppUnverified, llmScore: null };
    const availability = getTopNAvailability([bothPending, { ...mockApp1, stage: 'preseleccionado' }], 'LLM');
    expect(availability).toMatchObject({ eligibleCount: 0, pendingScoreCount: 1, pendingRequirementCount: 1 });
    expect(availability.hint).toContain('faltan puntajes LLM y requisitos verificados');
    expect(getTopNAvailability([mockAppMissingScore], 'LLM').hint).toBe('Selección pendiente: faltan puntajes LLM.');
    expect(getTopNAvailability([mockAppUnverified], 'LLM').hint).toContain('falta verificar');
    expect(getTopNAvailability([{ ...mockApp1, mandatoryRequirementStatus: 'no_cumple' }], 'LLM').eligibleCount).toBe(0);
    expect(getTopNAvailability([mockApp1, bothPending], 'LLM').eligibleCount).toBe(1);
    expect(getTopNAvailability([], 'LLM').hint).toContain('Carga perfiles');
    expect(getTopNAvailability([{ ...mockApp1, stage: 'contratado' }], 'LLM').hint).toContain('No hay postulaciones pendientes');
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

  it('calcula el promedio parcial y cobertura sin sumar pendientes, liberados o contratados', () => {
    const secondPartial = { ...mockPartial, criteriaBreakdown: { technology: { score: 40, evidence: 'Tecnología declarada.' } } };
    const metrics = calculateJobMetrics([mockPartial, secondPartial, mockAppMissingScore,
      { ...mockPartial, stage: 'no_continua' }, { ...mockPartial, stage: 'contratado' },
      { ...mockPartial, criteriaBreakdown: {} }, { ...mockPartial, llmEvaluation: undefined }], 'LLM', partialCriteria);
    expect(metrics).toMatchObject({ avgScore: null, scoredCount: 0, avgPartialScore: 60, avgPartialCoverage: 50,
      partialScoreCount: 2, evaluatedWithoutScoreCount: 1 });
    expect(mockPartial.llmScore).toBeNull();
    expect(isEligibleForTopN(mockPartial, 'LLM').eligible).toBe(false);
  });

  it('mantiene separados el promedio completo y el parcial, incluyendo ceros válidos', () => {
    const zeroPartial = { ...mockPartial, criteriaBreakdown: { experience: { score: 0, evidence: 'Evidencia de alineamiento bajo.' } } };
    const metrics = calculateJobMetrics([mockApp1, mockApp2, zeroPartial], 'LLM', partialCriteria);
    expect(metrics).toMatchObject({ avgScore: 88.5, scoredCount: 2, avgPartialScore: 0, avgPartialCoverage: 40, partialScoreCount: 1 });
    expect(calculateJobMetrics([mockAppMissingScore, { ...mockPartial, criteriaBreakdown: {} }], 'LLM', partialCriteria))
      .toMatchObject({ avgScore: null, avgPartialScore: null, avgPartialCoverage: null, partialScoreCount: 0, evaluatedWithoutScoreCount: 1 });
  });

  it('usa los pesos vigentes para calcular el parcial de evidencia guardada', () => {
    const criteria: Criterion[] = [
      { ...partialCriteria[0], weightPct: 20 }, { ...partialCriteria[1], weightPct: 30 },
      { id: 'reference', label: 'Referencia', type: 'LLM', weightPct: 50 },
    ];
    const app = { ...mockPartial, criteriaBreakdown: { experience: { score: 80, evidence: 'Experiencia.' }, technology: { score: 20, evidence: 'Tecnología.' } } };
    expect(calculateJobMetrics([app], 'LLM', criteria)).toMatchObject({ avgPartialScore: 44, avgPartialCoverage: 50 });
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
