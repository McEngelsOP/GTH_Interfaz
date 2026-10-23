import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const db = new PGlite();
const id = (n) => `${n.repeat(8)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(12)}`;
const python = spawnSync('python', ['-c', `import json\nfrom scraping.test_trayectoria import patron, HOY\nfrom scraping.trayectoria import analizar,huella\nd=patron();d['Exp[1] Descripción']='Análisis de información 🧪';print(json.dumps({'datos':d,'resultado':analizar(d,HOY),'huella':huella(d)}))`], { encoding: 'utf8' });
assert.equal(python.status, 0, python.stderr);
const fixture = JSON.parse(python.stdout);
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
    grant usage on schema auth to authenticated;
    insert into auth.users values('${id('1')}','maestro@example.test');`);
  await db.exec(readFileSync('scraping/supabase_esquema.sql', 'utf8'));
  for (const name of readdirSync('supabase/migrations').filter((p) => p.endsWith('.sql')).sort())
    await db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8'));
  await db.exec(`grant select on public.avisos,public.postulaciones to authenticated;
    insert into auth.users values('${id('2')}','general@example.test'),('${id('3')}','sinperfil@example.test');
    insert into public.gth_perfiles(user_id,email,nivel) values('${id('2')}','general@example.test','general');
    insert into public.avisos(aviso_id,titulo) values('A','Visible'),('C','Confidencial');
    insert into public.avisos_confidenciales(aviso_id) values('C');`);
  for (const aviso of ['A', 'C']) {
    await db.query(`insert into public.postulaciones(aviso_id,clave,id_postulante,datos_json) values($1,'k','persona',$2)`, [aviso, fixture.datos]);
    await db.query(`insert into public.gth_trayectoria_analisis(id,aviso_id,clave,id_postulante,huella,version,estado,fecha_referencia,vigente_hasta,detalle)
      values($1,$2,'k','persona',$3,'${fixture.resultado.version}','patron_detectado',current_date,current_date+30,$4)`, [id(aviso === 'A' ? 'a' : 'c'), aviso, fixture.huella, fixture.resultado]);
  }
  await db.query(`insert into public.gth_trayectoria_analisis(id,aviso_id,clave,huella,version,estado,fecha_referencia,detalle)
    values($1,'A','k',$2,'trayectoria-v1','patron_detectado',current_date+1,$3)`, [id('d'), fixture.huella, fixture.resultado]);
  await db.query(`insert into public.gth_trayectoria_revisiones(analisis_id,estado,texto) values($1,'revisado','Revisión histórica v1')`, [id('d')]);
  const upgrade = readdirSync('supabase/migrations').find((n) => n.endsWith('_trayectoria_fechas_v2.sql'));
  await db.exec(readFileSync(`supabase/migrations/${upgrade}`, 'utf8'));
  assert.equal((await db.query('select count(*)::int n from public.gth_trayectoria_revisiones')).rows[0].n, 1, 'la actualización conserva las revisiones previas');
  const hash = await db.query('select public.gth_trayectoria_huella($1) h', [fixture.datos]);
  assert.equal(hash.rows[0].h, fixture.huella, 'Python y Postgres comparten huella Unicode');
  const user = async (n) => { await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id(n)]); };
  const resumen = async (aviso = 'A', desde = 0) => (await db.query('select * from public.gth_trayectoria_resumen($1,$2)', [aviso, desde])).rows;
  const revisar = (analysis = id('a')) => db.query(`insert into public.gth_trayectoria_revisiones(analisis_id,estado,texto) values($1,'justificado','Contrato revisado por el equipo') returning autor`, [analysis]);
  await user('2');
  assert.equal((await resumen())[0].estado, 'patron_detectado');
  await assert.rejects(revisar(id('d')), 'v1 queda solo como historial y no admite nuevas revisiones');
  assert.deepEqual(await resumen('C'), [], 'no filtra confidenciales');
  assert.equal((await revisar()).rows[0].autor, id('2'), 'autor real de la sesión');
  assert.equal((await resumen())[0].revision, 'justificado');
  await assert.rejects(revisar(id('c')), 'no revisa análisis ocultos');
  await assert.rejects(db.query(`insert into public.gth_trayectoria_revisiones(analisis_id,estado,texto,autor) values($1,'revisado','Intento de suplantación',$2)`, [id('a'), id('1')]));
  await assert.rejects(db.query(`insert into public.gth_trayectoria_revisiones(analisis_id,estado,texto,creada_at) values($1,'revisado','Fecha manipulada',now()-interval '1 year')`, [id('a')]));
  await assert.rejects(db.query(`insert into public.gth_trayectoria_analisis(aviso_id,clave,huella,version,estado,fecha_referencia,detalle) values('A','k',$1,'falsa','sin_patron',current_date,'{}')`, [fixture.huella]), 'no fabrica resultados');
  await assert.rejects(db.query("update public.gth_trayectoria_revisiones set texto='alterado'"));
  await assert.rejects(db.query('delete from public.gth_trayectoria_analisis'));
  await assert.rejects(db.query(`insert into public.gth_trayectoria_revisiones(analisis_id,estado,texto) values($1,'revisado','x')`, [id('a')]));
  await db.exec('reset role');
  await db.query(`update public.postulaciones set datos_json=datos_json || '{"Teléfono celular":"000000000"}' where aviso_id='A'`);
  await user('2');
  assert.equal((await resumen())[0].estado, 'patron_detectado', 'contacto no invalida análisis laboral');
  await db.exec('reset role');
  await db.query(`update public.postulaciones set datos_json=datos_json || '{"Exp[2] Empresa":"Empresa nueva"}' where aviso_id='A'`);
  await user('2');
  assert.equal((await resumen())[0].estado, 'desactualizado');
  await assert.rejects(revisar(), 'no aprueba evidencia desactualizada');
  await db.exec('reset role');
  await db.query(`update public.postulaciones set datos_json=$1 where aviso_id='A'`, [fixture.datos]);
  await db.query(`insert into public.gth_trayectoria_analisis(aviso_id,clave,huella,version,estado,fecha_referencia,detalle)
    values('A','k',md5('otra fuente'),'${fixture.resultado.version}','sin_patron',current_date+1,'{}')`);
  await user('2');
  assert.equal((await resumen())[0].estado, 'patron_detectado', 'reutiliza la fuente compatible aunque exista otro snapshot más reciente');
  await db.exec('reset role');
  await db.query(`update public.gth_trayectoria_analisis set vigente_hasta=current_date-1 where aviso_id='A'`);
  await user('2');
  assert.equal((await resumen())[0].estado, 'desactualizado', 'vigencia temporal');
  await assert.rejects(revisar());
  await db.exec('reset role');
  await db.exec(`insert into public.postulaciones(aviso_id,clave,id_postulante,datos_json)
    select 'A','bulk-'||i,'bulk-'||lpad(i::text,4,'0'),'{}' from generate_series(1,1200) i;`);
  await user('2');
  const start = performance.now();
  assert.equal((await resumen('A')).length, 500);
  assert.equal((await resumen('A', 500)).length, 500);
  assert.equal((await resumen('A', 1000)).length, 201);
  assert.ok((await resumen('A')).every((r) => r.estado === 'pendiente'));
  console.log(`PASS: migraciones completas, huella Python/SQL, RLS, revisión inmutable, fuente actualizada, vigencia y paginación (1201 perfiles, ${Math.round(performance.now() - start)} ms).`);
  await user('3');
  assert.deepEqual(await resumen(), []);
  await db.exec('reset role; set role anon');
  await assert.rejects(resumen());
  await assert.rejects(db.query('select * from public.gth_trayectoria_analisis'));
} finally { await db.close(); }
