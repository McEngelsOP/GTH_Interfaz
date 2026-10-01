import test from 'node:test';
import assert from 'node:assert/strict';
import { getVirtualWindow, paginateCandidates } from '../js/pagination.js';
import { appState } from '../js/state.js';
import { DataGridController } from '../js/dataGrid.js';
import { DrawerController } from '../js/drawer.js';

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

test('la ventana virtual cubre el lote y monta solo filas cercanas al viewport', () => {
  const total = 523;
  const rowHeight = 52;
  const viewportHeight = 470;
  const headerHeight = 40;
  const visited = new Set();

  for (let scrollTop = 0; scrollTop <= total * rowHeight; scrollTop += viewportHeight - headerHeight) {
    const window = getVirtualWindow(total, scrollTop, viewportHeight, rowHeight, 5, headerHeight);
    assert.ok(window.end - window.start < 24);
    for (let row = window.start; row < window.end; row++) visited.add(row);
  }

  assert.equal(visited.size, total);
  assert.deepEqual(getVirtualWindow(0, 0, viewportHeight, rowHeight), { start: 0, end: 0 });
});

test('la altura de fila cambia entre densidad compacta y cómoda', () => {
  const grid = Object.create(DataGridController.prototype);
  grid.density = 'compact';
  grid.pageCandidates = [];
  grid.tableBody = { innerHTML: '' };
  grid.scrollRegion = null;
  const previousDocument = globalThis.document;
  const view = { dataset: {} };
  globalThis.document = { getElementById: id => id === 'viewContainer_ranking' ? view : null, querySelectorAll: () => [] };

  try {
    assert.equal(grid.getRowHeight(), 52);
    grid.setDensity('comfortable');
    assert.equal(grid.getRowHeight(), 66);
    assert.equal(view.dataset.density, 'comfortable');
    grid.setDensity('compact');
    assert.equal(grid.getRowHeight(), 52);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('el expediente detalla estado y evidencia de cada requisito obligatorio', () => {
  const drawer = Object.create(DrawerController.prototype);
  drawer.paneExplain = { innerHTML: '' };
  drawer.renderExplainPane({
    narrative: { selectionReason: 'Afinidad con la convocatoria.', strengths: [] },
    transferablePotential: false,
    mandatoryReqs: [
      { name: 'Experiencia profesional', status: 'green', tooltipTitle: 'Años comprobados', tooltipReason: '7 años en el área.' },
      { name: 'Certificación requerida', status: 'amber', tooltipTitle: 'Validación parcial', tooltipReason: 'Acreditación pendiente.' }
    ]
  });
  assert.match(drawer.paneExplain.innerHTML, /1\/2 cumplen/);
  assert.match(drawer.paneExplain.innerHTML, /7 años en el área\./);
  assert.match(drawer.paneExplain.innerHTML, /Acreditación pendiente\./);
  assert.match(drawer.paneExplain.innerHTML, /requirement-status-label amber/);
});

test('ordenar por nombre o puntaje ascendente no altera ranking ni Top-N', () => {
  const state = new appState.constructor();
  state.topN = 2;
  state.candidates = [
    { id: 'c', name: 'Zoe', score: 98, mlScore: 98, llmScore: 75, knockoutMet: true },
    { id: 'b', name: 'Beto', score: 87, mlScore: 87, llmScore: 90, knockoutMet: true },
    { id: 'a', name: 'Ana', score: 72, mlScore: 72, llmScore: 95, knockoutMet: true }
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

test('el controlador virtualiza las filas, busca en todo el lote y pagina', () => {
  const seed = appState.candidates[0];
  appState.candidates = Array.from({ length: 523 }, (_, index) => ({
    ...structuredClone(seed), id: `TEST-${index}`, name: `Perfil ${index + 1}`
  }));
  appState.updateTopNFlags();
  const grid = Object.create(DataGridController.prototype);
  grid.tableBody = { innerHTML: '', querySelectorAll: () => [] };
  grid.resultCount = { textContent: '' };
  grid.selectAllCheckbox = {};
  grid.scrollRegion = {
    scrollTop: 0,
    clientHeight: 420,
    querySelector: () => ({ getBoundingClientRect: () => ({ height: 40 }) })
  };
  grid.density = 'compact';
  grid.overscan = 6;
  grid.updatePagination = () => {};
  grid.page = 1;
  grid.pageSize = 25;
  grid.render();
  const firstPageRows = (grid.tableBody.innerHTML.match(/class="candidate-row /g) || []).length;
  assert.ok(firstPageRows > 0 && firstPageRows < 25);
  assert.match(grid.tableBody.innerHTML, /class="candidate-line"/);
  assert.match(grid.tableBody.innerHTML, /class="stage-pill stage-/);
  assert.doesNotMatch(grid.tableBody.innerHTML, /class="gap-indicator|data-action="star"/);
  assert.match(grid.tableBody.innerHTML, /Puntaje según Machine Learning/);
  assert.match(grid.tableBody.innerHTML, /Puntaje según LLM/);
  assert.match(grid.tableBody.innerHTML, /class="candidate-meta-icons"/);
  const firstRow = grid.tableBody.innerHTML.match(/<tr class="candidate-row[\s\S]*?<\/tr>/)?.[0] || '';
  assert.equal((firstRow.match(/class="capsule-pill /g) || []).length, 5);
  assert.match(firstRow, /aria-rowindex="2"/);
  assert.doesNotMatch(firstRow, /gap-short-title|requirements-count|Transferible/);
  assert.match(grid.resultCount.textContent, /1–25 de 523/);
  grid.changePage(21);
  assert.equal(grid.visibleCandidates.length, 23);
  assert.ok((grid.tableBody.innerHTML.match(/class="candidate-row /g) || []).length < 23);
  assert.match(grid.resultCount.textContent, /501–523/);

  grid.pageSize = 100;
  grid.changePage(1);
  assert.equal(grid.visibleCandidates.length, 100);
  assert.ok((grid.tableBody.innerHTML.match(/class="candidate-row /g) || []).length < 25);
  grid.scrollRegion.scrollTop = 80 * grid.getRowHeight() + 40;
  grid.renderVisibleRows();
  assert.match(grid.tableBody.innerHTML, /data-id="TEST-80"/);

  appState.setSearchQuery('Perfil 523');
  grid.render();
  assert.equal(grid.page, 1);
  assert.equal(grid.visibleCandidates[0].name, 'Perfil 523');
  appState.setSearchQuery('inexistente');
  grid.render();
  assert.equal(grid.selectAllCheckbox.disabled, true);
  assert.match(grid.tableBody.innerHTML, /No se encontraron candidatos/);
});
