/* ==========================================================================
   TalentAI - GTHC · ESAN
   Candidate Ranking Data Grid Engine (Podium Top-N, Gaps & Dual View Modes)
   ========================================================================== */

import { appState } from './state.js';
import { escapeHTML as esc, notify } from './ui.js';
import { normalizeCandidate, isEligible } from './domain.js';
import { getVirtualWindow, paginateCandidates } from './pagination.js';

export class DataGridController {
  constructor(tableBodyEl, selectAllCheckboxEl, resultCountEl) {
    this.tableBody = tableBodyEl;
    this.selectAllCheckbox = selectAllCheckboxEl;
    this.resultCount = resultCountEl;
    this.page = 1;
    this.pageSize = 25;
    this.visibleCandidates = [];
    this.pageCandidates = [];
    this.density = 'compact';
    this.overscan = 6;
    this.scrollRegion = document.getElementById('rankingScrollRegion');

    this.initListeners();
  }

  closeMenu() {
    if (!this.openMenu) return;
    const { menu, wrapper, button } = this.openMenu;
    menu.classList.remove('show');
    menu.style.left = '';
    menu.style.top = '';
    button.setAttribute('aria-expanded', 'false');
    if (wrapper.isConnected) wrapper.appendChild(menu);
    else menu.remove();
    this.openMenu = null;
  }

  showMenu(button, menu) {
    this.closeMenu();
    const wrapper = button.closest('.more-actions-dropdown-wrapper');
    document.body.appendChild(menu);
    menu.classList.add('show');
    const rect = button.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(rect.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - margin));
    const below = rect.bottom + margin;
    const top = below + menu.offsetHeight <= window.innerHeight - margin
      ? below
      : Math.max(margin, rect.top - menu.offsetHeight - margin);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    button.setAttribute('aria-expanded', 'true');
    this.openMenu = { menu, wrapper, button };
    menu.querySelector('button')?.focus({ preventScroll: true });
  }

  initListeners() {
    const closeMenus = () => this.closeMenu();
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.more-actions-dropdown-wrapper, .more-actions-menu')) closeMenus();
    });
    this.scrollRegion?.addEventListener('scroll', () => {
      closeMenus();
      this.scheduleVirtualRender();
    }, { passive: true });
    this.tableBody?.closest('.app-main')?.addEventListener('scroll', closeMenus, { passive: true });
    window.addEventListener('resize', () => {
      closeMenus();
      this.scheduleVirtualRender();
    });
    if (this.scrollRegion && typeof ResizeObserver !== 'undefined') {
      this.scrollResizeObserver = new ResizeObserver(() => this.scheduleVirtualRender());
      this.scrollResizeObserver.observe(this.scrollRegion);
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });
    document.getElementById('rankingPageSize')?.addEventListener('change', e => {
      this.pageSize = Number(e.target.value);
      this.changePage(1);
    });
    document.getElementById('rankingPrevPage')?.addEventListener('click', () => this.changePage(this.page - 1));
    document.getElementById('rankingNextPage')?.addEventListener('click', () => this.changePage(this.page + 1));
    document.querySelectorAll('#viewContainer_ranking [data-density]').forEach(button => {
      button.addEventListener('click', () => this.setDensity(button.dataset.density));
    });
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
        'criteria_updated', 'candidates_updated', 'role_changed',
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
    if (this.scrollRegion) this.scrollRegion.scrollTop = 0;
    this.render();
  }

  setDensity(density) {
    if (!['compact', 'comfortable'].includes(density) || density === this.density) return;
    this.density = density;
    const view = document.getElementById('viewContainer_ranking');
    if (view) view.dataset.density = density;
    document.querySelectorAll('#viewContainer_ranking [data-density]').forEach(button => {
      const active = button.dataset.density === density;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (this.scrollRegion) this.scrollRegion.scrollTop = 0;
    this.renderVisibleRows();
  }

  getRowHeight() {
    return this.density === 'comfortable' ? 66 : 52;
  }

  getRenderWindow() {
    const headerHeight = this.scrollRegion?.querySelector('thead')?.getBoundingClientRect().height || 40;
    return getVirtualWindow(
      this.pageCandidates.length,
      this.scrollRegion?.scrollTop || 0,
      this.scrollRegion?.clientHeight || 720,
      this.getRowHeight(),
      this.overscan,
      headerHeight
    );
  }

  scheduleVirtualRender() {
    if (this.virtualRenderPending) return;
    this.virtualRenderPending = true;
    requestAnimationFrame(() => {
      this.virtualRenderPending = false;
      this.renderVisibleRows();
    });
  }

  renderVisibleRows() {
    this.closeMenu();
    if (!this.tableBody || !this.pageCandidates) return;
    if (!this.pageCandidates.length) return;

    const { start, end } = this.getRenderWindow();
    if (start === this.windowStart && end === this.windowEnd && this.lastRenderedDensity === this.density) return;
    this.windowStart = start;
    this.windowEnd = end;
    this.lastRenderedDensity = this.density;

    const candidates = this.pageCandidates.slice(start, end);
    const topSpacer = this.renderSpacer(start * this.getRowHeight());
    const bottomSpacer = this.renderSpacer((this.pageCandidates.length - end) * this.getRowHeight());
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const focus = active && this.tableBody.contains?.(active) ? { id: active.dataset.id, action: active.dataset.action, checkbox: active.matches?.('.row-select-checkbox') } : null;
    this.tableBody.innerHTML = `${topSpacer}${candidates.map((candidate, index) => this.renderCandidateRow(candidate, start + index)).join('')}${bottomSpacer}`;
    this.bindRowEvents();
    if (focus) [...this.tableBody.querySelectorAll('[data-id]')].find(el => el.dataset.id === focus.id && (focus.checkbox ? el.matches('.row-select-checkbox') : el.dataset.action === focus.action))?.focus({ preventScroll: true });
  }

  renderSpacer(height) {
    return height > 0
      ? `<tr class="virtual-spacer" aria-hidden="true"><td colspan="6"><div style="height:${height}px"></div></td></tr>`
      : '';
  }

  renderCandidateRow(candidate, rowOffset = 0) {
    candidate = { ...normalizeCandidate(candidate, appState.activeJobPostingId), rank: candidate.rank, inTopN: candidate.inTopN };
    const scoreLabel = Number.isFinite(candidate.score) ? `${candidate.score}/100` : 'Evaluación pendiente';
    const isSelected = appState.selectedRows.has(candidate.id);
    const inComparison = appState.comparisonPool.has(candidate.id);
    const isActiveRow = appState.selectedCandidateId === candidate.id;
    const rowTopNClass = candidate.inTopN ? 'in-top-n' : 'outside-top-n';
    const activeClass = isActiveRow ? 'selected' : '';
    const mandatoryCount = candidate.mandatoryReqs.filter(r => r.status === 'green').length;
    const roleCategory = candidate.roleTypeName || appState.jobPosting.roleTypeName;

    return `
      <tr class="candidate-row ${rowTopNClass} ${activeClass}" data-id="${esc(candidate.id)}" aria-rowindex="${this.pageFirst + rowOffset + 1}" tabindex="0" aria-label="Abrir expediente de ${esc(candidate.name)}">
        <td class="candidate-select-cell">
          <input type="checkbox" class="custom-checkbox row-select-checkbox" data-id="${esc(candidate.id)}" aria-label="Seleccionar a ${esc(candidate.name)}" ${isSelected ? 'checked' : ''} />
        </td>

        <td class="candidate-primary-cell">
          <div class="candidate-cell">
            ${this.renderPodiumBadge(candidate.rank, candidate.inTopN)}
            <div class="candidate-line">
              <button type="button" class="candidate-name" data-action="open" data-id="${esc(candidate.id)}" title="Abrir expediente de ${esc(candidate.name)}">${esc(candidate.name)}</button>
              <button type="button" class="candidate-cv-link" data-action="cv" data-id="${esc(candidate.id)}" aria-label="Ver CV de ${esc(candidate.name)}" title="Ver CV">CV</button>
              <span class="candidate-role-org" title="${esc(candidate.role)} · ${esc(candidate.company)}">${esc(candidate.role)} · ${esc(candidate.company)}</span>
              <span class="candidate-meta-icons">
                <span class="meta-icon source-mark source-${esc(candidate.source)}" role="img" aria-label="Origen: ${esc(this.getSourceLabel(candidate.source))}" title="Origen: ${esc(this.getSourceLabel(candidate.source))}">${this.getSourceMark(candidate.source)}</span>
                ${candidate.transferablePotential ? '<span class="meta-icon" role="img" aria-label="Potencial transferible" title="Potencial transferible">✦</span>' : ''}
                ${roleCategory ? `<span class="meta-icon" role="img" aria-label="Categoría: ${esc(roleCategory)}" title="Categoría: ${esc(roleCategory)}">◈</span>` : ''}
              </span>
              <span class="stage-pill stage-${esc(candidate.stage)}" title="Estado actual">${this.getStageLabel(candidate.stage)}</span>
            </div>
          </div>
        </td>

        <td class="requirements-cell">
          <button type="button" class="requirements-summary" data-action="requirements" data-id="${esc(candidate.id)}" aria-label="Revisar requisitos de ${esc(candidate.name)}: ${mandatoryCount} de ${candidate.mandatoryReqs.length} cumplen">
            <span class="pills-row">${!candidate.mandatoryReqs.length ? '<span title="Requisitos pendientes">—</span>' : ''}
              ${candidate.mandatoryReqs.map(req => `<span class="capsule-pill pill-${esc(req.status)}" role="img" aria-label="${esc(req.name)}: ${req.status === 'green' ? 'cumple' : req.status === 'amber' ? 'parcial' : req.status === 'red' ? 'no cumple' : 'sin verificar'}" title="${esc(req.tooltipTitle)}: ${esc(req.tooltipReason)}"></span>`).join('')}
            </span>
          </button>
        </td>

        <td class="candidate-gap-cell">${this.renderGapsSummary(candidate)}</td>

        <td class="candidate-score-cell">
          <div class="score-summary" role="img" aria-label="${esc(scoreLabel)}" title="${esc(scoreLabel)}">
            ${this.renderCircularScore(candidate.score)}
          </div>
        </td>

        <td class="candidate-actions-cell">
          <div class="row-actions-cluster">
            <button class="btn-action-primary" data-action="advance" data-id="${esc(candidate.id)}" title="Avanzar etapa tras verificar elegibilidad" ${!appState.can('selection') || !isEligible(candidate) || candidate.stage === 'contratado' ? 'disabled' : ''}>Avanzar</button>
            <div class="more-actions-dropdown-wrapper">
              <button class="btn-more-actions" data-action="toggle-menu" data-id="${esc(candidate.id)}" aria-label="Más acciones para ${esc(candidate.name)}" aria-expanded="false" aria-controls="actionsMenu_${esc(candidate.id)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg>
              </button>
              <div class="more-actions-menu" id="actionsMenu_${esc(candidate.id)}">
                <button class="more-action-item ${inComparison ? 'active' : ''}" data-action="compare" data-id="${esc(candidate.id)}"><span class="action-icon">⚖️</span><span>${inComparison ? 'Quitar del Comparador' : 'Comparar cara a cara'}</span></button>
                <button class="more-action-item" data-action="talentpool" data-id="${esc(candidate.id)}"><span class="action-icon">👥</span><span>Guardar en Banco</span></button>
                <button class="more-action-item" data-action="history" data-id="${esc(candidate.id)}"><span class="action-icon">📋</span><span>Ver expediente & auditoría</span></button>
                <button class="more-action-item" data-action="star" data-id="${esc(candidate.id)}"><span class="action-icon">🪄</span><span>Ver guía de entrevista</span></button>
                <div class="more-action-divider"></div>
                <button class="more-action-item text-danger" data-action="release" data-id="${esc(candidate.id)}" ${!appState.can('selection') || ['contratado','liberado'].includes(candidate.stage) ? 'disabled' : ''}><span class="action-icon">📨</span><span>Liberar postulación</span></button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
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
    this.pageFirst = page.first;
    this.updatePagination(page);
    this.tableBody.closest?.('table')?.setAttribute('aria-rowcount', String(Math.max(1, page.total + 1)));
    this.pageCandidates = candidates;
    this.windowStart = -1;
    this.windowEnd = -1;
    this.lastRenderedDensity = null;

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

    this.renderVisibleRows();
  }

  renderPodiumBadge(rank, inTopN) {
    if (inTopN) {
      const medal = rank === 1 ? 'podium-1' : rank === 2 ? 'podium-2' : rank === 3 ? 'podium-3' : 'podium-regular';
      return `<span class="podium-rank-badge ${medal}" title="Top ${rank}">Top ${rank}</span>`;
    }
    return `<span class="candidate-rank" title="Puesto ${rank}">#${rank}</span>`;
  }

  renderGapsSummary(candidate) {
    const levels = { none: 0, low: 1, medium: 2, unknown: 3, high: 4 };
    const gap = [...(candidate.gaps || [])].sort((a, b) => (levels[b.severity] || 0) - (levels[a.severity] || 0))[0];
    if (!gap || gap.severity === 'unknown') return `<button type="button" class="gap-indicator gap-unknown" data-action="gaps" data-id="${esc(candidate.id)}" aria-label="Brechas pendientes de evaluar" title="Brechas pendientes de evaluar">?</button>`;
    if (gap.severity === 'none') {
      return `<button type="button" class="gap-indicator gap-none" data-action="gaps" data-id="${esc(candidate.id)}" aria-label="${esc(candidate.name)}: sin brechas críticas" title="Sin brechas críticas. Abrir detalle"><span aria-hidden="true">✓</span></button>`;
    }
    const severity = ['high', 'medium', 'low'].includes(gap.severity) ? gap.severity : 'low';
    const label = { high: 'brecha alta', medium: 'brecha media', low: 'brecha baja' }[severity];
    const impactValue = gap.impact || { high: 'alto', medium: 'medio', low: 'bajo' }[severity];
    const impact = ` Impacto: ${impactValue}.`;
    const detail = `${gap.item}.${impact} ${gap.tip || ''}`.trim();
    return `<button type="button" class="gap-indicator gap-${severity}" data-action="gaps" data-id="${esc(candidate.id)}" aria-label="${esc(candidate.name)}: ${label}. ${esc(detail)} Abrir detalle" title="${esc(detail)}"><span aria-hidden="true">!</span></button>`;
  }

  getStageLabel(stage) {
    switch (stage) {
      case 'postulado': return 'Postulado';
      case 'preseleccionado': return 'Preseleccionado';
      case 'entrevista': return 'En entrevista';
      case 'evaluacion': return 'Evaluación';
      case 'oferta': return 'Oferta';
      case 'contratado': return 'Contratado';
      case 'liberado': return 'Liberado';
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

  getSourceMark(source) {
    switch (source) {
      case 'linkedin': return 'in';
      case 'computrabajo': return 'CT';
      case 'bumeran': return 'B';
      case 'gmail': return '✉';
      case 'referrals': return 'ES';
      default: return 'CV';
    }
  }

  renderCircularScore(score) {
    if (!Number.isFinite(score)) return '<span class="score-circle-badge score-pending" title="Evaluación pendiente">—</span>';
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
    // Row click or keyboard activation opens the candidate drawer.
    this.tableBody.querySelectorAll('.candidate-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button, input')) return;
        const candId = row.getAttribute('data-id');
        appState.selectCandidate(candId);
      });
      row.addEventListener('keydown', event => {
        if (event.target !== row || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        appState.selectCandidate(row.getAttribute('data-id'));
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
        const menu = document.getElementById(`actionsMenu_${candId}`);
        
        if (this.openMenu?.menu === menu) this.closeMenu();
        else if (menu) this.showMenu(btn, menu);
      });
    });

    // Compare Toggle
    this.tableBody.querySelectorAll('[data-action="compare"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        appState.toggleComparisonCandidate(candId);
        this.closeMenu();
      });
    });

    // Talent Pool preservation (Cambio #11)
    this.tableBody.querySelectorAll('[data-action="talentpool"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === candId);
        if (cand && appState.addToTalentPool(candId)) {
          notify(`👥 ${cand.name} ha sido preservado en el Banco de Talento Institucional con categoría "${appState.jobPosting.roleTypeName}".`);
        }
        this.closeMenu();
      });
    });

    // Open History / Audit from dropdown
    this.tableBody.querySelectorAll('[data-action="history"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        appState.selectCandidate(candId);
        appState.setActiveDrawerTab('audit');
        this.closeMenu();
      });
    });

    // Generate STAR Questions from dropdown
    this.tableBody.querySelectorAll('[data-action="star"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        appState.selectCandidate(candId);
        appState.setActiveDrawerTab('gaps');
        this.closeMenu();
      });
    });

    // Advance Stage button (Cambio #7)
    this.tableBody.querySelectorAll('[data-action="advance"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === candId);
        if (cand) {
          if (appState.advanceCandidate(candId)) notify(`${cand.name}: etapa actualizada.`);
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
          const confirmRelease = confirm(`¿Deseas liberar al postulante ${cand.name}? Se conservará en el Banco de Talento. La demo no envía correos.`);
          if (confirmRelease && appState.releaseCandidate(candId)) notify("Postulación liberada y conservada en el banco. No se enviaron correos.");
        }
        this.closeMenu();
      });
    });
  }
}
