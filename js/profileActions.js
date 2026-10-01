import { appState } from './state.js';
import { escapeHTML as esc, openDialog, closeDialog, notify } from './ui.js';
import { icon } from './icons.js';

export class ProfileActionsController {
  constructor(mount) {
    this.mount = mount;
    mount.addEventListener('click', e => {
      const action = e.target.closest('[data-profile-action]')?.dataset.profileAction;
      if (e.target === mount || action === 'close') this.close();
    });
    mount.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.close(); } });
    mount.addEventListener('submit', e => { e.preventDefault(); this.save(); });
    mount.addEventListener('input', () => this.preview());
    mount.addEventListener('change', e => { if (['mailTemplate','mailLanguage'].includes(e.target.id)) this.applyTemplate(); });
    appState.subscribe(event => { if (event === 'job_changed') this.close(); });
  }
  open(type, candidate) {
    this.type = type; this.candidateId = candidate.id; this.jobId = appState.activeJobPostingId;
    const draft = candidate.messageDraft;
    const title = type === 'mail' ? 'Responder por correo' : type === 'note' ? 'Añadir una nota' : 'Agendar entrevista';
    const content = type === 'mail' ? `<div class="composer-grid"><label class="wizard-field">Para<input name="recipient" type="email" required autocomplete="off" value="${esc(draft?.recipient || candidate.email)}" placeholder="Correo del postulante"></label><label class="wizard-field">Copia (opcional)<input name="cc" value="${esc(draft?.cc)}" placeholder="correo@ejemplo.com, otro@ejemplo.com"></label><label class="wizard-field">Plantilla<select id="mailTemplate" name="template">${[['personal','Mensaje personal'],['avanza','Avance de postulación'],['no_avanza','Respuesta de cierre'],['entrevista','Invitación a entrevista']].map(([v,label])=>`<option value="${v}" ${draft?.template===v?'selected':''}>${label}</option>`).join('')}</select></label><label class="wizard-field">Idioma<select id="mailLanguage" name="language"><option value="es">Español</option><option value="en" ${draft?.language==='en'?'selected':''}>Inglés</option></select></label></div><label class="wizard-field">Asunto<input name="subject" required maxlength="200" value="${esc(draft?.subject || `Tu postulación a ${appState.jobPosting.title}`)}"></label><label class="wizard-field">Mensaje<textarea name="body" rows="7" required placeholder="Escribe una respuesta para ${esc(candidate.name)}…">${esc(draft?.body)}</textarea></label><details class="composer-preview" open><summary>Vista previa del correo</summary><div id="mailPreview" class="message-preview"></div></details><p class="helper-copy">Revisa el correo del destinatario. Si falta en el perfil, puedes escribirlo aquí.</p><p class="demo-note">Borrador · Pendiente de envío. Gmail se conectará en una siguiente etapa.</p>` : type === 'note' ? `<label class="wizard-field">Nota para el equipo<textarea name="details" rows="6" required placeholder="¿Qué deseas dejar registrado sobre este perfil?"></textarea></label><p class="helper-copy">La nota queda en el historial de esta postulación.</p>` : `<label class="wizard-field">Título<input name="title" required value="Entrevista con ${esc(candidate.name)}"></label><label class="wizard-field">Fecha y hora<input name="scheduledAt" type="datetime-local" required></label><label class="wizard-field">Lugar, enlace o detalles<textarea name="details" rows="4" placeholder="Añade los detalles de la entrevista"></textarea></label><p class="demo-note">La entrevista quedará registrada en la ficha. La invitación por correo o calendario está pendiente de conexión.</p>`;
    this.mount.innerHTML = `<section class="profile-action-dialog" role="dialog" aria-modal="true" aria-labelledby="profileActionTitle"><form><header class="modal-header"><div><span class="section-kicker">${esc(candidate.name)}</span><h2 id="profileActionTitle">${icon(type === 'mail' ? 'mail' : type === 'note' ? 'note' : 'calendar')}${title}</h2><p>${esc(appState.jobPosting.title)}</p></div><button type="button" class="btn btn-ghost" data-profile-action="close" aria-label="Cerrar">${icon('close')}</button></header><div class="modal-body">${content}<p id="profileActionError" class="form-error" role="alert" hidden></p></div><footer class="modal-footer"><button type="button" class="btn btn-secondary" data-profile-action="close">Cancelar</button><button type="submit" class="btn btn-primary">${icon(type === 'mail' ? 'mail' : 'check')}${type === 'mail' ? 'Guardar borrador' : type === 'note' ? 'Guardar nota' : 'Guardar entrevista'}</button></footer></form></section>`;
    this.mount.classList.add('active'); openDialog(this.mount, this.mount.querySelector('.profile-action-dialog')); this.preview();
  }
  applyTemplate() {
    const form = this.mount.querySelector('form'), template = form.elements.template.value, language = form.elements.language.value;
    if (template === 'personal') return;
    const c = appState.candidates.find(c => c.id === this.candidateId);
    if (!c) return;
    const job = appState.jobPosting.title;
    const messages = language === 'en' ? {
      avanza: [`Your application is moving forward · ${job}`, `Hi ${c.name},\n\nYour application for ${job} is moving forward to the next stage. We will share the next steps with you soon.\n\nThank you for your interest.\nGTHC · ESAN`],
      no_avanza: [`Your application · ${job}`, `Hi ${c.name},\n\nThank you for applying for ${job}. Your application will not move forward in this process. We appreciate your time and interest.\n\nGTHC · ESAN`],
      entrevista: [`Interview · ${job}`, `Hi ${c.name},\n\nWe would like to arrange an interview for ${job}. Please let us know your availability so we can confirm a date and time.\n\nGTHC · ESAN`]
    } : {
      avanza: [`Avance de tu postulación · ${job}`, `Hola ${c.name},\n\nTu postulación para ${job} avanza a la siguiente etapa. Pronto te compartiremos los próximos pasos.\n\n¡Gracias por tu interés!\nEquipo de GTHC · ESAN`],
      no_avanza: [`Resultado de tu postulación · ${job}`, `Hola ${c.name},\n\nGracias por postular a ${job}. En esta ocasión tu postulación no continuará en este proceso. Agradecemos tu tiempo y tu interés.\n\nEquipo de GTHC · ESAN`],
      entrevista: [`Entrevista · ${job}`, `Hola ${c.name},\n\nNos gustaría coordinar una entrevista para ${job}. Cuéntanos tu disponibilidad para confirmar juntos la fecha y hora.\n\nEquipo de GTHC · ESAN`]
    };
    [form.elements.subject.value, form.elements.body.value] = messages[template]; this.preview();
  }
  preview() {
    if (this.type !== 'mail' || !this.mount.classList.contains('active')) return;
    const form = this.mount.querySelector('form');
    this.mount.querySelector('#mailPreview').innerHTML = `<small>Para: ${esc(form.elements.recipient.value || 'Destinatario pendiente')}</small><strong>${esc(form.elements.subject.value || 'Asunto pendiente')}</strong><p>${esc(form.elements.body.value || 'Tu mensaje aparecerá aquí.')}</p>`;
  }
  save() {
    const fields = Object.fromEntries(new FormData(this.mount.querySelector('form')));
    try {
      if (this.type === 'mail') appState.saveMessageDraft(this.candidateId, fields, this.jobId);
      else appState.addCandidateActivity(this.candidateId, { ...fields, type: this.type }, this.jobId);
      const message = this.type === 'mail' ? 'Borrador guardado en la ficha. Pendiente de envío.' : this.type === 'note' ? 'Nota añadida al historial de esta postulación.' : 'Entrevista registrada en la ficha. Invitación pendiente de envío.';
      this.close(); notify(message);
    } catch (error) { const node = this.mount.querySelector('#profileActionError'); node.textContent = error.message; node.hidden = false; }
  }
  close() { closeDialog(this.mount); this.mount.classList.remove('active'); this.mount.innerHTML = ''; if (document.getElementById('drawerBackdrop').classList.contains('active')) document.querySelector(`#profileQuickActions [data-profile-quick="${this.type}"]`)?.focus({preventScroll:true}); }
}
