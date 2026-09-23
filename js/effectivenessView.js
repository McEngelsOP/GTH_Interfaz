import { appState } from './state.js';

export class EffectivenessViewController {
  constructor(container) { this.container=container;appState.subscribe(event=>{if(['view_changed','candidate_stage_changed','candidates_updated'].includes(event)&&appState.currentView==='effectiveness')this.render();}); }
  render() {
    const hires=Object.values(appState.candidatesByJob).flat().filter(c=>c.stage==='contratado').length;
    this.container.innerHTML=`<section class="effectiveness-wrapper"><header class="effectiveness-header"><div><h2>Efectividad de contratación</h2><p>Seguimiento del desempeño después de la selección</p></div><span class="demo-pill">PENDIENTE DE DATOS</span></header><div class="kpi-grid"><div class="kpi-card kpi-accent-primary"><span class="kpi-label">Contrataciones en la demo</span><strong class="kpi-value">${hires}</strong></div><div class="kpi-card kpi-accent-info"><span class="kpi-label">Evaluaciones de desempeño reales</span><strong class="kpi-value">0</strong></div></div><div class="drawer-card"><h3>El seguimiento comenzará con las evaluaciones reales</h3><p>Se vinculará cada contratación con su evaluación inicial y sus revisiones de desempeño a 3 y 6 meses.</p><p>La precisión, retención, correlación y análisis de equidad se calcularán cuando existan datos suficientes y una metodología definida.</p></div></section>`;
  }
}
