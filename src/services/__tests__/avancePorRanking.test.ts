import { describe, expect, it } from 'vitest';
import type { Application, Candidate } from '../../types/index.ts';
import { advanceApplications, puedeAvanzar } from '../recruitmentRules.ts';
import { estadoConConvocatoriaDePrueba } from '../../../tests/fixtures/convocatoriaDePrueba.ts';

const job = estadoConConvocatoriaDePrueba().jobPostings[0];
const app = (id: string, score: number, extra: Partial<Application> = {}): Application => ({
  id, jobPostingId: job.id, candidateId: `c-${id}`, stage: 'postulado', llmScore: null, mandatoryRequirementStatus: 'sin_verificar',
  requirementJustification: '', whyScoreNotes: { explanation: '', evidenceSummary: '', strengths: [] }, criteriaBreakdown: {},
  createdAt: '', updatedAt: '', ...extra,
  embeddingMatch: { score, ranking: 0, requirementSims: {}, requirementEvidence: {}, explanation: '', backend: 'e5',
    criteriaVersion: job.criteriaVersion, evaluatedAt: '' },
} as Application);
const cand = (id: string) => ({ id: `c-${id}`, name: `Persona ${id}`, email: `${id}@example.test` } as Candidate);

describe('avance a Preselección por el Top-N del ranking', () => {
  const apps = [app('a', 0.9), app('b', 0.8), app('c', 0.3)];
  const top = new Set(['a', 'b']);

  it('solo puede avanzar quien está en el Top-N y sigue pendiente', () => {
    expect(puedeAvanzar(apps[0], 'LLM', top)).toBe(true);
    expect(puedeAvanzar(apps[2], 'LLM', top)).toBe(false);
    expect(puedeAvanzar(app('a', 0.9, { stage: 'preseleccionado' }), 'LLM', top)).toBe(false);
    expect(puedeAvanzar(apps[0], 'LLM')).toBe(false);          // sin Top-N rige solo la regla LLM
  });

  it('mueve a Preselección, registra que fue por el Top-N y prepara el agradecimiento para el resto', () => {
    const r = advanceApplications({ jobPostingId: job.id, criteriaVersion: job.criteriaVersion, selectedAppIds: ['a'], applications: apps,
      candidates: ['a', 'b', 'c'].map(cand), jobPostingTitle: job.title, method: 'LLM', rejectOthersEvaluated: true,
      elegiblesPorRanking: top, evaluadosPorRanking: new Set(['a', 'b', 'c']) });
    const etapa = Object.fromEntries(r.updatedApplications.map((x) => [x.id, x.stage]));
    expect(etapa).toEqual({ a: 'preseleccionado', b: 'no_continua', c: 'no_continua' });
    expect(r.newDecisions[0].evaluationContext).toMatchObject({ viaTopN: true, embeddingScore: 0.9 });
    expect(r.newDrafts.map((d) => [d.applicationId, d.templateType])).toEqual([['a', 'avance'], ['b', 'cierre'], ['c', 'cierre']]);
  });

  it('rechaza el avance de alguien fuera del Top-N', () => {
    const r = advanceApplications({ jobPostingId: job.id, criteriaVersion: job.criteriaVersion, selectedAppIds: ['c'], applications: apps,
      candidates: [], jobPostingTitle: job.title, method: 'LLM', elegiblesPorRanking: top });
    expect(r.newDecisions).toHaveLength(0);
    expect(r.updatedApplications).toBe(apps);
  });
});
