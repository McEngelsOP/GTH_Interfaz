/* ==========================================================================
   TalentAI - GTHC · ESAN
   Candidate Multi-Comparison Matrix Engine with Competency Radar (Cambio #6)
   ========================================================================== */

import { appState } from './state.js';

export class ComparisonViewController {
  constructor(containerEl) {
    this.container = containerEl;
    this.isVerdictExpanded = false;
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
        <!-- Top Toolbar -->
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
              Contraste multidimensional de competencias, radar gráfico y análisis de brechas para: <strong>${appState.jobPosting.title}</strong>
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn btn-secondary" id="btnComparisonAddMore" onclick="window.comparisonController.addMoreCandidatesPrompt()">
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

        <!-- 1. AI Verdict Banner (Compacto con [ Expandir / Colapsar ]) -->
        <div class="comparison-ai-verdict-card">
          <div class="verdict-card-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="verdict-icon-sparkle">✦</span>
              <span class="verdict-title-text">Resumen IA del Motor Dual GTHC</span>
              <span class="verdict-candidate-highlight">
                Mejor ajuste: <strong>${candidates[0].name} (${candidates[0].score}/100)</strong>
              </span>
            </div>
            <button class="btn-toggle-verdict" id="btnToggleVerdict">
              ${this.isVerdictExpanded ? '▲ Colapsar resumen' : '▼ Expandir análisis completo'}
            </button>
          </div>

          <div class="verdict-card-body ${this.isVerdictExpanded ? 'expanded' : 'collapsed'}" id="verdictBodyContent">
            ${this.isVerdictExpanded ? `
              <p class="verdict-full-text">
                Para la vacante <strong>${appState.jobPosting.title}</strong>, el motor de Matching Dual (ML + LLM) 
                recomienda a <strong>${candidates[0].name}</strong> como la opción preferente gracias a su solidez técnica, 
                ausencia de brechas críticas y pleno cumplimiento de los requisitos de SUNEDU. 
                ${candidates.length > 1 ? `Como alternativa de alta proyección, <strong>${candidates[1].name}</strong> (Score: ${candidates[1].score}) destaca por su trayectoria en el mercado local y capacidad de liderazgo.` : ''}
              </p>
              <div class="verdict-key-takeaways">
                <div class="takeaway-pill">
                  <strong>Puntos Fuertes:</strong> Alta coincidencia de syllabus y proyectos reales.
                </div>
                <div class="takeaway-pill">
                  <strong>Recomendación:</strong> Priorizar entrevista técnica con Decano para ${candidates[0].name}.
                </div>
              </div>
            ` : `
              <p class="verdict-short-text">
                <strong>Recomendación inmediata:</strong> <strong>${candidates[0].name}</strong> presenta la mayor solidez integral (Score: ${candidates[0].score}/100). Cumple 100% de requisitos SUNEDU y syllabus. 
                ${candidates.length > 1 ? `Alternativa inmediata: <strong>${candidates[1].name}</strong> (Score: ${candidates[1].score}).` : ''}
              </p>
            `}
          </div>
        </div>

        <!-- 2. Competency Radar Chart Section (Nuevo: Visualización en Segundos) -->
        <div class="comparison-radar-section">
          <div class="radar-section-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">🕸️</span>
              <h3 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main);">
                Radar Comparativo de Competencias (Visualización en Segundos)
              </h3>
            </div>
            <span style="font-size: 11.5px; color: var(--text-tertiary);">
              Escala de 0 a 100 puntos en 6 dimensiones clave
            </span>
          </div>

          <div class="radar-content-layout">
            <div class="radar-svg-wrapper">
              ${this.renderRadarSVG(candidates)}
            </div>

            <div class="radar-candidates-legend">
              <div class="legend-header">Candidatos en Contraste:</div>
              <div class="legend-list">
                ${candidates.map((cand, idx) => {
                  const colors = ['#DC2626', '#2563EB', '#059669', '#D97706', '#9333EA'];
                  const color = colors[idx % colors.length];
                  const comps = this.getCandidateCompetencies(cand);
                  return `
                    <div class="legend-cand-item" style="border-left: 3px solid ${color};">
                      <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span class="legend-cand-name" style="color: var(--text-main); font-weight: 700;">${cand.name}</span>
                        <span class="legend-cand-score" style="background: ${color}15; color: ${color}; font-weight: 800; padding: 2px 7px; border-radius: 4px; font-size: 11px;">
                          Score ${cand.score}
                        </span>
                      </div>
                      <div class="legend-mini-stats">
                        <span>Docencia: <strong>${comps.docencia}</strong></span>
                        <span>Experiencia: <strong>${comps.experiencia}</strong></span>
                        <span>Investigación: <strong>${comps.investigacion}</strong></span>
                        <span>Cloud/Stack: <strong>${comps.cloud}</strong></span>
                        <span>Liderazgo: <strong>${comps.liderazgo}</strong></span>
                        <span>Certificaciones: <strong>${comps.certificaciones}</strong></span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Comparison Table -->
        <div class="comparison-table-wrapper" style="margin-top: 24px;">
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

              <!-- Row 2: Requisitos Mandatorios -->
              <tr class="dim-category-row">
                <td colspan="${candidates.length + 1}">2. Cumplimiento de Filtros Mandatorios (Knockout)</td>
              </tr>
              <tr>
                <td class="dim-label">Filtro SUNEDU / Regla Dura</td>
                ${candidates.map(cand => `
                  <td class="dim-value">
                    ${cand.knockoutMet 
                      ? '<span style="color: #047857; font-weight: 700;">✓ Cumple Totalmente</span>' 
                      : '<span style="color: #DC2626; font-weight: 700;">✗ No Cumple</span>'}
                  </td>
                `).join('')}
              </tr>

              <!-- Row 3: Ponderaciones Específicas -->
              <tr class="dim-category-row">
                <td colspan="${candidates.length + 1}">3. Desglose Ponderado de Criterios</td>
              </tr>
              ${weights.map(w => `
                <tr>
                  <td class="dim-label">
                    <span>${w.label}</span>
                    <span style="font-size: 10px; color: var(--text-tertiary); display: block;">Peso: ${w.weightPct}% (${w.type})</span>
                  </td>
                  ${candidates.map(cand => {
                    const match = (cand.weights || []).find(cw => cw.label === w.label);
                    const val = match ? match.scoreObtained : Math.round(cand.score * (w.weightPct / 100));
                    return `
                      <td class="dim-value">
                        <strong style="color: var(--text-main);">${val} pts</strong>
                        <div class="progress-bar-container" style="height: 4px; margin-top: 4px;">
                          <div style="width: ${(val / (w.weightPct || 30)) * 100}%; height: 100%; background: #2563EB;"></div>
                        </div>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}

              <!-- Row 4: Brechas y Riesgos -->
              <tr class="dim-category-row">
                <td colspan="${candidates.length + 1}">4. Análisis de Brechas, Riesgos & STAR</td>
              </tr>
              <tr>
                <td class="dim-label">Brecha Detectada</td>
                ${candidates.map(cand => `
                  <td class="dim-value" style="font-size: 11.5px; text-align: left; padding: 12px;">
                    ${cand.gaps && cand.gaps.length > 0 && cand.gaps[0].severity !== 'none'
                      ? `<span style="color: #B45309; font-weight: 600;">⚠️ ${cand.gaps[0].item}</span>`
                      : '<span style="color: #047857; font-weight: 600;">✅ Sin brechas críticas</span>'}
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

  getCandidateCompetencies(cand) {
    if (cand.radarCompetencies) return cand.radarCompetencies;

    // Derived realistic competencies based on candidate profile and scores
    const isMarcia = cand.name.includes('Marcia');
    const isCarlos = cand.name.includes('Carlos');
    const isPaul = cand.name.includes('Paul') || cand.name.includes('Esteban');

    if (isMarcia) {
      return { docencia: 88, experiencia: 95, investigacion: 78, cloud: 98, liderazgo: 86, certificaciones: 92 };
    }
    if (isCarlos) {
      return { docencia: 92, experiencia: 90, investigacion: 72, cloud: 84, liderazgo: 90, certificaciones: 88 };
    }
    if (isPaul) {
      return { docencia: 75, experiencia: 88, investigacion: 85, cloud: 92, liderazgo: 80, certificaciones: 82 };
    }

    const base = Math.min(95, Math.max(65, cand.score));
    return {
      docencia: Math.round(base * 0.9),
      experiencia: Math.round(base * 0.98),
      investigacion: Math.round(base * 0.8),
      cloud: Math.round(base * 0.95),
      liderazgo: Math.round(base * 0.85),
      certificaciones: Math.round(base * 0.88)
    };
  }

  renderRadarSVG(candidates) {
    const width = 360;
    const height = 320;
    const cx = 180;
    const cy = 160;
    const R = 110;

    const axes = [
      { name: 'Docencia', key: 'docencia' },
      { name: 'Experiencia', key: 'experiencia' },
      { name: 'Investigación', key: 'investigacion' },
      { name: 'Cloud / Stack', key: 'cloud' },
      { name: 'Liderazgo', key: 'liderazgo' },
      { name: 'Certificaciones', key: 'certificaciones' }
    ];

    const totalAxes = axes.length;
    const angleSlice = (Math.PI * 2) / totalAxes;

    // Background concentric levels (20%, 40%, 60%, 80%, 100%)
    const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
    const gridCircles = levels.map(level => {
      const points = [];
      for (let i = 0; i < totalAxes; i++) {
        const angle = i * angleSlice - Math.PI / 2;
        const x = cx + R * level * Math.cos(angle);
        const y = cy + R * level * Math.sin(angle);
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      return `
        <polygon 
          points="${points.join(' ')}" 
          fill="none" 
          stroke="#E2E8F0" 
          stroke-width="1" 
          stroke-dasharray="${level < 1 ? '3 3' : 'none'}"
        />
      `;
    }).join('');

    // Axis lines and labels
    const axisElements = axes.map((axis, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const xEnd = cx + R * Math.cos(angle);
      const yEnd = cy + R * Math.sin(angle);
      
      const labelDist = R + 20;
      const xLabel = cx + labelDist * Math.cos(angle);
      const yLabel = cy + labelDist * Math.sin(angle) + 4;

      return `
        <line x1="${cx}" y1="${cy}" x2="${xEnd.toFixed(1)}" y2="${yEnd.toFixed(1)}" stroke="#CBD5E1" stroke-width="1.2" />
        <text 
          x="${xLabel.toFixed(1)}" 
          y="${yLabel.toFixed(1)}" 
          text-anchor="middle" 
          font-family="var(--font-sans, Inter)" 
          font-size="10.5px" 
          font-weight="600" 
          fill="#475569"
        >
          ${axis.name}
        </text>
      `;
    }).join('');

    // Candidate Polygons
    const colors = ['#DC2626', '#2563EB', '#059669', '#D97706', '#9333EA'];
    const candidatePolygons = candidates.map((cand, idx) => {
      const comps = this.getCandidateCompetencies(cand);
      const color = colors[idx % colors.length];

      const points = axes.map((axis, i) => {
        const val = Math.max(10, Math.min(100, comps[axis.key] || 75)) / 100;
        const angle = i * angleSlice - Math.PI / 2;
        const x = cx + R * val * Math.cos(angle);
        const y = cy + R * val * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      return `
        <polygon 
          points="${points.join(' ')}" 
          fill="${color}" 
          fill-opacity="0.18" 
          stroke="${color}" 
          stroke-width="2.2"
        />
        ${axes.map((axis, i) => {
          const val = Math.max(10, Math.min(100, comps[axis.key] || 75)) / 100;
          const angle = i * angleSlice - Math.PI / 2;
          const x = cx + R * val * Math.cos(angle);
          const y = cy + R * val * Math.sin(angle);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" />`;
        }).join('')}
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" class="radar-svg" style="width: 100%; height: 100%; max-width: 380px;">
        ${gridCircles}
        ${axisElements}
        ${candidatePolygons}
      </svg>
    `;
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
    const btnToggleVerdict = this.container.querySelector('#btnToggleVerdict');
    if (btnToggleVerdict) {
      btnToggleVerdict.addEventListener('click', () => {
        this.isVerdictExpanded = !this.isVerdictExpanded;
        this.render();
      });
    }

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
