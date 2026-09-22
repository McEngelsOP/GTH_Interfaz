/* ==========================================================================
   TalentAI - GTHC · ESAN
   Copilot: ESA IA GTH Recruitment Assistant Controller
   ========================================================================== */

import { appState } from './state.js';

export class CopilotController {
  constructor(copilotContainerEl, floatingTriggerBtn) {
    this.copilotEl = copilotContainerEl;
    this.floatingBtn = floatingTriggerBtn;

    this.initElements();
    this.initListeners();
    this.initInitialWelcome();
  }

  initElements() {
    this.closeBtn = this.copilotEl.querySelector('#copilotCloseBtn');
    this.chatFeed = this.copilotEl.querySelector('#copilotChatFeed');
    this.form = this.copilotEl.querySelector('#copilotInputForm');
    this.input = this.copilotEl.querySelector('#copilotTextInput');
    this.chipBtns = this.copilotEl.querySelectorAll('.copilot-chip-btn');
  }

  initListeners() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.collapse();
      });
    }

    if (this.floatingBtn) {
      this.floatingBtn.addEventListener('click', () => {
        this.expand();
      });
    }

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.input.value.trim();
        if (text) {
          this.sendMessage(text);
          this.input.value = '';
        }
      });
    }

    this.chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        if (query) {
          this.sendMessage(query);
        }
      });
    });

    appState.subscribe((event, data) => {
      if (event === 'copilot_toggled') {
        if (data.collapsed) {
          this.copilotEl.classList.add('collapsed');
          if (this.floatingBtn) this.floatingBtn.classList.remove('hidden');
        } else {
          this.copilotEl.classList.remove('collapsed');
          if (this.floatingBtn) this.floatingBtn.classList.add('hidden');
        }
      }
    });
  }

  collapse() {
    appState.setCopilotCollapsed(true);
  }

  expand() {
    appState.setCopilotCollapsed(false);
  }

  initInitialWelcome() {
    if (!this.chatFeed) return;
    
    // Initial welcome message from AI
    this.appendMessage('assistant', `
      Hola Mariana, soy tu asistente de reclutamiento <strong>ESA IA GTH</strong>. He procesado los <strong>482 CVs</strong> de la convocatoria <em>Desarrollador de Software - Semestre 2026-II</em> mediante matching dual (ML + Embeddings LLM).
      <br><br>
      Puedes realizar consultas semánticas, solicitar justificaciones de puntaje o usar las sugerencias rápidas arriba.
    `);
  }

  appendMessage(role, htmlContent) {
    const time = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${role}`;
    messageEl.innerHTML = `
      <div class="message-bubble">
        ${htmlContent}
      </div>
      <span class="message-time">${time}</span>
    `;

    this.chatFeed.appendChild(messageEl);
    this.chatFeed.scrollTop = this.chatFeed.scrollHeight;

    // Attach inline events if recommendation cards exist
    messageEl.querySelectorAll('.btn-rec-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const candId = btn.getAttribute('data-id');
        if (candId) {
          appState.selectCandidate(candId);
        }
      });
    });
  }

  sendMessage(text) {
    // Append user message
    this.appendMessage('user', text);

    // Show typing placeholder
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message assistant';
    typingIndicator.id = 'copilotTyping';
    typingIndicator.innerHTML = `
      <div class="message-bubble" style="color: var(--text-tertiary); font-style: italic;">
        Consultando base vectorial y criterios ponderados...
      </div>
    `;
    this.chatFeed.appendChild(typingIndicator);
    this.chatFeed.scrollTop = this.chatFeed.scrollHeight;

    setTimeout(() => {
      const el = document.getElementById('copilotTyping');
      if (el) el.remove();
      this.generateAIResponse(text);
    }, 700);
  }

  generateAIResponse(query) {
    const qLower = query.toLowerCase();

    if (qLower.includes('3 mejores') || qLower.includes('mejores perfiles') || qLower.includes('top 3')) {
      const top3 = appState.candidates.slice(0, 3);

      const cardsHtml = `
        A continuación, presento los <strong>3 perfiles con mayor compatibilidad ponderada</strong> para la vacante de Desarrollador de Software según los pesos institucionales (30% ML reglas + 70% Embeddings LLM):
        
        <div class="recommendation-cards-container">
          ${top3.map((cand, idx) => `
            <div class="rec-card">
              <div class="rec-card-header">
                <div class="rec-candidate-info">
                  <span class="rec-rank-badge">#${idx + 1}</span>
                  <span class="rec-name">${cand.name}</span>
                </div>
                <span class="rec-score-badge">${cand.score}/100</span>
              </div>
              <div class="rec-justification">
                <strong>Justificación objetiva:</strong> ${cand.narrative.selectionReason.substring(0, 140)}...
              </div>
              <div class="rec-actions">
                <button class="btn-rec-action" data-id="${cand.id}">
                  Cargar en tabla principal & Ver detalle →
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      this.appendMessage('assistant', cardsHtml);
      return;
    }

    if (qLower.includes('liderazgo') || qLower.includes('potencial en liderazgo')) {
      const cand = appState.candidates.find(c => c.name === 'Carlos Mendoza') || appState.candidates[0];
      this.appendMessage('assistant', `
        Analizando la dimensión de liderazgo y gestión:
        <br><br>
        El postulante con mayor solvencia comprobada es <strong>${cand.name}</strong> (Score: ${cand.score}/100), quien registra dirección de equipos ágiles de 14 ingenieros en banca y cuenta con experiencia previa impartiendo cátedra en ESAN.
        <div style="margin-top: 8px;">
          <button class="btn-rec-action" data-id="${cand.id}">Ver expediente de ${cand.name} →</button>
        </div>
      `);
      return;
    }

    if (qLower.includes('transferible') || qLower.includes('fuera del top-n')) {
      const transferable = appState.candidates.filter(c => c.transferablePotential);
      this.appendMessage('assistant', `
        He identificado <strong>${transferable.length} candidatos destacados con Potencial Transferible</strong> bajo el Principio de Inclusión.
        <br><br>
        Estos postulantes (como <em>Paul Ladern</em> o <em>Roberto Cáceres</em>) poseen competencias arquitectónicas avanzadas que compensan desviaciones menores de certificaciones formales.
        <div style="margin-top: 8px;">
          <button class="btn-rec-action" data-id="CAND-002">Examinar caso de Paul Ladern (83 pts) →</button>
        </div>
      `);
      return;
    }

    // Default response
    this.appendMessage('assistant', `
      He analizado tu consulta <em>"${query}"</em> contrastando la base de 482 candidatos con los criterios de la convocatoria.
      <br><br>
      Los filtros aplicados confirman que el <strong>Score Promedio del lote es de 74.2/100</strong>, cumpliendo con los estándares de rigor técnico de GTHC · ESAN.
    `);
  }
}
