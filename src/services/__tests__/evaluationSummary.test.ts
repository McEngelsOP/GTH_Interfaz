import { describe,expect,it } from 'vitest';
import { evaluationSummary } from '../evaluationSummary.ts';
import { INITIAL_APP_STATE } from '../../data/initialData.ts';
import type { Application,Criterion } from '../../types/index.ts';

const criteria:Criterion[]=[{id:'a',label:'Experiencia',type:'LLM',weightPct:40},{id:'b',label:'Tecnología',type:'LLM',weightPct:60}];
const app:Application={id:'app',jobPostingId:'job',candidateId:'person',stage:'postulado',mandatoryRequirementStatus:'sin_verificar',createdAt:'2026-10-04',updatedAt:'2026-10-04',whyScoreNotes:{explanation:'Evaluación parcial.',strengths:[],evidenceSummary:'Evidencia.'},llmScore:null,criteriaBreakdown:{a:{score:75,evidence:'Evidencia.'}},llmEvaluation:{model:'gemini-test',evaluatedAt:'2026-10-04',criteriaVersion:'v1',profileHash:'a'.repeat(64),privacyVersion:'v1',missingCriteria:['b']}};
describe('resultados parciales',()=>{
  it('muestra promedio sobre los criterios evaluados y su cobertura, conservando total nulo',()=>{
    expect(evaluationSummary(app,criteria)).toMatchObject({partialScore:75,coverage:40,missingLabels:['Tecnología'],evaluated:true});
    expect(app.llmScore).toBeNull();
  });
  it('distingue evaluación sin evidencia y perfiles todavía no evaluados',()=>{
    expect(evaluationSummary({...app,criteriaBreakdown:{}},criteria)).toMatchObject({partialScore:null,coverage:0,evaluated:true});
    expect(evaluationSummary({...app,llmEvaluation:undefined},criteria).evaluated).toBe(false);
    expect(INITIAL_APP_STATE.applications).toEqual([]);
  });
});
