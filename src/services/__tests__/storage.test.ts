import { describe, it, expect, vi, afterEach } from 'vitest';
import { INITIAL_APP_STATE } from '../../../tests/fixtures/recruitmentData.ts';
import { loadAppState, parseStoredState, resetAppState, saveAppState } from '../storage.ts';
import { INITIAL_APP_STATE as EMPTY_STATE, INITIAL_JOB_POSTINGS } from '../../data/initialData.ts';
import { readRoute, routeHash } from '../navigation.ts';
import { IS_STAGE_ONE } from '../../config/edition.ts';
import { sanitizeCell } from '../exportService.ts';

afterEach(() => vi.unstubAllGlobals());
describe('persistencia y navegación', () => {
  it('acepta y conserva un inicio sin convocatorias', () => {
    expect(EMPTY_STATE.jobPostings).toEqual([]);
    expect(parseStoredState(JSON.stringify(EMPTY_STATE))).toEqual(EMPTY_STATE);
    expect(readRoute('#view=nueva_convocatoria').view).toBe('nueva_convocatoria');
  });
  it('retira ejemplos intactos sin borrar convocatorias modificadas ni postulaciones reales', () => {
    const state = structuredClone(EMPTY_STATE);
    state.jobPostings = structuredClone(INITIAL_JOB_POSTINGS);
    state.activeJobPostingId = state.jobPostings[0].id;
    expect(parseStoredState(JSON.stringify(state))?.jobPostings).toEqual([]);
    state.jobPostings[0].title = 'Convocatoria real editada';
    const migrated = parseStoredState(JSON.stringify(state))!;
    expect(migrated.jobPostings).toHaveLength(1);
    expect(migrated.activeJobPostingId).toBe(state.jobPostings[0].id);
    const withPeople = structuredClone(INITIAL_APP_STATE);
    const result = parseStoredState(JSON.stringify(withPeople))!;
    expect(result.candidates).toEqual(withPeople.candidates);
    expect(result.applications).toEqual(withPeople.applications);
  });
  it('recupera snapshots completos y normaliza preferencias corruptas', () => {
    const data = structuredClone(INITIAL_APP_STATE);
    data.jobPostings.forEach((job) => { job.title += ' — editada'; });
    expect(parseStoredState(JSON.stringify(data))).toEqual(data);
    Object.assign(data, { theme: 'other', topN: -3, selectedMethod: 'other', activeJobPostingId: 'missing' });
    const result = parseStoredState(JSON.stringify(data));
    expect(result?.selectedMethod).toBe('LLM');
    expect(result?.topN).toBe(5); expect(result?.theme).toBe('light');
    expect(result?.activeJobPostingId).toBe(data.jobPostings[0].id);
  });
  it('migra datos anteriores a LLM sin perder personas, etapas ni evidencias', () => {
    const legacy: any = structuredClone(INITIAL_APP_STATE);
    legacy.selectedMethod = 'ML';
    legacy.jobPostings[0].criteria[0].type = 'ML';
    legacy.applications[0].mlScore = 100;
    legacy.decisionLogs[0].evaluationContext.method = 'ML';
    legacy.decisionLogs[0].evaluationContext.mlScore = 95;
    const migrated = parseStoredState(JSON.stringify(legacy))!;
    expect(migrated.selectedMethod).toBe('LLM');
    expect(migrated.candidates).toEqual(legacy.candidates);
    expect(migrated.applications).toHaveLength(legacy.applications.length);
    expect(migrated.applications[0].llmScore).toBe(legacy.applications[0].llmScore);
    expect(migrated.applications[0]).not.toHaveProperty('mlScore');
    expect(migrated.jobPostings.every((job) => job.criteria.every((c) => c.type === 'LLM'))).toBe(true);
    expect(migrated.decisionLogs[0].metadata?.legacyEvaluationMethod).toBe('ML');
    expect(migrated.decisionLogs[0].evaluationContext).not.toHaveProperty('mlScore');
  });
  it('rechaza JSON inválido, registros nulos e identidades duplicadas o huérfanas', () => {
    for (const raw of ['null', '{', '{}', JSON.stringify({ jobPostings: [null] })]) expect(parseStoredState(raw)).toBeNull();
    const duplicate = structuredClone(INITIAL_APP_STATE);
    duplicate.applications.push(duplicate.applications[0]);
    expect(parseStoredState(JSON.stringify(duplicate))).toBeNull();
    const orphan = structuredClone(INITIAL_APP_STATE); orphan.applications[0].candidateId = 'missing';
    expect(parseStoredState(JSON.stringify(orphan))).toBeNull();
  });
  it('funciona sin almacenamiento y el reset no comparte objetos con los datos base', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw { name: 'QuotaExceededError' }; }, removeItem: () => {} });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = loadAppState(); expect(state.candidates).toEqual([]); expect(state.applications).toEqual([]);
    expect(INITIAL_APP_STATE.applications[0].stage).toBe('postulado');
    expect(saveAppState(state).success).toBe(false);
    expect(resetAppState().applications).toEqual([]);
    vi.restoreAllMocks();
  });
  it('conserva vista y convocatoria y admite nombres heredados sin rutas arbitrarias', () => {
    expect(readRoute('#view=avance-candidatos&job=REQ-1')).toEqual({ view: 'avance_candidatos', jobId: 'REQ-1' });
    expect(readRoute('#view=invalid').view).toBe('mejores_candidatos');
    expect(readRoute(routeHash('criterios_evaluacion', 'REQ-2'))).toEqual({ view: IS_STAGE_ONE ? 'mejores_candidatos' : 'criterios_evaluacion', jobId: 'REQ-2' });
  });
});
describe('CSV para Excel', () => {
  it('neutraliza fórmulas y escapa nombres de criterios y texto multilineal', () => {
    for (const value of ['=1+1', '+cmd', '-formula', '@SUM(A1)', '  =1+1']) expect(sanitizeCell(value).startsWith("'")).toBe(true);
    expect(sanitizeCell('Experiencia; "Cloud"')).toBe('"Experiencia; ""Cloud"""');
    expect(sanitizeCell('uno\ndos')).toBe('"uno\ndos"');
  });
});

