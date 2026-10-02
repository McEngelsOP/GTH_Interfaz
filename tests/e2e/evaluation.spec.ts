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
  await page.getByRole('button',{name:'Evaluar pendientes',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Revisar perfiles antes de evaluar'});
  await expect(dialog.getByText(/Clave Gemini configurada/)).toBeVisible();
  return dialog;
};

test('revisión explícita, envío depurado, persistencia y verificación humana habilitan Top-N', async ({page}) => {
  const sent:any[]=[];
  await page.route('**/api/evaluate',async route => {
    if(route.request().method()==='GET') return route.fulfill({json:{configured:true}});
    const body=route.request().postDataJSON();sent.push(body);
    await route.fulfill({json:jsonReply(body)});
  });
  await setup(page);
  const dialog=await preview(page);
  expect(sent).toHaveLength(0);
  const consent=dialog.getByRole('checkbox');await expect(consent).toBeDisabled();
  await dialog.getByText('Ver contenido depurado de Ana Segura',{exact:true}).click();
  await expect(dialog.locator('pre').filter({hasText:'Python'})).toBeVisible();
  await consent.check();
  await dialog.getByRole('button',{name:'Evaluar 1 revisados',exact:true}).click();
  await expect(dialog.getByText(/Lote completado/)).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(Object.keys(sent[0]).sort()).toEqual(['job','profile','requestId']);
  expect(JSON.stringify({profile:sent[0].profile,job:sent[0].job})).not.toMatch(/Ana|Segura|canary_private|example.com|987|01234567|Privada|CANARY|cand-import|app-import|rawCvText|snapshot/);
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Elegir los mejores',exact:true})).toBeDisabled();
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
  await dialog.getByRole('button',{name:'Evaluar 1 revisados',exact:true}).click();
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
  await dialog.getByRole('button',{name:'Evaluar 1 revisados',exact:true}).click();
  await expect(dialog.getByText('Cuota de prueba agotada.',{exact:true})).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('lote se detuvo');
  await dialog.getByRole('button',{name:'Evaluar 1 revisados',exact:true}).click();
  await expect.poll(()=>Boolean(resolve),{timeout:20000}).toBe(true);
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();resolve!();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('GTH_ESAN_STAGE_I_STATE_V2')!));
  expect(state.applications[0].llmScore).toBeNull();expect(state.applications[0].llmEvaluation).toBeUndefined();
  await expect(page.getByRole('button',{name:'Evaluar pendientes',exact:true})).toBeEnabled();
});

test('perfiles sin campos profesionales y claves ausentes no generan envíos', async ({page}) => {
  const state=structuredClone(fixture);state.candidates[0].importedProfile!.records=[{'Nombre':'Ana Segura','Correo':'canary_private@example.com'}];
  await page.addInitScript(s=>localStorage.setItem('GTH_ESAN_STAGE_I_STATE_V2',JSON.stringify(s)),state);
  let posts=0;
  await page.route('**/api/evaluate',route=>{if(route.request().method()==='POST')posts++;return route.fulfill({json:{configured:false}});});
  await page.goto('/#view=mejores_candidatos');await page.getByRole('button',{name:'Evaluar pendientes',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Revisar perfiles antes de evaluar'});
  await expect(dialog.getByText(/No hay información profesional suficiente/)).toBeVisible();
  await expect(dialog.getByText(/Falta GEMINI_API_KEY/)).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Evaluar 0 revisados',exact:true})).toBeDisabled();
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
