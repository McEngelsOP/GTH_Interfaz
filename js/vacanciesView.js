import { appState } from './state.js';
import { escapeHTML as esc } from './ui.js';

export class VacanciesViewController {
  constructor(container, { onNewJob, onOpenJob }) {
    this.container = container;
    this.onNewJob = onNewJob;
    this.onOpenJob = onOpenJob;
    this.query = '';
    this.category = 'all';
    appState.subscribe(event => {
      if (['jobs_changed', 'job_changed','role_changed','candidate_stage_changed'].includes(event) && appState.currentView === 'convocatorias') this.render();
    });
  }

  render() {
    if (!this.container) return;
    const jobs = appState.jobPostings;
    const active = jobs.filter(j => j.status !== 'Borrador').length;
    const drafts = jobs.length - active;
    const processed = jobs.reduce((sum, j) => sum + (Number(j.totalProcessed) || 0), 0);
    const matching = jobs.filter(j => (appState.candidatesByJob[j.id] || []).some(c => ['preseleccionado','entrevista','evaluacion'].includes(c.stage))).length;
    this.container.innerHTML = `
      <div class="vacancies-stats" aria-label="Resumen de convocatorias de demostración">
        <div class="vacancy-stat"><span class="stat-kicker">Convocatorias activas</span><strong>${active}</strong><small>Procesos abiertos</small></div>
        <div class="vacancy-stat"><span class="stat-kicker">CVs registrados</span><strong>${new Intl.NumberFormat('es-PE').format(processed)}</strong><small>Datos de ejemplo</small></div>
        <div class="vacancy-stat"><span class="stat-kicker">En evaluación</span><strong>${matching}</strong><small>Matching y preselección</small></div>
        <div class="vacancy-stat"><span class="stat-kicker">Borradores</span><strong>${drafts}</strong><small>Listos para configurar</small></div>
      </div>
      <div class="vacancies-section-heading">
        <div><span class="section-kicker">CENTRO DE CONVOCATORIAS</span><h2>Procesos de selección</h2><p>Selecciona una convocatoria para revisar sus candidatos y su avance.</p></div>
        <span class="vacancies-total">${jobs.length} procesos</span>
      </div>
      <div class="vacancies-toolbar">
        <label class="vacancies-search-label"><span class="sr-only">Buscar convocatoria</span><input type="search" id="vacanciesSearch" placeholder="Buscar puesto, código o área…" value="${esc(this.query)}" autocomplete="off"></label>
        <label class="vacancies-filter-label"><span class="sr-only">Filtrar por categoría</span><select id="vacanciesCategory"><option value="all">Todas las áreas</option><option value="docente">Docente</option><option value="administrativo">Administrativo</option><option value="operativo">Operativo</option><option value="directivo">Directivo</option></select></label>
      </div>
      <div class="vacancies-grid" id="vacanciesGrid">
        ${jobs.map(j => `
          <article class="vacancy-card ${j.id === appState.activeJobPostingId ? 'is-current' : ''}" data-role="${esc(j.roleType)}" data-search="${esc(`${j.title} ${j.id} ${j.department}`.toLowerCase())}">
            <div class="vacancy-card-top"><span class="vacancy-type type-${esc(j.roleType)}">${esc(j.categoryGroup)}</span><span class="vacancy-status ${j.status === 'Borrador' ? 'is-draft' : ''}"><span></span>${j.status === 'Borrador' ? 'Borrador' : 'Activa'}</span></div>
            <span class="vacancy-code">${esc(j.id)} ${j.demo ? '· Demo' : ''}</span>
            <h3>${esc(j.title)}</h3>
            <p class="vacancy-department">${esc(j.department)}</p>
            <div class="vacancy-meta"><span>${esc(j.period)}</span><span>${Number(j.vacancies) || 1} ${Number(j.vacancies) === 1 ? 'plaza' : 'plazas'}</span></div>
            <div class="vacancy-progress"><span>Etapa actual</span><strong>${esc(j.phase)}</strong></div>
            <div class="vacancy-card-footer"><span><strong>${Number(j.totalProcessed) || 0}</strong> CVs en demo</span><button type="button" data-action="${j.status === 'Borrador' ? 'activate' : 'open'}" data-job="${esc(j.id)}">${j.status === 'Borrador' ? 'Activar' : 'Ver evaluación'} →</button></div>
          </article>`).join('')}
      </div>
      <div class="vacancies-empty" id="vacanciesEmpty" hidden>No se encontraron convocatorias con esos filtros.</div>
      <p class="vacancies-disclaimer">Los indicadores y perfiles existentes son datos de demostración. Las nuevas convocatorias se guardan únicamente en este navegador.</p>
    `;
    this.container.querySelector('#vacanciesCategory').value = this.category;
    this.container.querySelector('#vacanciesSearch').addEventListener('input', e => { this.query = e.target.value; this.filter(); });
    this.container.querySelector('#vacanciesCategory').addEventListener('change', e => { this.category = e.target.value; this.filter(); });
    this.container.addEventListener('click', this.handleClick ??= e => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'new') return this.onNewJob();
      const jobId = button.dataset.job;
      if (button.dataset.action === 'activate') appState.activateJobPosting(jobId);
      if (jobId) this.onOpenJob(jobId);
    });
    this.filter();
  }

  filter() {
    const query = this.query.trim().toLowerCase();
    let visible = 0;
    this.container.querySelectorAll('.vacancy-card').forEach(card => {
      const show = (this.category === 'all' || card.dataset.role === this.category) && card.dataset.search.includes(query);
      card.hidden = !show;
      if (show) visible++;
    });
    this.container.querySelector('#vacanciesEmpty').hidden = visible > 0;
  }
}
