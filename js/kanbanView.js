import { appState } from './state.js';
import { escapeHTML as esc, notify } from './ui.js';
import { STAGES, STAGE_LABELS, isEligible } from './domain.js';

export class KanbanViewController {
  constructor(container) {
    this.container=container; this.query=''; this.limits={};
    appState.subscribe(event=>{
      if(event==='job_changed') { this.query=''; this.limits={}; }
      if(['job_changed','view_changed','candidate_stage_changed','candidates_updated','criteria_updated','role_changed','topN_changed','ranking_model_changed'].includes(event)&&appState.currentView==='kanban') this.render();
    });
    container.addEventListener('input',e=>{ if(e.target.id==='kanbanSearch') {this.query=e.target.value;this.limits={};this.renderBoard();} });
    container.addEventListener('click',e=>{
      const btn=e.target.closest('[data-kanban]'); if(!btn) return;
      const {kanban:action,id,stage}=btn.dataset;
      if(action==='open') appState.selectCandidate(id);
      if(action==='more') {this.limits[stage]=(this.limits[stage]||25)+25;this.renderBoard();}
      if(action==='next'&&appState.advanceCandidate(id)) notify('Etapa actualizada.');
      if(action==='prev') { const c=appState.candidates.find(c=>c.id===id); if(c) appState.moveCandidateStage(id,STAGES[STAGES.indexOf(c.stage)-1]); }
    });
  }
  render() {
    this.container.innerHTML=`<section class="kanban-wrapper"><header class="kanban-header-bar"><div><h2>Avance de candidatos</h2><p>${esc(appState.jobPosting.title)}</p></div><label>Buscar en el tablero<input id="kanbanSearch" type="search" value="${esc(this.query)}" placeholder="Nombre o puesto"></label></header><p class="demo-note">Sigue cada postulación por etapa. Abre un perfil para consultar sus detalles y el mensaje preparado.</p><div id="kanbanBoard" class="kanban-board-grid"></div></section>`;
    this.renderBoard();
  }
  renderBoard() {
    const q=this.query.trim().toLowerCase();
    const candidates=appState.getRankedCandidates().filter(c=>`${c.name} ${c.role}`.toLowerCase().includes(q));
    this.container.querySelector('#kanbanBoard').innerHTML=[...STAGES,'liberado'].map(stage=>{
      const rows=candidates.filter(c=>c.stage===stage),limit=this.limits[stage]||25;
      return `<section class="kanban-column"><header class="kanban-column-header"><strong>${STAGE_LABELS[stage]}</strong><span class="kanban-column-count">${rows.length}</span></header><div class="kanban-cards-list">${rows.slice(0,limit).map(c=>`<article class="kanban-card"><div class="kanban-card-top"><span>${c.rank === null ? 'Fuera del ranking' : c.inTopN ? 'Top '+c.rank : '#'+c.rank}</span><strong>ML ${c.mlScore??'—'} · LLM ${c.llmScore??'—'}</strong></div><button class="kanban-card-title" data-kanban="open" data-id="${esc(c.id)}">${esc(c.name)}</button><p class="kanban-card-subtitle">${esc(c.role)}</p>${c.messageDraft?'<span class="draft-status">Mensaje en borrador</span>':''}<div class="kanban-card-actions">${STAGES.indexOf(stage)>0&&stage!=='contratado'?`<button class="btn btn-ghost" data-kanban="prev" data-id="${esc(c.id)}" ${!appState.can('selection')?'disabled':''} aria-label="Retroceder a ${esc(c.name)}">←</button>`:''}${!['liberado','contratado'].includes(stage)?`<button class="btn btn-secondary" data-kanban="next" data-id="${esc(c.id)}" ${!appState.can('selection')||!isEligible(c,appState.rankingModel)?'disabled':''}>Avanzar →</button>`:''}</div></article>`).join('')||'<p class="kanban-empty-state">Sin candidatos</p>'}${rows.length>limit?`<button class="btn btn-secondary" data-kanban="more" data-stage="${stage}">Mostrar 25 más (${limit}/${rows.length})</button>`:''}</div></section>`;
    }).join('');
  }
}
