/* ==========================================================================
   TalentAI - GTHC · ESAN
   Executive Dashboard for Deans & Organizational Profiles Library (Cambios #4 & #15)
   ========================================================================== */

import { appState } from './state.js';

export class ExecutiveDashboardController {
  constructor(containerEl) {
    this.container = containerEl;
    this.initListeners();
  }

  initListeners() {
    appState.subscribe((event) => {
      if (event === 'view_changed' && appState.currentView === 'executive') {
        this.render();
      }
    });
  }

  render() {
    if (!this.container) return;

    const metrics = appState.executiveMetrics;
    const templates = appState.templates;

    this.container.innerHTML = `
      <div class="executive-wrapper">
        <!-- Header -->
        <div class="executive-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 22px;">👔</span>
              <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--text-main);">
                Dashboard Ejecutivo para Decanos, Directores & Gerencia
              </h2>
            </div>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
              Consolidado estratégico de atracción y cobertura de talento institucional en <strong>ESAN Graduate School of Business</strong>.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn btn-secondary" onclick="window.executiveController.showProfilesLibraryModal()">
              📚 Biblioteca de Perfiles (Templates)
            </button>
            <button class="btn btn-primary" onclick="alert('Generando informe de gestión para el Consejo Directivo de ESAN...')">
              Exportar Informe Ejecutivo
            </button>
          </div>
        </div>

        <!-- Executive High-Level KPI Row (Cambio #15) -->
        <div class="kpi-grid" style="margin-bottom: 24px;">
          <div class="kpi-card kpi-accent-primary">
            <div class="kpi-header">
              <span class="kpi-label">Convocatorias Abiertas</span>
              <div class="kpi-icon-wrapper">📂</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">${metrics.openVacanciesCount}</span>
              <span class="kpi-unit">plazas activas</span>
            </div>
            <div class="kpi-subtitle">
              <span>Distribuido en 4 facultades y áreas</span>
            </div>
          </div>

          <div class="kpi-card kpi-accent-info">
            <div class="kpi-header">
              <span class="kpi-label">Candidatos Evaluados (YTD)</span>
              <div class="kpi-icon-wrapper" style="color: #2563EB; background: #EFF6FF;">👥</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">${metrics.evaluatedCandidatesYTD}</span>
              <span class="kpi-unit">postulantes</span>
            </div>
            <div class="kpi-subtitle">
              <span>Procesados por OCR & Matching Dual</span>
            </div>
          </div>

          <div class="kpi-card kpi-accent-success">
            <div class="kpi-header">
              <span class="kpi-label">Tiempo Cobertura Promedio</span>
              <div class="kpi-icon-wrapper" style="color: #10B981; background: #ECFDF5;">⏱️</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">${metrics.avgCoverageDays}</span>
              <span class="kpi-unit">días</span>
            </div>
            <div class="kpi-subtitle">
              <span style="color: #10B981; font-weight: 700;">-2.6 días</span>
              <span>vs meta institucional (15d)</span>
            </div>
          </div>

          <div class="kpi-card kpi-accent-warning">
            <div class="kpi-header">
              <span class="kpi-label">Éxito en Contratación</span>
              <div class="kpi-icon-wrapper" style="color: #D97706; background: #FEF3C7;">⭐</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">${metrics.successfulHires6mRate}%</span>
              <span class="kpi-unit">satisfacción</span>
            </div>
            <div class="kpi-subtitle">
              <span>Evaluación docente y de desempeño</span>
            </div>
          </div>
        </div>

        <!-- Two Column Analytical Overview -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <!-- Left: Convocatorias por Facultad -->
          <div class="card" style="padding: 20px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
            <h3 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">
              Estado de Cobertura por Facultad y Dirección
            </h3>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${metrics.facultyBreakdown.map(fb => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #F8FAFC; border-radius: 8px; border: 1px solid var(--border-light);">
                  <div>
                    <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">${fb.faculty}</div>
                    <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                      ${fb.activeJobs} convocatorias en curso
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span style="font-size: 14px; font-weight: 800; color: #10B981;">${fb.hiresRate}</span>
                    <div style="font-size: 10px; color: var(--text-tertiary);">Éxito de Retención</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Right: Fuentes Más Efectivas -->
          <div class="card" style="padding: 20px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
            <h3 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">
              Canales de Atracción Más Rentables
            </h3>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${metrics.topChannels.map(ch => `
                <div style="padding: 10px; border-bottom: 1px solid var(--border-divider);">
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                    <span>${ch.name}</span>
                    <span style="color: #2563EB;">${ch.pct}% de ingresantes</span>
                  </div>
                  <div class="progress-bar-container" style="height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${ch.pct}%; height: 100%; background: #2563EB;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Bottom Section: Biblioteca de Perfiles Organizacionales (Cambio #4) -->
        <div style="margin-top: 28px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <div>
              <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 700; color: var(--text-main);">
                📚 Biblioteca de Perfiles Organizacionales Guardados
              </h3>
              <p style="font-size: 12.5px; color: var(--text-secondary);">
                Plantillas estandarizadas con criterios, pesos y filtros predefinidos para apertura inmediata de vacantes.
              </p>
            </div>
            <button class="btn btn-primary" onclick="alert('Abriendo editor de plantilla para crear nuevo perfil organizacional...')">
              + Crear Nueva Plantilla
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${templates.map(tpl => `
              <div class="talent-profile-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span class="role-badge role-${tpl.roleType}">
                      ${tpl.roleType.toUpperCase()}
                    </span>
                    <span style="font-size: 10.5px; color: var(--text-tertiary); font-weight: 700;">ID: ${tpl.id}</span>
                  </div>
                  <h4 style="font-family: var(--font-heading); font-size: 14.5px; font-weight: 700; color: var(--text-main); line-height: 1.3;">
                    ${tpl.title}
                  </h4>
                  <p style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; line-height: 1.4;">
                    ${tpl.description}
                  </p>

                  <div style="margin-top: 10px; padding: 8px; background: #F8FAFC; border-radius: 6px; border: 1px solid var(--border-light); font-size: 11px;">
                    <strong style="color: var(--text-main);">Regla Knockout:</strong> ${tpl.knockoutRule}
                  </div>
                </div>

                <div style="margin-top: 16px; border-top: 1px solid var(--border-divider); padding-top: 10px; display: flex; gap: 8px;">
                  <button class="btn btn-primary" style="flex: 1; font-size: 11.5px; padding: 6px 10px;" onclick="alert('Iniciando nueva convocatoria basada en la plantilla: ${tpl.title}')">
                    Usar Perfil
                  </button>
                  <button class="btn btn-secondary" style="font-size: 11.5px; padding: 6px 10px;" onclick="alert('Criterios configurados para ${tpl.title}:\\n\\n' + JSON.stringify(${JSON.stringify(tpl.criteria)}, null, 2))">
                    Ver Criterios
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  showProfilesLibraryModal() {
    const list = appState.templates.map((t, i) => `${i + 1}. [${t.roleType.toUpperCase()}] ${t.title}`).join('\n');
    alert(`📚 Biblioteca de Perfiles Organizacionales de ESAN:\n\n${list}\n\nSelecciona cualquier perfil para autocompletar una nueva convocatoria.`);
  }
}
