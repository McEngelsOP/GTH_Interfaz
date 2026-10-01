import { appState } from './state.js';
import { escapeHTML as esc, openDialog, closeDialog, notify } from './ui.js';
import { validateWeights } from './domain.js';

export class CriteriaModalController {
  constructor(backdrop, modal) {
    this.backdrop = backdrop; this.modal = modal;
    backdrop.addEventListener('click', e => { if (e.target === backdrop) this.close(); });
    modal.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    modal.addEventListener('click', e => {
      const action = e.target.closest('[data-criteria-action]')?.dataset.criteriaAction;
      if (action === 'close') this.close();
      if (action === 'reset') { this.weights = structuredClone(this.original); this.render(); }
      if (action === 'save') this.save();
    });
    modal.addEventListener('input', e => {
      if (!e.target.matches('[data-weight]')) return;
      this.weights[Number(e.target.dataset.weight)].weightPct = Number(e.target.value);
      this.preview();
    });
    appState.subscribe(event => { if (['job_changed','role_changed'].includes(event)) this.close(); });
  }
  open() {
    if (!appState.can('criteria')) { notify('Selecciona un rol de coordinación o administración para editar criterios.', true); return; }
    this.jobId = appState.activeJobPostingId;
    this.original = structuredClone(appState.jobPosting.weights);
    this.weights = structuredClone(this.original);
    this.render(); this.backdrop.classList.add('active'); openDialog(this.backdrop,this.modal);
  }
  close() { this.backdrop.classList.remove('active'); closeDialog(this.backdrop); }
  render() {
    this.modal.innerHTML = `<header class="modal-header"><div><h3 id="criteriaModalTitle">Criterios de evaluación</h3><p>${esc(appState.jobPosting.title)}</p></div><button class="btn btn-ghost" data-criteria-action="close" aria-label="Cerrar criterios">×</button></header>
      <div class="modal-body"><p class="demo-note">Prueba cuánto importa cada criterio. Cada método calcula su puntaje por separado y se conserva el resultado anterior. Si no hay evidencia, el resultado queda pendiente.</p>
      <div class="criteria-weights-grid">${this.weights.map((w,i) => `<label class="criteria-weight-item">${esc(w.label)} <small>${esc(w.type)}</small><input class="weight-input" type="number" min="0" max="100" step="1" data-weight="${i}" value="${w.weightPct}" aria-label="Importancia de ${esc(w.label)}"></label>`).join('')}</div>
      <p id="criteriaBalance" role="status"></p><h4>Vista previa según el método elegido</h4><div id="criteriaPreview"></div></div>
      <footer class="modal-footer"><button class="btn btn-secondary" data-criteria-action="reset">Restablecer</button><button class="btn btn-ghost" data-criteria-action="close">Cancelar</button><button class="btn btn-primary" data-criteria-action="save">Guardar cambios</button></footer>`;
    this.preview();
  }
  preview() {
    const balance = this.modal.querySelector('#criteriaBalance');
    const save = this.modal.querySelector('[data-criteria-action="save"]');
    try {
      validateWeights(this.weights); balance.textContent = 'Importancia total: 100 %'; save.disabled = false;
      const results = appState.simulateWeightsImpact(this.weights).slice(0,5);
      this.modal.querySelector('#criteriaPreview').innerHTML = results.length ? results.map(c => `<div class="sim-candidate-row"><strong>${esc(c.name)}</strong><span>${c.currentScore ?? 'Pendiente'} → ${c.simulatedScore ?? 'Pendiente'}</span></div>`).join('') : '<p class="empty-copy">No hay candidatos. Se guardarán los criterios para esta convocatoria.</p>';
    } catch (e) { balance.textContent = e.message; save.disabled = true; this.modal.querySelector('#criteriaPreview').textContent = 'Ajusta los pesos para calcular la vista previa.'; }
  }
  save() {
    try { appState.applyCriteria(this.jobId,this.weights); this.close(); notify('Criterios guardados. Ranking de demostración recalculado.'); }
    catch (error) { notify(error.message,true); }
  }
}
