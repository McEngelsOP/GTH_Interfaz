import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateCandidates } from '../js/pagination.js';
import { appState } from '../js/state.js';
import { DataGridController } from '../js/dataGrid.js';

test('un lote de 523 CVs se recorre sin omisiones ni duplicados', () => {
  const candidates = Array.from({ length: 523 }, (_, index) => ({ id: `CV-${index}` }));
  for (const size of [25, 50, 100]) {
    const visited = [];
    const count = paginateCandidates(candidates, 1, size).pageCount;
    for (let page = 1; page <= count; page++) {
      const result = paginateCandidates(candidates, page, size);
      assert.ok(result.items.length <= size);
      visited.push(...result.items.map(c => c.id));
    }
    assert.deepEqual(visited, candidates.map(c => c.id));
    assert.equal(new Set(visited).size, 523);
  }
});

test('la paginación se ajusta al filtrar y maneja resultados vacíos', () => {
  const filtered = [{ id: 'only' }];
  assert.equal(paginateCandidates(filtered, 20).page, 1);
  assert.deepEqual(paginateCandidates([], 9), { items: [], page: 1, pageSize: 25, pageCount: 1, total: 0, first: 0, last: 0 });
  assert.equal(paginateCandidates(filtered, -4, 800).pageSize, 25);
});

test('ordenar por nombre o puntaje ascendente no altera ranking ni Top-N', () => {
  const state = new appState.constructor();
  state.topN = 2;
  state.candidates = [
    { id: 'c', name: 'Zoe', score: 98 },
    { id: 'b', name: 'Beto', score: 87 },
    { id: 'a', name: 'Ana', score: 72 }
  ];
  state.updateTopNFlags();
  state.toggleSort('name');
  assert.deepEqual(state.candidates.map(c => c.name), ['Ana', 'Beto', 'Zoe']);
  assert.deepEqual(state.getRankedCandidates().map(c => [c.id, c.rank, c.inTopN]), [['c', 1, true], ['b', 2, true], ['a', 3, false]]);
  state.toggleSort('score');
  state.toggleSort('score');
  assert.equal(state.candidates[0].score, 72);
  assert.equal(state.getRankedCandidates()[0].id, 'c');
  state.comparisonPool = new Set(['a', 'c']);
  assert.deepEqual(state.getComparisonCandidates().map(c => c.id), ['c', 'a']);
});

test('seleccionar y deseleccionar una página no modifica otra página', () => {
  const state = new appState.constructor();
  state.candidates = Array.from({ length: 70 }, (_, index) => ({ id: `c-${index}` }));
  const first = paginateCandidates(state.candidates, 1).items;
  const second = paginateCandidates(state.candidates, 2).items;
  state.toggleSelectAll(true, first);
  assert.equal(state.selectedRows.size, 25);
  state.toggleSelectAll(true, second);
  assert.equal(state.selectedRows.size, 50);
  state.toggleSelectAll(false, first);
  assert.deepEqual([...state.selectedRows], second.map(c => c.id));
});

test('el controlador limita el DOM a la página y busca en todo el lote', () => {
  const seed = appState.candidates[0];
  appState.candidates = Array.from({ length: 523 }, (_, index) => ({
    ...structuredClone(seed), id: `TEST-${index}`, name: `Perfil ${index + 1}`
  }));
  appState.updateTopNFlags();
  const grid = Object.create(DataGridController.prototype);
  grid.tableBody = { innerHTML: '', querySelectorAll: () => [] };
  grid.resultCount = { textContent: '' };
  grid.selectAllCheckbox = {};
  grid.updatePagination = () => {};
  grid.page = 1;
  grid.pageSize = 25;
  grid.render();
  assert.equal((grid.tableBody.innerHTML.match(/class="candidate-row /g) || []).length, 25);
  assert.match(grid.resultCount.textContent, /1–25 de 523/);
  grid.changePage(21);
  assert.equal(grid.visibleCandidates.length, 23);
  assert.match(grid.resultCount.textContent, /501–523/);
  appState.setSearchQuery('Perfil 523');
  grid.render();
  assert.equal(grid.page, 1);
  assert.equal(grid.visibleCandidates[0].name, 'Perfil 523');
  appState.setSearchQuery('inexistente');
  grid.render();
  assert.equal(grid.selectAllCheckbox.disabled, true);
  assert.match(grid.tableBody.innerHTML, /No se encontraron candidatos/);
});
