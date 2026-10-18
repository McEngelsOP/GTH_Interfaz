import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import readXlsxFile from 'read-excel-file/node';
import { meetingState } from '../fixtures/gthMeetingData.ts';
import { instalarSupabaseFicticio, responderBaseFicticia } from '../fixtures/supabaseMock.ts';
import type { FilaBase } from '../../src/services/baseCentralizada.ts';

const review = '.impeccable/review';
const row = (n: number): FilaBase => ({
  persona_id: `persona-${n}`,aviso_id: 'qa-actual',aviso_titulo: 'Especialista en selección y desarrollo organizacional',aviso_area: 'Gestión del Talento Humano',
  id_postulante: `p-${n}`,nombre: n === 0 ? 'Ana' : `Persona ${String(n).padStart(2,'0')}`,apellido: 'Prueba',email: `persona${n}@example.test`,telefono: null,
  fecha_postulacion: '2026-10-16',ciudad: 'Lima',puesto_actual: 'Especialista en selección',empresa_actual: 'Empresa de prueba',area_experiencia: 'Recursos humanos',
  estudio: 'Administración',nivel_estudio: 'Universitario',estado_estudio: 'Graduado',institucion: 'Universidad de prueba',idiomas: 'Inglés - Avanzado',cv_url: null,sin_cv: true,
});

test('recurrencia abre historial remoto y conserva perfil, estados y diseño adaptable', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror',(e)=>errors.push(e.message));
  await instalarSupabaseFicticio(page,meetingState);
  const summaries: Record<string, unknown>[] = [];
  await page.route('**/rest/v1/rpc/gth_resumen_postulaciones', async (route) => {
    summaries.push(route.request().postDataJSON());
    await route.fulfill({ json: [{ id_postulante: 'qa-external-0',total: 3 }] });
  });
  await page.route('**/rest/v1/rpc/gth_historial_postulaciones', async (route) => {
    const { p_id_postulante } = route.request().postDataJSON();
    await route.fulfill({ json: p_id_postulante === 'qa-external-0' ? [
      { aviso_id: 'QA-1410',titulo: 'Especialista en selección',fecha: '2026-10-16',score: 1,backend: 'e5',criterios_version: 'v1' },
      { aviso_id: 'qa-antes',titulo: 'Analista de Gestión del Talento Humano y Desarrollo Organizacional',fecha: '2026-09-12',score: 0.73,backend: 'e5',criterios_version: 'v2' },
      { aviso_id: 'qa-sin-fecha',titulo: 'Asistente de operaciones',fecha: null,score: null,backend: null,criterios_version: null },
    ] : [] });
  });
  await page.goto('/#view=mejores_candidatos');
  mkdirSync(review,{recursive:true});
  await page.getByRole('button',{name:'Ver 3 postulaciones de Ana Prueba',exact:true}).waitFor();
  await page.screenshot({path:`${review}/ranking-desktop-light.png`,fullPage:true});
  await page.getByRole('button',{name:'Ver 3 postulaciones de Ana Prueba',exact:true}).click();
  const panel=page.getByRole('region',{name:'Historial de postulaciones',exact:true});
  await expect(page.getByRole('tab',{name:'Postulaciones',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(panel.getByRole('listitem')).toHaveCount(3);
  await expect(panel).toContainText('Sin puntaje vigente'); await expect(panel).toContainText('Fecha no disponible');
  await expect(panel).toContainText('12/09/2026');
  expect(summaries).toHaveLength(1);expect((summaries[0].p_ids as string[]).length).toBe(6);
  mkdirSync(review,{recursive:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.screenshot({path:`${review}/postulaciones-desktop-light.png`,fullPage:true});
  await page.getByRole('button',{name:'Cambiar tema de apariencia',exact:true}).dispatchEvent('click');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await expect(panel.locator('.postulaciones-detalle').first()).toHaveCSS('color','rgb(160, 169, 184)');
  await expect(panel.locator('.postulaciones-actual')).toHaveCSS('color','rgb(240, 85, 114)');
  await expect(page.getByRole('tab',{name:'Postulaciones',exact:true})).toHaveCSS('color','rgb(240, 85, 114)');
  await page.screenshot({path:`${review}/postulaciones-desktop-dark.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:`${review}/postulaciones-mobile-dark.png`,fullPage:true});
  await page.getByRole('button',{name:'Cambiar tema de apariencia',exact:true}).dispatchEvent('click');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme','dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await page.screenshot({path:`${review}/postulaciones-mobile-light.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await panel.evaluate((e)=>e.scrollWidth<=e.clientWidth)).toBe(true);
  expect(await page.getByRole('tab',{name:'Postulaciones',exact:true}).evaluate(e=>{const p=e.parentElement!.getBoundingClientRect(),r=e.getBoundingClientRect();return r.right<=p.right+1})).toBe(true);
  await page.getByRole('button',{name:'Cerrar panel',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'Bruno Prueba',exact:true}).click();
  await expect(page.getByRole('tab',{name:'Perfil',exact:true})).toHaveAttribute('aria-selected','true');
  await page.getByRole('tab',{name:'Postulaciones',exact:true}).click();
  await expect(panel).toContainText('No hay postulaciones disponibles');
  await expect(panel).not.toContainText('Asistente de operaciones');
  expect(errors).toEqual([]);
});

test('historial distingue error de vacío y permite reintentar', async ({ page }) => {
  await instalarSupabaseFicticio(page,meetingState);
  let attempts=0;
  await page.route('**/rest/v1/rpc/gth_historial_postulaciones', async (route) => {
    attempts++;
    await route.fulfill(attempts===1 ? {status:403,json:{code:'42501',message:'denied'}} : {json:[]});
  });
  await page.goto('/#view=mejores_candidatos');
  await page.getByRole('button',{name:'Ana Prueba',exact:true}).click();
  await page.getByRole('tab',{name:'Postulaciones',exact:true}).click();
  const panel=page.getByRole('region',{name:'Historial de postulaciones',exact:true});
  await expect(panel.getByRole('alert')).toContainText('No se pudieron cargar');
  await panel.getByRole('button',{name:'Reintentar',exact:true}).click();
  await expect(panel).toContainText('No hay postulaciones disponibles');
  expect(attempts).toBe(2);
});

test('base pagina desde el servidor y exporta todos los resultados filtrados', async ({ page }) => {
  await instalarSupabaseFicticio(page);
  const requests=await responderBaseFicticia(page,Array.from({length:63},(_,i)=>row(i)));
  await page.goto('/#view=base_centralizada');
  const table=page.getByRole('table',{name:'Postulantes de la base centralizada',exact:true});
  await expect(table.locator('tbody tr')).toHaveCount(50);
  await page.getByRole('button',{name:'Página siguiente',exact:true}).click();
  await expect(table.locator('tbody tr')).toHaveCount(13);
  expect(requests.at(-1)?.p_pagina).toBe(2);expect(requests.at(-1)?.p_incluir_resumen).toBe(false);
  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'Exportar a Excel (63)',exact:true}).click();
  const download=await downloading;
  const path=await download.path();
  expect((await readXlsxFile(path!))[0].data).toHaveLength(64);
  expect(requests.at(-1)?.p_por_pagina).toBe(250);
  await page.getByRole('button',{name:'Página anterior',exact:true}).click();
  await expect(table.locator('tbody tr')).toHaveCount(50);
  await page.getByRole('button',{name:'Filtros',exact:true}).click();
  mkdirSync(review,{recursive:true});
  await page.screenshot({path:`${review}/base-desktop-light.png`,fullPage:true});
  await page.getByRole('button',{name:'Cambiar tema de apariencia',exact:true}).dispatchEvent('click');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await expect(page.locator('.base-filtros-resultado')).toHaveCSS('color','rgb(160, 169, 184)');
  await page.screenshot({path:`${review}/base-desktop-dark.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:`${review}/base-mobile-dark.png`,fullPage:true});
  await page.getByRole('button',{name:'Cambiar tema de apariencia',exact:true}).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme','dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
  await page.screenshot({path:`${review}/base-mobile-light.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('Buscar postulantes',{exact:true}).fill('Ana');
  await expect(table.locator('tbody tr')).toHaveCount(1);await expect(table).toContainText('Ana Prueba');
  expect(requests.at(-1)?.p_pagina).toBe(1);
  const args=requests.at(-1)?.p_filtros as Record<string,unknown>;expect(args.texto).toBe('Ana');
});

test('base mantiene la carga anterior si falta la migración y muestra errores recuperables', async ({ page }) => {
  await instalarSupabaseFicticio(page);
  let legacy=true;
  await page.route('**/rest/v1/rpc/gth_base_centralizada',async(route)=>route.fulfill({status:legacy?404:503,json:legacy?{code:'PGRST202',message:'missing'}:{code:'unavailable',message:'offline'}}));
  await page.route('**/rest/v1/v_base_postulantes*',async(route)=>route.fulfill({json:[row(0)]}));
  await page.goto('/#view=base_centralizada');
  const table=page.getByRole('table',{name:'Postulantes de la base centralizada',exact:true});
  await expect(table).toContainText('Ana Prueba');
  legacy=false;
  await page.getByRole('button',{name:'Actualizar',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo leer');
  await expect(page.getByRole('button',{name:/Exportar a Excel/})).toBeDisabled();
  await expect(table).not.toContainText('Ana Prueba');
});
