import test from 'node:test';
import assert from 'node:assert/strict';
import { appState } from '../js/state.js';
import { normalizeCandidate, reweightCandidate, validateWeights, isEligible } from '../js/domain.js';
import { createDemoRepository } from '../js/services/demoRepository.js';
import { ApiClient } from '../js/services/apiClient.js';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value) };
const fresh = () => { storage.clear(); return new appState.constructor(); };

test('conteos corresponden a las postulaciones de cada convocatoria', () => {
  const s = fresh();
  assert.equal(Object.values(s.candidatesByJob).flat().length, 10);
  for (const j of s.jobPostings) assert.equal(j.totalProcessed, s.candidatesByJob[j.id].length);
  const empty = s.jobPostings.find(j => !j.totalProcessed);
  s.setActiveJobPosting(empty.id);
  assert.equal(s.candidates.length, 0);
  assert.equal(s.jobPosting.avgScore, null);
});

test('Top N persiste por convocatoria y la comparación se limpia al cambiar', () => {
  const s = fresh(), first = s.activeJobPostingId;
  s.setTopN(2);
  s.toggleComparisonCandidate(s.candidates[0].id);
  s.selectCandidate(s.candidates[0].id);
  s.setActiveJobPosting(s.jobPostings[1].id);
  assert.equal(s.comparisonPool.size, 0);
  assert.equal(s.selectedRows.size, 0);
  assert.equal(s.selectedCandidateId, null);
  s.setActiveJobPosting(first);
  assert.equal(s.topN, 2);
  const restored = new s.constructor();
  restored.setActiveJobPosting(first);
  assert.equal(restored.topN, 2);
});

test('limpiar el comparador no repuebla la selección', () => {
  const s = fresh();
  assert.deepEqual(s.getComparisonCandidates(), []);
  s.toggleComparisonCandidate(s.candidates[0].id);
  s.clearComparisonPool();
  assert.deepEqual(s.getComparisonCandidates(), []);
  assert.equal(s.selectedRows.size, 0);
});

test('avance, liberación, banco e historial comparten estado persistido', () => {
  const s = fresh();
  s.setUserRole('gthc');
  const c = s.candidates.find(isEligible), initial = c.stage;
  assert.equal(s.moveCandidateStage(c.id, 'contratado'), false);
  assert.equal(c.stage, initial);
  assert.equal(s.advanceCandidate(c.id), true);
  assert.match(c.audit.decisionHistory.at(-1).user, /Equipo de GTHC/);
  assert.equal(s.releaseCandidate(c.id), true);
  assert.equal(c.stage, 'liberado');
  assert.equal(c.inTopN, false);
  assert.equal(s.releaseCandidate(c.id), false);
  s.addToTalentPool(c.id);
  assert.equal(s.talentPool.filter(t => t.candidateId === c.candidateId).length, 1);
  const restored = new s.constructor();
  assert.equal(restored.candidates.find(row => row.id === c.id).stage, 'liberado');
});

test('un único perfil GTHC concentra acciones y vistas', () => {
  const s = fresh();
  assert.deepEqual(Object.keys(s.rolesConfig), ['gthc']);
  for (const oldRole of ['director','coordinador','admin','reclutador']) s.setUserRole(oldRole);
  assert.equal(s.currentUserRole, 'gthc');
  for (const action of ['jobs','selection','talent','criteria','ingestion']) assert.equal(s.can(action), true);
  assert.equal(s.can('unknown'), false);
  for (const view of ['convocatorias','ranking','comparison','kanban','talentPool','audit','executive','effectiveness']) assert.equal(s.canView(view), true);
  assert.equal(s.canView('unknown'), false);
});

test('lotes grandes tienen IDs únicos y límites verificables', () => {
  const s = fresh(), job = s.activeJobPostingId;
  s.addDemoBatch(job, 500);
  s.addDemoBatch(job, 25);
  assert.equal(s.candidates.length, 530);
  assert.equal(s.jobPosting.totalProcessed, 530);
  assert.equal(new Set(s.candidates.map(c => c.id)).size, 530);
  assert.throws(() => s.addDemoBatch(job, 500), /1000/);
  assert.equal(new s.constructor().candidates.length, 530);
});

test('vincular talento a otro puesto crea una evaluación pendiente, sin duplicar', () => {
  const s = fresh(), source = s.candidates[0];
  s.addToTalentPool(source.id);
  const talent = s.talentPool.find(t => t.candidateId === source.candidateId);
  s.setActiveJobPosting(s.jobPostings[1].id);
  const linked = s.linkTalent(talent.id);
  assert.equal(linked.score, null);
  assert.equal(linked.knockoutMet, null);
  assert.equal(s.linkTalent(talent.id).id, linked.id);
  assert.equal(s.candidates.length, 1);
  assert.equal(s.jobPosting.totalProcessed, 1);
});

test('reponderar preserva evidencia al pasar por cero y no inventa dimensiones', () => {
  const c = normalizeCandidate({id:'x', weights:[{label:'A', maxScore:50, scoreObtained:40},{label:'B', maxScore:50, scoreObtained:30}]}, 'job');
  const original = validateWeights([{label:'A',weightPct:50},{label:'B',weightPct:50}]);
  const zero = reweightCandidate(c, validateWeights([{label:'A',weightPct:0},{label:'B',weightPct:100}]));
  assert.equal(zero.score, 60);
  assert.equal(reweightCandidate(zero, original).score, 70);
  assert.equal(reweightCandidate(c, validateWeights([{label:'Nueva',weightPct:100}])).score, null);
});

test('guardar criterios cambia scores, versión, promedio e historial', () => {
  const s = fresh(); s.setUserRole('gthc');
  const id = s.candidates[0].id, old = s.candidates[0].score;
  const weights = s.jobPosting.weights.map((w,i) => ({...w,weightPct:i===0?100:0}));
  const expected = s.simulateWeightsImpact(weights).find(c => c.id === id).simulatedScore;
  s.applyCriteria(s.activeJobPostingId, weights);
  const c = s.candidates.find(c => c.id === id);
  assert.equal(c.score, expected);
  assert.equal(c.evaluationHistory.at(-1).score, old);
  assert.equal(c.audit.criteriaVersion, s.jobPosting.criteriaVersion);
  assert.deepEqual(c.narrative.strengths, []);
  assert.equal(new s.constructor().candidates.find(c => c.id === id).score, expected);
  assert.ok(new s.constructor().candidates.find(c => c.id === id).evaluationHistory[0].weights.length > 0);
});

test('datos incompletos permanecen pendientes y snapshots inválidos se recuperan', () => {
  const c = normalizeCandidate({id:'missing',evaluationHistory:[{score:'<img>'}]},'job');
  assert.equal(c.score,null); assert.equal(c.knockoutMet,null); assert.equal(isEligible(c),false);
  assert.equal(c.evaluationHistory[0].score,null);
  assert.throws(() => normalizeCandidate({id:'x',jobPostingId:'other'},'job'));
  storage.set('talentai.demo.workspace.v2','{broken');
  assert.equal(createDemoRepository().load().jobPostings.length,18);
});

test('API conserva ranking remoto y rechaza páginas inconsistentes', async () => {
  const payload = {items:[{id:'x',jobPostingId:'job',rank:42,inTopN:false}],total:500,nextCursor:'next',snapshotId:'v1'};
  const api = new ApiClient({fetchImpl:async () => ({ok:true,json:async () => payload})});
  const page = await api.listCandidates('job');
  assert.equal(page.items[0].rank,42); assert.equal(page.items[0].demo,false);
  payload.items[0].jobPostingId='wrong';
  await assert.rejects(api.listCandidates('job'),{code:'INVALID_RESPONSE'});
  await assert.rejects(api.listCandidates('job',{limit:1000}),{code:'INVALID_REQUEST'});
});

test('API distingue rechazo de permisos, JSON inválido y cancelación', async () => {
  const forbidden = new ApiClient({fetchImpl:async () => ({ok:false,status:403})});
  await assert.rejects(forbidden.get('/jobs'),{status:403,code:'HTTP'});
  const invalid = new ApiClient({fetchImpl:async () => ({ok:true,json:async () => {throw new Error();}})});
  await assert.rejects(invalid.get('/jobs'),{code:'INVALID_RESPONSE'});
  const controller = new AbortController(); controller.abort();
  const aborted = new ApiClient({fetchImpl:async (_, {signal}) => { signal.throwIfAborted(); }});
  await assert.rejects(aborted.get('/jobs',{signal:controller.signal}),{code:'ABORTED'});
});
