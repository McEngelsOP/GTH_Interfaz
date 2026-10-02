import { describe, it, expect } from 'vitest';
import { INITIAL_APP_STATE } from '../../data/initialData.ts';
import { advanceApplications, isEligibleForTopN, releaseApplication, simulateScoreRecalculation } from '../recruitmentRules.ts';
import { createPendingApplication, moveApplicationStage, updateJobCriteria, validateStageTransition } from '../workflow.ts';
import { parseCSV, validateProfileCatalogCSV } from '../csvService.ts';

const fresh = () => structuredClone(INITIAL_APP_STATE);

describe('decisiones aisladas por expediente y convocatoria', () => {
  it('cierra solamente pendientes elegibles del mismo puesto, conservando perfiles y borradores de cierre', () => {
    const state = fresh(), job = state.jobPostings[0];
    const foreign = state.applications.find((a) => a.jobPostingId !== job.id)!;
    const result = advanceApplications({ jobPostingId: job.id, criteriaVersion: 'v9.1', jobPostingTitle: job.title,
      selectedAppIds: ['app-001'], applications: state.applications, candidates: state.candidates, method: 'ML', rejectOthersEvaluated: true });
    expect(result.updatedApplications.find((a) => a.id === foreign.id)).toEqual(foreign);
    expect(result.updatedApplications.find((a) => a.id === 'app-001')?.stage).toBe('preseleccionado');
    const closed = result.updatedApplications.filter((a) => a.jobPostingId === job.id && a.stage === 'no_continua');
    expect(closed.length).toBeGreaterThan(0);
    for (const app of closed) {
      expect(result.updatedCandidates.find((c) => c.id === app.candidateId)?.savedInTalentPool).toBe(true);
      expect(result.newDrafts.some((d) => d.applicationId === app.id && d.templateType === 'cierre')).toBe(true);
    }
    expect(result.newDecisions.every((d) => d.criteriaVersion === 'v9.1')).toBe(true);
    for (const app of state.applications.filter((a) => a.jobPostingId === job.id && a.mandatoryRequirementStatus !== 'verificado')) {
      expect(result.updatedApplications.find((a) => a.id === app.id)).toEqual(app);
    }
  });

  it('rechaza selecciones ajenas, no verificadas, ya decididas o inexistentes sin efectos parciales', () => {
    const state = fresh(), job = state.jobPostings[0];
    const foreign = state.applications.find((a) => a.jobPostingId !== job.id)!;
    const unverified = state.applications.find((a) => a.jobPostingId === job.id && a.mandatoryRequirementStatus !== 'verificado')!;
    for (const ids of [[foreign.id], ['app-001', unverified.id], ['missing'], []]) {
      const result = advanceApplications({ jobPostingId: job.id, criteriaVersion: job.criteriaVersion, jobPostingTitle: job.title,
        selectedAppIds: ids, applications: state.applications, candidates: state.candidates, method: 'ML', rejectOthersEvaluated: true });
      expect(result.updatedApplications).toEqual(state.applications);
      expect(result.newDecisions).toEqual([]); expect(result.newDrafts).toEqual([]);
    }
    const decided = { ...state.applications[0], stage: 'preseleccionado' as const };
    expect(isEligibleForTopN(decided, 'ML').eligible).toBe(false);
  });

  it('liberar dos veces, una contratación o un expediente inexistente no genera auditoría falsa', () => {
    const state = fresh();
    for (const stage of ['contratado', 'no_continua'] as const) {
      expect(releaseApplication({ applicationId: 'app-001', applications: [{ ...state.applications[0], stage }],
        candidates: state.candidates, jobPostingTitle: 'Test', reason: 'Prueba' })).toBeNull();
    }
    expect(releaseApplication({ applicationId: 'missing', applications: state.applications,
      candidates: state.candidates, jobPostingTitle: 'Test' })).toBeNull();
  });

  it('vincular a otro puesto no inventa evaluaciones ni requisitos cumplidos', () => {
    const state = fresh();
    const app = createPendingApplication(state.candidates[0].id, state.jobPostings[1]);
    expect(app.mlScore).toBeNull(); expect(app.llmScore).toBeNull();
    expect(app.mandatoryRequirementStatus).toBe('sin_verificar');
    expect(isEligibleForTopN(app, 'ML').eligible).toBe(false);
  });

  it('mueve etapas sin mutar el estado original y registra la decisión y la versión correcta', () => {
    const state = fresh(), before = structuredClone(state);
    const next = moveApplicationStage(state, 'app-001', 'preseleccionado', 'Perfil revisado por GTHC');
    expect(state).toEqual(before);
    expect(next.applications.find((a) => a.id === 'app-001')?.stage).toBe('preseleccionado');
    expect(next.emailDrafts.length).toBe(state.emailDrafts.length + 1);
    const interviewed = moveApplicationStage(next, 'app-001', 'en_entrevista', 'Entrevista aprobada');
    expect(interviewed.applications.find((a) => a.id === 'app-001')?.stage).toBe('en_entrevista');
    expect(interviewed.decisionLogs[0].criteriaVersion).toBe(state.jobPostings[0].criteriaVersion);
    expect(moveApplicationStage(state, 'app-001', 'contratado', 'Salto')).toBe(state);
    expect(validateStageTransition({ ...state.applications[0], mandatoryRequirementStatus: 'sin_verificar' }, 'preseleccionado', 'ML')).toBeTruthy();
    expect(moveApplicationStage(state, 'app-001', 'preseleccionado', '')).toBe(state);
  });
});

describe('recálculo separado con evidencias completas', () => {
  it('guarda el mismo resultado de la simulación únicamente en pendientes de la convocatoria', () => {
    const state = fresh(), job = state.jobPostings[0];
    const criteria = job.criteria.map((c, i) => ({ ...c, weightPct: i === 0 ? c.weightPct - 10 : i === 2 ? c.weightPct + 10 : c.weightPct }));
    state.applications.push({ ...state.applications[0], id: 'decided', stage: 'en_entrevista' });
    const next = updateJobCriteria(state, job.id, criteria);
    const app = next.applications.find((a) => a.id === 'app-001')!;
    expect(app.mlScore).toBe(simulateScoreRecalculation(criteria, state.applications[0].criteriaBreakdown, 'ML'));
    expect(app.llmScore).toBe(simulateScoreRecalculation(criteria, state.applications[0].criteriaBreakdown, 'LLM'));
    expect(next.applications.find((a) => a.id === 'decided')).toEqual(state.applications.find((a) => a.id === 'decided'));
    expect(updateJobCriteria(state, job.id, [{ ...criteria[0], weightPct: 99 }])).toBe(state);
  });
  it('mantiene pendiente un puntaje sin evidencias, con NaN o fuera de rango', () => {
    const criteria = fresh().jobPostings[0].criteria;
    expect(simulateScoreRecalculation(criteria, {}, 'ML')).toBeNull();
    for (const score of [NaN, Infinity, -1, 101]) expect(isEligibleForTopN({ ...fresh().applications[0], mlScore: score }, 'ML').eligible).toBe(false);
  });
});

describe('CSV de catálogo', () => {
  it('conserva celdas citadas, separadores, tildes y saltos internos con BOM', () => {
    const csv = '\uFEFFID;Perfil;Categoría;Requisito\r\n1;"Docente; TI";docente;"Maestría\ncon \"\"registro\"\""';
    const result = validateProfileCatalogCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toEqual(['1', 'Docente; TI', 'docente', 'Maestría\ncon "registro"']);
  });
  it('respeta columnas reordenadas y detecta identificadores vacíos, repetidos y archivos incompletos', () => {
    expect(validateProfileCatalogCSV('Perfil,Requisito,ID,Categoría\nDocente,Maestría,1,docente').rows[0][0]).toBe('1');
    const result = validateProfileCatalogCSV('ID;Perfil;Categoría;Requisito\n;A;docente;M\n1;A;docente;M\n1;A;docente;M\n2');
    expect(result.errors).toHaveLength(3);
    expect(parseCSV('"sin cerrar').errors.length).toBeGreaterThan(0);
    expect(parseCSV('').errors.length).toBeGreaterThan(0);
  });
});
