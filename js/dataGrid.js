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
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.more-actions-dropdown-wrapper')) {
        this.tableBody?.querySelectorAll('.more-actions-menu.show').forEach(menu => menu.classList.remove('show'));
      }
    });
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
          <td colspan="6" style="text-align: center; padding: 48px; color: var(--text-tertiary);">
            <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
            <div style="font-weight: 600; font-size: 15px; color: var(--text-main);">${appState.candidates.length ? 'No se encontraron candidatos' : 'Aún no hay CVs en esta convocatoria'}</div>
            <p style="font-size: 12.5px; margin-top: 4px;">${appState.candidates.length ? 'Prueba con otros términos de búsqueda o filtros.' : 'Esta vacante se creó como demostración. La recepción y el procesamiento real de CVs se integrarán más adelante.'}</p>
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
                <div class="cv-pdf-icon" title="Ver CV extraído en la demo" onclick="event.stopPropagation(); window.openCandidateCV('${candidate.id}')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span class="cv-pdf-text" style="font-size: 8.5px;">CV</span>
                </div>
              </div>

              <div class="candidate-info">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span class="candidate-name">${candidate.name}</span>
                  <span class="role-badge role-${appState.jobPosting.roleType || 'docente'}" style="font-size: 9.5px; padding: 1.5px 6px;">
                    ${(appState.jobPosting.roleTypeName || 'Docente').toUpperCase()}
                  </span>
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

          <!-- Col 4: Score & Ajuste al Perfil (Vista RRHH) -->
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${this.renderCircularScore(candidate.score)}
              <div style="display: flex; flex-direction: column; font-size: 11px;">
                <span style="font-weight: 700; color: ${candidate.score >= 85 ? '#047857' : '#B45309'};">
                  ${candidate.score >= 90 ? 'Sobresaliente' : candidate.score >= 80 ? 'Afinidad Alta' : 'Alineamiento Medio'}
                </span>
                <span style="color: var(--text-tertiary); font-size: 10.5px;">Ajuste al Perfil</span>
              </div>
            </div>
          </td>

          <!-- Col 5: Acciones de Selección & Menú Desplegable (Simplificación Cognitiva) -->
          <td onclick="event.stopPropagation()">
            <div class="row-actions-cluster">
              <button 
                class="btn-action-primary" 
                data-action="advance" 
                data-id="${candidate.id}" 
                title="Avanzar etapa en el pipeline Kanban"
              >
                Avanzar
              </button>

              <div class="more-actions-dropdown-wrapper">
                <button 
                  class="btn-more-actions" 
                  data-action="toggle-menu" 
                  data-id="${candidate.id}"
                  title="Más acciones de selección"
                  aria-label="Más acciones"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="12" cy="5" r="1.5"></circle>
                    <circle cx="12" cy="19" r="1.5"></circle>
                  </svg>
                  <span>Más</span>
                </button>

                <div class="more-actions-menu" id="actionsMenu_${candidate.id}">
                  <button class="more-action-item ${inComparison ? 'active' : ''}" data-action="compare" data-id="${candidate.id}">
                    <span class="action-icon">⚖️</span>
                    <span>${inComparison ? 'Quitar del Comparador' : 'Comparar cara a cara'}</span>
                  </button>
                  <button class="more-action-item" data-action="talentpool" data-id="${candidate.id}">
                    <span class="action-icon">👥</span>
                    <span>Guardar en Banco</span>
                  </button>
                  <button class="more-action-item" data-action="history" data-id="${candidate.id}">
                    <span class="action-icon">📋</span>
                    <span>Ver expediente & auditoría</span>
                  </button>
                  <button class="more-action-item" data-action="star" data-id="${candidate.id}">
                    <span class="action-icon">🪄</span>
                    <span>Generar entrevista STAR</span>
                  </button>
                  <div class="more-action-divider"></div>
                  <button class="more-action-item text-danger" data-action="release" data-id="${candidate.id}">
                    <span class="action-icon">📨</span>
                    <span>Liberar y notificar</span>
                  </button>
                </div>
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
        <div class="gap-visual-card gap-impact-none" title="El postulante cubre íntegramente los requerimientos obligatorios y preferentes.">
          <span class="gap-visual-icon">✅</span>
          <div class="gap-visual-content">
            <span class="gap-visual-title">Sin brechas críticas</span>
            <span class="gap-impact-tag impact-none">Impacto: Nulo</span>
          </div>
        </div>
      `;
    }

    const gap = candidate.gaps[0];
    const severity = (gap.severity || 'low').toLowerCase();

    let icon = '⚠️';
    let impactLabel = 'Impacto: Bajo';
    let cardClass = 'gap-impact-low';
    let tagClass = 'impact-low';

    if (severity === 'high' || gap.item.toLowerCase().includes('sunedu') || gap.item.toLowerCase().includes('maestría')) {
      icon = '🔴';
      impactLabel = 'Impacto: Alto';
      cardClass = 'gap-impact-high';
      tagClass = 'impact-high';
    } else if (severity === 'medium' || gap.item.toLowerCase().includes('docente') || gap.item.toLowerCase().includes('gestión')) {
      icon = '🟡';
      impactLabel = 'Impacto: Medio';
      cardClass = 'gap-impact-medium';
      tagClass = 'impact-medium';
    }

    return `
      <div class="gap-visual-card ${cardClass}" title="${gap.tip || gap.item}">
        <span class="gap-visual-icon">${icon}</span>
        <div class="gap-visual-content">
          <span class="gap-visual-title">${gap.item}</span>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
            <span class="gap-impact-tag ${tagClass}">${impactLabel}</span>
            ${gap.tip ? `<span class="gap-visual-tip">${gap.tip}</span>` : ''}
          </div>
        </div>
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

    // Dropdown Menu Toggles (⋮ Más acciones)
    this.tableBody.querySelectorAll('[data-action="toggle-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        const menu = this.tableBody.querySelector(`#actionsMenu_${candId}`);
        
        // Close other menus
        this.tableBody.querySelectorAll('.more-actions-menu.show').forEach(m => {
          if (m !== menu) m.classList.remove('show');
        });

        if (menu) {
          menu.classList.toggle('show');
        }
      });
    });

    // Compare Toggle
    this.tableBody.querySelectorAll('[data-action="compare"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        appState.toggleComparisonCandidate(candId);
        const menu = btn.closest('.more-actions-menu');
        if (menu) menu.classList.remove('show');
      });
    });

    // Talent Pool preservation (Cambio #11)
    this.tableBody.querySelectorAll('[data-action="talentpool"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === candId);
        if (cand) {
          appState.addToTalentPool(candId);
          alert(`👥 ${cand.name} ha sido preservado en el Banco de Talento Institucional con categoría "${appState.jobPosting.roleTypeName}".`);
        }
        const menu = btn.closest('.more-actions-menu');
        if (menu) menu.classList.remove('show');
      });
    });

    // Open History / Audit from dropdown
    this.tableBody.querySelectorAll('[data-action="history"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        appState.selectCandidate(candId);
        appState.setActiveDrawerTab('audit');
        const menu = btn.closest('.more-actions-menu');
        if (menu) menu.classList.remove('show');
      });
    });

    // Generate STAR Questions from dropdown
    this.tableBody.querySelectorAll('[data-action="star"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        appState.selectCandidate(candId);
        appState.setActiveDrawerTab('gaps');
        const menu = btn.closest('.more-actions-menu');
        if (menu) menu.classList.remove('show');
      });
    });

    // Advance Stage button (Cambio #7)
    this.tableBody.querySelectorAll('[data-action="advance"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
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
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === candId);
        if (cand) {
          const confirmRelease = confirm(`¿Deseas liberar al postulante ${cand.name}? Se registrará en la auditoría y se ofrecerá enviarlo al Banco de Talento.`);
          if (confirmRelease) {
            appState.recordDecision(candId, `Liberado de la convocatoria activa`);
            appState.addToTalentPool(candId, "Liberado de convocatoria activa con potencial transferible.");
            alert(`📨 Decisión registrada. ${cand.name} ha sido notificado y resguardado en el Banco de Talento.`);
          }
        }
        const menu = btn.closest('.more-actions-menu');
        if (menu) menu.classList.remove('show');
      });
    });
  }
}
