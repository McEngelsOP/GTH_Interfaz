import { describe, expect, it } from 'vitest';
import { buildEmbeddingRequest, mapEmbeddingReply, needsEmbeddingRanking } from '../embeddingMatching.ts';
import type { Application, Candidate, JobPosting } from '../../types/index.ts';

const job = { id:'job', title:'Analista de cobranzas', status:'activa', criteriaVersion:'v1',
  criteria:[{ id:'a', label:'Cobranzas', type:'LLM', weightPct:70 }, { id:'b', label:'ERP', type:'LLM', weightPct:30, description:'SAP' }] } as JobPosting;
const candidate: Candidate = { id:'cand-1', name:'Zoraida Pérez', email:'ana@x.pe', phone:'999', currentTitle:'', currentCompany:'', source:'Bumeran (archivo)',
  summary:'', rawCvText:'Nombre: Zoraida', savedInTalentPool:false, importedProfile:{ documentType:'DNI', documentNumber:'123', externalId:'', records:[
    { Nombre:'Zoraida', Apellido:'Pérez', Edad:'30', Género:'Femenino', Dirección:'Av. 1', 'E-Mail':'ana@x.pe', 'Nro. Documento':'123',
      'Exp[1] Puesto':'Analista de cobranzas', 'Exp[1] Empresa':'Banco', 'Exp[1] Descripción':'Cartera morosa', 'Est[1] Titulo':'Contabilidad', Idiomas:'Inglés' }] } };
const app = { id:'app-1', jobPostingId:'job', candidateId:'cand-1', stage:'postulado', llmScore:72 } as Application;

describe('matching por embeddings', () => {
  it('envía solo experiencias, estudios e idiomas, con el ID de candidato existente y los criterios de la convocatoria', () => {
    const request = buildEmbeddingRequest(job, [app], [candidate]);
    expect(request.oferta).toEqual({ titulo:'Analista de cobranzas', requisitos:[['Cobranzas', 70], ['ERP · SAP', 30]] });
    expect(request.candidatos).toEqual([{ candidato_id:'cand-1', campos:{
      'Exp[1] Puesto':'Analista de cobranzas', 'Exp[1] Descripción':'Cartera morosa', 'Est[1] Titulo':'Contabilidad', Idiomas:'Inglés' } }]);
    expect(JSON.stringify(request)).not.toMatch(/Zoraida|Pérez|ana@x\.pe|Femenino|Av\. 1|123|Banco/);
  });

  it('guarda el score aparte del LLM y lo invalida cuando cambian los criterios', () => {
    const results = mapEmbeddingReply(job, [app], { backend:'tfidf', ranking:[{ candidato_id:'cand-1', ranking:1, score_embeddings:0.4321,
      req_sims:[0.5, null], req_fragmentos:['Exp[1] Analista de cobranzas', ''], explicacion:'[Cobranzas…] -> Exp[1] Analista de cobranzas (0.50)' }] }, '2026-10-05');
    expect(results['app-1']).toMatchObject({ score:0.4321, ranking:1, backend:'tfidf', criteriaVersion:'v1',
      requirementSims:{ a:0.5, b:null }, requirementEvidence:{ a:'Exp[1] Analista de cobranzas', b:'' } });
    const scored = { ...app, embeddingMatch: results['app-1'] };
    expect(scored.llmScore).toBe(72);
    // tfidf es el respaldo sin modelo: se vuelve a pedir por si el servicio ya tiene e5
    expect(needsEmbeddingRanking(job, [scored], [candidate])).toBe(true);
    const e5 = { ...scored, embeddingMatch: { ...results['app-1'], backend: 'e5' as const } };
    expect(needsEmbeddingRanking(job, [e5], [candidate])).toBe(false);
    expect(needsEmbeddingRanking({ ...job, criteriaVersion:'v2' }, [e5], [candidate])).toBe(true);
  });
});
