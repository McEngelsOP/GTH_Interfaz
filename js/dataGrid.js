/* ==========================================================================
   TalentAI - GTHC · ESAN
   Candidate Ranking Data Grid Engine (Virtual Table, Tooltips & Top-N Actions)
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
      if (['topN_changed', 'filter_changed', 'sort_changed', 'selection_changed', 'candidate_selected', 'decision_recorded'].includes(event)) {
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
      this.resultCount.textContent = `Mostrando ${candidates.length} de ${appState.candidates.length} candidatos evaluados`;
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
            <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
            <div style="font-weight: 600; font-size: 15px; color: var(--text-main);">No se encontraron candidatos</div>
            <p style="font-size: 12.5px; margin-top: 4px;">Intenta ajustar los términos de búsqueda o los filtros aplicados.</p>
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = candidates.map(candidate => {
      const isSelected = appState.selectedRows.has(candidate.id);
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

          <!-- Col 1: Candidato -->
          <td>
            <div class="candidate-cell">
              <div class="cv-pdf-icon" title="Ver CV original en PDF" onclick="event.stopPropagation(); window.openCandidateCV('${candidate.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span class="cv-pdf-text">PDF</span>
              </div>
              <div class="candidate-info">
                <span class="candidate-name">
                  ${candidate.name}
                  <span class="candidate-source-badge ${candidate.source}">${this.getSourceLabel(candidate.source)}</span>
                </span>
                <span class="candidate-role-org">
                  <span>${candidate.role}</span>
                  <span>•</span>
                  <strong>${candidate.company}</strong>
                </span>
              </div>
            </div>
          </td>

          <!-- Col 2: Requisitos Mandatorios (Pills verticales) -->
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
          </td>

          <!-- Col 3: Criterios Preferentes -->
          <td>
            <div class="preferred-pills-row">
              ${candidate.preferredCriteria.map(crit => `
                <span class="pref-pill ${crit.matched ? 'matched' : ''}">
                  ${crit.matched ? '✓ ' : ''}${crit.name}
                </span>
              `).join('')}
            </div>
          </td>

          <!-- Col 4: Score Consolidado -->
          <td>
            ${this.renderCircularScore(candidate.score)}
          </td>

          <!-- Col 5: Principio de Inclusión -->
          <td>
            ${candidate.transferablePotential 
              ? `<span class="inclusion-badge" title="Candidato de alta competencia con habilidades transversales transferibles">
                  <span class="inclusion-sparkle">✦</span> Potencial Transferible
                </span>`
              : `<span style="color: var(--text-tertiary); font-size: 11px;">Estándar</span>`
            }
          </td>

          <!-- Col 6: Estado Top-N & Decisión -->
          <td onclick="event.stopPropagation()">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div>
                ${candidate.inTopN
                  ? `<span class="top-n-tag in">✓ Dentro de Top-N</span>`
                  : `<span class="top-n-tag out">Fuera de corte</span>`
                }
              </div>
              <div class="action-buttons-group">
                <button 
                  class="btn-action-primary" 
                  data-action="advance" 
                  data-id="${candidate.id}" 
                  title="Avanzar a entrevista panel de GTHC"
                >
                  Avanzar a Siguiente Paso
                </button>
                <button 
                  class="btn-action-ghost" 
                  data-action="release" 
                  data-id="${candidate.id}" 
                  title="Liberar candidato y enviar correo de agradecimiento institucional"
                >
                  Liberar y Notificar
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.bindRowEvents();
  }

  getSourceLabel(source) {
    switch (source) {
      case 'linkedin': return 'LinkedIn';
      case 'computrabajo': return 'CompuTrabajo';
      case 'bumeran': return 'Bumeran';
      case 'gmail': return 'Gmail';
      default: return 'Portal';
    }
  }

  renderCircularScore(score) {
    const radius = 17;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const colorClass = score >= 80 ? 'high' : score >= 70 ? 'medium' : 'low';

    return `
      <div class="score-circle-badge" title="Score Consolidado: ${score}/100 (ML 30% + Embeddings LLM 70%)">
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

    // Action buttons
    this.tableBody.querySelectorAll('[data-action="advance"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const candId = e.target.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === candId);
        if (cand) {
          appState.recordDecision(candId, `Avanzado a 'Entrevista Técnica y Evaluación de Cátedra'`);
          alert(`✅ El candidato ${cand.name} ha sido promovido a la siguiente fase. Se ha programado la notificación para la Dirección Académica.`);
        }
      });
    });

    this.tableBody.querySelectorAll('[data-action="release"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const candId = e.target.getAttribute('data-id');
        const cand = appState.candidates.find(c => c.id === candId);
        if (cand) {
          const confirmRelease = confirm(`¿Deseas liberar al postulante ${cand.name} y enviarle un mensaje institucional de agradecimiento?`);
          if (confirmRelease) {
            appState.recordDecision(candId, `Liberado con envío automático de correo institucional de agradecimiento`);
            alert(`📨 Correo institucional de agradecimiento enviado exitosamente a ${cand.name}.`);
          }
        }
      });
    });
  }
}
