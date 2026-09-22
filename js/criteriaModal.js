/* ==========================================================================
   TalentAI - GTHC · ESAN
   Criteria & Weights Configuration Modal Controller (v2.4 / Matching Dual)
   ========================================================================== */

import { appState } from './state.js';

export class CriteriaModalController {
  constructor(backdropEl, modalEl) {
    this.backdrop = backdropEl;
    this.modal = modalEl;

    this.initElements();
    this.initListeners();
  }

  initElements() {
    this.closeBtn = this.modal.querySelector('#criteriaCloseBtn');
    this.cancelBtn = this.modal.querySelector('#cancelCriteriaBtn');
    this.saveBtn = this.modal.querySelector('#saveCriteriaBtn');
    this.resetBtn = this.modal.querySelector('#resetCriteriaBtn');

    // Dual Engine Sliders
    this.mlDualSlider = this.modal.querySelector('#mlDualSlider');
    this.mlDualBadge = this.modal.querySelector('#mlDualBadge');
    this.llmDualSlider = this.modal.querySelector('#llmDualSlider');
    this.llmDualBadge = this.modal.querySelector('#llmDualBadge');

    // Variables Sliders
    this.sliderExp = this.modal.querySelector('#sliderWeightExp');
    this.valExp = this.modal.querySelector('#valWeightExp');

    this.sliderSem = this.modal.querySelector('#sliderWeightSem');
    this.valSem = this.modal.querySelector('#valWeightSem');

    this.sliderTech = this.modal.querySelector('#sliderWeightTech');
    this.valTech = this.modal.querySelector('#valWeightTech');

    this.sliderTeach = this.modal.querySelector('#sliderWeightTeach');
    this.valTeach = this.modal.querySelector('#valWeightTeach');

    this.sliderPref = this.modal.querySelector('#sliderWeightPref');
    this.valPref = this.modal.querySelector('#valWeightPref');

    this.balanceBar = this.modal.querySelector('#weightsBalanceBar');
    this.checkInclusion = this.modal.querySelector('#checkInclusionEnable');
  }

  initListeners() {
    // Open/Close
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.close());
    if (this.backdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) this.close();
      });
    }

    // Dual Engine Balance synchronization
    if (this.mlDualSlider && this.llmDualSlider) {
      this.mlDualSlider.addEventListener('input', (e) => {
        const mlVal = parseInt(e.target.value, 10);
        const llmVal = 100 - mlVal;
        this.llmDualSlider.value = llmVal;
        this.mlDualBadge.textContent = `${mlVal}%`;
        this.llmDualBadge.textContent = `${llmVal}%`;
      });

      this.llmDualSlider.addEventListener('input', (e) => {
        const llmVal = parseInt(e.target.value, 10);
        const mlVal = 100 - llmVal;
        this.mlDualSlider.value = mlVal;
        this.llmDualBadge.textContent = `${llmVal}%`;
        this.mlDualBadge.textContent = `${mlVal}%`;
      });
    }

    // Specific Variables Listeners
    const variableSliders = [
      { slider: this.sliderExp, val: this.valExp, name: 'Experiencia' },
      { slider: this.sliderSem, val: this.valSem, name: 'Similitud Semántica' },
      { slider: this.sliderTech, val: this.valTech, name: 'Stack Técnico' },
      { slider: this.sliderTeach, val: this.valTeach, name: 'Docencia' },
      { slider: this.sliderPref, val: this.valPref, name: 'Preferentes' }
    ];

    variableSliders.forEach(item => {
      if (item.slider) {
        item.slider.addEventListener('input', (e) => {
          const v = parseInt(e.target.value, 10);
          if (item.val) item.val.textContent = `${v} pts (${v}%)`;
          this.updateBalanceValidation();
        });
      }
    });

    // Reset Defaults
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        this.resetToDefaults();
      });
    }

    // Save & Recalculate
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => {
        this.saveAndRecalculate();
      });
    }
  }

  updateBalanceValidation() {
    const total = 
      parseInt(this.sliderExp.value, 10) +
      parseInt(this.sliderSem.value, 10) +
      parseInt(this.sliderTech.value, 10) +
      parseInt(this.sliderTeach.value, 10) +
      parseInt(this.sliderPref.value, 10);

    if (total === 100) {
      this.balanceBar.className = 'balance-status-bar';
      this.balanceBar.innerHTML = `✓ Suma de variables: 100 pts (Balance Óptimo)`;
      this.saveBtn.disabled = false;
    } else {
      this.balanceBar.className = 'balance-status-bar invalid';
      this.balanceBar.innerHTML = `⚠ Suma actual: ${total} pts (Debe sumar exactamente 100 pts)`;
      this.saveBtn.disabled = true;
    }
  }

  resetToDefaults() {
    this.mlDualSlider.value = 30;
    this.llmDualSlider.value = 70;
    this.mlDualBadge.textContent = '30%';
    this.llmDualBadge.textContent = '70%';

    this.sliderExp.value = 30;
    this.valExp.textContent = '30 pts (30%)';

    this.sliderSem.value = 30;
    this.valSem.textContent = '30 pts (30%)';

    this.sliderTech.value = 20;
    this.valTech.textContent = '20 pts (20%)';

    this.sliderTeach.value = 10;
    this.valTeach.textContent = '10 pts (10%)';

    this.sliderPref.value = 10;
    this.valPref.textContent = '10 pts (10%)';

    this.checkInclusion.checked = true;
    this.updateBalanceValidation();
  }

  saveAndRecalculate() {
    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Recalculando scoring dual...';

    setTimeout(() => {
      // Update criteria version in state
      appState.jobPosting.criteriaVersion = 'v2.5 (Ponderación Personalizada GTHC)';

      // Trigger recalculation notification
      appState.notify('criteria_updated', {
        mlWeight: parseInt(this.mlDualSlider.value, 10),
        llmWeight: parseInt(this.llmDualSlider.value, 10),
        inclusion: this.checkInclusion.checked
      });

      this.saveBtn.disabled = false;
      this.saveBtn.textContent = 'Guardar y Re-calcular Ranking';
      this.close();

      alert('✅ ¡Criterios y Pesos guardados con éxito! Se ha recalculado la matriz de scoring dual (v2.5) para los 482 candidatos.');
    }, 600);
  }

  open() {
    this.backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}
