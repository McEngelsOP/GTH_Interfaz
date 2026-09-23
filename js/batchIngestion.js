import { appState } from './state.js';
import { escapeHTML as esc, openDialog, closeDialog, notify } from './ui.js';

export class BatchIngestionController {
  constructor(backdrop,modal) {
    this.backdrop = backdrop; this.modal = modal; this.running = false;
    backdrop.addEventListener('click',e=>{ if(e.target === backdrop) this.close(); });
    modal.addEventListener('keydown',e=>{ if(e.key === 'Escape') this.close(); });
    modal.addEventListener('click',e=>{
      const action = e.target.closest('[data-batch]')?.dataset.batch;
      if(action === 'close') this.close();
      if(action === 'start') this.start();
      if(action === 'cancel') this.cancel();
    });
    appState.subscribe(event=>{ if(['job_changed','role_changed'].includes(event)) { this.cancel(); this.close(); } });
  }
  open() {
    if(!appState.can('ingestion')) { notify('Este rol tiene acceso de consulta.',true); return; }
    this.jobId = appState.activeJobPostingId;
    this.modal.innerHTML = `<header class="modal-header"><div><h3 id="ingestionModalTitle">Carga y procesamiento · Demo</h3><p>${esc(appState.jobPosting.title)}</p></div><button class="btn btn-ghost" data-batch="close" aria-label="Cerrar carga">×</button></header>
      <div class="modal-body"><p class="demo-note">Prueba el flujo con perfiles ficticios. La recepción de archivos reales y el OCR se conectarán posteriormente.</p>
      <label class="wizard-field">Tamaño del lote de ejemplo<select id="demoBatchSize"><option value="25">25 perfiles</option><option value="100">100 perfiles</option><option value="500">500 perfiles</option></select></label>
      <ol class="batch-steps"><li>Preparar perfiles ficticios</li><li>Simular extracción y evaluación</li><li>Incorporar el lote al ranking</li></ol>
      <progress id="demoBatchProgress" max="3" value="0" aria-label="Progreso del lote"></progress><p id="demoBatchStatus" role="status">Listo para iniciar. Máximo: 1000 perfiles por convocatoria.</p></div>
      <footer class="modal-footer"><button class="btn btn-secondary" data-batch="cancel" disabled>Cancelar proceso</button><button class="btn btn-primary" data-batch="start">Generar lote ficticio</button></footer>`;
    this.backdrop.classList.add('active'); openDialog(this.backdrop,this.modal);
  }
  start() {
    if(this.running) return;
    const count = Number(this.modal.querySelector('#demoBatchSize').value), jobId = this.jobId;
    this.running = true; this.step = 0;
    this.modal.querySelector('[data-batch="start"]').disabled = true;
    this.modal.querySelector('[data-batch="cancel"]').disabled = false;
    const tick = () => {
      if(!this.running) return;
      this.step++;
      this.modal.querySelector('#demoBatchProgress').value = this.step;
      this.modal.querySelector('#demoBatchStatus').textContent = `Simulación ${this.step}/3 en curso…`;
      if(this.step < 3) { this.timer = setTimeout(tick,350); return; }
      try { const total = appState.addDemoBatch(jobId,count); this.modal.querySelector('#demoBatchStatus').textContent = `${total} perfiles ficticios incorporados. Ya puedes revisarlos en el ranking.`; }
      catch(error) { this.modal.querySelector('#demoBatchStatus').textContent = error.message; }
      this.running = false; this.modal.querySelector('[data-batch="start"]').disabled = false; this.modal.querySelector('[data-batch="cancel"]').disabled = true;
    };
    this.timer = setTimeout(tick,350);
  }
  cancel() {
    clearTimeout(this.timer);
    if(this.running) { this.modal.querySelector('#demoBatchStatus').textContent = 'Proceso cancelado. No se incorporaron perfiles.'; this.modal.querySelector('[data-batch="start"]').disabled = false; this.modal.querySelector('[data-batch="cancel"]').disabled = true; }
    this.running = false;
  }
  close() { this.cancel(); this.backdrop.classList.remove('active'); closeDialog(this.backdrop); }
}
