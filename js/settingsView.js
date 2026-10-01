import { icon } from './icons.js';
import { notify } from './ui.js';

const key = 'talentai.appearance.v1';
export class SettingsViewController {
  constructor(container) {
    this.container = container;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { /* use defaults */ }
    this.mode = ['light','dark','system'].includes(saved.mode) ? saved.mode : 'light';
    this.reduceMotion = saved.reduceMotion === true;
    this.systemTheme = matchMedia('(prefers-color-scheme: dark)');
    this.systemTheme.addEventListener('change', () => this.apply());
    container.addEventListener('click', e => {
      const button = e.target.closest('[data-appearance]');
      if (!button) return;
      this.mode = button.dataset.appearance; this.save(); this.render();
    });
    container.addEventListener('change', e => {
      if (e.target.id === 'reduceMotionToggle') { this.reduceMotion = e.target.checked; this.save(); }
    });
    this.apply();
  }
  apply() {
    document.documentElement.dataset.theme = this.mode === 'system' ? this.systemTheme.matches ? 'dark' : 'light' : this.mode;
    document.documentElement.dataset.motion = this.reduceMotion ? 'reduced' : 'normal';
  }
  save() {
    this.apply();
    try { localStorage.setItem(key, JSON.stringify({ mode: this.mode, reduceMotion: this.reduceMotion })); }
    catch { notify('La apariencia cambió para esta sesión. El navegador no pudo guardar tu preferencia.', true); }
  }
  render() {
    this.container.innerHTML = `<section class="settings-wrapper"><header class="page-heading"><span class="section-kicker">A TU MANERA</span><h1>Ajustes generales</h1><p>Haz que tu espacio de trabajo se sienta cómodo a cualquier hora.</p></header>
      <section class="settings-card"><div class="settings-section-title">${icon('sun')}<div><h2>Apariencia</h2><p>Elige un tema. Tu preferencia se guarda en este navegador.</p></div></div><div class="appearance-options" role="group" aria-label="Elegir apariencia">${[['light','Claro','sun','Cálido y fácil de leer durante el día.'],['dark','Oscuro','moon','Fondos suaves para trabajar por las noches.'],['system','Según mi equipo','monitor','Sigue la apariencia de tu dispositivo.']].map(([value,label,name,description])=>`<button class="appearance-option ${this.mode===value?'selected':''}" data-appearance="${value}" aria-pressed="${this.mode===value}"><span class="theme-swatch swatch-${value}"><i></i><i></i><i></i></span><strong>${icon(name)}${label}</strong><span>${description}</span>${this.mode===value?`<span class="appearance-check">${icon('check')}</span>`:''}</button>`).join('')}</div></section>
      <section class="settings-card motion-setting"><div class="settings-section-title">${icon('monitor')}<div><h2>Movimiento suave</h2><p>Las transiciones son breves. Activa esta opción si prefieres reducirlas aún más.</p></div></div><label class="setting-toggle"><input type="checkbox" id="reduceMotionToggle" ${this.reduceMotion?'checked':''}><span>Reducir animaciones</span></label><p class="helper-copy">También respetamos la preferencia de movimiento de tu dispositivo.</p></section>
      <section class="settings-card"><div class="settings-section-title">${icon('mail')}<div><h2>Correo y calendario</h2><p>Los correos se preparan como borradores y las entrevistas se guardan en la ficha. La conexión con Gmail y calendario está pendiente.</p></div></div></section></section>`;
  }
}
