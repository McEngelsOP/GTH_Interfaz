import test from 'node:test';
import assert from 'node:assert/strict';
import { appState } from '../js/state.js';
import { normalizeCandidate } from '../js/domain.js';
import { DataGridController } from '../js/dataGrid.js';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const fixture = () => {
  storage.clear();
  const state = new appState.constructor();
  const jobId = state.activeJobPostingId;
  state.candidates = [
    { id: 'ana', name: 'Ana', mlScore: 98, llmScore: 80 },
    { id: 'beto', name: 'Beto', mlScore: 90, llmScore: 95 },
    { id: 'caro', name: 'Caro', mlScore: 82, llmScore: 85 }
  ].map(c => normalizeCandidate({ ...c, stage: 'postulado', knockoutMet: true }, jobId));
  state.candidatesByJob[jobId] = state.candidates;
  state.setTopN(2);
  state.refreshJobMetrics(jobId);
  return state;
};

test('liberar retira del ranking activo, limpia la selección y repone el Top-N', () => {
  const state = fixture();
  state.selectTopN();
  assert.equal(state.releaseCandidate('ana'), true);
  assert.deepEqual(state.getFilteredCandidates().map(c => c.id), ['beto', 'caro']);
  assert.deepEqual(state.candidates.map(c => [c.id, c.rank, c.inTopN]), [['ana', null, false], ['beto', 1, true], ['caro', 2, true]]);
  assert.deepEqual([...state.selectedRows], ['beto']);
  assert.deepEqual(state.getComparisonCandidates().map(c => c.id), ['beto']);
  assert.equal(state.jobPosting.activeCandidates, 2);
  assert.equal(state.jobPosting.avgScore, 86);
  assert.deepEqual(state.getRankingCounts(), { active: 2, topN: 2, selected: 1, released: 1, all: 3 });
  assert.deepEqual(state.selectTopN().map(c => c.id), ['beto', 'caro']);
});

test('la pestaña No continúan y el banco conservan el perfil después de recargar', () => {
  const state = fixture();
  state.releaseCandidate('ana');
  for (const status of ['active', 'outsideTopN', 'pending', 'topN', 'selected', 'transferable']) {
    state.setFilterStatus(status);
    assert.ok(state.getFilteredCandidates().every(c => c.id !== 'ana'));
  }
  state.setFilterStatus('released');
  assert.deepEqual(state.getFilteredCandidates().map(c => c.id), ['ana']);
  state.setFilterStatus('all');
  assert.equal(state.getFilteredCandidates().length, 3);
  const restored = new state.constructor();
  assert.equal(restored.filterStatus, 'active');
  assert.equal(restored.candidates.find(c => c.id === 'ana').rank, null);
  assert.ok(restored.getFilteredCandidates().every(c => c.id !== 'ana'));
  assert.equal(restored.talentPool.filter(c => c.candidateId === 'ana').length, 1);
  assert.equal(restored.releaseCandidate('ana'), false);
});

test('las vistas reciben conteos y posiciones actualizados al liberar', () => {
  const state = fixture(), observed = [];
  state.subscribe(event => {
    if (event === 'candidate_stage_changed' || event === 'jobs_changed') {
      observed.push({ event, rows: state.getFilteredCandidates().map(c => c.id), active: state.jobPosting.activeCandidates, nextRank: state.candidates.find(c => c.id === 'beto').rank });
    }
  });
  state.releaseCandidate('ana');
  assert.deepEqual(observed.map(x => x.event), ['candidate_stage_changed', 'jobs_changed']);
  assert.ok(observed.every(x => x.active === 2 && x.nextRank === 1 && !x.rows.includes('ana')));
  const otherJob = state.jobPostings[1].id;
  state.setActiveJobPosting(otherJob);
  state.setActiveJobPosting(state.jobPostings[0].id);
  assert.equal(state.filterStatus, 'active');
  assert.equal(state.getFilteredCandidates().length, 2);
});

test('liberar con LLM recalcula solo el ranking y el promedio de ese método', () => {
  const state = fixture();
  state.setRankingModel('llm');
  state.releaseCandidate('beto');
  assert.deepEqual(state.selectTopN().map(c => c.id), ['caro', 'ana']);
  assert.equal(state.candidates.find(c => c.id === 'caro').rank, 1);
  assert.equal(state.jobPosting.avgScore, 82.5);
  assert.equal(state.candidates.find(c => c.id === 'ana').mlScore, 98);
  assert.equal(state.candidates.find(c => c.id === 'ana').llmScore, 80);
});

test('la tabla no asigna posición ni acción de avance a un perfil liberado', () => {
  const state = fixture();
  state.releaseCandidate('ana');
  const grid = Object.create(DataGridController.prototype);
  grid.pageFirst = 1;
  const row = grid.renderCandidateRow(state.candidates.find(c => c.id === 'ana'));
  assert.match(row, /Fuera del ranking activo/);
  assert.match(row, /No continúa/);
  assert.doesNotMatch(row, /#null|Top null|Top 1/);
  assert.match(row, /data-action="advance"[^>]*disabled/);
  assert.equal((row.match(/<td /g) || []).length, 7);
});

test('liberar todos deja el ranking vacío sin borrar los perfiles ni inventar un promedio', () => {
  const state = fixture();
  state.selectTopN();
  for (const candidate of state.candidates) state.releaseCandidate(candidate.id);
  assert.deepEqual(state.getFilteredCandidates(), []);
  assert.deepEqual(state.selectTopN(), []);
  assert.equal(state.jobPosting.activeCandidates, 0);
  assert.equal(state.jobPosting.avgScore, null);
  assert.equal(state.jobPosting.totalProcessed, 3);
  assert.equal(state.selectedRows.size, 0);
  assert.deepEqual(state.simulateWeightsImpact(state.jobPosting.weights), []);
  state.setFilterStatus('released');
  assert.equal(state.getFilteredCandidates().length, 3);
});
