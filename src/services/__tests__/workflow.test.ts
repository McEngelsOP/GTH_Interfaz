import { describe, it, expect } from 'vitest';
import { INITIAL_APP_STATE } from '../../../tests/fixtures/recruitmentData.ts';
import { advanceApplications, isEligibleForTopN, releaseApplication, simulateScoreRecalculation } from '../recruitmentRules.ts';
import { createPendingApplication, moveApplicationStage, releaseSelectedApplications, updateJobCriteria, validateStageTransition } from '../workflow.ts';
import { parseCSV, validateProfileCatalogCSV } from '../csvService.ts';

const fresh = () => structuredClone(INITIAL_APP_STATE);

describe('descarte por lote', () => {
  it('descarta solo los marcados, conserva evidencias y registra el motivo por expediente sin duplicar IDs', () => {
    const state=fresh(), job=state.jobPostings.find(item=>item.id===state.activeJobPostingId)!;
    const targets=state.applications.filter(app=>app.jobPostingId===job.id && app.stage!=='no_continua' && app.stage!=='contratado').slice(0,2);
    targets[0].llmScore=null;targets[0].mandatoryRequirementStatus='sin_verificar';
    const before=structuredClone(state),ids=targets.map(app=>app.id);
    const next=releaseSelectedApplications(state,job.id,[...ids,ids[0]],'  Revisión manual del lote.  ');
    expect(state).toEqual(before);
    expect(next.decisionLogs.length-state.decisionLogs.length).toBe(2);
    expect(next.activities.length-state.activities.length).toBe(2);
    expect(next.emailDrafts).toEqual(state.emailDrafts);
    for(const original of state.applications) {
      const current=next.applications.find(app=>app.id===original.id)!;
      if(ids.includes(original.id)) {
        expect(current.stage).toBe('no_continua');
        expect(current.criteriaBreakdown).toEqual(original.criteriaBreakdown);
        expect(current.llmScore).toBe(original.llmScore);
        expect(next.candidates.find(candidate=>candidate.id===original.candidateId)?.savedInTalentPool).toBe(true);
        expect(next.decisionLogs.find(log=>log.applicationId===original.id)?.notes).toBe('Revisión manual del lote.');
      } else expect(current).toEqual(original);
    }
    expect(releaseSelectedApplications(next,job.id,ids,'Otra vez')).toBe(next);
  });
  it('rechaza todo el lote ante IDs ajenos, cerrados, inexistentes, convocatoria inactiva o motivo vacío', () => {
    const state=fresh(),jobId=state.activeJobPostingId;
    const active=state.applications.find(app=>app.jobPostingId===jobId&&app.stage==='postulado')!;
    const foreign=state.applications.find(app=>app.jobPostingId!==jobId)!;
    const closed={...active,id:'closed',stage:'contratado' as const};state.applications.push(closed);
    for(const ids of [[active.id,foreign.id],[active.id,closed.id],[active.id,'missing'],[]]) expect(releaseSelectedApplications(state,jobId,ids,'Motivo')).toBe(state);
    expect(releaseSelectedApplications(state,jobId,[active.id],'  ')).toBe(state);
    const inactive=structuredClone(state);inactive.jobPostings.find(job=>job.id===jobId)!.status='borrador';
    expect(releaseSelectedApplications(inactive,jobId,[active.id],'Motivo')).toBe(inactive);
    const switched={...state,activeJobPostingId:foreign.jobPostingId};
    expect(releaseSelectedApplications(switched,jobId,[active.id],'Motivo')).toBe(switched);
  });
});

describe('decisiones aisladas por expediente y convocatoria', () => {
  it('cierra solamente pendientes elegibles del mismo puesto, conservando perfiles y borradores de cierre', () => {
    const state = fresh(), job = state.jobPostings[0];
    const foreign = state.applications.find((a) => a.jobPostingId !== job.id)!;
    const result = advanceApplications({ jobPostingId: job.id, criteriaVersion: 'v9.1', jobPostingTitle: job.title,
      selectedAppIds: ['app-001'], applications: state.applications, candidates: state.candidates, method: 'LLM', rejectOthersEvaluated: true });
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
        selectedAppIds: ids, applications: state.applications, candidates: state.candidates, method: 'LLM', rejectOthersEvaluated: true });
      expect(result.updatedApplications).toEqual(state.applications);
      expect(result.newDecisions).toEqual([]); expect(result.newDrafts).toEqual([]);
    }
    const decided = { ...state.applications[0], stage: 'preseleccionado' as const };
    expect(isEligibleForTopN(decided, 'LLM').eligible).toBe(false);
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
    expect(app.llmScore).toBeNull();
    expect(app.mandatoryRequirementStatus).toBe('sin_verificar');
    expect(isEligibleForTopN(app, 'LLM').eligible).toBe(false);
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
    expect(validateStageTransition({ ...state.applications[0], mandatoryRequirementStatus: 'sin_verificar' }, 'preseleccionado', 'LLM')).toBeTruthy();
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
    expect(app.llmScore).toBe(simulateScoreRecalculation(criteria, state.applications[0].criteriaBreakdown, 'LLM'));
    expect(next.applications.find((a) => a.id === 'decided')).toEqual(state.applications.find((a) => a.id === 'decided'));
    expect(updateJobCriteria(state, job.id, [{ ...criteria[0], weightPct: 99 }])).toBe(state);
  });
  it('mantiene pendiente un puntaje sin evidencias, con NaN o fuera de rango', () => {
    const criteria = fresh().jobPostings[0].criteria;
    expect(simulateScoreRecalculation(criteria, {}, 'LLM')).toBeNull();
    for (const score of [NaN, Infinity, -1, 101]) expect(isEligibleForTopN({ ...fresh().applications[0], llmScore: score }, 'LLM').eligible).toBe(false);
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
