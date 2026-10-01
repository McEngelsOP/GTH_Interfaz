import { appState } from './state.js';
import { escapeHTML as esc, notify } from './ui.js';
import { STAGE_LABELS, candidateScore, MODEL_LABELS, isEligible } from './domain.js';

export class ComparisonViewController {
  constructor(container) {
    this.container = container; this.query = '';
    appState.subscribe(event=>{
      if(event==='job_changed')this.query='';
      if(['comparison_pool_changed','view_changed','job_changed','candidate_stage_changed','criteria_updated','ranking_model_changed'].includes(event) && appState.currentView === 'comparison')this.render();
    });
    container.addEventListener('input',e=>{if(e.target.id==='comparisonSearch'){this.query=e.target.value;this.renderPicker();}});
    container.addEventListener('click',e=>{
      const button = e.target.closest('[data-compare-action]'); if(!button)return;
      const { compareAction:action,id }=button.dataset;
      if(action==='toggle')appState.toggleComparisonCandidate(id);
      if(action==='clear')appState.clearComparisonPool();
      if(action==='suggest')appState.selectTopN();
      if(action==='open')appState.selectCandidate(id);
      if(action==='advance' && appState.advanceCandidate(id))notify('Etapa actualizada.');
      if(action==='ranking')appState.setCurrentView('ranking');
      if(action==='bank')appState.setCurrentView('talentPool');
      if(action==='decide')this.onDecide?.();
    });
  }
  renderPicker() {
    const mount=this.container.querySelector('#comparisonPicker');if(!mount)return;
    const q=this.query.trim().toLowerCase();
    const matches=appState.getRankedCandidates().filter(c=>!appState.comparisonPool.has(c.id)&&`${c.name} ${c.role} ${c.company}`.toLowerCase().includes(q));
    mount.innerHTML=matches.slice(0,20).map(c=>`<button class="picker-candidate" data-compare-action="toggle" data-id="${esc(c.id)}"><span>${esc(c.name)}</span><span>ML ${c.mlScore??'—'} · LLM ${c.llmScore??'—'} <strong>+</strong></span></button>`).join('')+(matches.length>20?'<p class="helper-copy">Busca por nombre para encontrar más perfiles.</p>':'');
  }
  render() {
    const candidates=appState.getComparisonCandidates(),weights=appState.jobPosting.weights;
    const row=(label,cell)=>`<tr><th scope="row">${label}</th>${candidates.map(c=>`<td>${cell(c)}</td>`).join('')}</tr>`;
    const canDecide=candidates.length && candidates.every(c=>isEligible(c,appState.rankingModel));
    this.container.innerHTML=`<section class="comparison-view-card"><header class="comparison-view-header"><div><span class="section-kicker">REVISA LAS DIFERENCIAS</span><h2>Comparar perfiles</h2><p>${esc(appState.jobPosting.title)} · ${candidates.length} perfiles elegidos</p></div><div class="review-actions"><button class="btn btn-secondary" data-compare-action="suggest" ${!appState.candidates.some(c=>c.inTopN)?'disabled':''}>Elegir los mejores ${appState.topN}</button><button class="btn btn-ghost" data-compare-action="clear" ${!candidates.length?'disabled':''}>Limpiar</button><button class="btn btn-secondary" data-compare-action="bank">CSV en Banco de Talento</button></div></header>
      <div class="review-picker"><label>Añadir otro perfil<input id="comparisonSearch" type="search" value="${esc(this.query)}" placeholder="Buscar por nombre, puesto o empresa"></label><div id="comparisonPicker" class="candidate-picker"></div></div>
      ${!candidates.length?`<div class="ranking-empty"><h3>${appState.candidates.length?'Elige los perfiles que deseas comparar':'Esta convocatoria aún no tiene candidatos'}</h3><p>Marca perfiles en el ranking o añádelos aquí. Tú decides cuántos comparar.</p></div>`:`<p class="comparison-method-note">La lista está ordenada según <strong>${MODEL_LABELS[appState.rankingModel]}</strong>. Cada método conserva su propio puntaje.</p><div class="comparison-table-wrapper" tabindex="0" role="region" aria-label="Comparación de perfiles, desplaza para ver todas las columnas"><table class="comparison-matrix-table"><caption class="sr-only">Comparación para ${esc(appState.jobPosting.title)}</caption><thead><tr><th scope="col">Qué revisamos</th>${candidates.map(c=>`<th scope="col"><span class="comparison-profile-avatar">${esc(c.name.split(' ').map(n=>n[0]).slice(0,2).join(''))}</span><button class="candidate-name" data-compare-action="open" data-id="${esc(c.id)}">${esc(c.name)}</button><button class="btn btn-ghost" data-compare-action="toggle" data-id="${esc(c.id)}" aria-label="Quitar a ${esc(c.name)}">×</button><small class="comparison-profile-role">${esc(c.role)}<br>${esc(c.company)}</small></th>`).join('')}</tr></thead><tbody>
      ${row('Puntaje según Machine Learning',c=>`<strong class="model-score model-ml">${candidateScore(c,'ml')??'Pendiente'}</strong> / 100`)}
      ${row('Puntaje según LLM (embeddings)',c=>`<strong class="model-score model-llm">${candidateScore(c,'llm')??'Pendiente'}</strong> / 100`)}
      ${row('Etapa actual',c=>STAGE_LABELS[c.stage])}
      ${row('Requisitos obligatorios',c=>c.knockoutMet===true?'Verificados':c.knockoutMet===false?'No cumple':'Pendiente de verificar')}
      ${row('Por qué este perfil',c=>esc(c.narrative.selectionReason))}
      ${weights.map(w=>row(esc(w.label),c=>{const evidence=c.weights.find(cw=>cw.label===w.label);return Number.isFinite(evidence?.scoreObtained)&&evidence.maxScore>0?`${Math.round(evidence.scoreObtained/evidence.maxScore*100)} % de cumplimiento`:'Sin evidencia';})).join('')}
      ${row('Mensaje al candidato',c=>c.messageDraft?'Borrador preparado':'Sin preparar')}
      </tbody></table></div>`}
      <footer class="comparison-footer"><button class="btn btn-secondary" data-compare-action="ranking">← Volver al ranking</button><button class="btn btn-primary" data-compare-action="decide" ${!canDecide?'disabled':''}>Pasar a seleccionados →</button></footer><p class="helper-copy">Los puntajes y las evidencias son de ejemplo. La decisión final la toma GTH.</p></section>`;
    this.renderPicker();
  }
}
