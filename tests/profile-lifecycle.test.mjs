import test from 'node:test';
import assert from 'node:assert/strict';
import { appState } from '../js/state.js';
import { normalizeCandidate } from '../js/domain.js';
import { comparisonCSVRows, serializeCSV } from '../js/csvData.js';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const fixture = () => {
  storage.clear(); const s = new appState.constructor();
  const rows = [{id:'a',candidateId:'person-a',name:'Ana',email:'ana@example.com',mlScore:98,llmScore:80}, {id:'b',name:'Beto',mlScore:91,llmScore:90}, {id:'c',name:'Caro',mlScore:85,llmScore:95}];
  s.candidates = rows.map(c => normalizeCandidate({...c,stage:'postulado',knockoutMet:true},s.activeJobPostingId));
  s.candidatesByJob[s.activeJobPostingId] = s.candidates;
  s.setTopN(1); return s;
};

test('marcar no mueve perfiles; confirmar limpia la selección y repone Top-N con otros pendientes', () => {
  const s = fixture(); s.selectTopN();
  assert.equal(s.candidates.find(c=>c.id==='a').stage,'postulado');
  s.setFilterStatus('selected');
  s.confirmSelection({jobId:s.activeJobPostingId,advanceMessage:'Hola {nombre}'});
  assert.equal(s.selectedRows.size,0); assert.equal(s.comparisonPool.size,0); assert.equal(s.filterStatus,'active');
  assert.equal(s.getFilteredCandidates().length,3);
  s.setFilterStatus('topN'); assert.deepEqual(s.getFilteredCandidates().map(c=>c.id),['b']);
  s.setCandidateSelection(['a']); assert.equal(s.getDecisionPreview().blocked.length,1);
  assert.throws(()=>s.confirmSelection({jobId:s.activeJobPostingId,advanceMessage:'Hola'}),/pendientes de decisión/);
  assert.equal(new s.constructor().candidates.find(c=>c.id==='a').stage,'preseleccionado');
});

test('una persona conserva postulaciones independientes en dos puestos', () => {
  const s = fixture(), otherJob = s.jobPostings[1].id;
  const other = normalizeCandidate({id:'other-a',candidateId:'person-a',name:'Ana',stage:'postulado',knockoutMet:true,mlScore:60},otherJob);
  s.candidatesByJob[otherJob] = [other];
  assert.equal(s.getOtherApplications(s.candidates[0]).length,1);
  s.releaseCandidate('a'); assert.equal(other.stage,'postulado');
  s.setActiveJobPosting(otherJob); assert.equal(s.candidates[0].stage,'postulado');
  assert.equal(s.candidates[0].inTopN,true);
});

test('correo editable persiste como borrador sin cambiar la decisión ni inventar un destinatario', () => {
  const s = fixture();
  assert.equal(s.candidates.find(c=>c.id==='b').email,'');
  assert.throws(()=>s.saveMessageDraft('b',{recipient:'',subject:'Hola',body:'Mensaje'}),/correo/);
  assert.throws(()=>s.saveMessageDraft('a',{recipient:'ana@example.com',cc:'inválido',subject:'Hola',body:'Mensaje'}),/copias/);
  const draft = s.saveMessageDraft('a',{recipient:'ana@example.com',cc:'equipo@example.com',subject:'Respuesta',body:'Hola <Ana>\n\nGracias.',language:'en'});
  assert.equal(draft.status,'Borrador'); assert.equal(s.candidates[0].stage,'postulado');
  const restored = new s.constructor(), c = restored.candidates.find(c=>c.id==='a');
  assert.equal(c.messageDraft.recipient,'ana@example.com'); assert.equal(c.messageDraft.cc,'equipo@example.com'); assert.equal(c.messageDraft.language,'en');
  assert.equal(c.messageDraft.body,'Hola <Ana>\n\nGracias.');
  assert.throws(()=>s.saveMessageDraft('a',{recipient:'ana@example.com',subject:'Hola',body:'Mensaje'},'other'),/convocatoria cambió/);
});

test('notas y entrevistas permanecen en la postulación y no avanzan su etapa', () => {
  const s = fixture();
  s.addCandidateActivity('a',{type:'note',details:'Revisar documentación.'});
  assert.throws(()=>s.addCandidateActivity('a',{type:'interview',title:'Entrevista',scheduledAt:'2000-01-01'}),/futura/);
  const future = new Date(Date.now()+86400000).toISOString();
  s.addCandidateActivity('a',{type:'interview',title:'Conversación inicial',scheduledAt:future,details:'Enlace pendiente'});
  const c = new s.constructor().candidates.find(c=>c.id==='a');
  assert.equal(c.stage,'postulado'); assert.equal(c.activities.length,1); assert.equal(c.activities[0].scheduledAt,future);
  assert.ok(c.audit.decisionHistory.some(e=>e.action==='Nota: Revisar documentación.'));
});

test('comparativa CSV conserva puesto, métodos y evidencia desconocida', () => {
  const s = fixture(), rows = comparisonCSVRows(s.jobPosting,s.getRankedCandidates());
  assert.equal(rows[1][0],s.activeJobPostingId); assert.equal(rows[1][5],98); assert.equal(rows[1][6],80);
  assert.ok(rows[1].includes('Sin evidencia'));
  assert.ok(serializeCSV(rows).includes(s.jobPosting.title));
});
