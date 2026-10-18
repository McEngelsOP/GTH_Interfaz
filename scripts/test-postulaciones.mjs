import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const uid = (n) => `${n.repeat(8)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(12)}`;
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
    grant usage on schema auth to authenticated;
    insert into auth.users values('${uid('1')}','maestro@example.test');`);
  await db.exec(readFileSync('scraping/supabase_esquema.sql','utf8'));
  for (const name of readdirSync('supabase/migrations').filter((p) => p.endsWith('.sql')).sort())
    await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
  await db.exec(`grant select on public.avisos, public.postulaciones, public.cvs to authenticated;
    insert into auth.users values('${uid('2')}','general@example.test');
    insert into public.gth_perfiles(user_id,email,nivel) values('${uid('2')}','general@example.test','general');
    insert into public.avisos(aviso_id,titulo,criterios_version,en_ultima_lista) values
      ('A','Actual','v2',1),('B','Anterior','v1',0),('C','Confidencial','v1',0),('D','Otro','v1',1);
    insert into public.avisos_confidenciales(aviso_id) values('C');`);
  const seed = async (aviso, clave, id, doc, mail, fecha, ultimo=1, extra={}) => db.query(
    `insert into public.postulaciones(aviso_id,clave,id_postulante,documento,email,nombre,apellido,fecha_postulacion,en_ultimo_csv,datos_json)
     values($1,$2,$3,$4,$5,'Ana','Prueba',$6,$7,$8::jsonb)`,
    [aviso,clave,id,doc,mail,fecha,ultimo,JSON.stringify({'Fecha Postulación':fecha,'Ciudad':'San Juan De Lurigancho.',
      'Est[1] Nivel':'Universitario','Est[1] Titulo':'Administración','Idiomas':'Inglés - Avanzado',...extra})]);
  await seed('A','DOC:123','ana-a','12-3',' ANA@example.test ','15/10/2026');
  await seed('A','MAIL:ana','ana-duplicada',null,'ana@example.test','14/10/2026');
  await seed('B','MAIL:ana','ana-b',null,'ana@example.test','2026-09-03',0);
  await seed('C','DOC:123','ana-c','123','ana@example.test','2026-10-16');
  await seed('D','DOC:999','otra','999','ana@example.test','2026-10-10');
  await seed('D','HASH:1','sin-uno',null,null,null);
  await seed('B','HASH:1','sin-dos',null,null,null);
  await db.exec(`insert into public.ranking_embeddings(aviso_id,clave,id_postulante,criterios_version,backend,score)
    values('A','DOC:123','ana-a','v1','e5',0.99),('B','MAIL:ana','ana-b','v1','e5',0.73);`);
  const user = async (n) => { await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid(n)]); };
  const history = async (aviso='A', id='ana-a') => (await db.query('select * from public.gth_historial_postulaciones($1,$2)',[aviso,id])).rows;
  const base = async (f={},pagina=1,tamano=50,resumen=true) => (await db.query('select public.gth_base_centralizada($1,$2,$3,$4) as data',[JSON.stringify(f),pagina,tamano,resumen])).rows[0].data;
  await user('1');
  assert.deepEqual((await history()).map((r)=>r.aviso_id),['C','A'], 'correo con DNI contradictorios no une las personas');
  assert.equal((await history())[1].score,null,'un puntaje de criterios antiguos no se presenta como vigente');
  assert.equal((await history('B','ana-b'))[0].aviso_id,'B','se consulta aunque ya no esté en último CSV/lista');
  assert.deepEqual(await history('A','inexistente'),[]);
  assert.equal((await history('D','sin-uno')).length,1,'sin identidad no se une por nombre ni clave hash entre avisos');
  await db.exec('reset role');
  await db.query("update public.postulaciones set email='otra@example.test' where documento='999'");
  await user('1');
  let h = await history();
  assert.deepEqual(h.map((r)=>r.aviso_id),['C','A','B'],'DNI y correo unen el historial con fechas reales');
  assert.equal(h[2].score,0.73);
  assert.equal((await db.query("select total from public.gth_resumen_postulaciones('A',array['ana-a'])")).rows[0].total,3,'deduplica dos filas de la misma persona y aviso');
  const first = await base({},1,1);
  const second = await base({},2,1);
  assert.equal(first.personas.length,1);
  assert.notEqual(first.personas[0].id,second.personas[0].id,'paginación estable por persona');
  assert.equal(first.personas[0].avisos.length,2,'base usa últimos CSV y conserva todos los avisos de la persona antes de paginar');
  assert.equal(first.personas[0].ciudad,'San Juan de Lurigancho');
  assert.equal((await base({texto:'administracion',ciudad:'San Juan de Lurigancho',idioma:'Inglés',nivelIdioma:'Avanzado'})).total,4);
  assert.equal((await base({varios:true})).total,1);
  assert.equal((await base({texto:'no existe'})).total,0);
  assert.equal((await base({},100,50)).personas.length,0);
  assert.equal((await base({},1,1,false)).opciones,null,'páginas siguientes omiten metadatos');
  await user('2');
  h=await history();
  assert.deepEqual(h.map((r)=>r.aviso_id),['A','B'],'general no recibe avisos confidenciales');
  assert.equal((await db.query("select total from public.gth_resumen_postulaciones('A',array['ana-a'])")).rows[0].total,2,'contador tampoco revela su existencia');
  assert.deepEqual(await history('C','ana-c'),[],'no se puede consultar desde una identidad oculta');
  assert.ok(!(await base()).opciones.avisos.some(([id])=>id==='C'),'filtros tampoco revelan avisos ocultos');
  await db.exec('reset role');
  await db.query("update public.gth_perfiles set avisos=array['A'] where user_id=$1",[uid('2')]);
  await user('2');
  assert.equal((await history()).length,1,'lista de permisos aplicada al historial');
  await db.exec('reset role;set role anon');
  await assert.rejects(history()); await assert.rejects(base());
  await assert.rejects(db.query('select * from gth_interno.identidades'));
  await db.exec('reset role');
  await db.exec(`insert into public.postulaciones(aviso_id,clave,id_postulante,nombre,fecha_postulacion,datos_json)
    select 'D','bulk-'||i,'bulk-'||i,'Persona '||i,'2026-01-01','{}'::jsonb from generate_series(1,4200) i; analyze;`);
  await user('1');
  const started=performance.now();
  const bulk=await base({},1,50);
  assert.equal(bulk.personas.length,50);assert.ok(bulk.total>=4200);
  console.log(`PASS: identidad, historial, recurrencia, puntajes, fechas, filtros, paginación y RLS. 4200+ filas: ${Math.round(performance.now()-started)} ms; respuesta: ${JSON.stringify(bulk).length} bytes.`);
} catch (error) { console.error(error.message); process.exitCode=1; } finally { await db.close(); }
