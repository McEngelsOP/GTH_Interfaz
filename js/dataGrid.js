/* ==========================================================================
   TalentAI - GTHC · ESAN
   Candidate Ranking Data Grid Engine (Podium Top-N, Gaps & Dual View Modes)
   ========================================================================== */

import { appState } from './state.js';

export class DataGridController {
  constructor(tableBodyEl, selectAllCheckboxEl, resultCountEl) {
    this.tableBody = tableBodyEl;
    this.selectAllCheckbox = selectAllCheckboxEl;
    this.resultCount = resultCountEl;

    this.initListeners();
  }

  initListeners() {
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.addEventListener('change', (e) => {
        appState.toggleSelectAll(e.target.checked);
      });
    }

    // Subscribe to state updates
    appState.subscribe((event) => {
      if ([
        'topN_changed',
        'filter_changed',
        'sort_changed',
        'selection_changed',
        'candidate_selected',
        'decision_recorded',
        'job_changed',
        'view_mode_changed',
        'comparison_pool_changed',
        'candidate_stage_changed'
      ].includes(event)) {
        this.render();
      }
    });
  }

  render() {
    if (!this.tableBody) return;

    const candidates = appState.getFilteredCandidates();
    const selectedId = appState.selectedCandidateId;
    const isTechMode = appState.viewMode === 'technical';

    // Update result count
    if (this.resultCount) {
      this.resultCount.textContent = `Mostrando ${candidates.length} de ${appState.candidates.length} candidatos evaluados en ${appState.jobPosting.title}`;
    }

    // Update select all checkbox state
    if (this.selectAllCheckbox) {
      const allSelected = candidates.length > 0 && candidates.every(c => appState.selectedRows.has(c.id));
      this.selectAllCheckbox.checked = allSelected;
      this.selectAllCheckbox.indeterminate = !allSelected && candidates.some(c => appState.selectedRows.has(c.id));
    }

    if (candidates.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 48px; color: var(--text-tertiary);">
            <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
            <div style="font-weight: 600; font-size: 15px; color: var(--text-main);">No se encontraron candidatos</div>
            <p style="font-size: 12.5px; margin-top: 4px;">Intenta ajustar los términos de búsqueda o los filtros aplicados para esta convocatoria.</p>
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = candidates.map(candidate => {
      const isSelected = appState.selectedRows.has(candidate.id);
      const inComparison = appState.comparisonPool.has(candidate.id);
      const isActiveRow = selectedId === candidate.id;
      const rowTopNClass = candidate.inTopN ? 'in-top-n' : 'outside-top-n';
      const activeClass = isActiveRow ? 'selected' : '';

      return `
        <tr class="candidate-row ${rowTopNClass} ${activeClass}" data-id="${candidate.id}">
          <!-- Col 0: Checkbox -->
          <td onclick="event.stopPropagation()">
            <input 
              type="checkbox" 
              class="custom-checkbox row-select-checkbox" 
              data-id="${candidate.id}" 
              ${isSelected ? 'checked' : ''} 
            />
          </td>

          <!-- Col 1: Candidato con Podio Top-N (Cambio #18) -->
          <td>
            <div class="candidate-cell">
              <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0;">
                ${this.renderPodiumBadge(candidate.rank, candidate.inTopN)}
                <div class="cv-pdf-icon" title="Ver CV original en PDF" onclick="event.stopPropagation(); window.openCandidateCV ? window.openCandidateCV('${candidate.id}') : alert('Visualizando CV oficial de ${candidate.name}...')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span class="cv-pdf-text" style="font-size: 8.5px;">PDF</span>
                </div>
              </div>

              <div class="candidate-info">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="candidate-name">${candidate.name}</span>
                  <span class="candidate-source-badge ${candidate.source}">${this.getSourceLabel(candidate.source)}</span>
                  ${candidate.transferablePotential 
                    ? `<span class="inclusion-badge" title="Candidato con habilidades transversales transferibles">✦ Transferible</span>`
                    : ''
                  }
                </div>
                <span class="candidate-role-org">
                  <span>${candidate.role}</span>
                  <span>•</span>
                  <strong>${candidate.company}</strong>
                </span>
                <div style="margin-top: 3px;">
                  <span class="stage-tag stage-${candidate.stage}">
                    ${this.getStageLabel(candidate.stage)}
                  </span>
                </div>
              </div>
            </div>
          </td>

          <!-- Col 2: Requisitos Mandatorios / Knockout (Cambio #2) -->
          <td>
            <div class="pills-row">
              ${candidate.mandatoryReqs.map((req, idx) => `
                <div class="capsule-pill pill-${req.status}" tabindex="0" role="img" aria-label="${req.name}: ${req.tooltipTitle}">
                  <div class="pill-tooltip">
                    <span class="tooltip-title">${idx + 1}. ${req.tooltipTitle}</span>
                    <span class="tooltip-reason">${req.tooltipReason}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 4px;">
              ${candidate.mandatoryReqs.filter(r => r.status === 'green').length}/${candidate.mandatoryReqs.length} validados
            </div>
          </td>

          <!-- Col 3: Análisis de Brechas & Alertas (Cambio #10) -->
          <td>
            ${this.renderGapsSummary(candidate)}
          </td>

          <!-- Col 4: Score Dual & Modo Técnico vs RRHH (Cambio #9) -->
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${this.renderCircularScore(candidate.score)}
              <div style="display: flex; flex-direction: column; font-size: 11px;">
                ${isTechMode
                  ? `<span style="font-family: var(--font-mono); color: var(--status-info); font-weight: 600;">ML: ${candidate.mlScore} pts</span>
                     <span style="font-family: var(--font-mono); color: var(--status-purple); font-weight: 600;">LLM: ${candidate.llmScore}% sim</span>`
                  : `<span style="font-weight: 700; color: ${candidate.score >= 85 ? '#047857' : '#B45309'};">
                       ${candidate.score >= 90 ? 'Sobresaliente' : candidate.score >= 80 ? 'Afinidad Alta' : 'Alineamiento Medio'}
                     </span>
                     <span style="color: var(--text-tertiary); font-size: 10.5px;">Ajuste al Perfil</span>`
                }
              </div>
            </div>
          </td>

          <!-- Col 5: Acciones de Selección & Comparador (Cambio #6, #14) -->
          <td onclick="event.stopPropagation()">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div class="action-buttons-group">
                <button 
                  class="btn-action-primary" 
                  data-action="advance" 
                  data-id="${candidate.id}" 
                  title="Avanzar etapa en el pipeline Kanban"
                >
                  Avanzar Etapa
                </button>
                <button 
                  class="btn-action-ghost compare-toggle-btn ${inComparison ? 'active' : ''}" 
                  data-action="compare" 
                  data-id="${candidate.id}" 
                  title="Seleccionar para comparar cara a cara (Cambio #6)"
                  style="${inComparison ? 'background: #EFF6FF; border-color: #3B82F6; color: #1D4ED8; font-weight: 700;' : ''}"
                >
                  ${inComparison ? '✓ En Comparador' : '⚖️ Comparar'}
                </button>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between;">
                <button 
                  class="btn-action-ghost" 
                  data-action="talentpool" 
                  data-id="${candidate.id}" 
                  style="font-size: 10.5px; padding: 3px 8px;"
                  title="Preservar en el Banco de Talento Institucional (Cambio #11)"
                >
                  👥 Guardar en Banco
                </button>

                <button 
                  class="btn-action-ghost" 
                  data-action="release" 
                  data-id="${candidate.id}" 
                  style="font-size: 10.5px; padding: 3px 8px; color: var(--status-danger);"
                  title="Liberar y enviar correo de agradecimiento"
                >
                  Liberar
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.bindRowEvents();
  }

  renderPodiumBadge(rank, inTopN) {
    if (rank === 1) {
      return `<span class="podium-rank-badge podium-1" title="🥇 1er Lugar - Podio Convocatoria">🥇 Top 1</span>`;
    }
    if (rank === 2) {
      return `<span class="podium-rank-badge podium-2" title="🥈 2do Lugar - Podio Convocatoria">🥈 Top 2</span>`;
    }
    if (rank === 3) {
      return `<span class="podium-rank-badge podium-3" title="🥉 3er Lugar - Podio Convocatoria">🥉 Top 3</span>`;
    }
    if (inTopN) {
      return `<span class="podium-rank-badge podium-regular" title="Dentro de corte Top-N">#${rank}</span>`;
    }
    return `<span style="font-size: 11px; font-weight: 600; color: var(--text-tertiary); padding: 2px 6px;">#${rank}</span>`;
  }

  renderGapsSummary(candidate) {
    if (!candidate.gaps || candidate.gaps.length === 0 || candidate.gaps[0].severity === 'none') {
      return `
        <span class="gap-badge clean" title="El postulante cubre íntegramente los requerimientos obligatorios y preferentes.">
          ✅ Sin brechas críticas
        </span>
      `;
    }

    const gap = candidate.gaps[0];
    return `
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <span class="gap-badge has-gap" title="${gap.tip || gap.item}">
          ⚠️ ${gap.item}
        </span>
        ${gap.tip ? `<span style="font-size: 10px; color: var(--text-tertiary); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${gap.tip}</span>` : ''}
      </div>
    `;
  }

  getStageLabel(stage) {
    switch (stage) {
      case 'postulado': return '1. Postulado';
      case 'preseleccionado': return '2. Preseleccionado';
      case 'entrevista': return '3. En Entrevista';
      case 'evaluacion': return '4. Evaluación';
      case 'oferta': return '5. En Oferta';
      case 'contratado': return '6. Contratado 🎉';
      default: return stage;
    }
  }

  getSourceLabel(source) {
    switch (source) {
      case 'linkedin': return 'LinkedIn';
      case 'computrabajo': return 'CompuTrabajo';
      case 'bumeran': return 'Bumeran';
      case 'gmail': return 'Gmail';
      case 'referrals': return 'Referencia ESAN';
      default: return 'Portal';
    }
  }

  renderCircularScore(score) {
    const radius = 17;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const colorClass = score >= 85 ? 'high' : score >= 75 ? 'medium' : 'low';

    return `
      <div class="score-circle-badge" title="Score Consolidado: ${score}/100">
        <svg class="score-svg" viewBox="0 0 44 44">
          <circle class="score-bg-circle" cx="22" cy="22" r="${radius}" />
          <circle 
            class="score-progress-circle ${colorClass}" 
            cx="22" 
            cy="22" 
            r="${radius}" 
            stroke-dasharray="${circumference}" 
            stroke-dashoffset="${offset}" 
          />
        </svg>
        <span class="score-number">${score}</span>
      </div>
    `;
  }

  bindRowEvents() {
    // Row click -> opens drawer
    this.tableBody.querySelectorAll('.candidate-row').forEach(row => {
      row.addEventListener('click', () => {
        const candId = row.getAttribute('data-id');
        appState.selectCandidate(candId);
      });
    });

    // Checkboxes
    this.tableBody.querySelectorAll('.row-select-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const candId = e.target.getAttribute('data-id');
        appState.toggleRowSelection(candId);
      });
    });

    // Compare Toggle button (Cambio #6)
    this.tableBody.querySelectorAll('[data-action="compare"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const candId = e.target.getAttribute('data-id');
        appState.toggleComparisonCandidate(candId);
      });
    });

    // Talent Pool preservation (Cambio #11)
    this.tableBody.querySelectorAll('[data-action="talentpool"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const candId = e.target.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === candId);
        if (cand) {
          appState.addToTalentPool(candId);
          alert(`👥 ${cand.name} ha sido preservado en el Banco de Talento Institucional con categoría "${appState.jobPosting.roleTypeName}".`);
        }
      });
    });

    // Advance Stage button (Cambio #7)
    this.tableBody.querySelectorAll('[data-action="advance"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const candId = e.target.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === candId);
        if (cand) {
          const stages = ['postulado', 'preseleccionado', 'entrevista', 'evaluacion', 'oferta', 'contratado'];
          const currentIndex = stages.indexOf(cand.stage);
          if (currentIndex < stages.length - 1) {
            const nextStage = stages[currentIndex + 1];
            appState.moveCandidateStage(candId, nextStage);
            alert(`✅ ${cand.name} avanzó a la etapa: "${nextStage.toUpperCase()}". Registrado en trazabilidad de auditoría.`);
          } else {
            alert(`🎉 ${cand.name} ya está en la etapa final de Contratado.`);
          }
        }
      });
    });

    // Release candidate button
    this.tableBody.querySelectorAll('[data-action="release"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const candId = e.target.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === candId);
        if (cand) {
          const confirmRelease = confirm(`¿Deseas liberar al postulante ${cand.name}? Se registrará en la auditoría y se ofrecerá enviarlo al Banco de Talento.`);
          if (confirmRelease) {
            appState.recordDecision(candId, `Liberado de la convocatoria activa`);
            appState.addToTalentPool(candId, "Liberado de convocatoria activa con potencial transferible.");
            alert(`📨 Decisión registrada. ${cand.name} ha sido notificado y resguardado en el Banco de Talento.`);
          }
        }
      });
    });
  }
}
