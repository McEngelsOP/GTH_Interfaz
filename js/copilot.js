/* ==========================================================================
   TalentAI - GTHC · ESAN
   Copilot: ESA IA GTH Recruitment Assistant Controller
   ========================================================================== */

import { appState } from './state.js';
import { escapeHTML as esc } from './ui.js';

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
      if (event === 'job_changed') {
        this.appendMessage('assistant', `Convocatoria seleccionada: <strong>${esc(data.jobPosting.title)}</strong>. ${data.jobPosting.demo ? 'Esta vacante todavía no tiene CVs; el asistente solo muestra datos de demostración.' : 'Responderé con los perfiles de ejemplo asociados a esta vista.'}`);
      }
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
    
    this.appendMessage('assistant', `Hola, soy <strong>ESA IA GTH</strong> en modo demostración. Puedes explorar los perfiles de ejemplo de <strong>${esc(appState.jobPosting.title)}</strong> con las sugerencias rápidas. La conexión con modelos de IA y la base de datos está pendiente.`);
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
    this.appendMessage('user', esc(text));

    // Show typing placeholder
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message assistant';
    typingIndicator.id = 'copilotTyping';
    typingIndicator.innerHTML = `
      <div class="message-bubble" style="color: var(--text-tertiary); font-style: italic;">
        Consultando los datos de demostración...
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
    if (!appState.candidates.length) {
      this.appendMessage('assistant', `Todavía no hay candidatos de demostración para <strong>${esc(appState.jobPosting.title)}</strong>. Cuando se conecte la carga de CVs, aquí aparecerán sus evaluaciones.`);
      return;
    }

    if (qLower.includes('3 mejores') || qLower.includes('mejores perfiles') || qLower.includes('top 3')) {
      const top3 = appState.candidates.slice(0, 3);

      const cardsHtml = `
        Estos son los <strong>${top3.length} perfiles de ejemplo con mayor puntaje</strong> para ${esc(appState.jobPosting.title)}. Los puntajes provienen de datos de demostración:
        
        <div class="recommendation-cards-container">
          ${top3.map((cand, idx) => `
            <div class="rec-card">
              <div class="rec-card-header">
                <div class="rec-candidate-info">
                  <span class="rec-rank-badge">#${idx + 1}</span>
                  <span class="rec-name">${esc(cand.name)}</span>
                </div>
                <span class="rec-score-badge">${cand.score}/100</span>
              </div>
              <div class="rec-justification">
                <strong>Motivo de ejemplo:</strong> ${esc(cand.narrative.selectionReason.substring(0, 140))}...
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
      const cand = appState.candidates.find(c => /liderazgo/i.test(c.narrative?.selectionReason || '')) || appState.candidates[0];
      this.appendMessage('assistant', `
        Revisión de los perfiles de ejemplo para esta convocatoria:
        <br><br>
        <strong>${esc(cand.name)}</strong> figura con ${cand.score}/100. ${esc(cand.narrative?.selectionReason || 'Consulta su expediente para ver más detalles.')}
        <div style="margin-top: 8px;">
          <button class="btn-rec-action" data-id="${esc(cand.id)}">Ver expediente de ${esc(cand.name)} →</button>
        </div>
      `);
      return;
    }

    if (qLower.includes('transferible') || qLower.includes('fuera del top-n')) {
      const transferable = appState.candidates.filter(c => c.transferablePotential);
      this.appendMessage('assistant', `
        He identificado <strong>${transferable.length} candidatos destacados con Potencial Transferible</strong> bajo el Principio de Inclusión.
        <br><br>
        ${transferable.length ? `Entre ellos: ${transferable.slice(0, 3).map(c => esc(c.name)).join(', ')}. Revisa sus expedientes antes de decidir.` : 'No hay perfiles marcados como transferibles en los datos de esta convocatoria.'}
      `);
      return;
    }

    // Default response
    this.appendMessage('assistant', `
      La consulta <em>"${esc(query)}"</em> no coincide con una sugerencia disponible en este prototipo. Prueba «3 mejores perfiles», «liderazgo» o «potencial transferible». La consulta semántica estará disponible cuando se conecte la IA.
    `);
  }
}
