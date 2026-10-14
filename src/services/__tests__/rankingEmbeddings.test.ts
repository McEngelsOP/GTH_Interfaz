import { describe, expect, it } from 'vitest';
import type { Application, Candidate } from '../../types/index.ts';
import { embeddingVigente, evidenciaLegible, idsTopN, ordenarPorEmbeddings } from '../rankingEmbeddings.ts';
import { estadoConConvocatoriaDePrueba } from '../../../tests/fixtures/convocatoriaDePrueba.ts';

const job = estadoConConvocatoriaDePrueba().jobPostings[0];
const cand = (id: string, name: string, records: Record<string, string>[] = []): Candidate => ({
  id, name, email: null, phone: null, currentTitle: '', currentCompany: '', source: 'Bumeran', summary: '', rawCvText: '',
  savedInTalentPool: false, importedProfile: { documentType: 'DNI', documentNumber: '', externalId: id, emails: [], records },
} as Candidate);
const app = (id: string, candidateId: string, score: number | null, extra: Partial<Application> = {}): Application => ({
  id, jobPostingId: job.id, candidateId, stage: 'postulado', llmScore: null, mandatoryRequirementStatus: 'sin_verificar',
  requirementJustification: '', whyScoreNotes: { explanation: '', evidenceSummary: '', strengths: [] }, criteriaBreakdown: {},
  createdAt: '', updatedAt: '',
  embeddingMatch: score === null ? undefined : { score, ranking: 0, requirementSims: {}, requirementEvidence: {}, explanation: '',
    backend: 'e5', criteriaVersion: job.criteriaVersion, evaluatedAt: '' },
  ...extra,
} as Application);

describe('ranking por Score Embeddings', () => {
  const candidates = [cand('c1', 'Zoe'), cand('c2', 'Ana'), cand('c3', 'Bea'), cand('c4', 'Carla'), cand('c5', 'Dora')];
  const apps = [app('a1', 'c1', 0.5), app('a2', 'c2', 0.9), app('a3', 'c3', null), app('a4', 'c4', 0.5),
    app('a5', 'c5', 0.95, { stage: 'no_continua' })];

  it('ordena de mayor a menor score, deja sin score al final y desempata por nombre', () => {
    expect(ordenarPorEmbeddings(apps, candidates, job).map((a) => a.id)).toEqual(['a5', 'a2', 'a4', 'a1', 'a3']);
  });

  it('el Top-N toma los N primeros con score entre los que siguen en proceso', () => {
    expect([...idsTopN(apps, candidates, job, 2)]).toEqual(['a2', 'a4']);
    expect(idsTopN(apps, candidates, job, 10).size).toBe(3);   // a3 sin score y a5 descartado no cuentan
    expect(idsTopN(apps, candidates, job, 0).size).toBe(0);
  });

  it('ignora resultados calculados con otros criterios', () => {
    const viejo = app('a6', 'c1', 0.99, {});
    viejo.embeddingMatch!.criteriaVersion = 'otra';
    expect(embeddingVigente(viejo, job)).toBeNull();
  });

  it('muestra la evidencia completa a partir de la etiqueta del scraper', () => {
    const c = cand('c9', 'Eva', [{ 'Exp[1] Puesto': 'Gestora de cobranza', 'Exp[1] Empresa': 'Financiera', 'Exp[1] Descripción': 'Cartera  morosa',
      'Est[2] Titulo': 'Contabilidad', 'Est[2] Institucion': 'Instituto', 'Est[2] Nivel': 'Técnico', Idiomas: 'Inglés' }]);
    expect(evidenciaLegible('Exp[1] Gestora de cobranza', c)).toBe('Gestora de cobranza · Financiera — Cartera morosa');
    expect(evidenciaLegible('Est[2] Contabilidad', c)).toBe('Contabilidad · Instituto (Técnico)');
    expect(evidenciaLegible('Idiomas', c)).toBe('Idiomas: Inglés');
    expect(evidenciaLegible('Exp[3] Otro', c)).toBe('Exp[3] Otro');
  });
});
