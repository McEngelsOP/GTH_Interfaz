/* ==========================================================================
   TalentAI - GTHC · ESAN
   Closed-Loop Hiring Effectiveness & AI Calibration Engine (Vista RRHH vs Avanzada)
   ========================================================================== */

import { appState } from './state.js';

export class EffectivenessViewController {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeMode = 'rrhh'; // 'rrhh' | 'avanzada'
    this.initListeners();
  }

  initListeners() {
    appState.subscribe((event) => {
      if (event === 'view_changed' && appState.currentView === 'effectiveness') {
        this.render();
      }
    });
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="effectiveness-wrapper">
        <!-- Header con Switch Vista RRHH vs Avanzada -->
        <div class="effectiveness-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 24px;">📈</span>
              <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--text-main);">
                Efectividad Real de Contratación & Ciclo Cerrado IA
              </h2>
            </div>
            <p style="font-size: 13.5px; color: var(--text-secondary); margin-top: 4px;">
              Validación longitudinal entre el <strong>Score Inicial de TalentAI</strong> y el <strong>Desempeño Real a 6 meses</strong> para calibrar pesos en futuras convocatorias.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <!-- Segmented Switch Vista RRHH / Vista Avanzada (Recomendación del Usuario) -->
            <div class="effectiveness-mode-switch">
              <button class="mode-switch-btn ${this.activeMode === 'rrhh' ? 'active' : ''}" data-mode="rrhh">
                👔 Vista RRHH
              </button>
              <button class="mode-switch-btn ${this.activeMode === 'avanzada' ? 'active' : ''}" data-mode="avanzada">
                🔬 Vista Avanzada (Admin)
              </button>
            </div>

            <button class="btn btn-primary" onclick="alert('Generando reporte longitudinal de correlación psicométrica y desempeño...')">
              Exportar Análisis
            </button>
          </div>
        </div>

        ${this.activeMode === 'rrhh' ? this.renderRrhhView() : this.renderAdvancedView()}
      </div>
    `;

    this.bindEvents();
  }

  renderRrhhView() {
    return `
      <!-- KPI Resumen RRHH -->
      <div class="kpi-grid" style="margin-bottom: 24px;">
        <div class="kpi-card kpi-accent-success">
          <div class="kpi-header">
            <span class="kpi-label">Precisión Predictiva IA</span>
            <div class="kpi-icon-wrapper" style="color: #10B981; background: #ECFDF5;">🎯</div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">91.4%</span>
            <span class="kpi-unit">acierto</span>
          </div>
          <div class="kpi-subtitle">
            <span>Score inicial vs evaluación a 6 meses</span>
          </div>
        </div>

        <div class="kpi-card kpi-accent-primary">
          <div class="kpi-header">
            <span class="kpi-label">Colaboradores Monitoreados</span>
            <div class="kpi-icon-wrapper">👔</div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">38</span>
            <span class="kpi-unit">contratados</span>
          </div>
          <div class="kpi-subtitle">
            <span>Evaluados formalmente a 6 meses</span>
          </div>
        </div>

        <div class="kpi-card kpi-accent-info">
          <div class="kpi-header">
            <span class="kpi-label">Retención a 6 Meses</span>
            <div class="kpi-icon-wrapper" style="color: #2563EB; background: #EFF6FF;">🛡️</div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">94.7%</span>
            <span class="kpi-unit">permanencia</span>
          </div>
          <div class="kpi-subtitle">
            <span>Solo 2 deserciones en 1 año</span>
          </div>
        </div>

        <div class="kpi-card kpi-accent-warning">
          <div class="kpi-header">
            <span class="kpi-label">Calibraciones Sugeridas</span>
            <div class="kpi-icon-wrapper" style="color: #D97706; background: #FEF3C7;">⚡</div>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value">2</span>
            <span class="kpi-unit">ajustes</span>
          </div>
          <div class="kpi-subtitle">
            <span>Para optimizar plantillas docentes</span>
          </div>
        </div>
      </div>

      <!-- Sugerencia Accionable RRHH -->
      <div class="closed-loop-card">
        <div style="display: flex; items-align: flex-start; justify-content: space-between; gap: 16px;">
          <div style="display: flex; gap: 14px;">
            <div class="closed-loop-icon">🤖</div>
            <div>
              <h4 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: #1E3A8A;">
                Sugerencia de Auto-Calibración de Criterios (Feedback Continuo)
              </h4>
              <p style="font-size: 13px; color: #1E293B; margin-top: 4px; line-height: 1.5;">
                Los docentes contratados con mayor puntaje en <strong>"Experiencia Docente Universitaria"</strong> 
                obtuvieron un <strong>16% más de satisfacción estudiantil</strong> en la encuesta docente semestral que aquellos seleccionados primordialmente por publicaciones teóricas.
              </p>
              <div style="margin-top: 10px;">
                <span style="font-size: 12px; font-weight: 700; color: #047857; background: #ECFDF5; padding: 4px 10px; border-radius: 4px; border: 1px solid #A7F3D0;">
                  Acción recomendada: Aumentar peso pedagógico de 10% a 15% en Plantilla Docente
                </span>
              </div>
            </div>
          </div>

          <button class="btn btn-primary" onclick="alert('✅ Calibración aplicada: La plantilla Docente TI ha sido actualizada con 15% en Experiencia Pedagógica.');">
            ⚡ Aplicar Calibración
          </button>
        </div>
      </div>

      <!-- Trazabilidad Longitudinal Simplificada -->
      <div class="card" style="margin-top: 24px; padding: 20px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
        <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">
          Trazabilidad Longitudinal: Score Inicial vs Desempeño a 6 Meses
        </h3>

        <table class="comparison-matrix-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left;">Colaborador Contratado</th>
              <th style="text-align: left;">Puesto Asignado</th>
              <th style="text-align: center;">Score TalentAI</th>
              <th style="text-align: center;">Evaluación 6 Meses</th>
              <th style="text-align: center;">Desviación</th>
              <th style="text-align: left;">Diagnóstico del Comité</th>
              <th style="text-align: center;">Retención</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Marcia Samin</strong></td>
              <td>Docente Cloud & Software</td>
              <td style="text-align: center;"><span style="font-weight: 800; color: #2563EB;">92 / 100</span></td>
              <td style="text-align: center;"><span style="font-weight: 800; color: #10B981;">95 / 100</span></td>
              <td style="text-align: center; color: #10B981; font-weight: 700;">+3.2% (Acierto)</td>
              <td style="font-size: 12px; color: var(--text-secondary);">97% de aprobación estudiantil en cátedra.</td>
              <td style="text-align: center;"><span class="stage-tag stage-contratado">Activa</span></td>
            </tr>
            <tr>
              <td><strong>Carlos Mendoza</strong></td>
              <td>Docente Ingeniería Software</td>
              <td style="text-align: center;"><span style="font-weight: 800; color: #2563EB;">89 / 100</span></td>
              <td style="text-align: center;"><span style="font-weight: 800; color: #10B981;">91 / 100</span></td>
              <td style="text-align: center; color: #10B981; font-weight: 700;">+2.2% (Acierto)</td>
              <td style="font-size: 12px; color: var(--text-secondary);">Excelente desarrollo de casos reales de la industria en aula.</td>
              <td style="text-align: center;"><span class="stage-tag stage-contratado">Activa</span></td>
            </tr>
            <tr>
              <td><strong>Jorge Alarcón</strong></td>
              <td>Técnico Mantenimiento</td>
              <td style="text-align: center;"><span style="font-weight: 800; color: #2563EB;">93 / 100</span></td>
              <td style="text-align: center;"><span style="font-weight: 800; color: #10B981;">96 / 100</span></td>
              <td style="text-align: center; color: #10B981; font-weight: 700;">+3.2% (Acierto)</td>
              <td style="font-size: 12px; color: var(--text-secondary);">Cero incidentes en turno rotativo; respuesta inmediata.</td>
              <td style="text-align: center;"><span class="stage-tag stage-contratado">Activa</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  renderAdvancedView() {
    return `
      <!-- Vista Avanzada para Administradores de Modelos -->
      <div class="advanced-analytics-container">
        <div class="advanced-alert-banner">
          <span>🔬</span>
          <div>
            <strong>Panel Estadístico de Calibración de Modelos (Solo Administradores):</strong>
            <p style="margin: 0; font-size: 12px; color: #1E3A8A;">
              Métricas psicométricas, coeficientes de regresión multivariable y curvas ROC del motor de Matching Dual (ML + LLM).
            </p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0;">
          <div class="card" style="padding: 16px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">Correlación de Pearson (r)</div>
            <div style="font-size: 28px; font-weight: 800; color: #2563EB; margin: 6px 0;">r = 0.864</div>
            <div style="font-size: 11px; color: var(--status-success); font-weight: 600;">p-value < 0.0001 (Altamente Significativo)</div>
          </div>

          <div class="card" style="padding: 16px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">Área Bajo la Curva ROC (AUC)</div>
            <div style="font-size: 28px; font-weight: 800; color: #059669; margin: 6px 0;">AUC = 0.932</div>
            <div style="font-size: 11px; color: var(--text-tertiary);">Excelente discriminación de candidatos idóneos</div>
          </div>

          <div class="card" style="padding: 16px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">Índice de Disparate Impact (Bias)</div>
            <div style="font-size: 28px; font-weight: 800; color: #7C3AED; margin: 6px 0;">DI = 0.98</div>
            <div style="font-size: 11px; color: var(--status-success); font-weight: 600;">Cumple regla de las 4/5 partes (Sin sesgo)</div>
          </div>
        </div>

        <!-- Matriz de Coeficientes de Regresión -->
        <div class="card" style="padding: 20px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
          <h4 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">
            Variables Predictivas y Pesos Empíricos Calibrados
          </h4>

          <table class="comparison-matrix-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="text-align: left;">Variable Evaluada</th>
                <th style="text-align: center;">Peso Teórico Actual</th>
                <th style="text-align: center;">Peso Empírico Sugerido</th>
                <th style="text-align: center;">Correlación con Desempeño</th>
                <th style="text-align: left;">Recomendación del Algoritmo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Experiencia Profesional</strong></td>
                <td style="text-align: center;">30%</td>
                <td style="text-align: center; font-weight: 700; color: #2563EB;">28%</td>
                <td style="text-align: center;">r = +0.72</td>
                <td style="font-size: 11.5px; color: var(--text-secondary);">Ajuste menor (-2%). Alta validez en cátedras avanzadas.</td>
              </tr>
              <tr>
                <td><strong>Similitud Semántica (LLM)</strong></td>
                <td style="text-align: center;">30%</td>
                <td style="text-align: center; font-weight: 700; color: #2563EB;">27%</td>
                <td style="text-align: center;">r = +0.81</td>
                <td style="font-size: 11.5px; color: var(--text-secondary);">Excelente alineamiento con syllabus universitario.</td>
              </tr>
              <tr>
                <td><strong>Experiencia Docente Universitaria</strong></td>
                <td style="text-align: center;">10%</td>
                <td style="text-align: center; font-weight: 700; color: #059669;">15% (+5%)</td>
                <td style="text-align: center; font-weight: 700; color: #059669;">r = +0.88</td>
                <td style="font-size: 11.5px; color: #047857; font-weight: 600;">Máxima correlación con satisfacción del estudiante.</td>
              </tr>
              <tr>
                <td><strong>Stack Tecnológico Específico</strong></td>
                <td style="text-align: center;">20%</td>
                <td style="text-align: center; font-weight: 700; color: #2563EB;">20%</td>
                <td style="text-align: center;">r = +0.65</td>
                <td style="font-size: 11.5px; color: var(--text-secondary);">Peso equilibrado; mantener en 20%.</td>
              </tr>
              <tr>
                <td><strong>Certificaciones & Grado</strong></td>
                <td style="text-align: center;">10%</td>
                <td style="text-align: center; font-weight: 700; color: #D97706;">10%</td>
                <td style="text-align: center;">r = +0.58</td>
                <td style="font-size: 11.5px; color: var(--text-secondary);">Knockout SUNEDU cubre el piso legal.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelectorAll('.mode-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeMode = btn.getAttribute('data-mode');
        this.render();
      });
    });
  }
}
