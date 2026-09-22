/* ==========================================================================
   TalentAI - GTHC · ESAN
   Auditability & Score Explainability Slide-Over Drawer Controller
   ========================================================================== */

import { appState } from './state.js';

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
          appState.recordDecision(cand.id, `Avanzado desde panel de explicabilidad`);
          alert(`✅ ${cand.name} ha sido promovido exitosamente.`);
          this.renderAuditPane(cand);
        }
      });
    }

    if (this.btnRelease) {
      this.btnRelease.addEventListener('click', () => {
        const cand = appState.getSelectedCandidate();
        if (cand) {
          const ok = confirm(`¿Liberar y notificar agradecimiento institucional a ${cand.name}?`);
          if (ok) {
            appState.recordDecision(cand.id, `Liberado desde panel de explicabilidad`);
            alert(`📨 Notificación enviada a ${cand.name}.`);
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
    if (this.nameEl) this.nameEl.textContent = candidate.name;
    if (this.roleEl) this.roleEl.textContent = `${candidate.role} · ${candidate.company}`;
    if (this.sourceEl) this.sourceEl.textContent = `Origen: ${candidate.source.toUpperCase()}`;

    // Score badge
    if (this.scoreBadgeEl) {
      const color = candidate.score >= 80 ? 'var(--status-success)' : candidate.score >= 70 ? 'var(--status-warning)' : 'var(--status-danger)';
      this.scoreBadgeEl.innerHTML = `
        <div style="text-align: right;">
          <div style="font-family: var(--font-heading); font-size: 24px; font-weight: 800; color: ${color}; line-height: 1;">
            ${candidate.score}<span style="font-size: 13px; color: var(--text-tertiary);">/100</span>
          </div>
          <div style="font-size: 10.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
            Matching Dual
          </div>
        </div>
      `;
    }

    // Populate Tab 1: Explicación del Score
    this.renderExplainPane(candidate);

    // Populate Tab 2: Desglose por Pesos
    this.renderWeightsPane(candidate);

    // Populate Tab 3: CV Markdown
    this.renderCVPane(candidate);

    // Populate Tab 4: Registro de Auditoría
    this.renderAuditPane(candidate);

    // Default to explain tab
    this.switchTab(appState.activeDrawerTab || 'explain');
  }

  renderExplainPane(cand) {
    if (!this.paneExplain) return;

    this.paneExplain.innerHTML = `
      <div class="drawer-card">
        <h4 class="drawer-card-title">
          <span style="color: var(--esan-primary);">✦</span> ¿Por qué quedó seleccionado este perfil?
        </h4>
        <div class="narrative-box">
          <p>${cand.narrative.selectionReason}</p>
        </div>

        <div class="narrative-tag-group">
          <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; color: var(--text-tertiary); margin-top: 10px;">
            Puntos Clave Validados por IA:
          </div>
          ${cand.narrative.strengths.map(s => `
            <div class="narrative-item">
              <span class="narrative-icon" style="color: var(--status-success);">✔</span>
              <span><strong>Fortaleza:</strong> ${s}</span>
            </div>
          `).join('')}

          <div class="narrative-item" style="background: #FEF2F2; padding: 8px 10px; border-radius: 6px; border-left: 3px solid var(--status-danger);">
            <span class="narrative-icon" style="color: var(--status-danger);">⚠</span>
            <span style="color: #991B1B;"><strong>Análisis de Brecha:</strong> ${cand.narrative.gap}</span>
          </div>

          ${cand.transferablePotential ? `
            <div class="narrative-item" style="background: #F0F9FF; padding: 8px 10px; border-radius: 6px; border-left: 3px solid var(--inclusion-text);">
              <span class="narrative-icon" style="color: var(--inclusion-text);">✦</span>
              <span style="color: #0369A1;"><strong>Principio de Inclusión:</strong> ${cand.narrative.inclusionDetail}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="drawer-card">
        <h4 class="drawer-card-title">Resumen de Criterios Obligatorios</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${cand.mandatoryReqs.map((req, i) => `
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 8px 10px; border-radius: 6px; background: #F8FAFC; border: 1px solid var(--border-light);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="capsule-pill pill-${req.status}" style="width: 10px; height: 18px; border-radius: 4px;"></span>
                <span style="font-weight: 600; font-size: 12.5px; color: var(--text-main);">${req.name}</span>
              </div>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${req.status === 'green' ? 'var(--status-success)' : req.status === 'amber' ? 'var(--status-warning)' : 'var(--status-danger)'};">
                ${req.status === 'green' ? 'Cumplido' : req.status === 'amber' ? 'Parcial' : 'No cumple'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderWeightsPane(cand) {
    if (!this.paneWeights) return;

    this.paneWeights.innerHTML = `
      <div class="drawer-card">
        <h4 class="drawer-card-title">Ponderación Dual de Motores</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div style="background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: var(--radius-md); padding: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: #6D28D9; text-transform: uppercase;">Camino 1 · ML Tradicional (30%)</div>
            <div style="font-size: 20px; font-weight: 800; color: #5B21B6; margin-top: 4px;">${cand.mlScore}/100</div>
            <div style="font-size: 11.5px; color: #4C1D95;">Reglas NLP, años experiencia & filtros duros.</div>
          </div>
          <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: var(--radius-md); padding: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: #1D4ED8; text-transform: uppercase;">Camino 2 · LLM Embeddings (70%)</div>
            <div style="font-size: 20px; font-weight: 800; color: #1E40AF; margin-top: 4px;">${cand.llmScore}/100</div>
            <div style="font-size: 11.5px; color: #1E3A8A;">Similitud semántica vectorial Claude/OpenAI.</div>
          </div>
        </div>

        <h5 style="font-size: 12.5px; font-weight: 700; margin-bottom: 10px; color: var(--text-main);">
          Desglose Analítico por Variables y Pesos Asignados:
        </h5>

        <div class="weight-breakdown-list">
          ${cand.weights.map(w => {
            const pct = Math.round((w.scoreObtained / w.maxScore) * 100);
            const fillClass = w.type === 'LLM' ? 'info' : 'primary';
            return `
              <div class="weight-row">
                <div class="weight-meta">
                  <span class="weight-label">${w.label} (Peso: ${w.weightPct}%)</span>
                  <span class="weight-score"><strong>${w.scoreObtained}</strong> / ${w.maxScore} pts (${pct}%)</span>
                </div>
                <div class="weight-track">
                  <div class="weight-fill ${fillClass}" style="width: ${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderCVPane(cand) {
    if (!this.paneCV) return;

    // Format markdown text into clean HTML
    const formattedHtml = this.formatMarkdownToHtml(cand.cvMarkdown);

    this.paneCV.innerHTML = `
      <div class="drawer-card" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 12px; color: var(--text-secondary);">
          Documento extraído mediante <strong>OCR Inteligente</strong> y estructurado a Markdown.
        </span>
        <button class="btn btn-secondary btn-sm" onclick="alert('Descargando archivo estructurado en formato .md...')">
          Descargar .MD
        </button>
      </div>
      <div class="markdown-cv-viewer">
        ${formattedHtml}
      </div>
    `;
  }

  renderAuditPane(cand) {
    if (!this.paneAudit) return;

    this.paneAudit.innerHTML = `
      <div class="drawer-card">
        <h4 class="drawer-card-title">Sello Inmutable de Auditoría GTHC</h4>
        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">
          Trazabilidad criptográfica y operativa del proceso de selección automatizado según directivas de gobernanza ESAN.
        </p>

        <div class="audit-stamp-box">
          <div class="audit-badge-verified">
            ✓ Registro Verificado & Firmado
          </div>

          <div class="audit-field-grid">
            <div class="audit-field">
              <span class="audit-field-title">ID de Lote de Postulación:</span>
              <span class="audit-field-value">${cand.audit.batchId}</span>
            </div>
            <div class="audit-field">
              <span class="audit-field-title">Fecha & Hora de Indexación:</span>
              <span class="audit-field-value">${cand.audit.timestamp}</span>
            </div>
            <div class="audit-field">
              <span class="audit-field-title">Versión de Criterios & Pesos:</span>
              <span class="audit-field-value">${cand.audit.criteriaVersion}</span>
            </div>
            <div class="audit-field">
              <span class="audit-field-title">Modelo de Embeddings / LLM:</span>
              <span class="audit-field-value">${cand.audit.model}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-card">
        <h4 class="drawer-card-title">Historial de Decisiones y Acciones</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
          ${cand.audit.decisionHistory.map(dh => `
            <div style="padding: 10px 12px; background: #F8FAFC; border-radius: 6px; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-tertiary);">
                <span>${dh.time}</span>
                <strong style="color: var(--text-secondary);">${dh.user}</strong>
              </div>
              <div style="font-size: 12.5px; font-weight: 500; color: var(--text-main);">
                ${dh.action}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  formatMarkdownToHtml(md) {
    if (!md) return '<p>No hay contenido disponible.</p>';
    return md
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/gim, '<p></p>');
  }
}
