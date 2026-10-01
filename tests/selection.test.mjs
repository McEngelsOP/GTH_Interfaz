import test from 'node:test';
import assert from 'node:assert/strict';
import { appState } from '../js/state.js';
import { normalizeCandidate, reweightCandidate } from '../js/domain.js';
import { candidateCSVRows, catalogCSVRows, serializeCSV, parseCatalogCSV, detectFileFormat } from '../js/csvData.js';

const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
const fixture=()=>{
  storage.clear();const s=new appState.constructor(),id=s.activeJobPostingId;
  const inputs=[
    {id:'A',name:'Ana',mlScore:96,llmScore:61,knockoutMet:true},
    {id:'B',name:'Beto',mlScore:72,llmScore:99,knockoutMet:true},
    {id:'C',name:'Caro',mlScore:90,llmScore:75,knockoutMet:true},
    {id:'D',name:'Dani',mlScore:84,llmScore:82,knockoutMet:null},
    {id:'E',name:'Eva',mlScore:null,llmScore:93,knockoutMet:true},
    {id:'F',name:'Fran',mlScore:70,llmScore:69,knockoutMet:false}
  ];
  s.candidates=inputs.map(c=>normalizeCandidate({...c,score:100,stage:'postulado'},id));
  s.candidatesByJob[id]=s.candidates;s.setTopN(2);s.updateTopNFlags();return s;
};

test('el orden y el Top-N usan solo el método elegido, sin promedios',()=>{
  const s=fixture();
  assert.deepEqual(s.selectTopN().map(c=>c.id),['A','C']);
  s.setRankingModel('llm');
  assert.deepEqual(s.selectTopN().map(c=>c.id),['B','E']);
  assert.equal(s.candidates.find(c=>c.id==='A').mlScore,96);
  assert.equal(s.candidates.find(c=>c.id==='A').llmScore,61);
  const restored=new s.constructor();assert.equal(restored.rankingModel,'llm');
});

test('se pueden elegir y comparar más de cinco perfiles y guardar un N variable',()=>{
  const s=fixture();s.addDemoBatch(s.activeJobPostingId,25);s.setTopN(18);
  assert.equal(s.selectTopN().length,18);assert.equal(s.getComparisonCandidates().length,18);
  s.setTopN(150);assert.equal(s.topN,150);assert.equal(new s.constructor().topN,150);
  assert.equal(s.setTopN(0),false);assert.equal(s.topN,150);
});

test('confirmar avanza elegidos y prepara mensajes, sin decidir sobre datos pendientes',()=>{
  const s=fixture();s.selectTopN();
  const result=s.confirmSelection({jobId:s.activeJobPostingId,declineOthers:true,advanceMessage:'Hola {nombre}, avanzas para {puesto}.',declineMessage:'Gracias {nombre}, no continúas para {puesto}.'});
  assert.deepEqual(result,{advanced:2,declined:2,pending:2});
  for(const id of ['A','C']){const c=s.candidates.find(c=>c.id===id);assert.equal(c.stage,'preseleccionado');assert.equal(c.messageDraft.status,'Borrador');assert.match(c.messageDraft.body,new RegExp(c.name));assert.doesNotMatch(c.messageDraft.body,/\{nombre\}|\{puesto\}/);}
  for(const id of ['B','F'])assert.equal(s.candidates.find(c=>c.id===id).stage,'liberado');
  for(const id of ['D','E']){const c=s.candidates.find(c=>c.id===id);assert.equal(c.stage,'postulado');assert.equal(c.messageDraft,null);}
  const restored=new s.constructor();assert.equal(restored.candidates.find(c=>c.id==='B').messageDraft.outcome,'no_avanza');
  assert.equal(restored.talentPool.find(t=>t.candidateId==='B').llmScore,99);
});

test('la decisión requiere selección verificable, mensajes y la misma convocatoria',()=>{
  const s=fixture();s.setCandidateSelection(['D']);
  assert.throws(()=>s.confirmSelection({jobId:s.activeJobPostingId,advanceMessage:'Hola'}),/verificados/);
  s.selectTopN();assert.throws(()=>s.confirmSelection({jobId:'otro',advanceMessage:'Hola'}),/convocatoria cambió/);
  assert.throws(()=>s.confirmSelection({jobId:s.activeJobPostingId,advanceMessage:' '}),/texto/);
  s.confirmSelection({jobId:s.activeJobPostingId,advanceMessage:'Hola {nombre}'});
  assert.equal(s.candidates.find(c=>c.id==='B').stage,'postulado');
  const other=s.jobPostings[1].id;s.setActiveJobPosting(other);assert.equal(s.selectedRows.size,0);assert.equal(s.comparisonPool.size,0);
});

test('recalcular conserva dos resultados independientes y deja pendientes los métodos sin evidencia',()=>{
  const c=normalizeCandidate({id:'x',weights:[{label:'Experiencia',type:'ML',maxScore:60,scoreObtained:54},{label:'Afinidad',type:'LLM',maxScore:40,scoreObtained:20}]},'job');
  const result=reweightCandidate(c,[{label:'Experiencia',weightPct:60,type:'ML'},{label:'Afinidad',weightPct:40,type:'LLM'}]);
  assert.equal(result.mlScore,90);assert.equal(result.llmScore,50);
  const missing=reweightCandidate(c,[{label:'Sin evidencia',weightPct:50,type:'ML'},{label:'Afinidad',weightPct:50,type:'LLM'}]);
  assert.equal(missing.mlScore,null);assert.equal(missing.llmScore,50);
});

test('CSV identifica el puesto y conserva los puntajes por separado',()=>{
  const s=fixture(),rows=candidateCSVRows(s.jobPosting,s.candidates);
  assert.equal(rows[1][5],s.activeJobPostingId);assert.equal(rows[1][6],96);assert.equal(rows[1][7],61);
  assert.equal(rows[0][6],'Puntaje según Machine Learning');assert.equal(rows[0][7],'Puntaje según LLM (embeddings)');
  const parsed=parseCatalogCSV(serializeCSV(catalogCSVRows([{id:'TPL-1',title:'Puesto; "demo"\nmultilínea',roleType:'docente',knockoutRule:'Requisito'}])));
  assert.equal(parsed[0].title,'Puesto; "demo"\nmultilínea');
  assert.throws(()=>parseCatalogCSV('ID;Perfil;Categoría;Requisito\n1;Perfil;Docente'),/cuatro columnas/);
  assert.throws(()=>parseCatalogCSV('ID;Perfil;Categoría;Requisito\n1;"incompleto'),/comillas/);
  assert.match(serializeCSV([[' =2+2','@SUM(A1)']]),/' =2\+2/);
  assert.equal(detectFileFormat({name:'CV.PDF'}),'PDF');assert.equal(detectFileFormat({name:'archivo.exe'}),'Formato no reconocido');
});
