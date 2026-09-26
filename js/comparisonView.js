import { appState } from './state.js';
import { escapeHTML as esc, notify, exportCSV } from './ui.js';
import { STAGE_LABELS, isEligible } from './domain.js';

export class ComparisonViewController {
  constructor(container) {
    this.container = container; this.query = '';
    appState.subscribe(event => {
      if (['comparison_pool_changed','view_changed','job_changed','candidate_stage_changed','criteria_updated','role_changed'].includes(event) && appState.currentView === 'comparison') this.render();
    });
    container.addEventListener('input',e => { if (e.target.id === 'comparisonSearch') { this.query = e.target.value; this.renderPicker(); } });
    container.addEventListener('click',e => {
      const button = e.target.closest('[data-compare-action]'); if (!button) return;
      const { compareAction: action, id } = button.dataset;
      if (action === 'toggle') appState.toggleComparisonCandidate(id);
      if (action === 'clear') appState.clearComparisonPool();
      if (action === 'suggest') { appState.clearComparisonPool(); appState.getRankedCandidates().filter(isEligible).slice(0,3).forEach(c => appState.toggleComparisonCandidate(c.id)); }
      if (action === 'open') appState.selectCandidate(id);
      if (action === 'advance' && appState.advanceCandidate(id)) notify('Etapa actualizada.');
      if (action === 'export') exportCSV(`comparacion-${appState.activeJobPostingId}.csv`,[['Candidato','Puntaje','Etapa'],...appState.getComparisonCandidates().map(c => [c.name,c.score,STAGE_LABELS[c.stage]])]);
    });
  }
  renderPicker() {
    const mount = this.container.querySelector('#comparisonPicker'); if (!mount) return;
    const q = this.query.trim().toLowerCase();
    const matches = appState.getRankedCandidates().filter(c => !appState.comparisonPool.has(c.id) && `${c.name} ${c.role} ${c.company}`.toLowerCase().includes(q));
    mount.innerHTML = matches.slice(0,20).map(c => `<button class="picker-candidate" data-compare-action="toggle" data-id="${esc(c.id)}" ${appState.comparisonPool.size >= 5 ? 'disabled' : ''}><span>${esc(c.name)}</span><span>${c.score ?? '—'} · Añadir +</span></button>`).join('') + (matches.length > 20 ? '<p>Mostrando 20 coincidencias. Refina la búsqueda.</p>' : '');
  }
  renderRadar(candidates, weights) {
    if (weights.length < 3) return '';
    const colors = ['#dc3354', '#3269ed', '#00a887', '#925ac5', '#bc7d13'];
    const point = (i, radius) => { const angle = i * 2 * Math.PI / weights.length - Math.PI / 2; return [180 + radius * Math.cos(angle), 170 + radius * Math.sin(angle)]; };
    const ratio = (candidate, weight) => {
      const row = candidate.weights.find(w => w.label === weight.label);
      return Number.isFinite(row?.scoreObtained) && row.maxScore > 0 ? Math.max(0, Math.min(1, row.scoreObtained / row.maxScore)) : null;
    };
    return `<section class="comparison-radar-section"><div><h3>Radar comparativo de criterios</h3><p>Porcentaje de cumplimiento registrado en cada criterio.</p></div><div class="comparison-radar-layout">
      <svg class="comparison-radar" viewBox="0 0 360 350" role="img" aria-label="Comparación de evidencias por criterio; valores detallados en la leyenda y la matriz">
        ${[.25,.5,.75,1].map(scale => `<polygon points="${weights.map((_,i)=>point(i,105*scale).join(',')).join(' ')}" fill="none" stroke="#dce5ef"/>`).join('')}
        ${weights.map((w,i)=>`<line x1="180" y1="170" x2="${point(i,105)[0]}" y2="${point(i,105)[1]}" stroke="#e5ebf3"/><text x="${point(i,140)[0]}" y="${point(i,140)[1]}" text-anchor="middle" font-size="9" fill="#40536b"><title>${esc(w.label)}</title>${esc(w.label.length>24?w.label.slice(0,22)+'…':w.label)}</text>`).join('')}
        ${candidates.map((c,index)=>weights.every(w=>ratio(c,w)!==null)?`<polygon points="${weights.map((w,i)=>point(i,105*ratio(c,w)).join(',')).join(' ')}" fill="${colors[index]}" fill-opacity="0.07" stroke="${colors[index]}" stroke-width="2"/>`:'').join('')}
      </svg><div class="comparison-radar-legend">${candidates.map((c,index)=>`<div class="comparison-legend-card" style="border-left-color:${colors[index]}"><strong>${esc(c.name)}</strong><span class="comparison-legend-score">${c.score ?? '—'} / 100</span><p>${weights.map(w=>`${esc(w.label)}: ${ratio(c,w)===null?'Sin evidencia':Math.round(ratio(c,w)*100)+' %'}`).join(' · ')}</p></div>`).join('')}</div></div></section>`;
  }
  render() {
    const candidates = appState.getComparisonCandidates(), weights = appState.jobPosting.weights;
    this.container.innerHTML = `<section class="comparison-view-card"><header class="comparison-view-header"><div><h2>Comparador multicandidato cara a cara</h2><p>${esc(appState.jobPosting.title)} · ${candidates.length}/5 perfiles</p></div><div class="review-actions"><button class="btn btn-secondary" data-compare-action="suggest">Añadir 3 elegibles</button><button class="btn btn-ghost" data-compare-action="clear" ${!candidates.length ? 'disabled' : ''}>Limpiar</button><button class="btn btn-secondary" data-compare-action="export" ${!candidates.length ? 'disabled' : ''}>Exportar CSV</button></div></header>
      <div class="review-picker"><label>Buscar un candidato<input id="comparisonSearch" type="search" value="${esc(this.query)}" placeholder="Nombre, puesto u organización"></label><div id="comparisonPicker" class="candidate-picker"></div></div>
      ${!candidates.length ? `<div class="ranking-empty"><h3>${appState.candidates.length ? 'Elige los perfiles que deseas comparar' : 'Esta convocatoria aún no tiene candidatos'}</h3><p>Compara hasta cinco perfiles. La selección se mantiene hasta que la cambies.</p></div>` : `${this.renderRadar(candidates, weights)}<div class="comparison-table-wrapper"><table class="comparison-matrix-table"><thead><tr><th>Dimensión</th>${candidates.map(c => `<th><div class="comparison-profile-avatar">${esc(c.name.split(' ').map(n=>n[0]).slice(0,2).join(''))}</div><button class="candidate-name" data-compare-action="open" data-id="${esc(c.id)}">${esc(c.name)}</button><button class="btn btn-ghost" data-compare-action="toggle" data-id="${esc(c.id)}" aria-label="Quitar a ${esc(c.name)}">×</button><small class="comparison-profile-role">${esc(c.role)}<br>${esc(c.company)}</small><strong class="comparison-profile-score">${c.score ?? '—'} <small>/ 100</small></strong></th>`).join('')}</tr></thead><tbody>
      <tr><th>Puntaje</th>${candidates.map(c=>`<td><strong>${c.score ?? 'Pendiente'}</strong></td>`).join('')}</tr>
      <tr><th>Etapa</th>${candidates.map(c=>`<td>${STAGE_LABELS[c.stage]}</td>`).join('')}</tr>
      <tr><th>Elegibilidad</th>${candidates.map(c=>`<td>${c.knockoutMet === true ? 'Verificada' : c.knockoutMet === false ? 'No cumple' : 'Pendiente de verificar'}</td>`).join('')}</tr>
      ${weights.map(w=>`<tr><th>${esc(w.label)} <small>(${w.weightPct} %)</small></th>${candidates.map(c=>{ const evidence = c.weights.find(cw=>cw.label === w.label); return `<td>${Number.isFinite(evidence?.scoreObtained) ? `${evidence.scoreObtained} / ${evidence.maxScore}` : 'Sin evidencia'}</td>`; }).join('')}</tr>`).join('')}
      <tr><th>Brechas registradas</th>${candidates.map(c=>`<td>${c.gaps.filter(g=>g.severity !== 'none').map(g=>esc(g.item)).join('<br>') || (c.gaps.length ? 'Sin brechas registradas' : 'Sin evaluación de brechas')}</td>`).join('')}</tr>
      <tr><th>Siguiente paso</th>${candidates.map(c=>`<td><button class="btn btn-primary" data-compare-action="advance" data-id="${esc(c.id)}" ${!appState.can('selection') || !isEligible(c) || c.stage === 'contratado' ? 'disabled' : ''}>Avanzar una etapa</button></td>`).join('')}</tr>
      </tbody></table></div>`}<p class="demo-note">Datos de demostración. Las decisiones requieren revisión de evidencias; el puntaje no garantiza idoneidad.</p></section>`;
    this.renderPicker();
  }
}
