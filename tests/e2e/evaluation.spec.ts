import { test, expect, Page } from '@playwright/test';
import { INITIAL_APP_STATE } from '../../src/data/initialData.ts';
import { analyzeCandidateTables, applyCandidateImport, tableFromCSV } from '../../src/services/candidateImport.ts';
const raw = 'Nombre completo;E-Mail;Teléfono;DNI;Dirección;Exp[1] Puesto;Exp[1] Empresa;Exp[1] Descripción;Est[1] Titulo;Campo desconocido\nAna Segura;canary_private@example.com;+51 987 654 321;01234567;Av. Privada 987;Desarrolladora;Empresa CANARY_ENTITY;Desarrolló soluciones con Python y AWS.;Maestría en informática;CANARY_UNKNOWN';
const fixture = applyCandidateImport(structuredClone(INITIAL_APP_STATE),INITIAL_APP_STATE.activeJobPostingId,analyzeCandidateTables([tableFromCSV(raw,'inventado.csv')]).rows).state;
const setup = async (page:Page) => {
  await page.addInitScript((state) => { if (!localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')) localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(state)); },fixture);
  await page.goto('/#view=mejores_candidatos');
};
const jsonReply = (body:any,partial=false) => ({ requestId:body.requestId,model:'gemini-3.5-flash-lite',evaluatedAt:new Date().toISOString(),llmScore:partial?null:80,
  explanation:'Evaluación sustentada en los campos profesionales.',strengths:['Experiencia tecnológica declarada'],evidenceSummary:'Tecnología y formación declaradas.',
  criteria:body.job.criteria.map((c:any,i:number) => ({ key:c.key,score:partial && i===0?null:80,evidence:partial && i===0?null:'Desarrolló soluciones con Python y AWS.' })) });
const preview = async (page:Page) => {
  await page.getByRole('button',{name:'Evaluar todos los pendientes',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Evaluar perfiles pendientes'});
  await expect(dialog.getByText(/Clave Gemini configurada/)).toBeVisible();
  return dialog;
};

function averageFixture(total: number) {
  const state = structuredClone(fixture);
  const job = state.jobPostings.find(job => job.id === state.activeJobPostingId)!;
  job.criteria = [{ id:'experience', label:'Experiencia', type:'LLM', weightPct:40 },
    { id:'technology', label:'Tecnología', type:'LLM', weightPct:60 }];
  state.candidates = Array.from({ length:total }, (_,i) => ({ ...structuredClone(fixture.candidates[0]), id:`average-person-${i}`, name:`Perfil promedio ${i}` }));
  state.applications = Array.from({ length:total }, (_,i) => ({ ...structuredClone(fixture.applications[0]), id:`average-app-${i}`, candidateId:`average-person-${i}`,
    criteriaBreakdown:{ experience:{ score:42.5, evidence:'Desarrolló soluciones con Python y AWS.' } },
    llmEvaluation:{ model:'gemini-test', evaluatedAt:'2026-10-04T20:00:00Z', criteriaVersion:job.criteriaVersion,
      profileHash:'a'.repeat(64), privacyVersion:'v1', missingCriteria:['technology'] } }));
  return state;
}

test('119 evaluaciones parciales muestran promedio y cobertura al recargar y liberar perfiles', async ({page}) => {
  const state = averageFixture(127);
  for (let i=119;i<122;i++) { state.applications[i].llmEvaluation=undefined;state.applications[i].criteriaBreakdown={}; }
  for (let i=122;i<127;i++) state.applications[i].stage='no_continua';
  await page.addInitScript(s=>{if(!localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2'))localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s));},state);
  await page.goto('/#view=mejores_candidatos');
  const average=page.getByRole('region',{name:'Resumen del promedio LLM'});
  await expect(average).toContainText('Promedio parcial (LLM)');
  await expect(average).toContainText('42.5 / 100');
  await expect(average).toContainText('119 evaluaciones parciales · cobertura media 40%');
  await expect(average).not.toContainText('Sin datos');
  await expect(page.getByText(/3 sin evaluar · 119 con evidencia incompleta · 0 casos especiales/)).toBeVisible();
  await page.reload();
  await expect(average).toContainText('119 evaluaciones parciales');
  await page.getByRole('table').getByRole('row').filter({hasText:'Perfil promedio 0'}).getByTitle('Liberar postulación (No continúa)',{exact:true}).click();
  await page.getByRole('dialog',{name:'Confirmar liberación de postulación'}).getByRole('button',{name:'Confirmar liberación',exact:true}).click();
  await expect(average).toContainText('118 evaluaciones parciales · cobertura media 40%');
  const apps=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!).applications);
  expect(apps.every((app:any)=>app.llmScore===null)).toBe(true);
  await expect(page.getByRole('button',{name:'Elegir los mejores',exact:true})).toBeEnabled();
  await average.scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/gth-average-desktop.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  await average.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:'/tmp/gth-average-mobile.png',fullPage:true,animations:'disabled'});
});

test('promedio completo, parcial cero y evaluaciones sin evidencia se distinguen en el indicador', async ({page}) => {
  const state=averageFixture(6);
  state.applications[0].llmScore=80;
  state.applications[0].criteriaBreakdown.experience.score=80;
  state.applications[0].criteriaBreakdown.technology={score:80,evidence:'Tecnología declarada.'};
  state.applications[0].llmEvaluation!.missingCriteria=[];
  state.applications[1].criteriaBreakdown.experience.score=0;
  state.applications[2].criteriaBreakdown={};
  state.applications[2].llmEvaluation!.missingCriteria=['experience','technology'];
  state.applications[3].llmEvaluation=undefined;state.applications[3].criteriaBreakdown={};
  state.applications[4].llmScore=100;state.applications[4].stage='no_continua';
  state.applications[5].llmScore=100;state.applications[5].stage='contratado';
  await page.addInitScript(s=>{if(!localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2'))localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s));},state);
  await page.goto('/#view=mejores_candidatos');
  const average=page.getByRole('region',{name:'Resumen del promedio LLM'});
  await expect(average).toContainText('Promedio (LLM)');
  await expect(average).toContainText('80 / 100');
  await expect(average).toContainText('1 evaluación completa');
  await expect(average).toContainText('Parciales: 0 / 100 · 1 evaluación parcial · cobertura media 40%');
  for (let i=0;i<2;i++) {
    await page.getByRole('table').getByRole('row').filter({hasText:`Perfil promedio ${i}`}).getByTitle('Liberar postulación (No continúa)',{exact:true}).click();
    await page.getByRole('dialog',{name:'Confirmar liberación de postulación'}).getByRole('button',{name:'Confirmar liberación',exact:true}).click();
    if(i===0) {await expect(average).toContainText('Promedio parcial (LLM)');await expect(average).toContainText('0 / 100');}
  }
  await page.reload();
  await expect(average).toContainText('Sin evidencia');
  await expect(average).toContainText('1 evaluación recibida sin criterios puntuables');
  await expect(average).not.toContainText('Sin datos');
});

test('cola concurrente conserva resultados fuera de orden, parciales y puntajes tras liberar un caso especial',async({page})=>{
  const state=structuredClone(fixture);
  state.candidates=Array.from({length:6},(_,i)=>({...structuredClone(fixture.candidates[0]),id:`parallel-person-${i}`,name:`Perfil concurrente ${i}`}));
  state.applications=Array.from({length:6},(_,i)=>({...structuredClone(fixture.applications[0]),id:`parallel-app-${i}`,candidateId:`parallel-person-${i}`}));
  await page.addInitScript(s=>{if(!localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2'))localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s));},state);
  await page.clock.install();
  let posts=0;const held:(()=>void)[]=[];
  await page.route('**/api/evaluate',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true,concurrency:3,intervalSeconds:3.1}});
    const index=++posts,body=route.request().postDataJSON();
    if(index<=2)await new Promise<void>(resolve=>held.push(resolve));
    if(index===4)return route.fulfill({status:422,json:{code:'INVALID_EVALUATION',error:'Caso especial de prueba.'}});
    await route.fulfill({json:jsonReply(body,index===6)});
    if(index===3)held.forEach(resolve=>resolve());
  });
  await page.goto('/#view=mejores_candidatos');const dialog=await preview(page);
  await expect(dialog).toContainText('Hasta 3 perfiles simultáneos');
  await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Evaluar 6 perfiles',exact:true}).click();
  await expect.poll(()=>posts).toBe(1);await page.clock.runFor(3101);
  await expect.poll(()=>posts).toBe(2);await page.clock.runFor(3101);
  await expect(dialog.getByLabel('Resumen del lote')).toContainText('3 resultados recibidos');
  for(let i=4;i<=6;i++){await page.clock.runFor(3101);await expect.poll(()=>posts).toBe(i);}
  await expect(dialog.getByText(/Lote completado/)).toContainText('5 resultados recibidos · 1 casos especiales');
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  const table=page.getByRole('table');
  await expect(table.getByText('Parcial · 80',{exact:true})).toBeVisible();
  await expect(page.getByText(/0 sin evaluar · 1 con evidencia incompleta · 1 casos especiales/)).toBeVisible();
  await table.getByRole('row').filter({hasText:'Perfil concurrente 3'}).getByTitle('Liberar postulación (No continúa)',{exact:true}).click();
  await page.getByRole('dialog',{name:'Confirmar liberación de postulación'}).getByRole('button',{name:'Confirmar liberación',exact:true}).click();
  await page.reload();
  const apps=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!).applications);
  expect(apps.map((app:any)=>app.llmScore)).toEqual([80,80,80,null,80,null]);
  expect(apps[3].stage).toBe('no_continua');expect(apps[5].llmEvaluation.missingCriteria).toHaveLength(1);
  await expect(page.getByRole('table').getByText('Parcial · 80',{exact:true})).toBeVisible();
  await expect(page.getByText(/0 sin evaluar · 1 con evidencia incompleta · 0 casos especiales/)).toBeVisible();
  await page.getByText('Evaluaciones recibidas · evidencia incompleta (1)',{exact:true}).click();
  await expect(page.getByText(/Puntaje parcial: 80\/100 · Cobertura:/)).toBeVisible();
  await page.getByRole('table').scrollIntoViewIfNeeded();
  await page.clock.runFor(1000);
  await page.screenshot({path:'/tmp/gth-evaluation-results-desktop.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.getByText('Evaluaciones recibidas · evidencia incompleta (1)',{exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:'/tmp/gth-evaluation-results-mobile.png',fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Reevaluar perfiles incompletos',exact:true}).click();
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true}).click();
  await expect(dialog.getByText(/Lote completado/)).toContainText('1 resultados recibidos');
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(page.getByText('Evaluaciones recibidas · evidencia incompleta (1)',{exact:true})).not.toBeVisible();
  const next=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!).applications);
  expect(next[5].llmScore).toBe(80);expect(posts).toBe(7);
});

test('Retry-After permite continuar automáticamente sin repetir los resultados previos',async({page})=>{
  await page.clock.install();let posts=0;
  await page.route('**/api/evaluate',route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true,concurrency:3,intervalSeconds:3.1}});
    if(++posts===1)return route.fulfill({status:429,headers:{'Retry-After':'20'},json:{code:'PROVIDER_RATE_LIMIT',error:'Espera temporal.'}});
    return route.fulfill({json:jsonReply(route.request().postDataJSON())});
  });
  await setup(page);const dialog=await preview(page);
  await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('Esperando 20 segundos por cuota');
  await page.clock.runFor(19000);expect(posts).toBe(1);
  await page.clock.runFor(1001);await expect(dialog.getByText(/Lote completado/)).toBeVisible();
  expect(posts).toBe(2);
  const app=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!).applications[0]);
  expect(app.llmScore).toBe(80);expect(app.evaluationIssue).toBeUndefined();
});

test('autorización única, envío depurado, persistencia y verificación humana habilitan el avance', async ({page}) => {
  const sent:any[]=[];
  await page.route('**/api/evaluate',async route => {
    if(route.request().method()==='GET') return route.fulfill({json:{configured:true}});
    const body=route.request().postDataJSON();sent.push(body);
    await route.fulfill({json:jsonReply(body)});
  });
  await setup(page);
  const dialog=await preview(page);
  expect(sent).toHaveLength(0);
  const consent=dialog.getByRole('checkbox');await expect(consent).toBeEnabled();
  await expect(dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true})).toBeDisabled();
  await dialog.getByText('Ver contenido depurado de Ana Segura',{exact:true}).click();
  await expect(dialog.locator('pre').filter({hasText:'Python'})).toBeVisible();
  await consent.check();
  await dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true}).click();
  await expect(dialog.getByText(/Lote completado/)).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(Object.keys(sent[0]).sort()).toEqual(['job','profile','requestId']);
  expect(JSON.stringify({profile:sent[0].profile,job:sent[0].job})).not.toMatch(/Ana|Segura|canary_private|example.com|987|01234567|Privada|CANARY|cand-import|app-import|rawCvText|snapshot/);
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Elegir los mejores',exact:true})).toBeEnabled();
  await page.getByText('Ana Segura',{exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'Ficha del candidato'});
  await drawer.getByRole('button',{name:'Revisar requisito',exact:true}).click();
  const review=page.getByRole('dialog',{name:'Revisar requisito obligatorio'});
  await review.getByLabel('Estado del requisito',{exact:true}).selectOption('verificado');
  await expect(review.getByRole('button',{name:'Guardar revisión',exact:true})).toBeDisabled();
  await review.getByLabel('Evidencia o motivo de revisión',{exact:true}).fill('Verificación humana de prueba en fuente oficial.');
  await review.getByRole('button',{name:'Guardar revisión',exact:true}).click();
  await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click();
  await expect(page.getByRole('button',{name:'Elegir los mejores',exact:true})).toBeEnabled();
  await page.reload();
  const stored=await page.evaluate(() => JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!));
  expect(stored.applications[0].llmScore).toBe(80);expect(stored.applications[0].mandatoryRequirementStatus).toBe('verificado');
  expect(stored.candidates[0].email).toBe('canary_private@example.com');
  expect(stored.applications[0].llmEvaluation.profileHash).toHaveLength(64);
  await page.screenshot({path:'../evaluation-ranked.png',fullPage:true});
});

test('vista previa móvil permite omitir campos y obliga a autorizar otra vez', async ({page}) => {
  const sent:any[]=[];
  await page.route('**/api/evaluate',async route => {
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true}});
    const body=route.request().postDataJSON();sent.push(body);return route.fulfill({json:jsonReply(body,true)});
  });
  await setup(page);await page.setViewportSize({width:390,height:844});
  const dialog=await preview(page);
  await dialog.getByText('Ver contenido depurado de Ana Segura',{exact:true}).click();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Omitir campo 1',exact:true}).click();
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await dialog.getByRole('checkbox').check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect(await dialog.evaluate((el) => el.contains(document.elementFromPoint(innerWidth/2,55)))).toBe(true);
  await page.screenshot({path:'../evaluation-preview-mobile.png',fullPage:true});
  await dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true}).click();
  await expect(dialog.getByText(/Evaluación recibida: falta evidencia/)).toBeVisible();
  expect(sent[0].profile.some((field:any) => field.label==='Puesto')).toBe(false);
  const app=await page.evaluate(() => JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!).applications[0]);
  expect(app.llmScore).toBeNull();expect(app.llmEvaluation.missingCriteria).toHaveLength(1);
});

test('cuota conserva resultados previos y cerrar cancela la evaluación en curso', async ({page}) => {
  let requests=0;let resolve:(()=>void)|undefined;
  await page.route('**/api/evaluate',async route => {
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true}});
    requests++;
    if(requests===1)return route.fulfill({status:429,json:{error:'Cuota de prueba agotada.'}});
    await new Promise<void>(r=>{resolve=r;});
    await route.fulfill({json:jsonReply(route.request().postDataJSON())}).catch(()=>{});
  });
  await setup(page);const dialog=await preview(page);
  await dialog.getByText('Ver contenido depurado de Ana Segura',{exact:true}).click();await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true}).click();
  await expect(dialog.getByText('Cuota de prueba agotada.',{exact:true})).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('lote se detuvo');
  await dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true}).click();
  await expect.poll(()=>Boolean(resolve),{timeout:20000}).toBe(true);
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();resolve!();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!));
  expect(state.applications[0].llmScore).toBeNull();expect(state.applications[0].llmEvaluation).toBeUndefined();
  await expect(page.getByRole('button',{name:'Evaluar todos los pendientes',exact:true})).toBeEnabled();
});

test('perfiles sin campos profesionales y claves ausentes no generan envíos', async ({page}) => {
  const state=structuredClone(fixture);state.candidates[0].importedProfile!.records=[{'Nombre':'Ana Segura','Correo':'canary_private@example.com'}];
  await page.addInitScript(s=>localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s)),state);
  let posts=0;
  await page.route('**/api/evaluate',route=>{if(route.request().method()==='POST')posts++;return route.fulfill({json:{configured:false}});});
  await page.goto('/#view=mejores_candidatos');await page.getByRole('button',{name:'Evaluar todos los pendientes',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Evaluar perfiles pendientes'});
  await expect(dialog.getByText(/No hay información profesional suficiente/)).toBeVisible();
  await expect(dialog.getByText(/Falta GEMINI_API_KEY/)).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Evaluar 0 perfiles',exact:true})).toBeDisabled();
  expect(posts).toBe(0);
});

test('referencia del puesto se guarda localmente, cambia versión e invalida puntajes previos', async ({page}) => {
  await setup(page);
  await page.getByText('Referencia del puesto o syllabus',{exact:true}).click();
  await page.getByLabel('Referencia del puesto o syllabus',{exact:true}).fill('Desarrollo cloud con Python, AWS y diseño de APIs.');
  await page.getByRole('button',{name:'Guardar referencia',exact:true}).click();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!));
  const job=stored.jobPostings.find((job:any)=>job.id===stored.activeJobPostingId);
  expect(job.evaluationReference).toContain('Python');expect(job.criteriaVersion).toContain('ref');
});


for (const total of [120,400]) test(`prepara ${total} perfiles con una sola confirmación y sin abrir vistas previas`,async({page})=>{
  const state=structuredClone(fixture);
  state.candidates=Array.from({length:total},(_,i)=>({...structuredClone(fixture.candidates[0]),id:`test-person-${i}`,name:`Persona de prueba ${i}`}));
  state.applications=Array.from({length:total},(_,i)=>({...structuredClone(fixture.applications[0]),id:`test-app-${i}`,candidateId:`test-person-${i}`}));
  state.candidates[total-1].importedProfile!.records=[{'Nombre':'Persona de prueba'}];
  await page.addInitScript(s=>localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s)),state);
  let posts=0;
  await page.route('**/api/evaluate',route=>{if(route.request().method()==='POST')posts++;return route.fulfill({json:{configured:true}});});
  await page.goto('/#view=mejores_candidatos');const dialog=await preview(page);
  await expect(dialog.getByRole('checkbox')).toHaveCount(1);
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await expect(dialog.getByRole('checkbox')).toBeEnabled();
  await expect(dialog.getByLabel('Resumen del lote')).toContainText(`${total} perfiles preparados`);
  await expect(dialog.getByLabel('Resumen del lote')).toContainText(`${total-1} pendientes listos · 1 requieren revisión`);
  await expect(dialog.locator('.evaluation-row')).toHaveCount(25);
  await expect(dialog.locator('.evaluation-field')).toHaveCount(0);
  await dialog.getByRole('checkbox').check();
  await expect(dialog.getByRole('button',{name:`Evaluar ${total-1} perfiles`,exact:true})).toBeEnabled();
  expect(posts).toBe(0);
  await dialog.getByRole('button',{name:'Siguiente',exact:true}).click();
  await expect(dialog.getByRole('checkbox')).toBeChecked();
  await expect(dialog.locator('.evaluation-row').first()).toContainText('26. Persona de prueba 25');
  if(total===120){
    await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.getByRole('row').filter({has:page.getByRole('button',{name:'Persona de prueba 0',exact:true})}).getByRole('checkbox').check();
    await page.getByRole('button',{name:'Evaluar seleccionados',exact:true}).click();
    await expect(dialog.getByLabel('Resumen del lote')).toContainText('1 perfiles preparados');
    await expect(dialog.getByRole('checkbox')).not.toBeChecked();
    await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.getByRole('button',{name:'Evaluar todos los pendientes',exact:true}).click();
    await expect(dialog.getByLabel('Resumen del lote')).toContainText('120 perfiles preparados');
    await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  }
  if(total===400){await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await page.screenshot({path:'../evaluation-batch-400-mobile.png',fullPage:true});}
});

test('una confirmación procesa más de 25, omite bloqueados y reanuda sin repetir resultados',async({page})=>{
  test.setTimeout(90000);
  const state=structuredClone(fixture);
  const total=28;
  state.candidates=Array.from({length:total},(_,i)=>({...structuredClone(fixture.candidates[0]),id:`queue-person-${i}`,name:`Persona de prueba ${i}`}));
  state.applications=Array.from({length:total},(_,i)=>({...structuredClone(fixture.applications[0]),id:`queue-app-${i}`,candidateId:`queue-person-${i}`}));
  state.candidates[total-1].importedProfile!.records=[{'Nombre':'Persona de prueba'}];
  await page.addInitScript(s=>localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s)),state);
  await page.clock.install();
  const sent:any[]=[];let fail=true;
  await page.route('**/api/evaluate',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true}});
    const body=route.request().postDataJSON();sent.push(body);
    if(sent.length===26 && fail){fail=false;return route.fulfill({status:429,json:{error:'Cuota temporal de prueba.'}});}
    return route.fulfill({json:jsonReply(body)});
  });
  await page.goto('/#view=mejores_candidatos');const dialog=await preview(page);
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Evaluar 27 perfiles',exact:true}).click();
  for(let i=1;i<=25;i++){
    await expect.poll(()=>sent.length).toBe(i);
    await expect(dialog.getByLabel('Resumen del lote')).toContainText(`${i} resultados recibidos`);
    if(i===1){
      await dialog.getByRole('button',{name:'Pausar lote',exact:true}).click();
      await expect(dialog.getByRole('button',{name:'Evaluar 26 perfiles',exact:true})).toBeEnabled();
      await expect(dialog.getByRole('checkbox')).toBeChecked();
      await page.clock.runFor(12001);
      expect(sent).toHaveLength(1);
      await dialog.getByRole('button',{name:'Evaluar 26 perfiles',exact:true}).click();
    }else await page.clock.runFor(12001);
  }
  await expect.poll(()=>sent.length).toBe(26);
  await expect(dialog.getByRole('alert')).toContainText('lote se detuvo');
  await expect(dialog.getByRole('alert')).toContainText('Cuota temporal de prueba.');
  await expect(dialog.getByRole('checkbox')).toBeChecked();
  await expect(dialog.getByRole('button',{name:'Evaluar 2 perfiles',exact:true})).toBeEnabled();
  await dialog.getByRole('button',{name:'Evaluar 2 perfiles',exact:true}).click();
  await page.clock.runFor(12001);
  await expect.poll(()=>sent.length).toBe(27);
  await expect(dialog.getByLabel('Resumen del lote')).toContainText('26 resultados recibidos');
  await page.clock.runFor(12001);
  await expect(dialog.getByText(/Lote completado/)).toBeVisible();
  expect(sent).toHaveLength(28); // 27 listos más el reintento del único fallo.
  expect(new Set(sent.map(body=>body.requestId)).size).toBe(27);
  const apps=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!).applications);
  expect(apps.filter((app:any)=>app.llmScore===80)).toHaveLength(27);
  expect(apps[27].llmScore).toBeNull();
});

for (const code of ['EVIDENCE_SOURCE_MISMATCH','INVALID_EVALUATION']) test(`continúa tras ${code}, persiste el caso y lo reintenta con autorización explícita`,async({page})=>{
  const state=structuredClone(fixture);
  state.candidates=Array.from({length:3},(_,i)=>({...structuredClone(fixture.candidates[0]),id:`special-person-${i}`,name:`Perfil de prueba ${i}`}));
  state.applications=Array.from({length:3},(_,i)=>({...structuredClone(fixture.applications[0]),id:`special-app-${i}`,candidateId:`special-person-${i}`}));
  await page.addInitScript(s=>{if(!localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2'))localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s));},state);
  await page.clock.install();
  let posts=0,invalid=true;
  await page.route('**/api/evaluate',route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true}});
    posts++;
    if((posts===2 || posts===4) && invalid)return route.fulfill({status:422,json:{code,error:'No se guardó la evaluación. La fuente de evidencia no corresponde al perfil depurado.'}});
    return route.fulfill({json:jsonReply(route.request().postDataJSON())});
  });
  await page.goto('/#view=mejores_candidatos');let dialog=await preview(page);
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Evaluar 3 perfiles',exact:true}).click();
  await expect(dialog.getByLabel('Resumen del lote')).toContainText('1 resultados recibidos');
  await page.clock.runFor(12001);
  await expect(dialog.getByLabel('Resumen del lote')).toContainText('1 casos especiales');
  await page.clock.runFor(12001);
  await expect(dialog.getByText(/Lote completado/)).toContainText('2 resultados recibidos · 1 casos especiales');
  expect(posts).toBe(3);
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'Evaluar todos los pendientes',exact:true})).toBeDisabled();
  await page.getByText('Casos especiales · revisión de información (1)',{exact:true}).click();
  const cases=page.locator('.evaluation-special-cases');
  await expect(cases).toContainText('Perfil de prueba 1');
  await expect(cases).toContainText('Intentos con incidencia: 1');
  await cases.getByRole('button',{name:'Revisar perfil',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Ficha del candidato'})).toContainText('Perfil de prueba 1');
  await page.getByRole('button',{name:'Cerrar panel',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:'/tmp/gth-special-cases-mobile.png',fullPage:true});
  await cases.getByRole('button',{name:'Reintentar evaluación',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Evaluar perfiles pendientes'});
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await expect(dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true})).toBeDisabled();
  expect(posts).toBe(3);
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true}).click();
  await page.clock.runFor(12001);
  await expect(dialog.getByText(/Lote completado/)).toContainText('0 resultados recibidos · 1 casos especiales');
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(cases).toContainText('Intentos con incidencia: 2');
  invalid=false;
  await cases.getByRole('button',{name:'Reintentar evaluación',exact:true}).click();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Evaluar 1 perfil',exact:true}).click();
  await page.clock.runFor(12001);
  await expect(dialog.getByText(/Lote completado/)).toContainText('1 resultados recibidos · 0 casos especiales');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!));
  expect(stored.applications.map((app:any)=>app.llmScore)).toEqual([80,80,80]);
  expect(stored.applications.every((app:any)=>!app.evaluationIssue && app.stage==='postulado' && app.mandatoryRequirementStatus==='sin_verificar')).toBe(true);
  expect(posts).toBe(5);
});

test('una incidencia individual seguida de cuota pausa y reanuda solo los pendientes',async({page})=>{
  const state=structuredClone(fixture);
  state.candidates=Array.from({length:3},(_,i)=>({...structuredClone(fixture.candidates[0]),id:`quota-person-${i}`,name:`Caso de prueba ${i}`}));
  state.applications=Array.from({length:3},(_,i)=>({...structuredClone(fixture.applications[0]),id:`quota-app-${i}`,candidateId:`quota-person-${i}`}));
  await page.addInitScript(s=>localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s)),state);
  await page.clock.install();
  let posts=0;
  await page.route('**/api/evaluate',route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true}});
    posts++;
    if(posts===1)return route.fulfill({status:422,json:{code:'INVALID_EVALUATION',error:'Respuesta incompleta de prueba.'}});
    if(posts===2)return route.fulfill({status:429,json:{error:'Cuota temporal de prueba.'}});
    return route.fulfill({json:jsonReply(route.request().postDataJSON())});
  });
  await page.goto('/#view=mejores_candidatos');const dialog=await preview(page);
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Evaluar 3 perfiles',exact:true}).click();
  await expect(dialog.getByLabel('Resumen del lote')).toContainText('1 casos especiales');
  await page.clock.runFor(12001);
  await expect(dialog.getByRole('alert')).toContainText('Cuota temporal de prueba.');
  await expect(dialog.getByRole('button',{name:'Evaluar 2 perfiles',exact:true})).toBeEnabled();
  expect(posts).toBe(2);
  await dialog.getByRole('button',{name:'Evaluar 2 perfiles',exact:true}).click();
  await page.clock.runFor(12001);
  await expect(dialog.getByLabel('Resumen del lote')).toContainText('1 resultados recibidos');
  await page.clock.runFor(12001);
  await expect(dialog.getByText(/Lote completado/)).toContainText('2 resultados recibidos · 1 casos especiales');
  expect(posts).toBe(4);
});

test('una respuesta HTTP 200 ajena se aparta y las evaluaciones parciales no se repiten al reabrir',async({page})=>{
  const state=structuredClone(fixture);
  state.candidates=[{...structuredClone(fixture.candidates[0]),id:'reply-0',name:'Primer perfil de prueba'},{...structuredClone(fixture.candidates[0]),id:'reply-1',name:'Segundo perfil de prueba'}];
  state.applications=[{...structuredClone(fixture.applications[0]),id:'reply-app-0',candidateId:'reply-0'},{...structuredClone(fixture.applications[0]),id:'reply-app-1',candidateId:'reply-1'}];
  await page.addInitScript(s=>{if(!localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2'))localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s));},state);
  await page.clock.install();let posts=0;
  await page.route('**/api/evaluate',route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{configured:true}});
    posts++;const body=route.request().postDataJSON();
    return route.fulfill({json:posts===1?{...jsonReply(body),requestId:'incorrect-request'}:jsonReply(body,true)});
  });
  await page.goto('/#view=mejores_candidatos');const dialog=await preview(page);
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Evaluar 2 perfiles',exact:true}).click();
  await expect(dialog.getByLabel('Resumen del lote')).toContainText('1 casos especiales');
  await page.clock.runFor(12001);
  await expect(dialog.getByText(/Lote completado/)).toContainText('1 resultados recibidos · 1 casos especiales');
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'Evaluar todos los pendientes',exact:true})).toBeDisabled();
  const apps=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!).applications);
  expect(apps[0].evaluationIssue.code).toBe('INVALID_RESPONSE');
  expect(apps[1].llmEvaluation.missingCriteria).toHaveLength(1);
  expect(posts).toBe(2);
});

