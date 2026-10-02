import { describe, it, expect, vi, afterEach } from 'vitest';
import { INITIAL_APP_STATE } from '../../data/initialData.ts';
import { loadAppState, parseStoredState, resetAppState, saveAppState } from '../storage.ts';
import { readRoute, routeHash } from '../navigation.ts';
import { sanitizeCell } from '../exportService.ts';

afterEach(() => vi.unstubAllGlobals());
describe('persistencia y navegación', () => {
  it('recupera snapshots completos y normaliza preferencias corruptas', () => {
    const data = structuredClone(INITIAL_APP_STATE);
    expect(parseStoredState(JSON.stringify(data))).toEqual(data);
    Object.assign(data, { theme: 'other', topN: -3, selectedMethod: 'other', activeJobPostingId: 'missing' });
    const result = parseStoredState(JSON.stringify(data));
    expect(result?.topN).toBe(5); expect(result?.theme).toBe('light');
    expect(result?.activeJobPostingId).toBe(data.jobPostings[0].id);
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
    const state = loadAppState(); state.applications[0].stage = 'no_continua';
    expect(INITIAL_APP_STATE.applications[0].stage).toBe('postulado');
    expect(saveAppState(state).success).toBe(false);
    expect(resetAppState().applications[0].stage).toBe('postulado');
    vi.restoreAllMocks();
  });
  it('conserva vista y convocatoria y admite nombres heredados sin rutas arbitrarias', () => {
    expect(readRoute('#view=avance-candidatos&job=REQ-1')).toEqual({ view: 'avance_candidatos', jobId: 'REQ-1' });
    expect(readRoute('#view=invalid').view).toBe('mejores_candidatos');
    expect(readRoute(routeHash('criterios_evaluacion', 'REQ-2'))).toEqual({ view: 'criterios_evaluacion', jobId: 'REQ-2' });
  });
});
describe('CSV para Excel', () => {
  it('neutraliza fórmulas y escapa nombres de criterios y texto multilineal', () => {
    for (const value of ['=1+1', '+cmd', '-formula', '@SUM(A1)', '  =1+1']) expect(sanitizeCell(value).startsWith("'")).toBe(true);
    expect(sanitizeCell('Experiencia; "Cloud"')).toBe('"Experiencia; ""Cloud"""');
    expect(sanitizeCell('uno\ndos')).toBe('"uno\ndos"');
  });
});
