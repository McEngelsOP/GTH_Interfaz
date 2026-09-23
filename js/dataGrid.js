/* ==========================================================================
   TalentAI - GTHC · ESAN
   Candidate Ranking Data Grid Engine (Podium Top-N, Gaps & Dual View Modes)
   ========================================================================== */

import { appState } from './state.js';
import { escapeHTML as esc } from './ui.js';
import { paginateCandidates } from './pagination.js';

export class DataGridController {
  constructor(tableBodyEl, selectAllCheckboxEl, resultCountEl) {
    this.tableBody = tableBodyEl;
    this.selectAllCheckbox = selectAllCheckboxEl;
    this.resultCount = resultCountEl;
    this.page = 1;
    this.pageSize = 25;
    this.visibleCandidates = [];
    this.scrollRegion = document.getElementById('rankingScrollRegion');

    this.initListeners();
  }

  initListeners() {
    const closeMenus = () => {
      this.tableBody?.querySelectorAll('.more-actions-menu.show').forEach(menu => menu.classList.remove('show'));
      this.tableBody?.querySelectorAll('[data-action="toggle-menu"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    };
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.more-actions-dropdown-wrapper')) closeMenus();
    });
    this.scrollRegion?.addEventListener('scroll', closeMenus, { passive: true });
    this.tableBody?.closest('.app-main')?.addEventListener('scroll', closeMenus, { passive: true });
    window.addEventListener('resize', closeMenus);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });
    document.getElementById('rankingPageSize')?.addEventListener('change', e => {
      this.pageSize = Number(e.target.value);
      this.changePage(1);
    });
    document.getElementById('rankingPrevPage')?.addEventListener('click', () => this.changePage(this.page - 1));
    document.getElementById('rankingNextPage')?.addEventListener('click', () => this.changePage(this.page + 1));
    document.querySelectorAll('#viewContainer_ranking [data-sort]').forEach(button => {
      button.addEventListener('click', () => appState.toggleSort(button.dataset.sort));
    });
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.addEventListener('change', (e) => {
        appState.toggleSelectAll(e.target.checked, this.visibleCandidates);
      });
    }

    // Subscribe to state updates
    appState.subscribe((event) => {
      if (['filter_changed', 'job_changed', 'sort_changed'].includes(event)) {
        this.page = 1;
        if (this.scrollRegion) this.scrollRegion.scrollTop = 0;
      }
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

  changePage(page) {
    this.page = page;
    this.render();
    if (this.scrollRegion) this.scrollRegion.scrollTop = 0;
  }

  updatePagination(page) {
    const prev = document.getElementById('rankingPrevPage');
    const next = document.getElementById('rankingNextPage');
    const label = document.getElementById('rankingPageLabel');
    if (prev) prev.disabled = page.page === 1;
    if (next) next.disabled = page.page === page.pageCount;
    if (label) label.textContent = `${page.page} / ${page.pageCount}`;
    document.querySelectorAll('#viewContainer_ranking [data-sort-header]').forEach(th => {
      const active = th.dataset.sortHeader === appState.sortBy;
      th.setAttribute('aria-sort', active ? (appState.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none');
      th.querySelector('span').textContent = active ? (appState.sortOrder === 'asc' ? '↑' : '↓') : '↕';
    });
  }

  render() {
    if (!this.tableBody) return;

    const page = paginateCandidates(appState.getFilteredCandidates(), this.page, this.pageSize);
    this.page = page.page;
    const candidates = page.items;
    this.visibleCandidates = candidates;
    this.updatePagination(page);
    const selectedId = appState.selectedCandidateId;

    // Update result count
    if (this.resultCount) {
      const selected = appState.selectedRows.size ? ` · ${appState.selectedRows.size} seleccionados` : '';
      const filtered = page.total !== appState.candidates.length ? ` (${appState.candidates.length} en total)` : '';
      this.resultCount.textContent = `${page.first}–${page.last} de ${page.total} candidatos${filtered}${selected}`;
    }

    // Update select all checkbox state
    if (this.selectAllCheckbox) {
      const allSelected = candidates.length > 0 && candidates.every(c => appState.selectedRows.has(c.id));
      this.selectAllCheckbox.checked = allSelected;
      this.selectAllCheckbox.indeterminate = !allSelected && candidates.some(c => appState.selectedRows.has(c.id));
      this.selectAllCheckbox.disabled = candidates.length === 0;
    }

    if (candidates.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="ranking-empty">
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
              aria-label="Seleccionar a ${esc(candidate.name)}"
              ${isSelected ? 'checked' : ''} 
            />
          </td>

          <td>
            <div class="candidate-cell">
              ${this.renderPodiumBadge(candidate.rank, candidate.inTopN)}
              <div class="candidate-info">
                <div class="candidate-title-line">
                  <button type="button" class="candidate-name" data-action="open" data-id="${esc(candidate.id)}" title="Abrir expediente de ${esc(candidate.name)}">${esc(candidate.name)}</button>
                  <button type="button" class="candidate-cv-link" data-action="cv" data-id="${esc(candidate.id)}" aria-label="Ver CV de ${esc(candidate.name)}">CV</button>
                </div>
                <span class="candidate-role-org" title="${esc(candidate.role)} · ${esc(candidate.company)}">${esc(candidate.role)} · ${esc(candidate.company)}</span>
                <div class="candidate-meta">
                  <span class="candidate-source-badge ${esc(candidate.source)}">${this.getSourceLabel(candidate.source)}</span>
                  <span class="stage-tag">${this.getStageLabel(candidate.stage)}</span>
                  ${candidate.transferablePotential ? '<span class="inclusion-badge" title="Potencial transferible">✦ Transferible</span>' : ''}
                </div>
              </div>
            </div>
          </td>

          <td>
            <button type="button" class="requirements-summary" data-action="requirements" data-id="${esc(candidate.id)}" aria-label="Revisar requisitos de ${esc(candidate.name)}: ${candidate.mandatoryReqs.filter(r => r.status === 'green').length} de ${candidate.mandatoryReqs.length} cumplen">
              <span class="pills-row">
                ${candidate.mandatoryReqs.map(req => `<span class="capsule-pill pill-${req.status}" role="img" aria-label="${esc(req.name)}: ${req.status === 'green' ? 'cumple' : req.status === 'amber' ? 'parcial' : 'no cumple'}" title="${esc(req.tooltipTitle)}: ${esc(req.tooltipReason)}"></span>`).join('')}
              </span>
              <span class="requirements-count">${candidate.mandatoryReqs.filter(r => r.status === 'green').length}/${candidate.mandatoryReqs.length} cumplen</span>
            </button>
          </td>

          <!-- Col 3: Análisis de Brechas & Alertas (Cambio #10) -->
          <td>
            ${this.renderGapsSummary(candidate)}
          </td>

          <!-- Col 4: Score & Ajuste al Perfil (Vista RRHH) -->
          <td class="candidate-score-cell">
            <div class="score-summary" role="img" aria-label="${candidate.score} de 100 puntos" title="${candidate.score}/100 · Abre el expediente para ver la justificación">
              ${this.renderCircularScore(candidate.score)}
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
                  aria-label="Más acciones para ${esc(candidate.name)}"
                  aria-expanded="false"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="12" cy="5" r="1.5"></circle>
                    <circle cx="12" cy="19" r="1.5"></circle>
                  </svg>
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
      return `<span class="podium-rank-badge podium-1" title="Puesto 1">1</span>`;
    }
    if (rank === 2) {
      return `<span class="podium-rank-badge podium-2" title="Puesto 2">2</span>`;
    }
    if (rank === 3) {
      return `<span class="podium-rank-badge podium-3" title="Puesto 3">3</span>`;
    }
    if (inTopN) {
      return `<span class="podium-rank-badge podium-regular" title="Puesto ${rank}, dentro de Top-N">${rank}</span>`;
    }
    return `<span class="candidate-rank" title="Puesto ${rank}">${rank}</span>`;
  }

  renderGapsSummary(candidate) {
    const levels = { none: 0, low: 1, medium: 2, high: 3 };
    const gap = [...(candidate.gaps || [])].sort((a, b) => (levels[b.severity] || 0) - (levels[a.severity] || 0))[0];
    if (!gap || gap.severity === 'none') {
      return `<button type="button" class="gap-compact gap-none" data-action="gaps" data-id="${esc(candidate.id)}" title="Ver detalle de requisitos y brechas"><span aria-hidden="true">✓</span> Sin brechas críticas</button>`;
    }
    const severity = ['high', 'medium', 'low'].includes(gap.severity) ? gap.severity : 'low';
    const label = { high: 'Alta', medium: 'Media', low: 'Baja' }[severity];
    return `<button type="button" class="gap-compact gap-${severity}" data-action="gaps" data-id="${esc(candidate.id)}" title="${esc(gap.item)}. ${esc(gap.tip || '')}"><span class="gap-short-title">${esc(gap.item)}</span><span class="gap-level">${label}</span></button>`;
  }

  getStageLabel(stage) {
    switch (stage) {
      case 'postulado': return 'Postulado';
      case 'preseleccionado': return 'Preselección';
      case 'entrevista': return 'Entrevista';
      case 'evaluacion': return 'Evaluación';
      case 'oferta': return 'Oferta';
      case 'contratado': return 'Contratado';
      default: return esc(stage);
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
    const detailTabs = { open: 'explain', cv: 'cv', requirements: 'explain', gaps: 'gaps' };
    this.tableBody.querySelectorAll('[data-action]').forEach(button => {
      const tab = detailTabs[button.dataset.action];
      if (!tab) return;
      button.addEventListener('click', e => {
        e.stopPropagation();
        appState.selectCandidate(button.dataset.id);
        appState.setActiveDrawerTab(tab);
      });
    });
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
        this.tableBody.querySelectorAll('[data-action="toggle-menu"]').forEach(button => {
          if (button !== btn) button.setAttribute('aria-expanded', 'false');
        });

        if (menu) {
          const opened = menu.classList.toggle('show');
          btn.setAttribute('aria-expanded', String(opened));
          if (opened) {
            const trigger = btn.getBoundingClientRect();
            const size = menu.getBoundingClientRect();
            menu.style.left = `${Math.max(8, Math.min(window.innerWidth - size.width - 8, trigger.right - size.width))}px`;
            menu.style.top = `${trigger.bottom + size.height + 8 > window.innerHeight ? Math.max(8, trigger.top - size.height - 4) : trigger.bottom + 4}px`;
          }
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
