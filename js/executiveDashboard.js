/* ==========================================================================
   TalentAI - GTHC · ESAN
   Executive Dashboard for Deans & High-Level Leadership (Rediseño Simplificado)
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

    this.container.innerHTML = `
      <div class="executive-wrapper">
        <!-- Header -->
        <div class="executive-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 24px;">📊</span>
              <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--text-main);">
                Dashboard Ejecutivo para Decanos, Directores & Gerencia
              </h2>
            </div>
            <p style="font-size: 13.5px; color: var(--text-secondary); margin-top: 4px;">
              Consolidado estratégico de atracción, cobertura y efectividad del talento en <strong>ESAN Graduate School of Business</strong>.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn btn-secondary" onclick="appState.setCurrentView('profilesLibrary')">
              📚 Ir a Biblioteca de Perfiles
            </button>
            <button class="btn btn-primary" onclick="alert('Generando informe ejecutivo consolidado en PDF para el Consejo Directivo de ESAN...')">
              Exportar Informe Ejecutivo
            </button>
          </div>
        </div>

        <!-- 1. HERO KPI PRINCIPAL (Recomendación Ejecutiva: Cobertura de Vacantes 94%) -->
        <div class="executive-hero-kpi-card">
          <div class="hero-kpi-main-block">
            <div class="hero-kpi-header">
              <span class="hero-kpi-badge">INDICADOR PRINCIPAL DE GESTIÓN</span>
              <span class="hero-kpi-period">Semestre 2026-II · GTHC</span>
            </div>
            <div class="hero-kpi-value-row">
              <div class="hero-kpi-number">94.0%</div>
              <div class="hero-kpi-context">
                <span class="hero-kpi-title">Cobertura de Vacantes Institucionales</span>
                <span class="hero-kpi-meta">
                  <strong style="color: #047857;">+4.0%</strong> por encima de la meta institucional (90%) · 17 de 18 plazas cubiertas o en fase de oferta final
                </span>
              </div>
            </div>
            <div class="hero-kpi-progress-bar">
              <div class="hero-kpi-progress-fill" style="width: 94%;"></div>
            </div>
          </div>

          <div class="hero-kpi-side-metric">
            <span class="side-metric-label">Tiempo de Retención 6m</span>
            <span class="side-metric-val">94.7%</span>
            <span class="side-metric-sub">Solo 2 deserciones anuales</span>
          </div>
        </div>

        <!-- 2. KPIS SECUNDARIOS (18 vacantes, 845 candidatos, 12.4 días cobertura, 89% éxito) -->
        <div class="kpi-grid" style="margin-bottom: 24px;">
          <!-- KPI Secundario 1: Plazas Activas -->
          <div class="kpi-card kpi-accent-primary">
            <div class="kpi-header">
              <span class="kpi-label">Vacantes Convocadas</span>
              <div class="kpi-icon-wrapper">📂</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">18</span>
              <span class="kpi-unit">vacantes</span>
            </div>
            <div class="kpi-subtitle">
              <span>8 Docentes · 5 Admin · 3 Ope · 2 Dir</span>
            </div>
          </div>

          <!-- KPI Secundario 2: Candidatos Evaluados -->
          <div class="kpi-card kpi-accent-info">
            <div class="kpi-header">
              <span class="kpi-label">Candidatos Evaluados</span>
              <div class="kpi-icon-wrapper" style="color: #2563EB; background: #EFF6FF;">👥</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">845</span>
              <span class="kpi-unit">postulantes</span>
            </div>
            <div class="kpi-subtitle">
              <span>Procesados vía OCR & Matching Dual</span>
            </div>
          </div>

          <!-- KPI Secundario 3: Tiempo Cobertura -->
          <div class="kpi-card kpi-accent-success">
            <div class="kpi-header">
              <span class="kpi-label">Días de Cobertura</span>
              <div class="kpi-icon-wrapper" style="color: #10B981; background: #ECFDF5;">⏱️</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">12.4</span>
              <span class="kpi-unit">días</span>
            </div>
            <div class="kpi-subtitle">
              <span style="color: #10B981; font-weight: 700;">-2.6 días</span>
              <span>vs meta institucional (15d)</span>
            </div>
          </div>

          <!-- KPI Secundario 4: Éxito en Contratación -->
          <div class="kpi-card kpi-accent-warning">
            <div class="kpi-header">
              <span class="kpi-label">Éxito en Selección</span>
              <div class="kpi-icon-wrapper" style="color: #D97706; background: #FEF3C7;">⭐</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">89.2%</span>
              <span class="kpi-unit">satisfacción</span>
            </div>
            <div class="kpi-subtitle">
              <span>Evaluación docente y de desempeño</span>
            </div>
          </div>
        </div>

        <!-- 3. Two Column Analytical Breakdown -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
          <!-- Left: Cobertura por Facultad -->
          <div class="card" style="padding: 20px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
            <h3 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">
              Estado de Cobertura por Facultad y Área
            </h3>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${metrics.facultyBreakdown.map(fb => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #F8FAFC; border-radius: 8px; border: 1px solid var(--border-light);">
                  <div>
                    <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">${fb.faculty}</div>
                    <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                      ${fb.activeJobs} convocatorias abiertas
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

          <!-- Right: Canales de Atracción -->
          <div class="card" style="padding: 20px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
            <h3 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">
              Efectividad por Canal de Atracción
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

        <!-- 4. Quick Gateway to Autonomous Profiles Library -->
        <div class="profiles-library-cta-banner">
          <div>
            <h4 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: #1E3A8A;">
              📚 Biblioteca de Perfiles Organizacionales de ESAN
            </h4>
            <p style="font-size: 13px; color: #2563EB; margin-top: 3px;">
              Configura y estandariza los criterios, ponderaciones y knockouts por tipo de puesto (Docente, Administrativo, Operativo, Directivo).
            </p>
          </div>
          <button class="btn btn-primary" onclick="appState.setCurrentView('profilesLibrary')">
            Explorar Biblioteca de Perfiles →
          </button>
        </div>
      </div>
    `;
  }

  showProfilesLibraryModal() {
    appState.setCurrentView('profilesLibrary');
  }
}
