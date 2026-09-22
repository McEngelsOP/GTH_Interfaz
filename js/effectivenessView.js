/* ==========================================================================
   TalentAI - GTHC · ESAN
   Closed-Loop Hiring Effectiveness & 6-Month Performance Engine (Cambio #12)
   ========================================================================== */

import { appState } from './state.js';

export class EffectivenessViewController {
  constructor(containerEl) {
    this.container = containerEl;
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
        <!-- Header -->
        <div class="effectiveness-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 22px;">📈</span>
              <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--text-main);">
                Efectividad Real de Contratación & Ciclo Cerrado IA
              </h2>
            </div>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
              Validación longitudinal entre el <strong>Score Inicial de TalentAI</strong> y la <strong>Evaluación de Desempeño a los 6 meses</strong> para calibrar pesos en convocatorias futuras.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="role-badge role-${appState.jobPosting.roleType}">
              Rol: ${appState.jobPosting.roleTypeName}
            </span>
            <button class="btn btn-primary" onclick="alert('Generando reporte longitudinal de correlación psicométrica y desempeño...')">
              Exportar Análisis
            </button>
          </div>
        </div>

        <!-- 4 Metrics Row -->
        <div class="kpi-grid" style="margin-bottom: 20px;">
          <div class="kpi-card kpi-accent-success">
            <div class="kpi-header">
              <span class="kpi-label">Precisión Predictiva IA</span>
              <div class="kpi-icon-wrapper" style="color: #10B981; background: #ECFDF5;">🎯</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">91.4%</span>
              <span class="kpi-unit">correlación</span>
            </div>
            <div class="kpi-subtitle">
              <span>Score inicial vs desempeño 6m</span>
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
              <span class="kpi-label">Recomendaciones de Calibración</span>
              <div class="kpi-icon-wrapper" style="color: #D97706; background: #FEF3C7;">⚡</div>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">2</span>
              <span class="kpi-unit">ajustes sugeridos</span>
            </div>
            <div class="kpi-subtitle">
              <span>Optimización de pesos de plantilla</span>
            </div>
          </div>
        </div>

        <!-- AI Closed-Loop Recommendation Banner -->
        <div class="closed-loop-card">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;">
            <div style="display: flex; gap: 14px;">
              <div class="closed-loop-icon">🤖</div>
              <div>
                <h4 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: #1E3A8A;">
                  Sugerencia de Auto-Calibración de Criterios (Feedback Continuo)
                </h4>
                <p style="font-size: 13px; color: #1E293B; margin-top: 4px; line-height: 1.5;">
                  Los datos del último semestre demuestran que los docentes contratados con mayor puntaje en 
                  <strong>"Experiencia Docente Universitaria"</strong> obtuvieron un <strong>16% más de satisfacción estudiantil</strong> 
                  en la encuesta docente que aquellos seleccionados primordialmente por publicaciones teóricas.
                </p>
                <div style="margin-top: 10px; display: flex; align-items: center; gap: 12px;">
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

        <!-- Historical Performance Tracking Table -->
        <div class="card" style="margin-top: 24px; padding: 20px; background: #FFF; border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
          <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">
            Trazabilidad Longitudinal: Score Inicial vs Desempeño a 6 Meses
          </h3>

          <table class="comparison-matrix-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="text-align: left;">Colaborador Contratado</th>
                <th style="text-align: left;">Puesto Asignado</th>
                <th style="text-align: center;">Score TalentAI (Ingreso)</th>
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
                <td style="font-size: 12px; color: var(--text-secondary);">97% de aprobación estudiantil en cátedra. Modelo altamente preciso.</td>
                <td style="text-align: center;"><span class="stage-tag stage-contratado">Activa</span></td>
              </tr>
              <tr>
                <td><strong>Carlos Mendoza</strong></td>
                <td>Docente de Ingeniería de Software</td>
                <td style="text-align: center;"><span style="font-weight: 800; color: #2563EB;">89 / 100</span></td>
                <td style="text-align: center;"><span style="font-weight: 800; color: #10B981;">91 / 100</span></td>
                <td style="text-align: center; color: #10B981; font-weight: 700;">+2.2% (Acierto)</td>
                <td style="font-size: 12px; color: var(--text-secondary);">Excelente desarrollo de casos reales de la industria en aula.</td>
                <td style="text-align: center;"><span class="stage-tag stage-contratado">Activa</span></td>
              </tr>
              <tr>
                <td><strong>Jorge Alarcón</strong></td>
                <td>Técnico de Mantenimiento Campus</td>
                <td style="text-align: center;"><span style="font-weight: 800; color: #2563EB;">93 / 100</span></td>
                <td style="text-align: center;"><span style="font-weight: 800; color: #10B981;">96 / 100</span></td>
                <td style="text-align: center; color: #10B981; font-weight: 700;">+3.2% (Acierto)</td>
                <td style="font-size: 12px; color: var(--text-secondary);">Cero incidentes en turno rotativo; respuesta inmediata en infraestructura.</td>
                <td style="text-align: center;"><span class="stage-tag stage-contratado">Activa</span></td>
              </tr>
              <tr>
                <td><strong>Patricia Valdivia</strong></td>
                <td>Coordinadora de Admisiones</td>
                <td style="text-align: center;"><span style="font-weight: 800; color: #2563EB;">91 / 100</span></td>
                <td style="text-align: center;"><span style="font-weight: 800; color: #10B981;">94 / 100</span></td>
                <td style="text-align: center; color: #10B981; font-weight: 700;">+3.3% (Acierto)</td>
                <td style="font-size: 12px; color: var(--text-secondary);">Optimización del proceso de matrícula en ERP Banner (-32% tiempo).</td>
                <td style="text-align: center;"><span class="stage-tag stage-contratado">Activa</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}
