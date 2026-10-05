import { describe, expect, it } from 'vitest';
import { getReviewCandidates, reviewAvailability, reviewEvaluation } from '../reviewRanking.ts';
import { isEligibleForTopN } from '../recruitmentRules.ts';
import type { Application, Criterion } from '../../types/index.ts';

const criteria: Criterion[] = [{ id:'a', label:'Experiencia', type:'LLM', weightPct:40 }, { id:'b', label:'Tecnología', type:'LLM', weightPct:60 }];
const app: Application = { id:'partial', candidateId:'person', jobPostingId:'job', stage:'postulado', llmScore:null,
  mandatoryRequirementStatus:'sin_verificar', createdAt:'2026-10-04', updatedAt:'2026-10-04',
  whyScoreNotes:{ explanation:'Evidencia parcial.', strengths:[], evidenceSummary:'Experiencia.' }, criteriaBreakdown:{ a:{score:90,evidence:'Experiencia declarada.'} },
  llmEvaluation:{model:'gemini-test',evaluatedAt:'2026-10-04',criteriaVersion:'v1',profileHash:'a'.repeat(64),privacyVersion:'v1',missingCriteria:['b']} };

describe('ranking para revisión humana', () => {
  it('usa resultados parciales guardados y completos sin dar por verificados los requisitos', () => {
    const before=structuredClone(app), complete={...app,id:'complete',llmScore:80};
    expect(getReviewCandidates([complete,app],criteria,2).map(item=>item.id)).toEqual(['partial','complete']);
    expect(reviewEvaluation(app,criteria)).toEqual({score:90,coverage:40,partial:true});
    expect(reviewAvailability([app],criteria).count).toBe(1);
    expect(isEligibleForTopN(app,'LLM').eligible).toBe(false);
    expect(isEligibleForTopN(complete,'LLM').eligible).toBe(false);
    expect(app).toEqual(before);
  });
  it('excluye expedientes decididos, sin evidencia, con incidencias o requisitos descartados', () => {
    const apps:Application[]=[{...app,stage:'no_continua'}, {...app,stage:'contratado'}, {...app,stage:'preseleccionado'},
      {...app,criteriaBreakdown:{}}, {...app,llmEvaluation:undefined}, {...app,mandatoryRequirementStatus:'no_cumple'},
      {...app,evaluationIssue:{code:'INVALID',message:'Incidencia',attempts:1,lastAttemptAt:'2026-10-04'}}];
    expect(getReviewCandidates(apps,criteria,10)).toEqual([]);
    expect(reviewAvailability(apps,criteria).count).toBe(0);
  });
  it('desempata por cobertura y conserva un parcial cero como dato válido', () => {
    const complete={...app,id:'complete',llmScore:90}, higherCoverage={...app,id:'coverage',criteriaBreakdown:{b:{score:90,evidence:'Tecnología.'}}};
    const zero={...app,id:'zero',criteriaBreakdown:{a:{score:0,evidence:'Alineamiento bajo explícito.'}}};
    expect(getReviewCandidates([zero,app,higherCoverage,complete],criteria,4).map(item=>item.id)).toEqual(['complete','coverage','partial','zero']);
    expect(getReviewCandidates([app],criteria,NaN)).toEqual([]);
    expect(getReviewCandidates([app],criteria,0)).toEqual([]);
  });
});
