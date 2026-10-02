import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appState } from '../js/state.js';
import { escapeHTML } from '../js/ui.js';

const saved = new Map();
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value)
};

test('la aplicación empieza en una vista existente y expone roles coherentes', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(appState.currentView, 'convocatorias');
  assert.match(html, /id="viewContainer_convocatorias"/);
  for (const role of Object.values(appState.rolesConfig)) {
    assert.ok(role.stages.includes('convocatorias'));
    assert.ok(role.userName && role.initials && role.userRole);
  }
});

test('crear una convocatoria de demostración la selecciona y no inventa candidatos', () => {
  const startCount = appState.jobPostings.length;
  const weights = [{ label: 'Experiencia', weightPct: 60, type: 'ML' }, { label: 'Afinidad', weightPct: 40, type: 'LLM' }];
  const job = appState.createJobPosting({ title: '  Analista de selección  ', department: '  GTHC  ', roleType: 'administrativo', vacancies: 2, weights, activate: true, openDate: '2026-09-23', closeDate: '2026-10-20' });
  assert.equal(appState.jobPostings.length, startCount + 1);
  assert.equal(job.title, 'Analista de selección');
  assert.equal(job.status, 'Convocatoria Abierta');
  assert.equal(appState.activeJobPostingId, job.id);
  assert.deepEqual(appState.candidates, []);
  assert.deepEqual(appState.candidatesByJob[job.id], []);
  assert.equal(JSON.parse(saved.get('talentai.demo.jobs.v1')).length, 1);
});

test('las convocatorias guardadas se recuperan y un borrador puede activarse', () => {
  const job = appState.createJobPosting({ title: 'Coordinación docente', department: 'Pregrado', roleType: 'docente', vacancies: 1, weights: [{ label: 'Competencias', weightPct: 100, type: 'ML' }], activate: false });
  assert.equal(job.status, 'Borrador');
  assert.equal(appState.activateJobPosting(job.id), true);
  assert.equal(appState.jobPosting.status, 'Convocatoria Abierta');
  const reloaded = new appState.constructor();
  assert.ok(reloaded.jobPostings.some(j => j.id === job.id && j.status === 'Convocatoria Abierta'));
  reloaded.setActiveJobPosting(job.id);
  assert.deepEqual(reloaded.candidates, []);
});

test('rechaza pesos incorrectos, fechas inversas y campos vacíos', () => {
  const base = { title: 'Analista', department: 'TI', roleType: 'administrativo', vacancies: 1, weights: [{ label: 'Experiencia', weightPct: 100 }] };
  assert.throws(() => appState.createJobPosting({ ...base, title: ' ' }), /Completa/);
  assert.throws(() => appState.createJobPosting({ ...base, weights: [{ label: 'Experiencia', weightPct: 90 }] }), /sumar 100/);
  assert.throws(() => appState.createJobPosting({ ...base, openDate: '2026-10-20', closeDate: '2026-09-23' }), /posterior/);
});

test('el texto introducido por personas se escapa antes de insertarlo en HTML', () => {
  assert.equal(escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
