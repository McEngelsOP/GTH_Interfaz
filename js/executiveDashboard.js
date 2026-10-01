import { appState } from './state.js';
import { escapeHTML as esc } from './ui.js';

export class ExecutiveDashboardController {
  constructor(container) {
    this.container=container;
    appState.subscribe(event=>{if(['view_changed','jobs_changed','candidate_stage_changed','candidates_updated'].includes(event)&&appState.currentView==='executive')this.render();});
    container.addEventListener('click',e=>{
      const action=e.target.closest('[data-executive]')?.dataset.executive;
      if(action==='profiles')appState.setCurrentView('profilesLibrary');
      if(action==='bank')appState.setCurrentView('talentPool');
    });
  }
  render() {
    const jobs=appState.jobPostings,rows=Object.values(appState.candidatesByJob).flat(),hires=rows.filter(c=>c.stage==='contratado').length;
    const cards=[['Convocatorias activas',jobs.filter(j=>j.status!=='Borrador').length],['Perfiles ficticios',rows.length],['Contratados en demo',hires],['En oferta',rows.filter(c=>c.stage==='oferta').length]];
    this.container.innerHTML=`<section class="executive-wrapper"><header class="executive-header"><div><h2>Resumen institucional</h2><p>Indicadores calculados desde esta demostración</p></div><div class="review-actions"><button class="btn btn-secondary" data-executive="profiles">Biblioteca de perfiles</button><button class="btn btn-secondary" data-executive="bank">Ir a las descargas</button></div></header><div class="kpi-grid">${cards.map(([label,value])=>`<div class="kpi-card kpi-accent-primary"><span class="kpi-label">${label}</span><strong class="kpi-value">${value}</strong></div>`).join('')}</div><div class="comparison-table-wrapper"><table class="comparison-matrix-table"><thead><tr><th>Convocatoria</th><th>Perfiles</th><th>Contratados</th><th>Promedio del método elegido</th></tr></thead><tbody>${jobs.map(j=>`<tr><td>${esc(j.title)}</td><td>${j.totalProcessed}</td><td>${(appState.candidatesByJob[j.id]||[]).filter(c=>c.stage==='contratado').length}</td><td>${j.avgScore??'—'}</td></tr>`).join('')}</tbody></table></div><p class="demo-note">Los tiempos de cobertura, retención y efectividad requieren historial real. No se muestran estimaciones sin datos.</p></section>`;
  }
}
