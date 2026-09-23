/* ==========================================================================
   TalentAI - GTHC · ESAN
   Auditability, Score Explainability & Interview STAR Generator Drawer
   ========================================================================== */

import { appState } from './state.js';
import { escapeHTML as esc } from './ui.js';

export class DrawerController {
  constructor(backdropEl, drawerEl) {
    this.backdrop = backdropEl;
    this.drawer = drawerEl;
    
    this.initElements();
    this.initListeners();
  }

  initElements() {
    this.closeBtn = this.drawer.querySelector('#drawerCloseBtn');
    this.tabBtns = this.drawer.querySelectorAll('.drawer-tab-btn');
    this.tabPanes = this.drawer.querySelectorAll('.tab-pane');

    // Header info
    this.avatarEl = this.drawer.querySelector('#drawerCandidateAvatar');
    this.nameEl = this.drawer.querySelector('#drawerCandidateName');
    this.roleEl = this.drawer.querySelector('#drawerCandidateRole');
    this.sourceEl = this.drawer.querySelector('#drawerCandidateSource');
    this.scoreBadgeEl = this.drawer.querySelector('#drawerScoreBadge');

    // Content containers
    this.paneExplain = this.drawer.querySelector('#tabPane_explain');
    this.paneGaps = this.drawer.querySelector('#tabPane_gaps');
    this.paneWeights = this.drawer.querySelector('#tabPane_weights');
    this.paneCV = this.drawer.querySelector('#tabPane_cv');
    this.paneAudit = this.drawer.querySelector('#tabPane_audit');

    // Drawer action buttons
    this.btnAdvance = this.drawer.querySelector('#drawerBtnAdvance');
    this.btnRelease = this.drawer.querySelector('#drawerBtnRelease');
  }

  initListeners() {
    // Close events
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.backdrop) {
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) {
          this.close();
        }
      });
    }

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.backdrop.classList.contains('active')) {
        this.close();
      }
    });

    // Tab buttons
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Drawer footer actions
    if (this.btnAdvance) {
      this.btnAdvance.addEventListener('click', () => {
        const cand = appState.getSelectedCandidate();
        if (cand) {
          const stages = ['postulado', 'preseleccionado', 'entrevista', 'evaluacion', 'oferta', 'contratado'];
          const currIdx = stages.indexOf(cand.stage);
          if (currIdx < stages.length - 1) {
            const nextStage = stages[currIdx + 1];
            appState.moveCandidateStage(cand.id, nextStage);
            alert(`✅ ${cand.name} ha avanzado a la etapa: "${nextStage.toUpperCase()}".`);
            this.renderAuditPane(cand);
          }
        }
      });
    }

    if (this.btnRelease) {
      this.btnRelease.addEventListener('click', () => {
        const cand = appState.getSelectedCandidate();
        if (cand) {
          const ok = confirm(`¿Liberar al postulante ${cand.name}? Se registrará en la auditoría y se preservará en el Banco de Talento.`);
          if (ok) {
            appState.recordDecision(cand.id, `Liberado desde panel de explicabilidad`);
            appState.addToTalentPool(cand.id, "Preservado tras liberación en convocatoria activa.");
            alert(`📨 Notificación de agradecimiento registrada para ${cand.name}.`);
            this.renderAuditPane(cand);
          }
        }
      });
    }

    // Subscribe to state
    appState.subscribe((event, data) => {
      if (event === 'candidate_selected') {
        const cand = appState.getSelectedCandidate();
        if (cand) {
          this.populate(cand);
          this.open();
        }
      } else if (event === 'drawer_tab_changed') {
        this.switchTab(data.tabName);
      }
    });
  }

  open() {
    this.backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  switchTab(tabName) {
    appState.activeDrawerTab = tabName;

    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.getAttribute('id') === `tabPane_${tabName}`);
    });
  }

  populate(candidate) {
    // Header
    const initials = candidate.name.split(' ').map(n => n[0]).slice(0, 2).join('');
    if (this.avatarEl) this.avatarEl.textContent = initials;
    if (this.nameEl) {
      this.nameEl.innerHTML = `
        ${candidate.name}
        <span class="stage-tag stage-${candidate.stage}" style="font-size: 11px; margin-left: 8px;">
          ${candidate.stage.toUpperCase()}
        </span>
      `;
    }
    if (this.roleEl) this.roleEl.textContent = `${candidate.role} · ${candidate.company}`;
    if (this.sourceEl) this.sourceEl.textContent = `Convocatoria: ${appState.jobPosting.title} | Origen: ${candidate.source.toUpperCase()}`;

    // Score badge
    if (this.scoreBadgeEl) {
      const color = candidate.score >= 85 ? 'var(--status-success)' : candidate.score >= 75 ? 'var(--status-warning)' : 'var(--status-danger)';
      this.scoreBadgeEl.innerHTML = `
        <div style="text-align: right;">
          <div style="font-family: var(--font-heading); font-size: 24px; font-weight: 800; color: ${color}; line-height: 1;">
            ${candidate.score}<span style="font-size: 13px; color: var(--text-tertiary);">/100</span>
          </div>
          <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
            ${candidate.rank <= 3 ? `🥇 Podio Top ${candidate.rank}` : `Ranking #${candidate.rank}`}
          </div>
        </div>
      `;
    }

    // Render Contextual Quick Actions (Cambio #14)
    this.renderQuickActions(candidate);

    // Populate Tab 1: Explicación del Score
    this.renderExplainPane(candidate);

    // Populate Tab 2: Brechas & Entrevista STAR (Cambio #10)
    this.renderGapsPane(candidate);

    // Populate Tab 3: Desglose por Pesos
    this.renderWeightsPane(candidate);

    // Populate Tab 4: CV Markdown
    this.renderCVPane(candidate);

    // Populate Tab 5: Registro de Auditoría
    this.renderAuditPane(candidate);

    // Default tab
    this.switchTab(appState.activeDrawerTab || 'explain');
  }

  renderQuickActions(cand) {
    let actionContainer = this.drawer.querySelector('.drawer-quick-actions-mount');
    if (!actionContainer) {
      const headerArea = this.drawer.querySelector('.drawer-header');
      actionContainer = document.createElement('div');
      actionContainer.className = 'drawer-quick-actions-mount';
      headerArea.parentNode.insertBefore(actionContainer, headerArea.nextSibling);
    }

    actionContainer.innerHTML = `
      <div class="quick-action-bar" style="padding: 0 28px 12px; border-bottom: 1px solid var(--border-divider); display: flex; flex-wrap: wrap; gap: 8px;">
        <button class="quick-action-btn primary" data-action="btn-explain" title="Ver justificación técnica y explicabilidad del score">
          🪄 Explicar Score
        </button>
        <button class="quick-action-btn primary" data-action="btn-star" title="Ver preguntas situacionales STAR personalizadas para entrevista">
          📋 Generar Entrevista STAR
        </button>
        <button class="quick-action-btn" data-action="btn-gaps" title="Analizar brechas de competencias y requisitos faltantes">
          🔍 Analizar Brechas
        </button>
        <button class="quick-action-btn" data-action="btn-compare" title="Agregar a comparador cara a cara y contrastar">
          ⚖️ Comparar Candidato
        </button>
        <button class="quick-action-btn" data-action="btn-talentpool" title="Preservar en Banco de Talento Institucional">
          👥 Banco de Talento
        </button>
      </div>
    `;

    // Bind Quick Action Events
    actionContainer.querySelector('[data-action="btn-explain"]').onclick = () => {
      this.switchTab('explain');
      const narrative = this.paneExplain?.querySelector('.narrative-box');
      if (narrative) {
        narrative.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.3)';
        setTimeout(() => narrative.style.boxShadow = '', 1500);
      }
    };
    actionContainer.querySelector('[data-action="btn-star"]').onclick = () => {
      this.switchTab('gaps');
      setTimeout(() => {
        const starBox = this.paneGaps?.querySelector('.star-generator-box');
        if (starBox) {
          starBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          starBox.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.3)';
          setTimeout(() => starBox.style.boxShadow = '', 1500);
        }
      }, 50);
    };
    actionContainer.querySelector('[data-action="btn-gaps"]').onclick = () => {
      this.switchTab('gaps');
      const gapsList = this.paneGaps?.querySelector('.gaps-list');
      if (gapsList) {
        gapsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    actionContainer.querySelector('[data-action="btn-compare"]').onclick = () => {
      appState.toggleComparisonCandidate(cand.id);
      this.close();
      appState.setCurrentView('comparison');
    };
    actionContainer.querySelector('[data-action="btn-talentpool"]').onclick = () => {
      appState.addToTalentPool(cand.id);
      alert(`👥 ${cand.name} ha sido guardado exitosamente en el Banco de Talento Institucional de ESAN.`);
    };
  }

  renderExplainPane(cand) {
    if (!this.paneExplain) return;

    const mandatoryReqs = Array.isArray(cand.mandatoryReqs) ? cand.mandatoryReqs : [];
    const passedRequirements = mandatoryReqs.filter(requirement => requirement.status === 'green').length;
    const requirementLabels = { green: 'Cumple', amber: 'Parcial', red: 'No cumple' };

    this.paneExplain.innerHTML = `
      <div class="drawer-card">
        <h4 class="drawer-card-title">
          <span style="color: var(--esan-primary);">✦</span> ¿Por qué quedó en esta posición del ranking?
        </h4>
        <div class="narrative-box">
          <p>${cand.narrative.selectionReason}</p>
        </div>

        <div class="narrative-tag-group">
          <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; color: var(--text-tertiary); margin-top: 10px;">
            Fortalezas Validadas por el Algoritmo Dual:
          </div>
          ${cand.narrative.strengths.map(s => `
            <div class="narrative-item">
              <span class="narrative-icon" style="color: var(--status-success);">✔</span>
              <span><strong>Fortaleza:</strong> ${s}</span>
            </div>
          `).join('')}

          ${cand.transferablePotential ? `
            <div class="narrative-item" style="background: #F0F9FF; padding: 8px 10px; border-radius: 6px; border-left: 3px solid var(--inclusion-text);">
              <span class="narrative-icon" style="color: var(--inclusion-text);">✦</span>
              <span><strong>Principio de Inclusión ESAN:</strong> ${cand.narrative.inclusionDetail}</span>
            </div>
          ` : ''}
        </div>

        <section class="mandatory-review" aria-labelledby="mandatoryReviewTitle">
          <div class="mandatory-review-heading">
            <h5 id="mandatoryReviewTitle">Requisitos obligatorios</h5>
            <span>${passedRequirements}/${mandatoryReqs.length} cumplen</span>
          </div>
          ${mandatoryReqs.length ? `
            <div class="mandatory-requirement-list">
              ${mandatoryReqs.map(requirement => {
                const status = ['green', 'amber', 'red'].includes(requirement.status) ? requirement.status : 'amber';
                return `
                  <div class="mandatory-requirement">
                    <span class="requirement-status-mark ${status}" aria-hidden="true"></span>
                    <div class="mandatory-requirement-copy">
                      <strong>${esc(requirement.name)}</strong>
                      <span>${esc(requirement.tooltipTitle || 'Evidencia')}</span>
                      <p>${esc(requirement.tooltipReason || 'Sin justificación registrada en esta demostración.')}</p>
                    </div>
                    <span class="requirement-status-label ${status}">${requirementLabels[status]}</span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : '<p class="mandatory-review-empty">No hay criterios obligatorios registrados para este perfil.</p>'}
        </section>
      </div>
    `;
  }

  renderGapsPane(cand) {
    if (!this.paneGaps) return;

    const questions = cand.interviewStarQuestions || [
      "Situación: Describa una situación desafiante en su área técnica o laboral.",
      "Tarea: ¿Cuál era el objetivo y las limitaciones de tiempo o presupuesto?",
      "Acción: ¿Qué decisión tomó y qué herramientas utilizó?",
      "Resultado: ¿Cuál fue el impacto cuantitativo o pedagógico logrado?"
    ];

    this.paneGaps.innerHTML = `
      <div class="drawer-card">
        <h4 class="drawer-card-title" style="color: #B45309;">
          ⚠️ Brechas Detectadas en el Perfil (${cand.name})
        </h4>
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          ${cand.gaps && cand.gaps.length > 0 && cand.gaps[0].severity !== 'none' ? cand.gaps.map(g => `
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 12px; border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #92400E;">
                <span>⚠️</span> <span>${g.item}</span>
              </div>
              ${g.tip ? `<p style="font-size: 12px; color: #78350F; margin-top: 4px;"><strong>Recomendación GTHC:</strong> ${g.tip}</p>` : ''}
            </div>
          `).join('') : `
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 12px; border-radius: 8px; color: #047857; font-weight: 600;">
              ✅ El candidato cumple satisfactoriamente con el 100% de requisitos obligatorios y preferentes.
            </div>
          `}
        </div>

        <!-- Riesgos Registrados -->
        <div style="margin-top: 16px;">
          <h5 style="font-size: 12px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 700; margin-bottom: 6px;">
            Riesgos Operacionales / Horarios
          </h5>
          <div style="background: #F8FAFC; border: 1px solid var(--border-light); padding: 10px; border-radius: 6px; font-size: 12.5px; color: var(--text-secondary);">
            ${cand.risks && cand.risks.length > 0 ? cand.risks[0] : 'Candidato sin alertas de horario ni conflicto de intereses.'}
          </div>
        </div>

        <!-- Guía de Entrevista STAR Dinámica (Cambio #10) -->
        <div style="margin-top: 20px; border-top: 1px solid var(--border-divider); padding-top: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <h4 class="drawer-card-title" style="margin-bottom: 0;">
              🎯 Guía de Entrevista Generada por IA (Método STAR)
            </h4>
            <span style="font-size: 11px; background: #EEF2FF; color: #3730A3; padding: 2px 8px; border-radius: 4px; font-weight: 700;">
              Basada en sus brechas
            </span>
          </div>
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
            Preguntas redactadas por TalentAI para indagar cómo el candidato compensa las brechas detectadas:
          </p>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${questions.map((q, idx) => `
              <div style="background: #FFFFFF; border: 1px solid var(--border-light); padding: 10px 12px; border-radius: 6px; font-size: 12.5px; line-height: 1.4;">
                <span style="font-weight: 700; color: var(--esan-primary);">P${idx + 1}:</span> ${q}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Marketplace de Vacantes Cruzadas (Cambio #13) -->
        <div class="crossmatch-box" style="margin-top: 20px; border-top: 1px solid var(--border-divider); padding-top: 16px;">
          <h4 class="drawer-card-title" style="color: #1D4ED8;">
            🔄 Oportunidades en Vacantes Cruzadas (Marketplace Interno)
          </h4>
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">
            TalentAI detectó afinidad de este perfil con otras convocatorias activas en ESAN:
          </p>

          ${cand.crossMatches && cand.crossMatches.length > 0 ? cand.crossMatches.map(cm => `
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <div>
                <div style="font-weight: 700; font-size: 13px; color: #1E3A8A;">${cm.jobTitle}</div>
                <div style="font-size: 11.5px; color: #2563EB;">${cm.reason}</div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <span style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; color: #1D4ED8;">${cm.matchPct}%</span>
                <div style="font-size: 10px; color: #3B82F6;">Coincidencia</div>
              </div>
            </div>
          `).join('') : `
            <div style="font-size: 12px; color: var(--text-tertiary); font-style: italic;">
              No se detectaron vacantes paralelas de alta coincidencia en este momento.
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderWeightsPane(cand) {
    if (!this.paneWeights) return;

    const weights = cand.weights || appState.jobPosting.weights.map(w => ({
      label: w.label,
      weightPct: w.weightPct,
      scoreObtained: Math.round((cand.score * w.weightPct) / 100),
      maxScore: w.weightPct,
      type: w.type
    }));

    this.paneWeights.innerHTML = `
      <div class="drawer-card">
        <h4 class="drawer-card-title">Desglose Analítico por Criterios de Ponderación</h4>
        <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 16px;">
          Pesos configurados específicamente para: <strong>${appState.jobPosting.title}</strong> (${appState.jobPosting.roleTypeName}).
        </p>

        <div class="weights-list">
          ${weights.map(w => `
            <div class="weight-bar-item">
              <div class="weight-meta">
                <span class="weight-label">
                  ${w.label}
                  <span class="weight-tag ${w.type.toLowerCase()}">${w.type}</span>
                </span>
                <span class="weight-score"><strong>${w.scoreObtained}</strong> / ${w.maxScore} pts (${w.weightPct}%)</span>
              </div>
              <div class="weight-progress-track">
                <div class="weight-progress-fill ${w.type.toLowerCase()}" style="width: ${(w.scoreObtained / w.maxScore) * 100}%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderCVPane(cand) {
    if (!this.paneCV) return;

    this.paneCV.innerHTML = `
      <div class="drawer-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h4 class="drawer-card-title" style="margin-bottom: 0;">Currículum Vitae Estructurado (Post-OCR)</h4>
          <span style="font-size: 11px; color: var(--text-tertiary);">Extracción Verificada</span>
        </div>
        <div class="cv-markdown-container">
          <pre style="white-space: pre-wrap; font-family: var(--font-body); font-size: 12.5px; line-height: 1.6; color: var(--text-main);">${cand.cvMarkdown || 'Sin CV estructurado'}</pre>
        </div>
      </div>
    `;
  }

  renderAuditPane(cand) {
    if (!this.paneAudit) return;

    this.paneAudit.innerHTML = `
      <div class="drawer-card">
        <h4 class="drawer-card-title">Registro de Auditoría e Inmutabilidad GTHC</h4>
        <div class="audit-meta-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <div class="audit-meta-box">
            <span class="audit-meta-label">ID de Lote</span>
            <span class="audit-meta-value">${cand.audit.batchId}</span>
          </div>
          <div class="audit-meta-box">
            <span class="audit-meta-label">Versión Criterios</span>
            <span class="audit-meta-value">${cand.audit.criteriaVersion}</span>
          </div>
          <div class="audit-meta-box" style="grid-column: span 2;">
            <span class="audit-meta-label">Modelos Empleados</span>
            <span class="audit-meta-value">${cand.audit.model}</span>
          </div>
        </div>

        <h5 style="font-size: 12px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 700; margin-bottom: 8px;">
          Historial de Trazabilidad y Decisiones Humanas
        </h5>
        <div class="audit-timeline">
          ${cand.audit.decisionHistory.map(entry => `
            <div class="timeline-entry" style="padding: 8px 12px; background: #F8FAFC; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #2563EB;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-tertiary);">
                <span>${entry.user}</span>
                <span>${entry.time}</span>
              </div>
              <div style="font-size: 12.5px; font-weight: 600; color: var(--text-main); margin-top: 2px;">
                ${entry.action}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
