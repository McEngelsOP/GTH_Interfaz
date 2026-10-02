/* ==========================================================================
   TalentAI - GTHC · ESAN
   Interactive Kanban Pipeline Board (Cambio #7)
   ========================================================================== */

import { appState } from './state.js';

export class KanbanViewController {
  constructor(containerEl) {
    this.container = containerEl;
    this.stages = [
      { id: 'postulado', label: '1. Postulados', color: '#64748B' },
      { id: 'preseleccionado', label: '2. Preseleccionados', color: '#2563EB' },
      { id: 'entrevista', label: '3. En Entrevista', color: '#8B5CF6' },
      { id: 'evaluacion', label: '4. Evaluación & Brechas', color: '#F59E0B' },
      { id: 'oferta', label: '5. En Oferta', color: '#0284C7' },
      { id: 'contratado', label: '6. Contratados 🎉', color: '#10B981' }
    ];

    this.initListeners();
  }

  initListeners() {
    appState.subscribe((event) => {
      if ([
        'job_changed',
        'view_changed',
        'candidate_stage_changed',
        'decision_recorded',
        'filter_changed'
      ].includes(event)) {
        if (appState.currentView === 'kanban') {
          this.render();
        }
      }
    });
  }

  render() {
    if (!this.container) return;

    const candidates = appState.getFilteredCandidates();

    this.container.innerHTML = `
      <div class="kanban-wrapper">
        <div class="kanban-header-bar">
          <div>
            <h2 style="font-family: var(--font-heading); font-size: 18px; font-weight: 700; color: var(--text-main);">
              Tablero Kanban del Proceso de Selección
            </h2>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">
              Seguimiento ágil de candidatos en 6 etapas para: <strong>${appState.jobPosting.title}</strong>
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 12px; color: var(--text-tertiary);">Total en flujo: <strong>${candidates.length} candidatos</strong></span>
            <button class="btn btn-secondary" onclick="window.kanbanController.advanceTopNToInterview()">
              ⚡ Avanzar Top-N a Entrevista
            </button>
          </div>
        </div>

        <div class="kanban-board-grid">
          ${this.stages.map(stage => {
            const stageCandidates = candidates.filter(c => c.stage === stage.id);
            return `
              <div class="kanban-column" data-stage="${stage.id}">
                <div class="kanban-column-header">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="kanban-column-dot" style="background: ${stage.color};"></span>
                    <span class="kanban-column-title">${stage.label}</span>
                  </div>
                  <span class="kanban-column-count">${stageCandidates.length}</span>
                </div>

                <div class="kanban-cards-list">
                  ${stageCandidates.length === 0 ? `
                    <div class="kanban-empty-state">Sin candidatos en esta etapa</div>
                  ` : stageCandidates.map(cand => `
                    <div class="kanban-card" data-id="${cand.id}">
                      <div class="kanban-card-top">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          ${cand.rank <= 3 ? `
                            <span class="podium-rank-badge podium-${cand.rank}">
                              ${cand.rank === 1 ? '🥇 Top 1' : cand.rank === 2 ? '🥈 Top 2' : '🥉 Top 3'}
                            </span>
                          ` : `
                            <span class="podium-rank-badge podium-regular">#${cand.rank}</span>
                          `}
                          <span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #EFF6FF; color: #1D4ED8;">
                            Score ${cand.score}
                          </span>
                        </div>
                        <button class="kanban-card-drawer-btn" data-action="open-drawer" data-id="${cand.id}" title="Abrir ficha">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h6v6"></path>
                            <path d="M10 14L21 3"></path>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          </svg>
                        </button>
                      </div>

                      <div class="kanban-card-title">${cand.name}</div>
                      <div class="kanban-card-subtitle">${cand.role} • <strong>${cand.company}</strong></div>

                      ${cand.gaps && cand.gaps.length > 0 && cand.gaps[0].severity !== 'none' ? `
                        <div class="kanban-card-gap">
                          ⚠️ ${cand.gaps[0].item}
                        </div>
                      ` : `
                        <div class="kanban-card-gap clean">
                          ✅ Perfil Óptimo
                        </div>
                      `}

                      <div class="kanban-card-actions">
                        ${this.renderCardMoveButtons(cand.id, stage.id)}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.bindKanbanEvents();
  }

  renderCardMoveButtons(candId, currentStage) {
    const stageIds = this.stages.map(s => s.id);
    const currIdx = stageIds.indexOf(currentStage);

    let prevBtn = '';
    let nextBtn = '';

    if (currIdx > 0) {
      prevBtn = `
        <button class="kanban-btn-move" data-action="prev" data-id="${candId}" data-target="${stageIds[currIdx - 1]}" title="Retroceder etapa">
          ←
        </button>
      `;
    }

    if (currIdx < stageIds.length - 1) {
      const nextStageName = this.stages[currIdx + 1].label.split('.')[1].trim();
      nextBtn = `
        <button class="kanban-btn-next" data-action="next" data-id="${candId}" data-target="${stageIds[currIdx + 1]}">
          Avanzar a ${nextStageName} →
        </button>
      `;
    }

    return `
      ${prevBtn}
      ${nextBtn}
    `;
  }

  advanceTopNToInterview() {
    const topCandidates = appState.candidates.filter(c => c.inTopN && (c.stage === 'postulado' || c.stage === 'preseleccionado'));
    if (topCandidates.length === 0) {
      alert("Todos los candidatos dentro del corte Top-N ya se encuentran en Entrevista o etapas posteriores.");
      return;
    }

    topCandidates.forEach(cand => {
      appState.moveCandidateStage(cand.id, 'entrevista');
    });

    alert(`✅ ${topCandidates.length} candidatos del Top-N han sido avanzados automáticamente a la fase de 'Entrevista'.`);
    this.render();
  }

  bindKanbanEvents() {
    // Open drawer on card click
    this.container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // Ignore button clicks
        const candId = card.getAttribute('data-id');
        appState.selectCandidate(candId);
      });
    });

    this.container.querySelectorAll('[data-action="open-drawer"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        appState.selectCandidate(candId);
      });
    });

    // Move next
    this.container.querySelectorAll('[data-action="next"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        const targetStage = btn.getAttribute('data-target');
        appState.moveCandidateStage(candId, targetStage);
        this.render();
      });
    });

    // Move prev
    this.container.querySelectorAll('[data-action="prev"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candId = btn.getAttribute('data-id');
        const targetStage = btn.getAttribute('data-target');
        appState.moveCandidateStage(candId, targetStage);
        this.render();
      });
    });
  }
}
