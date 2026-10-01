/* ==========================================================================
   TalentAI - GTHC · ESAN
   Organizational Profiles Library Controller (Módulo Autónomo de Perfiles)
   ========================================================================== */

import { appState } from './state.js';
import { escapeRecord } from './ui.js';

export class ProfilesLibraryViewController {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeCategory = 'all'; // 'all' | 'docente' | 'administrativo' | 'operativo' | 'directivo'

    this.initListeners();
  }

  initListeners() {
    appState.subscribe((event) => {
      if (event === 'view_changed' && appState.currentView === 'profilesLibrary') {
        this.render();
      }
    });
  }

  render() {
    if (!this.container) return;

    const templates = escapeRecord(appState.templates);
    const filtered = this.activeCategory === 'all'
      ? templates
      : templates.filter(t => t.roleType.toLowerCase() === this.activeCategory.toLowerCase());

    this.container.innerHTML = `
      <div class="profiles-library-wrapper">
        <!-- Header -->
        <div class="profiles-library-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 24px;">📚</span>
              <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--text-main);">
                Perfiles de puestos
              </h2>
            </div>
            <p style="font-size: 13.5px; color: var(--text-secondary); margin-top: 4px;">
              Perfiles de ejemplo para abrir una convocatoria en <strong>ESAN Graduate School of Business</strong>.
              Revisa qué se necesita para cada puesto y úsalo como punto de partida. Puedes descargar estos perfiles desde Banco de Talento.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">

            <button class="btn btn-primary" id="btnNewProfileTemplate" type="button">
              + Nueva Convocatoria
            </button>
          </div>
        </div>

        <!-- Role Category Filter Tabs -->
        <div class="profiles-category-tabs">
          <button class="profiles-tab-btn ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">
            Todos los Perfiles (${templates.length})
          </button>
          <button class="profiles-tab-btn ${this.activeCategory === 'docente' ? 'active' : ''}" data-cat="docente">
            Docentes e investigadores (${templates.filter(t => t.roleType === 'docente').length})
          </button>
          <button class="profiles-tab-btn ${this.activeCategory === 'administrativo' ? 'active' : ''}" data-cat="administrativo">
            Administrativos y gestión (${templates.filter(t => t.roleType === 'administrativo').length})
          </button>
          <button class="profiles-tab-btn ${this.activeCategory === 'operativo' ? 'active' : ''}" data-cat="operativo">
            Operativos y soporte (${templates.filter(t => t.roleType === 'operativo').length})
          </button>
          <button class="profiles-tab-btn ${this.activeCategory === 'directivo' ? 'active' : ''}" data-cat="directivo">
            Directivos (${templates.filter(t => t.roleType === 'directivo').length})
          </button>
        </div>

        <!-- Profiles Cards Grid -->
        <div class="profiles-grid">
          ${filtered.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-tertiary);">
              No se encontraron plantillas para esta categoría de puesto.
            </div>
          ` : filtered.map(tpl => `
            <div class="profile-card">
              <div class="profile-card-header">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span class="role-badge role-${tpl.roleType}">${tpl.roleType.toUpperCase()}</span>
                  <span class="profile-id-tag">${tpl.id}</span>
                </div>
                <h3 class="profile-card-title">${tpl.title}</h3>
                <p class="profile-card-desc">${tpl.description}</p>
              </div>

              <!-- Accordion / Details Section -->
              <details class="profile-details-box"><summary>Ver requisitos y criterios</summary>
                <!-- Knockout Rule -->
                <div class="profile-detail-row knockout-row">
                  <div class="profile-detail-label">
                    <span style="color: #DC2626;">⛔</span>
                    <strong>Requisito obligatorio:</strong>
                  </div>
                  <div class="profile-detail-val">${tpl.knockoutRule}</div>
                </div>

                <!-- Effectiveness -->
                <div class="profile-detail-row">
                  <div class="profile-detail-label">
                    <span style="color: #059669;">📈</span>
                    <strong>Resultados del proceso:</strong>
                  </div>
                  <div class="profile-detail-val" style="color: #047857; font-weight: 600;">
                    Pendiente de seguimiento real
                  </div>
                </div>

                <!-- History -->
                <div class="profile-detail-row">
                  <div class="profile-detail-label">
                    <span style="color: #2563EB;">🕒</span>
                    <strong>Historial de Convocatorias:</strong>
                  </div>
                  <div class="profile-detail-val">
                    Plantilla institucional de demostración
                  </div>
                </div>

                <!-- Criteria & Weights Summary -->
                <div style="margin-top: 10px;">
                  <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px;">
                    Importancia de cada criterio (Total: 100%)
                  </div>
                  <div class="profile-criteria-list">
                    ${tpl.criteria.map(c => `
                      <div class="profile-criterion-item">
                        <span class="criterion-name">${c.name}</span>
                        <span class="criterion-weight">${c.weight}%</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </details>

              <!-- Actions -->
              <div class="profile-card-actions">
                <button class="btn btn-primary" style="flex: 1; font-size: 12px; padding: 7px 12px;" data-launch-template="${tpl.id}">
                  ⚡ Abrir Convocatoria
                </button>

              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {

    this.container.querySelectorAll('.profiles-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.getAttribute('data-cat');
        this.render();
      });
    });
    this.container.querySelector('#btnNewProfileTemplate')?.addEventListener('click', () => this.onStartNewJob?.(''));
    this.container.querySelectorAll('[data-launch-template]').forEach(btn => {
      btn.addEventListener('click', () => this.onStartNewJob?.(btn.dataset.launchTemplate));
    });
  }

}
