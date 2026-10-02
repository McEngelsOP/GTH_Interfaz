/* ==========================================================================
   TalentAI - GTHC · ESAN
   Institutional Talent Pool & Cross-Matching Marketplace (con Buscador Universal y Transferibles)
   ========================================================================== */

import { appState } from './state.js';

export class TalentPoolViewController {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeCategoryFilter = 'all'; // 'all' | 'docente' | 'administrativo' | 'operativo' | 'transferible'

    this.initListeners();
  }

  initListeners() {
    appState.subscribe((event) => {
      if ([
        'talent_pool_updated',
        'talent_search_changed',
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

    const filtered = appState.getFilteredTalentPool(this.activeCategoryFilter);
    const totalCount = appState.talentPool.length;
    const transferibleCount = appState.talentPool.filter(t => t.crossMatchOpportunity).length;

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
              Total en banco: <strong>${totalCount} perfiles activos</strong>
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

        <!-- Universal Search & Category Tabs Bar (Recomendación del Usuario) -->
        <div class="talent-controls-card">
          <!-- Universal Search Input -->
          <div class="talent-search-row">
            <div class="search-input-wrapper" style="flex: 1;">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                class="search-input" 
                id="talentUniversalSearchInput" 
                placeholder="Buscador universal: escribe una habilidad o keyword (ej: Python, Marketing, Cloud, Finanzas, Banner)..."
                value="${appState.talentSearchQuery || ''}"
              />
            </div>
            ${appState.talentSearchQuery ? `
              <button class="btn btn-secondary btn-sm" id="btnClearTalentSearch">Limpiar búsqueda</button>
            ` : ''}
          </div>

          <!-- Quick Skill Chips -->
          <div class="talent-quick-chips-row">
            <span style="font-size: 11.5px; font-weight: 600; color: var(--text-tertiary);">Filtros rápidos por habilidad:</span>
            <button class="talent-quick-chip" data-skill="Python">Python</button>
            <button class="talent-quick-chip" data-skill="Marketing">Marketing</button>
            <button class="talent-quick-chip" data-skill="Cloud">Cloud</button>
            <button class="talent-quick-chip" data-skill="Finanzas">Finanzas</button>
            <button class="talent-quick-chip" data-skill="Banner">Banner</button>
            <button class="talent-quick-chip" data-skill="SST">SST</button>
          </div>

          <!-- Filter Category Tabs (Con Transferibles como categoría propia) -->
          <div class="talent-filter-bar">
            <button class="talent-filter-btn ${this.activeCategoryFilter === 'all' ? 'active' : ''}" data-cat="all">
              Todos (${totalCount})
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
            <button class="talent-filter-btn talent-tab-transferible ${this.activeCategoryFilter === 'transferible' ? 'active' : ''}" data-cat="transferible">
              ✦ Transferibles (${transferibleCount})
            </button>
          </div>
        </div>

        <!-- Grid of Talent Cards -->
        <div class="talent-cards-grid">
          ${filtered.length === 0 ? `
            <div style="grid-column: span 3; text-align: center; padding: 48px; color: var(--text-tertiary);">
              <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
              <strong style="color: var(--text-main); font-size: 15px;">No se encontraron perfiles en el Banco de Talento</strong>
              <p style="font-size: 12.5px; margin-top: 4px;">Intenta con otro término en el buscador universal o cambia la pestaña seleccionada.</p>
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
                ${(t.tags || []).map(tag => {
                  const isHighlighted = appState.talentSearchQuery && tag.toLowerCase().includes(appState.talentSearchQuery);
                  return `
                    <span class="talent-skill-tag ${isHighlighted ? 'highlighted' : ''}">${tag}</span>
                  `;
                }).join('')}
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
                <button class="btn btn-primary" style="flex: 1; font-size: 11.5px; padding: 6px 10px;" onclick="alert('Vinculando a ${t.name} con la convocatoria activa ${appState.jobPosting.title}...')">
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
    // Filter tabs
    this.container.querySelectorAll('.talent-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategoryFilter = btn.getAttribute('data-cat');
        this.render();
      });
    });

    // Search Input
    const searchInput = this.container.querySelector('#talentUniversalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        appState.setTalentSearchQuery(e.target.value);
      });
    }

    // Clear search
    const btnClear = this.container.querySelector('#btnClearTalentSearch');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        appState.setTalentSearchQuery('');
      });
    }

    // Quick chips
    this.container.querySelectorAll('.talent-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const skill = chip.getAttribute('data-skill');
        appState.setTalentSearchQuery(skill);
      });
    });
  }
}
