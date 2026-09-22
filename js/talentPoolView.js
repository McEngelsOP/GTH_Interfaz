/* ==========================================================================
   TalentAI - GTHC · ESAN
   Institutional Talent Pool & Cross-Matching Marketplace (Cambios #11 & #13)
   ========================================================================== */

import { appState } from './state.js';

export class TalentPoolViewController {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeCategoryFilter = 'all';

    this.initListeners();
  }

  initListeners() {
    appState.subscribe((event) => {
      if ([
        'talent_pool_updated',
        'view_changed'
      ].includes(event)) {
        if (appState.currentView === 'talentPool') {
          this.render();
        }
      }
    });
  }

  render() {
    if (!this.container) return;

    const talentList = appState.talentPool;
    const filtered = this.activeCategoryFilter === 'all'
      ? talentList
      : talentList.filter(t => t.roleCategory.toLowerCase().includes(this.activeCategoryFilter.toLowerCase()));

    this.container.innerHTML = `
      <div class="talent-pool-wrapper">
        <!-- Header -->
        <div class="talent-pool-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 22px;">👥</span>
              <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--text-main);">
                Banco de Talento Institucional & Movilidad Interna
              </h2>
            </div>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
              Resguardo estratégico de perfiles evaluados con alto potencial para reasignación rápida en ESAN sin repetir procesos de selección costosos.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 12px; color: var(--text-tertiary);">
              Total perfiles en banco: <strong>${talentList.length} activos</strong>
            </span>
            <button class="btn btn-primary" onclick="alert('Exportando directorio de talento en formato Excel/CSV para GTHC...')">
              Descargar Directorio
            </button>
          </div>
        </div>

        <!-- Marketplace de Vacantes Cruzadas Highlight (Cambio #13) -->
        <div class="marketplace-highlight-banner">
          <div class="marketplace-icon-col">
            <div class="marketplace-icon-badge">🔄</div>
          </div>
          <div class="marketplace-info-col">
            <h4 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: #1E3A8A;">
              Marketplace de Vacantes Cruzadas Inteligente
            </h4>
            <p style="font-size: 12.5px; color: #2563EB; margin-top: 3px;">
              El algoritmo de TalentAI detecta compatibilidad de candidatos no seleccionados en su postulación original con otras plazas abiertas en ESAN.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
              <span class="crossmatch-chip">
                <strong>Esteban Zúñiga</strong> → 94% Cátedra Inteligencia Artificial
              </span>
              <span class="crossmatch-chip">
                <strong>Víctor Huamán</strong> → 91% Mantenimiento Data Center
              </span>
              <span class="crossmatch-chip">
                <strong>Milagros Paredes</strong> → 88% Jefatura Bienestar
              </span>
            </div>
          </div>
        </div>

        <!-- Filter Pills Bar -->
        <div class="talent-filter-bar">
          <button class="talent-filter-btn ${this.activeCategoryFilter === 'all' ? 'active' : ''}" data-cat="all">
            Todos (${talentList.length})
          </button>
          <button class="talent-filter-btn ${this.activeCategoryFilter === 'docente' ? 'active' : ''}" data-cat="docente">
            Docentes & Investigadores
          </button>
          <button class="talent-filter-btn ${this.activeCategoryFilter === 'administrativo' ? 'active' : ''}" data-cat="administrativo">
            Administrativos & Gestión
          </button>
          <button class="talent-filter-btn ${this.activeCategoryFilter === 'operativo' ? 'active' : ''}" data-cat="operativo">
            Operativos & Facilities
          </button>
        </div>

        <!-- Grid of Talent Cards -->
        <div class="talent-cards-grid">
          ${filtered.length === 0 ? `
            <div style="grid-column: span 3; text-align: center; padding: 40px; color: var(--text-tertiary);">
              No hay perfiles registrados en esta categoría del banco de talento.
            </div>
          ` : filtered.map(t => `
            <div class="talent-profile-card">
              <div class="talent-card-header">
                <div>
                  <h3 class="talent-candidate-name">${t.name}</h3>
                  <span class="talent-category-tag">${t.roleCategory}</span>
                </div>
                <div class="talent-score-pill">
                  Score ${t.scoreObtained}
                </div>
              </div>

              <div class="talent-meta-row">
                <span style="font-size: 11px; color: var(--text-tertiary);">Evaluado en:</span>
                <span style="font-size: 11.5px; font-weight: 600; color: var(--text-secondary);">${t.previousVacancy}</span>
              </div>

              <p class="talent-narrative-reason">
                "${t.matchReason}"
              </p>

              <!-- Tags -->
              <div class="talent-tags-group">
                ${(t.tags || []).map(tag => `
                  <span class="talent-skill-tag">${tag}</span>
                `).join('')}
              </div>

              <!-- Opportunity Alert -->
              ${t.crossMatchOpportunity ? `
                <div class="talent-opportunity-box">
                  <span style="font-size: 12px;">⚡</span>
                  <span><strong>Oportunidad:</strong> ${t.crossMatchOpportunity}</span>
                </div>
              ` : ''}

              <!-- Actions -->
              <div class="talent-card-actions">
                <button class="btn btn-primary" style="flex: 1; font-size: 11.5px; padding: 6px 10px;" onclick="alert('Vinculando a ${t.name} con la convocatoria activa...')">
                  Vincular a Vacante
                </button>
                <button class="btn btn-secondary" style="font-size: 11.5px; padding: 6px 10px;" onclick="alert('Generando ficha completa de perfil y antecedentes de ${t.name}...')">
                  Ver Historial
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
    this.container.querySelectorAll('.talent-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategoryFilter = btn.getAttribute('data-cat');
        this.render();
      });
    });
  }
}
