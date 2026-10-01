import { appState } from './state.js';
import { escapeHTML } from './ui.js';

export class AuditViewController {
  constructor(container) {
    this.container = container;
    this.candidateId = 'all';
    appState.subscribe(event => {
      if (event === 'job_changed') this.candidateId = 'all';
      if (['view_changed', 'job_changed', 'decision_recorded', 'candidate_stage_changed', 'criteria_updated', 'candidates_updated'].includes(event)
          && appState.currentView === 'audit') this.render();
    });
  }

  render() {
    const candidates = appState.candidates.filter(candidate => this.candidateId === 'all' || candidate.id === this.candidateId);
    const rows = candidates.flatMap(candidate => (candidate.audit?.decisionHistory || []).map(entry => ({ candidate, entry })));
    this.container.innerHTML = `
      <header class="process-view-heading">
        <h2>Historial de decisiones</h2>
        <p>Historial de acciones y responsables de ${escapeHTML(appState.jobPosting.title)}.</p>
      </header>
      <div class="audit-view-toolbar">
        <label for="auditCandidateFilter">Candidato</label>
        <select id="auditCandidateFilter" class="filter-select">
          <option value="all">Todos los candidatos</option>
          ${appState.candidates.map(candidate => `<option value="${escapeHTML(candidate.id)}" ${candidate.id === this.candidateId ? 'selected' : ''}>${escapeHTML(candidate.name)}</option>`).join('')}
        </select>
        <span>${rows.length} registros</span>
      </div>
      <div class="table-card"><div class="table-responsive">
        <table class="candidate-table process-table">
          <thead><tr><th>Candidato</th><th>Fecha / hora registrada</th><th>Responsable</th><th>Acción registrada</th><th>Puntaje actual</th><th>Detalle</th></tr></thead>
          <tbody>${rows.length ? rows.map(({ candidate, entry }) => `
            <tr>
              <td><strong>${escapeHTML(candidate.name)}</strong><small>${escapeHTML(candidate.audit?.batchId)}</small></td>
              <td>${escapeHTML(entry.time)}</td>
              <td>${escapeHTML(entry.user)}</td>
              <td>${escapeHTML(entry.action)}</td>
              <td>ML ${candidate.mlScore ?? 'Pendiente'} · LLM ${candidate.llmScore ?? 'Pendiente'}<small>Criterios ${escapeHTML(candidate.audit?.criteriaVersion)}</small></td>
              <td><button class="btn btn-secondary btn-sm" data-audit-candidate="${escapeHTML(candidate.id)}">Ver expediente</button></td>
            </tr>`).join('') : '<tr><td colspan="6">Todavía no hay decisiones registradas para esta selección.</td></tr>'}</tbody>
        </table>
      </div></div>`;
    this.container.querySelector('#auditCandidateFilter').addEventListener('change', event => {
      this.candidateId = event.target.value;
      this.render();
    });
    this.container.querySelectorAll('[data-audit-candidate]').forEach(button => {
      button.addEventListener('click', () => {
        appState.setActiveDrawerTab('audit');
        appState.selectCandidate(button.dataset.auditCandidate);
      });
    });
  }
}
