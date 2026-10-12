import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { INITIAL_APP_STATE } from '../../src/data/initialData.ts';
import type { AppStateData, Application } from '../../src/types/index.ts';

const key='GTH_ESAN_STAGE_I_STATE_V2';
function fixture(): AppStateData {
  const state=structuredClone(INITIAL_APP_STATE),job=state.jobPostings.find(job=>job.id===state.activeJobPostingId)!;
  job.criteria=[{id:'a',label:'Experiencia',type:'LLM',weightPct:40},{id:'b',label:'Tecnología',type:'LLM',weightPct:60}];
  state.candidates=Array.from({length:30},(_,i)=>({id:`bulk-person-${i}`,name:`Persona ${String(i+1).padStart(2,'0')}`,email:null,phone:null,
    currentTitle:'Especialista',currentCompany:'Empresa ficticia',source:'Prueba',summary:'',rawCvText:'Experiencia profesional de prueba.',savedInTalentPool:false}));
  state.applications=Array.from({length:30},(_,i): Application=>({id:`bulk-app-${i}`,candidateId:`bulk-person-${i}`,jobPostingId:job.id,
    stage:'postulado',llmScore:null,mandatoryRequirementStatus:'sin_verificar',createdAt:'2026-10-04T20:00:00Z',updatedAt:'2026-10-04T20:00:00Z',
    whyScoreNotes:{explanation:'Evaluación parcial.',strengths:[],evidenceSummary:'Experiencia declarada.'},criteriaBreakdown:{a:{score:40+i,evidence:'Experiencia declarada.'}},
    llmEvaluation:{model:'gemini-test',evaluatedAt:'2026-10-04T20:00:00Z',criteriaVersion:job.criteriaVersion,profileHash:'a'.repeat(64),privacyVersion:'v1',missingCriteria:['b']}}));
  state.applications[27].stage='no_continua';state.applications[28].stage='contratado';
  state.applications[29].jobPostingId=state.jobPostings.find(other=>other.id!==job.id)!.id;
  return state;
}
const setup=async(page:Page,state=fixture())=>{
  await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key,state});
  await page.goto('/#view=mejores_candidatos');
};
const stored=(page:Page):Promise<AppStateData>=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);

test('descarte de 27 marcados entre páginas confirma motivo y conserva evaluaciones e historial al recargar',async({page})=>{
  const before=fixture();await setup(page,before);
  await page.getByRole('columnheader').getByRole('checkbox').check();
  await expect(page.getByRole('button',{name:'Descartar marcados (25)',exact:true})).toBeEnabled();
  await page.getByTitle('Página siguiente',{exact:true}).click();
  await page.getByRole('columnheader').getByRole('checkbox').check();
  const discard=page.getByRole('button',{name:'Descartar marcados (27)',exact:true});await discard.click();
  const dialog=page.getByRole('dialog',{name:'Descartar postulantes marcados'});
  await expect(dialog.getByLabel('Postulantes a descartar').getByRole('listitem')).toHaveCount(27);
  const confirm=dialog.getByRole('button',{name:'Confirmar descarte (27)',exact:true});
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Motivo del descarte',{exact:true}).fill('Revisión del lote por el equipo de GTHC.');
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  expect((await stored(page)).applications).toEqual(before.applications);
  await discard.click();await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Motivo del descarte',{exact:true}).fill('Revisión del lote por el equipo de GTHC.');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:'/tmp/gth-bulk-discard-mobile.png',fullPage:true,animations:'disabled'});
  await confirm.click();await expect(dialog).not.toBeVisible();
  const after=await stored(page);
  expect(after.applications.slice(0,27).every(app=>app.stage==='no_continua')).toBe(true);
  expect(after.applications.slice(27)).toEqual(before.applications.slice(27));
  expect(after.candidates.slice(0,27).every(candidate=>candidate.savedInTalentPool)).toBe(true);
  expect(after.candidates.slice(27)).toEqual(before.candidates.slice(27));
  expect(after.emailDrafts).toEqual(before.emailDrafts);
  expect(after.decisionLogs).toHaveLength(before.decisionLogs.length+27);
  expect(after.activities).toHaveLength(before.activities.length+27);
  for(let i=0;i<27;i++) {
    expect(after.applications[i].llmEvaluation).toEqual(before.applications[i].llmEvaluation);
    expect(after.applications[i].criteriaBreakdown).toEqual(before.applications[i].criteriaBreakdown);
    expect(after.decisionLogs.find(log=>log.applicationId===after.applications[i].id)?.notes).toBe('Revisión del lote por el equipo de GTHC.');
  }
  await expect(page.getByRole('button',{name:/Descartar marcados/})).not.toBeVisible();
  await page.reload();expect((await stored(page)).applications).toEqual(after.applications);
  await page.getByRole('tab',{name:/No continúan/}).click();
  await expect(page.getByRole('table').getByText('Persona 27',{exact:true})).toBeVisible();
});

test('Top-N parcial permite marcar, comparar y exportar resultados disponibles sin inventar puntajes completos',async({page})=>{
  await setup(page);
  await page.getByRole('spinbutton',{name:'Cantidad Top-N'}).fill('2');
  await expect(page.getByRole('button',{name:'Elegir los mejores',exact:true})).toBeEnabled();
  await expect(page.locator('#top-n-availability')).toContainText('Selección para revisión');
  await page.getByRole('button',{name:'Elegir los mejores',exact:true}).click();
  const table=page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(3);
  await expect(table.getByRole('row').nth(1)).toContainText('Persona 27');
  await expect(table.getByRole('row').nth(2)).toContainText('Persona 26');
  for (const checkbox of await table.getByRole('checkbox').all()) await expect(checkbox).toBeChecked();
  await expect(table.getByText('Cobertura 40%',{exact:true})).toHaveCount(2);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Exportar CSV (2)',exact:true}).click();
  const download=await downloadPromise,csv=readFileSync((await download.path())!,'utf8');
  expect(csv).toContain('Puntaje parcial LLM;Cobertura LLM (%);Criterios sin evidencia');
  expect(csv).toContain(';Parcial;');expect(csv).toContain(';66;40;Tecnología');expect(csv).toContain(';65;40;Tecnología');
  await page.getByRole('button',{name:'Decidir con borrador...',exact:true}).click();
  const advance=page.getByRole('dialog',{name:'Revisar decisión de avance de candidatos'});
  await expect(advance.getByRole('button',{name:/Confirmar avance/})).toBeDisabled();
  await expect(advance.getByRole('alert')).toContainText('puntaje completo y requisitos verificados');
  await advance.getByRole('button',{name:'Cancelar',exact:true}).click();
  await table.scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/gth-review-ranking-desktop.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:'/tmp/gth-review-ranking-mobile.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'Comparar (2)',exact:true}).click();
  await expect(page.getByText('Parcial · 66',{exact:true})).toBeVisible();
  await expect(page.getByText('Parcial · 65',{exact:true})).toBeVisible();
  await expect(page.getByText('Cobertura 40%',{exact:true})).toHaveCount(2);
  const apps=(await stored(page)).applications;
  expect(apps.every(app=>app.llmScore===null)).toBe(true);
  expect(apps.slice(0,27).every(app=>app.stage==='postulado'&&app.mandatoryRequirementStatus==='sin_verificar')).toBe(true);
  await page.getByRole('button',{name:'Limpiar comparación',exact:true}).click();
  await page.getByRole('button',{name:'Cargar 3 mejores activos',exact:true}).click();
  await expect(page.getByText('Parcial · 64',{exact:true})).toBeVisible();
});
