/* ==========================================================================
   TalentAI - GTHC · ESAN
   Batch Ingestion, OCR & Multi-Source Synchronization Controller (con Incidencias)
   ========================================================================== */

import { appState } from './state.js';

export class BatchIngestionController {
  constructor(backdropEl, modalEl) {
    this.backdrop = backdropEl;
    this.modal = modalEl;
    this.showIncidences = false;

    this.initElements();
    this.initListeners();
  }

  initElements() {
    this.closeBtn = this.modal.querySelector('#ingestionCloseBtn');
    this.dropzone = this.modal.querySelector('#massiveDropzone');
    this.fileInput = this.modal.querySelector('#cvFileInput');
    this.startBtn = this.modal.querySelector('#startBatchBtn');
    this.cancelBtn = this.modal.querySelector('#cancelBatchBtn');

    // Incidences elements
    this.btnToggleIncidences = this.modal.querySelector('#btnToggleOcrIncidences');
    this.incidencesPanel = this.modal.querySelector('#ocrIncidencesPanel');
    this.incidencesListMount = this.modal.querySelector('#ocrIncidencesListMount');

    // Steps elements
    this.step1Indicator = this.modal.querySelector('#step1Indicator');
    this.step1Bar = this.modal.querySelector('#step1Bar');
    this.step1Pct = this.modal.querySelector('#step1Pct');

    this.step2Indicator = this.modal.querySelector('#step2Indicator');
    this.step2Bar = this.modal.querySelector('#step2Bar');
    this.step2Pct = this.modal.querySelector('#step2Pct');

    this.step3Indicator = this.modal.querySelector('#step3Indicator');
    this.step3Bar = this.modal.querySelector('#step3Bar');
    this.step3Pct = this.modal.querySelector('#step3Pct');

    this.isProcessing = false;
  }

  initListeners() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.close());
    }

    if (this.backdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop && !this.isProcessing) {
          this.close();
        }
      });
    }

    // Toggle Incidences filter
    if (this.btnToggleIncidences) {
      this.btnToggleIncidences.addEventListener('click', () => {
        this.showIncidences = !this.showIncidences;
        if (this.incidencesPanel) {
          this.incidencesPanel.classList.toggle('hidden', !this.showIncidences);
        }
        if (this.showIncidences) {
          this.renderIncidences();
          this.btnToggleIncidences.textContent = 'Ocultar incidencias ▲';
          this.btnToggleIncidences.classList.add('active');
        } else {
          this.btnToggleIncidences.textContent = '⚠️ Mostrar incidencias (7)';
          this.btnToggleIncidences.classList.remove('active');
        }
      });
    }

    if (this.dropzone && this.fileInput) {
      this.dropzone.addEventListener('click', () => {
        this.fileInput.click();
      });

      this.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dropzone.classList.add('dragover');
      });

      this.dropzone.addEventListener('dragleave', () => {
        this.dropzone.classList.remove('dragover');
      });

      this.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          this.simulateFileUpload(files.length);
        }
      });

      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.simulateFileUpload(e.target.files.length);
        }
      });
    }

    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        this.runBatchPipeline();
      });
    }
  }

  renderIncidences() {
    if (!this.incidencesListMount) return;
    const items = appState.ocrIncidences.items || [];

    this.incidencesListMount.innerHTML = items.map(item => `
      <div class="ocr-incidence-card ${item.status}">
        <div class="incidence-left">
          <span class="incidence-badge ${item.status}">
            ${item.status === 'review' ? '⚠️ En Revisión' : '🔴 Error de Carga'}
          </span>
          <div class="incidence-file-info">
            <span class="incidence-filename">${item.file}</span>
            <span class="incidence-meta">${item.candidateName} • ${item.channel} • ${item.type}</span>
          </div>
        </div>
        <div class="incidence-right">
          <div class="incidence-issue">
            <strong>Motivo:</strong> ${item.issue} (${item.action})
          </div>
          <button class="btn btn-secondary btn-xs" onclick="alert('Resolviendo incidencia para ${item.file}: Abriendo visor de edición manual...')">
            Subsanar
          </button>
        </div>
      </div>
    `).join('');
  }

  open() {
    this.backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (this.isProcessing) return;
    this.backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  simulateFileUpload(count) {
    alert(`📥 ${count} archivo(s) recibidos en el búfer de extracción. Haz clic en "Simular Re-procesamiento OCR" para ejecutar el pipeline.`);
  }

  runBatchPipeline() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.startBtn.disabled = true;
    this.startBtn.textContent = 'Procesando lote en segundo plano...';

    // Step 1: OCR
    this.step1Indicator.className = 'step-indicator active';
    this.step1Indicator.textContent = '⟳';
    this.step1Bar.style.width = '30%';
    this.step1Pct.textContent = '30%';

    setTimeout(() => {
      this.step1Bar.style.width = '100%';
      this.step1Pct.textContent = '100%';
      this.step1Indicator.className = 'step-indicator done';
      this.step1Indicator.textContent = '✓';

      // Step 2: Markdown
      this.step2Indicator.className = 'step-indicator active';
      this.step2Indicator.textContent = '⟳';
      this.step2Bar.style.width = '50%';
      this.step2Pct.textContent = '50%';

      setTimeout(() => {
        this.step2Bar.style.width = '100%';
        this.step2Pct.textContent = '100%';
        this.step2Indicator.className = 'step-indicator done';
        this.step2Indicator.textContent = '✓';

        // Step 3: Embeddings
        this.step3Indicator.className = 'step-indicator active';
        this.step3Indicator.textContent = '⟳';
        this.step3Bar.style.width = '60%';
        this.step3Pct.textContent = '60%';

        setTimeout(() => {
          this.step3Bar.style.width = '100%';
          this.step3Pct.textContent = '100%';
          this.step3Indicator.className = 'step-indicator done';
          this.step3Indicator.textContent = '✓';

          this.isProcessing = false;
          this.startBtn.disabled = false;
          this.startBtn.textContent = 'Procesamiento Completado (482 CVs)';
          alert('🎉 ¡Lote procesado con éxito! Se han extraído los CVs a Markdown y sincronizado los vectores en la Base Centralizada.');
          setTimeout(() => this.close(), 800);
        }, 800);
      }, 700);
    }, 600);
  }
}
