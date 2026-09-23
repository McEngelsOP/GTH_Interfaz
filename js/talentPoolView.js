import { appState } from './state.js';
import { escapeHTML as esc, exportCSV, notify } from './ui.js';
import { paginateCandidates } from './pagination.js';

export class TalentPoolViewController {
  constructor(container) {
    this.container=container;this.page=1;this.category='all';
    appState.subscribe(event=>{
      if(event==='talent_search_changed') {this.page=1;if(appState.currentView==='talentPool')this.renderResults();}
      if(['talent_pool_updated','view_changed','job_changed','role_changed'].includes(event)&&appState.currentView==='talentPool')this.render();
    });
    container.addEventListener('input',e=>{if(e.target.id==='talentSearch')appState.setTalentSearchQuery(e.target.value);});
    container.addEventListener('change',e=>{if(e.target.id==='talentCategory'){this.category=e.target.value;this.page=1;this.renderResults();}});
    container.addEventListener('click',e=>{
      const b=e.target.closest('[data-talent]');if(!b)return;
      if(b.dataset.talent==='prev') {this.page--;this.renderResults();}
      if(b.dataset.talent==='next') {this.page++;this.renderResults();}
      if(b.dataset.talent==='link')try{appState.linkTalent(b.dataset.id);notify('Postulación abierta. Su evaluación es específica para esta convocatoria.');}catch(error){notify(error.message,true);}
      if(b.dataset.talent==='export')exportCSV('banco-talento-demo.csv',[['Nombre','Categoría','Convocatoria previa','Puntaje previo'],...appState.getFilteredTalentPool(this.category).map(t=>[t.name,t.roleCategory,t.previousVacancy,t.scoreObtained])]);
    });
  }
  render() {
    this.container.innerHTML=`<section class="talent-pool-wrapper"><header class="talent-pool-header"><div><h2>Banco de talento</h2><p>Perfiles preservados · ${appState.talentPool.length} registros</p></div><button class="btn btn-secondary" data-talent="export">Exportar CSV</button></header><div class="review-toolbar"><label>Buscar perfiles<input id="talentSearch" type="search" value="${esc(appState.talentSearchQuery)}" placeholder="Nombre, puesto o habilidad"></label><label>Categoría<select id="talentCategory">${[['all','Todas'],['docente','Docente'],['administrativo','Administrativo'],['operativo','Operativo'],['directivo','Directivo'],['transferible','Con oportunidad registrada']].map(([v,label])=>`<option value="${v}" ${v===this.category?'selected':''}>${label}</option>`).join('')}</select></label></div><p class="demo-note">Destino de la vinculación: ${esc(appState.jobPosting.title)}. Cada nueva postulación comienza pendiente de evaluación.</p><div id="talentResults"></div></section>`;
    this.renderResults();
  }
  renderResults() {
    const result=paginateCandidates(appState.getFilteredTalentPool(this.category),this.page,25);this.page=result.page;
    const mount=this.container.querySelector('#talentResults');if(!mount)return;
    mount.innerHTML=`<div class="talent-results-grid">${result.items.map(t=>`<article class="talent-card"><header><h3>${esc(t.name)}</h3><span>${esc(t.roleCategory)}</span></header><p>${esc(t.previousVacancy)}</p><p>${esc(t.matchReason)}</p><p>${(t.tags||[]).map(esc).join(' · ')}</p>${t.crossMatchOpportunity?`<p class="demo-note">${esc(t.crossMatchOpportunity)}</p>`:''}<button class="btn btn-secondary" data-talent="link" data-id="${esc(t.id)}" ${!appState.can('talent')?'disabled':''}>Vincular a convocatoria</button></article>`).join('')||'<p class="ranking-empty">No se encontraron perfiles.</p>'}</div><footer class="table-footer"><span role="status">${result.first}–${result.last} de ${result.total}</span><div class="review-actions"><button class="btn btn-secondary" data-talent="prev" ${result.page===1?'disabled':''}>Anterior</button><span>${result.page}/${result.pageCount}</span><button class="btn btn-secondary" data-talent="next" ${result.page===result.pageCount?'disabled':''}>Siguiente</button></div></footer>`;
  }
}
