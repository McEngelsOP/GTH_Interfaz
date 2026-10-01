import { appState } from './state.js';
import { MODEL_LABELS } from './domain.js';
import { escapeHTML as esc, openDialog, closeDialog, notify } from './ui.js';
import { icon } from './icons.js';

const advanceText = 'Hola {nombre}, tu postulación para {puesto} avanza a la siguiente etapa. Pronto te compartiremos los próximos pasos. ¡Gracias por tu interés!';
const declineText = 'Hola {nombre}, gracias por postular a {puesto}. En esta ocasión tu postulación no continuará en este proceso. Agradecemos tu tiempo y tu interés.';

export class SelectionFlowController {
  constructor(mount) {
    this.mount = mount;
    document.getElementById('selectTopNBtn').addEventListener('click',()=>{
      const chosen = appState.selectTopN();
      notify(chosen.length ? `${chosen.length} perfiles seleccionados. Revisa la lista y decide quiénes avanzan.` : 'Todavía no hay perfiles con requisitos y puntaje verificados.',!chosen.length);
    });
    document.getElementById('clearSelectionBtn').addEventListener('click',()=>appState.clearComparisonPool());
    document.getElementById('compareSelectedBtn').addEventListener('click',()=>appState.setCurrentView('comparison'));
    document.getElementById('advanceSelectedBtn').addEventListener('click',()=>this.open());
    document.getElementById('viewSelectedBtn').addEventListener('click',()=>{
      appState.setFilterStatus(appState.filterStatus === 'selected' ? 'active' : 'selected');
      document.getElementById('filterStatusSelect').value = appState.filterStatus;
    });
    mount.addEventListener('click',e=>{
      const action = e.target.closest('[data-decision]')?.dataset.decision;
      if (e.target === mount || action === 'close') this.close();
      if (action === 'confirm') this.confirm();
    });
    mount.addEventListener('keydown',e=>{ if(e.key==='Escape')this.close(); });
    mount.addEventListener('input',()=>this.updatePreview());
    appState.subscribe(event=>{
      if(['job_changed','ranking_model_changed'].includes(event))this.close();
      if(['selection_changed','comparison_pool_changed','topN_changed','candidate_stage_changed','job_changed','candidates_updated','ranking_model_changed','filter_changed'].includes(event))this.updateControls();
    });
    this.updateControls();
  }
  updateControls() {
    const preview = appState.getDecisionPreview(), total = preview.selected.length;
    const ready = appState.candidates.filter(c=>c.inTopN).length;
    document.getElementById('selectionSummary').textContent = total ? `${total} perfiles marcados para revisar${preview.blocked.length ? ` · ${preview.blocked.length} ya avanzaron o requieren verificación` : ''}` : 'Marcar perfiles no cambia su etapa. Revisa y confirma quién avanza.';
    document.querySelector('.selection-action-row').classList.toggle('has-selection', total > 0);
    document.getElementById('topNAvailable').textContent = `${ready} perfiles pendientes de decisión · según ${MODEL_LABELS[appState.rankingModel]}`;
    document.getElementById('selectTopNBtn').disabled = !ready;
    document.getElementById('topNDecrementBtn').disabled = appState.topN <= 1;
    document.getElementById('clearSelectionBtn').disabled = !total;
    document.getElementById('compareSelectedBtn').disabled = total < 2;
    document.getElementById('advanceSelectedBtn').disabled = !total || !!preview.blocked.length;
    document.getElementById('viewSelectedBtn').disabled = !total;
    document.getElementById('viewSelectedBtn').innerHTML = `${icon('users')}${appState.filterStatus === 'selected' ? 'Ver en proceso' : 'Ver marcados'}`;
  }
  open() {
    const preview = appState.getDecisionPreview();
    if (!preview.selected.length || preview.blocked.length) return;
    this.jobId = appState.activeJobPostingId;
    this.mount.innerHTML = `<section class="decision-dialog" role="dialog" aria-modal="true" aria-labelledby="decisionTitle"><header class="modal-header"><div><span class="section-kicker">REVISIÓN FINAL</span><h2 id="decisionTitle">Pasar a seleccionados</h2><p>${esc(appState.jobPosting.title)}</p></div><button class="btn btn-ghost" data-decision="close" aria-label="Cerrar revisión">×</button></header><div class="modal-body">
      <div class="decision-counts"><div><strong>${preview.selected.length}</strong><span>Avanzan</span></div><div><strong>${preview.declined.length}</strong><span>Otros perfiles evaluados</span></div><div><strong>${preview.pending.length}</strong><span>Siguen pendientes</span></div></div>
      <details class="decision-list" open><summary>Perfiles que elegiste</summary><ul>${preview.selected.map(c=>`<li>${esc(c.name)} <span>ML ${c.mlScore ?? '—'} · LLM ${c.llmScore ?? '—'}</span></li>`).join('')}</ul></details>
      <label class="decision-check"><input type="checkbox" id="declineOthers"> Marcar que los otros ${preview.declined.length} perfiles evaluados no avanzan y preparar su mensaje.</label>
      <p class="helper-copy">Quienes avanzan pasan a Preseleccionado y dejan la lista de mejores pendientes. Siguen disponibles en En proceso y Avance de candidatos. Los perfiles con información pendiente conservan su estado.</p>
      <label class="wizard-field">Mensaje para quienes avanzan<textarea id="advanceMessage" rows="3">${esc(advanceText)}</textarea></label>
      <label class="wizard-field" id="declineMessageField" hidden>Mensaje para quienes no avanzan<textarea id="declineMessage" rows="3">${esc(declineText)}</textarea></label>
      <p class="helper-copy">Usa {nombre} y {puesto}; se completan para cada persona.</p><div id="decisionMessagePreview" class="message-preview" aria-live="polite"></div>
      <p class="demo-note">Los mensajes se guardarán como borradores. El envío estará disponible al conectar el servicio de mensajes.</p></div><footer class="modal-footer"><button class="btn btn-secondary" data-decision="close">Seguir revisando</button><button class="btn btn-primary" data-decision="confirm">Confirmar selección y preparar mensajes</button></footer></section>`;
    this.mount.classList.add('active');
    openDialog(this.mount,this.mount.querySelector('.decision-dialog'));
    this.updatePreview();
  }
  updatePreview() {
    if (!this.mount.classList.contains('active')) return;
    const reject = this.mount.querySelector('#declineOthers').checked;
    this.mount.querySelector('#declineMessageField').hidden = !reject;
    const preview = appState.getDecisionPreview(), c = preview.selected[0];
    const body = this.mount.querySelector('#advanceMessage').value.replaceAll('{nombre}',c.name).replaceAll('{puesto}',appState.jobPosting.title);
    const other = preview.declined[0];
    const decline = reject && other ? this.mount.querySelector('#declineMessage').value.replaceAll('{nombre}',other.name).replaceAll('{puesto}',appState.jobPosting.title) : null;
    this.mount.querySelector('#decisionMessagePreview').innerHTML = `<strong>Así verá el mensaje ${esc(c.name)}</strong><p>${esc(body)}</p>${decline ? `<strong>Ejemplo para ${esc(other.name)}</strong><p>${esc(decline)}</p>` : ''}`;
    this.mount.querySelector('[data-decision="confirm"]').disabled = !body.trim() || (reject && !this.mount.querySelector('#declineMessage').value.trim());
  }
  confirm() {
    try {
      const result = appState.confirmSelection({ jobId:this.jobId, declineOthers:this.mount.querySelector('#declineOthers').checked, advanceMessage:this.mount.querySelector('#advanceMessage').value, declineMessage:this.mount.querySelector('#declineMessage').value });
      this.close();
      appState.setCurrentView('kanban');
      notify(`${result.advanced} perfiles seleccionados${result.declined ? ` · ${result.declined} no avanzan` : ''}. Mensajes guardados como borradores.`);
    } catch(error) { notify(error.message,true); }
  }
  close() { this.mount.classList.remove('active'); closeDialog(this.mount); this.mount.innerHTML=''; }
}
