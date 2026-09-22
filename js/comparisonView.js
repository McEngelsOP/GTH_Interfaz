/* ==========================================================================
   TalentAI - GTHC · ESAN
   Candidate Multi-Comparison Matrix Engine (Cambio #6)
   ========================================================================== */

import { appState } from './state.js';

export class ComparisonViewController {
  constructor(containerEl) {
    this.container = containerEl;
    this.initListeners();
  }

  initListeners() {
    appState.subscribe((event) => {
      if ([
        'comparison_pool_changed',
        'view_changed',
        'job_changed'
      ].includes(event)) {
        if (appState.currentView === 'comparison') {
          this.render();
        }
      }
    });
  }

  render() {
    if (!this.container) return;

    let candidates = appState.getComparisonCandidates();

    // If no candidate was explicitly checked, auto-select top 3 so recruiter has immediate value
    if (candidates.length === 0) {
      const topCands = appState.candidates.slice(0, 3);
      topCands.forEach(c => appState.comparisonPool.add(c.id));
      candidates = topCands;
    }

    const weights = appState.jobPosting.weights || [];

    this.container.innerHTML = `
      <div class="comparison-view-card">
        <div class="comparison-view-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">⚖️</span>
              <h2 style="font-family: var(--font-heading); font-size: 20px; font-weight: 700; color: var(--text-main);">
                Comparador Multicandidato Cara a Cara
              </h2>
              <span class="role-badge role-${appState.jobPosting.roleType}">
                ${appState.jobPosting.roleTypeName}
              </span>
            </div>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
              Contraste multidimensional de competencias, pesos por perfil y brechas para: <strong>${appState.jobPosting.title}</strong>
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn btn-secondary" onclick="window.comparisonController.addMoreCandidatesPrompt()">
              + Agregar Candidato
            </button>
            <button class="btn btn-secondary" onclick="window.comparisonController.clearAndReset()">
              Limpiar Comparación
            </button>
            <button class="btn btn-primary" onclick="alert('Generando informe ejecutivo de comparativa en PDF para el Comité de Selección...')">
              Exportar Matriz PDF
            </button>
          </div>
        </div>

        <!-- AI Verdict Banner -->
        <div class="comparison-ai-verdict">
          <div class="verdict-icon">✦</div>
          <div class="verdict-content">
            <span class="verdict-title">Recomendación Algorítmica del Motor Dual GTHC</span>
            <p class="verdict-text">
              Para el perfil <strong>${appState.jobPosting.title}</strong>, 
              <strong>${candidates[0].name}</strong> presenta la mayor solidez integral (Score: ${candidates[0].score}/100) 
              con 0 brechas críticas y cumplimiento de Sunedu. 
              ${candidates.length > 1 ? `Como alternativa de alta proyección, <strong>${candidates[1].name}</strong> (Score: ${candidates[1].score}) destaca por su experiencia en el mercado local.` : ''}
            </p>
          </div>
        </div>

        <!-- Comparison Table -->
        <div class="comparison-table-wrapper">
          <table class="comparison-matrix-table">
            <thead>
              <tr>
                <th style="width: 240px; text-align: left;">Dimensión Evaluada</th>
                ${candidates.map(cand => `
                  <th class="cand-col-header">
                    <div class="cand-header-card">
                      <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span class="podium-rank-badge podium-${cand.rank <= 3 ? cand.rank : 'regular'}">
                          ${cand.rank === 1 ? '🥇 Top 1' : cand.rank === 2 ? '🥈 Top 2' : cand.rank === 3 ? '🥉 Top 3' : `#${cand.rank}`}
                        </span>
                        <button class="remove-from-compare-btn" data-id="${cand.id}" title="Quitar de la comparación">✕</button>
                      </div>
                      
                      <div class="cand-avatar-circle">${cand.name.split(' ').map(n=>n[0]).join('')}</div>
                      <div class="cand-header-name">${cand.name}</div>
                      <div class="cand-header-role">${cand.role}</div>
                      <div class="cand-header-company">${cand.company}</div>

                      <div class="cand-header-score">
                        <span class="score-big">${cand.score}</span>
                        <span class="score-label">/ 100</span>
                      </div>

                      <button class="btn-action-primary" style="width: 100%; margin-top: 10px;" data-action="advance-winner" data-id="${cand.id}">
                        Seleccionar y Avanzar
                      </button>
                    </div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              <!-- Row 1: Estado Pipeline -->
              <tr class="dim-category-row">
                <td colspan="${candidates.length + 1}">1. Estado en el Pipeline & Trazabilidad</td>
              </tr>
              <tr>
                <td class="dim-label">Etapa Actual</td>
                ${candidates.map(cand => `
                  <td class="dim-value">
                    <span class="stage-tag stage-${cand.stage}">${cand.stage.toUpperCase()}</span>
                  </td>
                `).join('')}
              </tr>
              <tr>
                <td class="dim-label">Fuente de Captación</td>
                ${candidates.map(cand => `
                  <td class="dim-value">
                    <span class="candidate-source-badge ${cand.source}">${cand.source.toUpperCase()}</span>
                  </td>
                `).join('')}
              </tr>
              <tr>
                <td class="dim-label">Potencial Transferible</td>
                ${candidates.map(cand => `
                  <td class="dim-value">
                    ${cand.transferablePotential 
                      ? '<span class="inclusion-badge">✦ Sí Detectado</span>' 
                      : '<span style="color: var(--text-tertiary);">Estándar</span>'}
                  </td>
                `).join('')}
              </tr>

              <!-- Row 2: Desglose por Criterios y Pesos del Puesto -->
              <tr class="dim-category-row">
                <td colspan="${candidates.length + 1}">2. Criterios Ponderados de Convocatoria (${appState.jobPosting.roleTypeName})</td>
              </tr>
              ${weights.map((w, wIdx) => `
                <tr>
                  <td class="dim-label">
                    <div style="font-weight: 600;">${w.label}</div>
                    <span style="font-size: 11px; color: var(--text-tertiary);">Peso: ${w.weightPct}% (${w.type})</span>
                  </td>
                  ${candidates.map(cand => {
                    const candWeight = (cand.weights && cand.weights[wIdx]) ? cand.weights[wIdx].scoreObtained : Math.round((cand.score * w.weightPct) / 100);
                    return `
                      <td class="dim-value">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                          <div class="progress-bar-container" style="width: 80px; height: 7px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${(candWeight / w.weightPct) * 100}%; height: 100%; background: #2563EB;"></div>
                          </div>
                          <strong style="font-size: 13px;">${candWeight}</strong>
                          <span style="font-size: 11px; color: var(--text-tertiary);">/ ${w.weightPct} pts</span>
                        </div>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}

              <!-- Row 3: Brechas & Riesgos -->
              <tr class="dim-category-row">
                <td colspan="${candidates.length + 1}">3. Detección de Brechas & Puntos Críticos para Entrevista</td>
              </tr>
              <tr>
                <td class="dim-label">Brechas Identificadas</td>
                ${candidates.map(cand => `
                  <td class="dim-value">
                    ${cand.gaps && cand.gaps.length > 0 && cand.gaps[0].severity !== 'none' ? `
                      <div class="gap-badge has-gap" style="white-space: normal; text-align: left;">
                        ⚠️ ${cand.gaps[0].item}
                      </div>
                      ${cand.gaps[0].tip ? `<div style="font-size: 10.5px; color: var(--text-tertiary); margin-top: 4px; text-align: left;">${cand.gaps[0].tip}</div>` : ''}
                    ` : `
                      <div class="gap-badge clean">✅ Cumple 100% de requerimientos</div>
                    `}
                  </td>
                `).join('')}
              </tr>
              <tr>
                <td class="dim-label">Riesgo Operativo / Pedagógico</td>
                ${candidates.map(cand => `
                  <td class="dim-value" style="font-size: 11.5px; color: var(--text-secondary); text-align: left; padding: 12px;">
                    ${cand.risks && cand.risks.length > 0 ? cand.risks[0] : 'Sin riesgos registrados.'}
                  </td>
                `).join('')}
              </tr>
              <tr>
                <td class="dim-label">Pregunta Clave STAR Recomendada</td>
                ${candidates.map(cand => `
                  <td class="dim-value" style="font-size: 11.5px; color: #1E293B; text-align: left; padding: 12px; background: #F8FAFC;">
                    💬 <em>"${cand.interviewStarQuestions && cand.interviewStarQuestions[0] ? cand.interviewStarQuestions[0] : '¿Cuál es su principal factor diferenciador para esta cátedra?'}"</em>
                  </td>
                `).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  addMoreCandidatesPrompt() {
    const unselected = appState.candidates.filter(c => !appState.comparisonPool.has(c.id));
    if (unselected.length === 0) {
      alert("Todos los candidatos disponibles ya están en la matriz de comparación.");
      return;
    }
    const names = unselected.map((c, i) => `${i + 1}. ${c.name} (Score: ${c.score})`).join('\n');
    const choice = prompt(`Selecciona el número del candidato a agregar:\n\n${names}`);
    const index = parseInt(choice, 10) - 1;
    if (index >= 0 && index < unselected.length) {
      appState.toggleComparisonCandidate(unselected[index].id);
      this.render();
    }
  }

  clearAndReset() {
    appState.clearComparisonPool();
    this.render();
  }

  bindEvents() {
    this.container.querySelectorAll('.remove-from-compare-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        appState.toggleComparisonCandidate(id);
        this.render();
      });
    });

    this.container.querySelectorAll('[data-action="advance-winner"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === id);
        if (cand) {
          appState.moveCandidateStage(id, 'oferta');
          alert(`🏆 ${cand.name} ha sido seleccionado como el candidato preferente y avanzado a etapa de Oferta.`);
        }
      });
    });
  }
}
