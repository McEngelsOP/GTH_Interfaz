import { appState } from './state.js';
import { escapeHTML as esc, openDialog, closeDialog, notify } from './ui.js';

const fallbackCriteria = [
  { label: 'Experiencia relevante', weightPct: 30, type: 'ML' },
  { label: 'Afinidad con el perfil', weightPct: 30, type: 'LLM' },
  { label: 'Competencias técnicas', weightPct: 20, type: 'ML' },
  { label: 'Habilidades interpersonales', weightPct: 20, type: 'ML' }
];

export class NewJobWizard {
  constructor(mount, onCreated) {
    this.mount = mount;
    this.onCreated = onCreated;
    this.step = 1;
    this.draft = {};
    this.mount.addEventListener('click', e => {
      if (e.target === this.mount || e.target.closest('[data-wizard="close"]')) return this.close();
      const action = e.target.closest('[data-wizard]')?.dataset.wizard;
      if (action === 'next') this.next();
      if (action === 'back') { this.capture(); this.step--; this.render(); }
      if (action === 'draft') this.finish(false);
      if (action === 'activate') this.finish(true);
    });
    this.mount.addEventListener('change', e => {
      if (e.target.name === 'templateId' || e.target.name === 'roleType') this.selectTemplate(e.target.value);
      if (e.target.name === 'weightPct') this.showWeightTotal();
    });
    this.mount.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  }

  open(templateId = '') {
    if (!appState.can('jobs')) { notify('Este rol tiene acceso de consulta.',true); return; }
    this.returnFocus = document.activeElement;
    this.step = 1;
    this.draft = { templateId, roleType: '' };
    this.selectTemplate(templateId);
    this.mount.classList.add('show');
    this.mount.setAttribute('aria-hidden', 'false');
    this.render();
    this.mount.querySelector('button, input')?.focus();
  }

  close() {
    this.mount.classList.remove('show');
    this.mount.setAttribute('aria-hidden', 'true');
    closeDialog(this.mount);
    this.mount.innerHTML = '';
    this.returnFocus?.focus?.();
  }

  selectTemplate(id) {
    const tpl = appState.templates.find(t => t.id === id);
    this.draft.templateId = tpl?.id || '';
    if (tpl) {
      this.draft.roleType = tpl.roleType;
      this.draft.title = tpl.title;
      this.draft.knockoutRule = tpl.knockoutRule;
      this.draft.weights = tpl.criteria.map(c => ({ label: c.name, weightPct: c.weight, type: /semántic|alineamiento|producción/i.test(c.name) ? 'LLM' : 'ML' }));
    } else {
      this.draft.roleType = ['docente', 'administrativo', 'operativo', 'directivo'].includes(id) ? id : 'docente';
      this.draft.title = '';
      this.draft.knockoutRule = '';
      this.draft.weights = fallbackCriteria.map(w => ({ ...w }));
    }
    this.render();
  }

  render() {
    closeDialog(this.mount);
    const d = this.draft;
    const labels = ['Perfil', 'Datos', 'Criterios', 'Revisión'];
    const body = this.step === 1 ? `
      <h3>¿Qué tipo de talento buscas?</h3><p>Parte de un perfil institucional o configura uno sin plantilla.</p>
      <div class="wizard-template-grid">
        <label class="wizard-template-option ${!d.templateId ? 'selected' : ''}"><input type="radio" name="templateId" value="${esc(d.roleType || 'docente')}" ${!d.templateId ? 'checked' : ''}><strong>Desde cero</strong><small>Personaliza el puesto y sus criterios</small></label>
        ${appState.templates.map(t => `<label class="wizard-template-option ${d.templateId === t.id ? 'selected' : ''}"><input type="radio" name="templateId" value="${esc(t.id)}" ${d.templateId === t.id ? 'checked' : ''}><strong>${esc(t.title)}</strong><small>${esc(t.category)} · ${esc(t.id)}</small></label>`).join('')}
      </div>
      ${!d.templateId ? `<label class="wizard-field">Categoría<select name="roleType" id="wizardRole">${['docente','administrativo','operativo','directivo'].map(r => `<option value="${r}" ${d.roleType === r ? 'selected' : ''}>${r.charAt(0).toUpperCase()+r.slice(1)}</option>`).join('')}</select></label>` : ''}
    ` : this.step === 2 ? `
      <h3>Datos de la convocatoria</h3><p>Estos datos aparecerán en el centro de convocatorias y en el selector superior.</p>
      <div class="wizard-fields">
        <label class="wizard-field span-full">Nombre del puesto *<input name="title" maxlength="120" required value="${esc(d.title || '')}" placeholder="Ej. Analista de selección"></label>
        <label class="wizard-field span-full">Área solicitante *<input name="department" maxlength="100" required value="${esc(d.department || '')}" placeholder="Ej. Gestión de Talento Humano"></label>
        <label class="wizard-field">Número de vacantes *<input name="vacancies" type="number" min="1" max="100" required value="${esc(d.vacancies || 1)}"></label>
        <label class="wizard-field">Periodo<input name="period" maxlength="60" value="${esc(d.period || 'Semestre 2026-II')}"></label>
        <label class="wizard-field">Modalidad<select name="modality">${['Presencial','Híbrido','Remoto'].map(m=>`<option ${d.modality === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="wizard-field">Fecha de apertura<input name="openDate" type="date" value="${esc(d.openDate || '')}"></label>
        <label class="wizard-field">Fecha de cierre<input name="closeDate" type="date" value="${esc(d.closeDate || '')}"></label>
      </div>
    ` : this.step === 3 ? `
      <h3>Criterios explicables</h3><p>Define cómo se evaluará el perfil cuando se conecte el motor de matching. Por ahora, son parámetros de la demo.</p>
      <div class="wizard-criteria">${d.weights.map((w, i) => `<div class="wizard-criterion"><label>Criterio ${i+1}<input name="weightLabel" maxlength="100" value="${esc(w.label)}" required></label><label>Peso %<input name="weightPct" type="number" min="0" max="100" value="${w.weightPct}" required></label></div>`).join('')}</div>
      <div class="wizard-weight-summary">Total ponderado <strong id="wizardWeightTotal">100 %</strong></div>
      <label class="wizard-field">Requisito obligatorio o condición de revisión<textarea name="knockoutRule" rows="2" maxlength="300" placeholder="Ej. Maestría registrada (revisión manual)">${esc(d.knockoutRule || '')}</textarea></label>
      <p class="wizard-note">Los requisitos se revisarán manualmente; el prototipo no descarta candidatos automáticamente.</p>
    ` : `
      <h3>Revisa antes de continuar</h3><p>Puedes conservarla como borrador o activarla dentro del prototipo.</p>
      <div class="wizard-review"><div><span>Puesto</span><strong>${esc(d.title)}</strong></div><div><span>Área y periodo</span><strong>${esc(d.department)} · ${esc(d.period || 'Por definir')}</strong></div><div><span>Plazas</span><strong>${esc(d.vacancies)}</strong></div><div><span>Perfil</span><strong>${esc(d.templateId || d.roleType)}</strong></div><div><span>Criterios</span><strong>${d.weights.length} variables · 100 %</strong></div></div>
      <p class="wizard-demo-notice">Modo demostración: se guardará en este navegador. No se enviarán datos ni se procesarán CVs reales.</p>
    `;
    this.mount.innerHTML = `<section class="wizard-dialog" role="dialog" aria-modal="true" aria-labelledby="wizardTitle">
      <header class="wizard-header"><div><span class="section-kicker">TALENTAI · CREACIÓN DE CONVOCATORIA</span><h2 id="wizardTitle">Nueva convocatoria</h2></div><button type="button" class="wizard-close" data-wizard="close" aria-label="Cerrar">×</button></header>
      <div class="wizard-steps">${labels.map((label, i)=>`<span class="${i+1 === this.step ? 'current' : i+1 < this.step ? 'completed' : ''}"><b>${i+1}</b> ${label}</span>`).join('')}</div>
      <div class="wizard-body">${body}<p class="wizard-error" id="wizardError" role="alert" hidden></p></div>
      <footer class="wizard-footer">${this.step > 1 ? '<button type="button" class="btn btn-secondary" data-wizard="back">Atrás</button>' : '<span></span>'}
        <div>${this.step === 4 ? '<button type="button" class="btn btn-secondary" data-wizard="draft">Guardar borrador</button><button type="button" class="btn btn-primary" data-wizard="activate">Activar convocatoria</button>' : '<button type="button" class="btn btn-primary" data-wizard="next">Continuar →</button>'}</div></footer>
    </section>`;
    if (this.step === 3) this.showWeightTotal();
    if (this.mount.classList.contains('show')) openDialog(this.mount,this.mount.querySelector('.wizard-dialog'));
  }

  capture() {
    if (this.step === 2) Object.assign(this.draft,Object.fromEntries([...this.mount.querySelectorAll('.wizard-body [name]')].map(el=>[el.name,el.value])));
    if (this.step === 3) {
      const labels=[...this.mount.querySelectorAll('[name="weightLabel"]')];
      const values=[...this.mount.querySelectorAll('[name="weightPct"]')];
      this.draft.weights=labels.map((el,i)=>({...this.draft.weights[i],label:el.value,weightPct:Number(values[i].value)}));
      this.draft.knockoutRule=this.mount.querySelector('[name="knockoutRule"]').value;
    }
  }

  showError(message) {
    const el = this.mount.querySelector('#wizardError');
    el.textContent = message;
    el.hidden = false;
  }

  showWeightTotal() {
    const total = [...this.mount.querySelectorAll('input[name="weightPct"]')].reduce((sum, el) => sum + (Number(el.value) || 0), 0);
    const el = this.mount.querySelector('#wizardWeightTotal');
    if (el) { el.textContent = `${total} %`; el.classList.toggle('invalid', total !== 100); }
  }

  next() {
    if (this.step === 2) {
      const fields = Object.fromEntries([...this.mount.querySelectorAll('.wizard-body [name]')].map(el => [el.name, el.value]));
      if (!fields.title.trim() || !fields.department.trim() || !Number.isInteger(Number(fields.vacancies)) || Number(fields.vacancies) < 1 || Number(fields.vacancies) > 100) return this.showError('Completa el puesto, el área y un número de vacantes entre 1 y 100.');
      if (fields.openDate && fields.closeDate && fields.closeDate < fields.openDate) return this.showError('La fecha de cierre debe ser posterior a la de apertura.');
      Object.assign(this.draft, fields);
    }
    if (this.step === 3) {
      const labels = [...this.mount.querySelectorAll('input[name="weightLabel"]')].map(el => el.value.trim());
      const values = [...this.mount.querySelectorAll('input[name="weightPct"]')].map(el => Number(el.value));
      if (labels.some(x => !x) || values.some(x => !Number.isInteger(x) || x < 0 || x > 100) || values.reduce((a, b) => a + b, 0) !== 100) return this.showError('Todos los criterios requieren nombre y los pesos deben sumar exactamente 100 %.');
      this.draft.weights = labels.map((label, i) => ({ ...this.draft.weights[i], label, weightPct: values[i] }));
      this.draft.knockoutRule = this.mount.querySelector('[name="knockoutRule"]').value.trim();
    }
    this.step++;
    this.render();
  }

  finish(activate) {
    try {
      const job = appState.createJobPosting({ ...this.draft, activate });
      this.close();
      this.onCreated(job);
    } catch (error) { this.showError(error.message); }
  }
}
