import { appState } from './state.js';
import { escapeHTML as esc, exportCSV, notify } from './ui.js';
import { candidateCSVRows, catalogCSVRows } from './csvData.js';
import { paginateCandidates } from './pagination.js';
import { STAGE_LABELS } from './domain.js';

export class TalentPoolViewController {
  constructor(container) {
    this.container=container;this.page=1;this.category='all';this.exportScope='all';
    appState.subscribe(event=>{
      if(event==='talent_search_changed'){this.page=1;if(appState.currentView==='talentPool')this.renderResults();}
      if(['talent_pool_updated','view_changed','job_changed','role_changed','comparison_pool_changed','topN_changed','ranking_model_changed','candidate_stage_changed'].includes(event)&&appState.currentView==='talentPool')this.render();
    });
    container.addEventListener('input',e=>{if(e.target.id==='talentSearch')appState.setTalentSearchQuery(e.target.value);});
    container.addEventListener('change',e=>{
      if(e.target.id==='talentCategory'){this.category=e.target.value;this.page=1;this.renderResults();}
      if(e.target.id==='exportProfileScope'){this.exportScope=e.target.value;this.renderExportPreview();}
    });
    container.addEventListener('click',e=>{
      const b=e.target.closest('[data-talent]');if(!b)return;
      const action=b.dataset.talent;
      if(action==='prev'){this.page--;this.renderResults();}
      if(action==='next'){this.page++;this.renderResults();}
      if(action==='link')try{appState.linkTalent(b.dataset.id);notify('Perfil vinculado a este puesto. Su evaluación queda pendiente.');}catch(error){notify(error.message,true);}
      if(action==='catalog')exportCSV('perfiles-demo.csv',catalogCSVRows(appState.templates));
      if(action==='export')exportCSV(`perfiles-${appState.activeJobPostingId}.csv`,candidateCSVRows(appState.jobPosting,this.getExportCandidates()));
      if(action==='bank-export')exportCSV('banco-talento.csv',[['ID','Candidato','Categoría','Convocatoria anterior','Puntaje según Machine Learning','Puntaje según LLM (embeddings)','Motivo'],...appState.getFilteredTalentPool(this.category).map(t=>[t.id,t.name,t.roleCategory,t.previousVacancy,t.mlScore,t.llmScore,t.matchReason])]);
      if(action==='compare'){
        const rows=this.getExportCandidates();
        appState.setCandidateSelection(rows.map(c=>c.id));
        appState.setCurrentView('comparison');
      }
    });
  }
  getExportCandidates() {
    return appState.getRankedCandidates().filter(c=>this.exportScope==='all'||(this.exportScope==='topN'?c.inTopN:appState.selectedRows.has(c.id)));
  }
  render() {
    this.container.innerHTML=`<section class="talent-pool-wrapper"><header class="talent-pool-header"><div><span class="section-kicker">PERFILES Y DESCARGAS</span><h2>Banco de Talento</h2><p>Consulta candidatos guardados y descarga los perfiles que necesitas.</p></div></header>
      <section class="export-workspace"><div class="export-heading"><div><h3>Perfiles de esta convocatoria</h3><p>${esc(appState.jobPosting.title)} <small>· ${esc(appState.activeJobPostingId)}</small></p></div><label>Qué perfiles descargar<select id="exportProfileScope">${[['all','Todos los candidatos del puesto'],['topN',`Los mejores ${appState.topN}`],['selected','Los perfiles que seleccionaste']].map(([v,label])=>`<option value="${v}" ${this.exportScope===v?'selected':''}>${label}</option>`).join('')}</select></label></div><div id="exportPreview"></div></section>
      <details class="catalog-download"><summary>También puedes descargar los perfiles de puestos</summary><div><p>Catálogo con ID, perfil, categoría y requisito, como el archivo de ejemplo.</p><button class="btn btn-secondary" data-talent="catalog">Descargar perfiles de puestos · CSV</button></div></details>
      <div class="bank-section-heading"><div><h3>Candidatos guardados</h3><p>${appState.talentPool.length} perfiles disponibles para futuras convocatorias</p></div><button class="btn btn-secondary" data-talent="bank-export" ${!appState.talentPool.length?'disabled':''}>Descargar candidatos guardados · CSV</button></div>
      <div class="review-toolbar"><label>Buscar perfiles<input id="talentSearch" type="search" value="${esc(appState.talentSearchQuery)}" placeholder="Nombre, puesto o habilidad"></label><label>Categoría<select id="talentCategory">${[['all','Todas'],['docente','Docente'],['administrativo','Administrativo'],['operativo','Operativo'],['directivo','Directivo'],['transferible','Con otra oportunidad']].map(([v,label])=>`<option value="${v}" ${v===this.category?'selected':''}>${label}</option>`).join('')}</select></label></div><p class="helper-copy">Al vincular un perfil a ${esc(appState.jobPosting.title)}, su evaluación para ese puesto comienza pendiente.</p><div id="talentResults"></div></section>`;
    this.renderExportPreview();this.renderResults();
  }
  renderExportPreview() {
    const rows=this.getExportCandidates(),mount=this.container.querySelector('#exportPreview');if(!mount)return;
    mount.innerHTML=`<p class="export-count" role="status">${rows.length} perfiles para descargar <span>· ML y LLM en columnas separadas</span></p>${rows.length?`<div class="export-preview-scroll"><table class="export-preview-table"><thead><tr><th>Candidato</th><th>Machine Learning</th><th>LLM (embeddings)</th><th>Etapa</th></tr></thead><tbody>${rows.slice(0,5).map(c=>`<tr><td>${esc(c.name)}</td><td>${c.mlScore??'Pendiente'}</td><td>${c.llmScore??'Pendiente'}</td><td>${STAGE_LABELS[c.stage]}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty-copy">Todavía no hay perfiles en esta selección. Revisa el ranking o cambia la opción de descarga.</p>'}${rows.length>5?'<p class="helper-copy">Vista previa de cinco filas. El archivo incluye todos los perfiles indicados.</p>':''}<div class="review-actions"><button class="btn btn-primary" data-talent="export" ${!rows.length?'disabled':''}>Descargar perfiles · CSV</button><button class="btn btn-secondary" data-talent="compare" ${rows.length<2?'disabled':''}>Comparar estos perfiles</button></div>`;
  }
  renderResults() {
    const result=paginateCandidates(appState.getFilteredTalentPool(this.category),this.page,25);this.page=result.page;
    const mount=this.container.querySelector('#talentResults');if(!mount)return;
    mount.innerHTML=`<div class="talent-results-grid">${result.items.map(t=>`<article class="talent-card"><header><span class="talent-avatar">${esc(t.name.split(' ').map(n=>n[0]).slice(0,2).join(''))}</span><div><h3>${esc(t.name)}</h3><span>${esc(t.roleCategory)}</span></div></header><p>${esc(t.previousVacancy)}</p><p>${esc(t.matchReason)}</p><div class="talent-tags">${(t.tags||[]).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>${t.crossMatchOpportunity?`<p class="helper-copy">${esc(t.crossMatchOpportunity)}</p>`:''}<button class="btn btn-secondary" data-talent="link" data-id="${esc(t.id)}" ${!appState.can('talent')?'disabled':''}>Vincular a este puesto →</button></article>`).join('')||'<p class="ranking-empty">No se encontraron perfiles.</p>'}</div><footer class="table-footer"><span role="status">${result.first}–${result.last} de ${result.total}</span><div class="review-actions"><button class="btn btn-secondary" data-talent="prev" ${result.page===1?'disabled':''}>Anterior</button><span>${result.page}/${result.pageCount}</span><button class="btn btn-secondary" data-talent="next" ${result.page===result.pageCount?'disabled':''}>Siguiente</button></div></footer>`;
  }
}
