import { appState } from './state.js';
import { escapeHTML as esc, openDialog, closeDialog, notify } from './ui.js';
import { STAGE_LABELS, isEligible } from './domain.js';

export class DrawerController {
  constructor(backdrop,drawer) {
    this.backdrop = backdrop; this.drawer = drawer;
    this.tabBtns = [...drawer.querySelectorAll('.drawer-tab-btn')];
    this.tabPanes = [...drawer.querySelectorAll('.tab-pane')];
    for(const name of ['Explain','Gaps','Weights','CV','Audit']) this[`pane${name}`] = drawer.querySelector(`#tabPane_${name.toLowerCase()}`);
    this.btnAdvance = drawer.querySelector('#drawerBtnAdvance'); this.btnRelease = drawer.querySelector('#drawerBtnRelease');
    drawer.querySelector('#drawerCloseBtn').addEventListener('click',()=>this.close());
    backdrop.addEventListener('click',e=>{ if(e.target === backdrop) this.close(); });
    drawer.addEventListener('keydown',e=>{
      if(e.key === 'Escape') this.close();
      const i = this.tabBtns.indexOf(e.target);
      if(i >= 0 && ['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
        e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? this.tabBtns.length-1 : (i+(e.key === 'ArrowRight' ? 1 : -1)+this.tabBtns.length)%this.tabBtns.length;
        this.tabBtns[next].click(); this.tabBtns[next].focus();
      }
    });
    drawer.querySelector('.drawer-tabs').setAttribute('role','tablist');
    this.tabBtns.forEach(btn=>{ btn.id = `drawerTab_${btn.dataset.tab}`; btn.setAttribute('role','tab'); btn.setAttribute('aria-controls',`tabPane_${btn.dataset.tab}`); btn.addEventListener('click',()=>appState.setActiveDrawerTab(btn.dataset.tab)); });
    this.btnAdvance.addEventListener('click',()=>{ if(appState.advanceCandidate(appState.selectedCandidateId)) notify('Etapa actualizada.'); });
    this.btnRelease.addEventListener('click',()=>{
      const c=appState.getSelectedCandidate();
      if(c && confirm(`¿Liberar la postulación de ${c.name}? Se conservará en el banco de talento. En esta demo no se envían correos.`) && appState.releaseCandidate(c.id)) notify('Postulación liberada y conservada en el banco.');
    });
    appState.subscribe((event,data)=>{
      if(event === 'candidate_selected') { const c = appState.getSelectedCandidate(); if(c) { this.populate(c); this.open(); } else this.hide(); }
      if(event === 'drawer_tab_changed') this.switchTab(data.tabName);
      if(['candidate_stage_changed','decision_recorded','criteria_updated','topN_changed','role_changed'].includes(event)) { const c=appState.getSelectedCandidate(); if(c) this.populate(c); }
    });
  }
  open() { this.backdrop.classList.add('active'); openDialog(this.backdrop,this.drawer); }
  hide() { this.backdrop.classList.remove('active'); closeDialog(this.backdrop); }
  close() { this.hide(); appState.selectCandidate(null); }
  switchTab(tab) {
    if(!['explain','gaps','weights','cv','audit'].includes(tab)) tab='explain';
    appState.activeDrawerTab=tab;
    this.tabBtns.forEach(btn=>{ const active = btn.dataset.tab===tab; btn.classList.toggle('active',active); btn.setAttribute('aria-selected',String(active)); btn.tabIndex=active?0:-1; });
    this.tabPanes.forEach(pane=>{ const active = pane.id===`tabPane_${tab}`; pane.classList.toggle('active',active); pane.hidden=!active; pane.setAttribute('role','tabpanel'); pane.setAttribute('aria-labelledby',`drawerTab_${pane.id.replace('tabPane_','')}`); });
  }
  populate(c) {
    this.drawer.querySelector('#drawerCandidateAvatar').textContent=c.name.split(' ').map(n=>n[0]).slice(0,2).join('');
    this.drawer.querySelector('#drawerCandidateName').textContent=`${c.name} · ${STAGE_LABELS[c.stage]}`;
    this.drawer.querySelector('#drawerCandidateRole').textContent=`${c.role} · ${c.company}`;
    this.drawer.querySelector('#drawerCandidateSource').textContent=`${appState.jobPosting.title} · ${c.source}`;
    this.drawer.querySelector('#drawerScoreBadge').textContent=Number.isFinite(c.score)?`${c.score}/100`:'Pendiente';
    this.btnAdvance.disabled=!appState.can('selection')||!isEligible(c)||c.stage==='contratado';
    this.btnRelease.disabled=!appState.can('selection')||['liberado','contratado'].includes(c.stage);
    this.renderExplainPane(c); this.renderGapsPane(c); this.renderWeightsPane(c); this.renderCVPane(c); this.renderAuditPane(c);
    this.switchTab(appState.activeDrawerTab);
  }
  renderExplainPane(c) {
    const requirements=c.mandatoryReqs||[], labels={green:'Cumple',amber:'Parcial',red:'No cumple',unknown:'Sin verificar'};
    this.paneExplain.innerHTML=`<section class="drawer-card"><h4 class="drawer-card-title">Fundamento de la evaluación</h4><div class="narrative-box"><p>${esc(c.narrative?.selectionReason)}</p></div>
      <p class="demo-note">${esc(appState.jobPosting.roleTypeName)} · ${esc(c.source || 'Sin fuente')} ${c.transferablePotential?'· Potencial transferible':''}</p>
      ${(c.narrative?.strengths||[]).map(s=>`<p class="narrative-item">✓ ${esc(s)}</p>`).join('')}
      ${c.transferablePotential?`<p>${esc(c.narrative?.inclusionDetail)}</p>`:''}
      <section class="mandatory-review" aria-labelledby="mandatoryReviewTitle"><div class="mandatory-review-heading"><h5 id="mandatoryReviewTitle">Requisitos obligatorios</h5><span>${requirements.filter(r=>r.status==='green').length}/${requirements.length} cumplen</span></div>
      <div class="mandatory-requirement-list">${requirements.map(r=>`<div class="mandatory-requirement"><span class="requirement-status-mark ${['green','amber','red'].includes(r.status)?r.status:'unknown'}" aria-hidden="true"></span><div class="mandatory-requirement-copy"><strong>${esc(r.name)}</strong><span>${esc(r.tooltipTitle)}</span><p>${esc(r.tooltipReason)}</p></div><span class="requirement-status-label ${['green','amber','red'].includes(r.status)?r.status:'unknown'}">${labels[r.status]||labels.unknown}</span></div>`).join('')||'<p>No hay evidencias registradas. Verificación pendiente.</p>'}</div></section></section>`;
  }
  renderGapsPane(c) {
    const gaps=(c.gaps||[]).filter(g=>g.severity!=='none');
    this.paneGaps.innerHTML=`<section class="drawer-card"><h4 class="drawer-card-title">Brechas y evidencias pendientes</h4>${gaps.map(g=>`<div class="gap-detail"><strong>${esc(g.item)}</strong><p>Impacto: ${esc(g.impact||({high:'alto',medium:'medio',low:'bajo'}[g.severity])||'sin determinar')}</p><p>${esc(g.tip)}</p></div>`).join('')||`<p>${c.gaps?.length?'No se registraron brechas en esta evaluación.':'Sin evaluación de brechas disponible.'}</p>`}
      <h4>Riesgos registrados</h4>${(c.risks||[]).map(r=>`<p>${esc(r)}</p>`).join('')||'<p>Sin información registrada.</p>'}
      <h4>Guía de entrevista de ejemplo · STAR</h4>${(c.interviewStarQuestions||[]).map(q=>`<p class="gap-detail">${esc(q)}</p>`).join('')||'<p>No hay preguntas específicas registradas para este perfil.</p>'}
      <h4>Otras convocatorias</h4>${(c.crossMatches||[]).map(m=>`<div class="gap-detail"><strong>${esc(m.jobTitle)}</strong><p>${esc(m.reason)} · ${m.matchPct??'—'} % de afinidad de ejemplo</p></div>`).join('')||'<p>Sin oportunidades evaluadas.</p>'}</section>`;
  }
  renderWeightsPane(c) {
    this.paneWeights.innerHTML=`<section class="drawer-card"><h4>Desglose por criterios</h4><p>Versión: ${esc(c.audit?.criteriaVersion)}</p>${(c.weights||[]).map(w=>`<div class="weight-bar-item"><div class="weight-meta"><span>${esc(w.label)} (${w.weightPct} %)</span><strong>${w.scoreObtained??'Pendiente'} / ${w.maxScore}</strong></div><progress max="100" value="${w.maxScore>0&&Number.isFinite(w.scoreObtained)?Math.max(0,Math.min(100,w.scoreObtained/w.maxScore*100)):0}" aria-label="${esc(w.label)}"></progress></div>`).join('')||'<p>Sin evaluación por criterios.</p>'}</section>`;
  }
  renderCVPane(c) { this.paneCV.innerHTML='<section class="drawer-card"><h4>CV estructurado</h4><pre class="safe-cv"></pre></section>'; this.paneCV.querySelector('pre').textContent=c.cvMarkdown||'Sin documento disponible.'; }
  renderAuditPane(c) {
    this.paneAudit.innerHTML=`<section class="drawer-card"><h4>Historial de demostración</h4><p class="demo-note">Guardado en este navegador. La auditoría de servidor se integrará posteriormente.</p><p>Lote: ${esc(c.audit?.batchId)} · Criterios: ${esc(c.audit?.criteriaVersion)}</p><p>Motor registrado: ${esc(c.audit?.model)}</p>${(c.audit?.decisionHistory||[]).map(e=>`<article class="audit-entry"><small>${esc(e.timestamp||e.time)} · ${esc(e.user)}</small><p>${esc(e.action)}</p></article>`).join('')||'<p>Sin decisiones registradas.</p>'}<h4>Evaluaciones anteriores</h4>${(c.evaluationHistory||[]).map(e=>`<p>${esc(e.timestamp)} · ${esc(e.criteriaVersion)} · ${e.score??'Pendiente'}/100</p>`).join('')||'<p>Sin versiones anteriores.</p>'}</section>`;
  }
}
