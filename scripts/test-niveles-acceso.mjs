import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('..', import.meta.url));
const db = new PGlite();
const id = (n) => `${n.repeat(8)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(12)}`;
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
grant usage on schema auth to authenticated; grant usage on schema public to authenticated;
insert into auth.users values('${id('1')}','maestra@x.pe');`);
await db.exec(readFileSync(root + '/scraping/supabase_esquema.sql', 'utf8'));
for (const m of ['20261015230000_comentarios_internos', '20261016001000_avance_compartido', '20261016004500_retroceso_desde_contratado', '20261017120000_niveles_acceso', '20261020120000_agradecimiento_preseleccionados', '20261020180000_multitest_servidor'])
  await db.exec(readFileSync(`${root}/supabase/migrations/${m}.sql`, 'utf8'));
// Usuario 1 existía antes de la migración (queda maestro). Después se crean 2 (general) y 3 (general con lista).
await db.exec(`insert into auth.users values('${id('2')}','general@x.pe'),('${id('3')}','lista@x.pe'),('${id('4')}','sinperfil@x.pe');
insert into public.gth_perfiles(user_id,email,nivel,avisos) values('${id('2')}','general@x.pe','general',null),('${id('3')}','lista@x.pe','general','{B}');
insert into public.gth_colaboradores values('${id('1')}'),('${id('2')}'),('${id('3')}'),('${id('4')}');
insert into public.avisos(aviso_id,titulo) values('A','Uno'),('B','Dos'),('C','Tres');
insert into public.postulaciones(aviso_id,clave,id_postulante,datos_json) values('A','k1','p1','{}'),('B','k2','p2','{}'),('C','k3','p3','{}');
grant select on public.avisos, public.postulaciones, public.cvs to authenticated; -- en Supabase vienen por defecto`);
const user = (n) => db.query("select set_config('request.jwt.claim.sub',$1,false)", [id(n)]);
const avisos = async () => (await db.query('select aviso_id from public.avisos order by 1')).rows.map((r) => r.aviso_id).join('');
await db.exec('set role authenticated');

await user('1');
assert.equal((await db.query('select nivel from public.gth_perfiles where user_id=auth.uid()')).rows[0].nivel, 'maestro', 'usuario previo queda maestro');
await db.query("insert into public.avisos_confidenciales(aviso_id) values('C')");
assert.equal(await avisos(), 'ABC', 'maestro ve todo, también confidenciales');
assert.equal((await db.query('select * from public.gth_perfiles')).rows.length, 3, 'maestro ve todos los perfiles');
await assert.rejects(db.query("update public.gth_perfiles set nivel='general' where user_id=auth.uid()"), 'no se quita su propio nivel');

await user('2');
assert.equal(await avisos(), 'AB', 'general no ve confidenciales');
assert.equal((await db.query("select * from public.postulaciones where aviso_id='C'")).rows.length, 0, 'ni sus postulantes');
assert.equal((await db.query('select * from public.v_base_postulantes')).rows.map((r) => r.aviso_id).sort().join(''), 'AB', 'base centralizada filtrada');
assert.equal((await db.query('select * from public.avisos_confidenciales')).rows.length, 0, 'no ve la lista de confidenciales');
await assert.rejects(db.query("insert into public.avisos_confidenciales(aviso_id) values('A')"), 'general no marca confidenciales');
assert.equal((await db.query("update public.gth_perfiles set nivel='maestro' where user_id=auth.uid() returning 1")).rows.length, 0, 'general no se sube de nivel');
assert.equal((await db.query('select * from public.gth_perfiles')).rows.length, 1, 'general solo ve su perfil');
await assert.rejects(db.query("insert into public.comentarios_internos(aviso_id,id_postulante,texto) values('C','p3','x')"), 'no comenta en confidencial');
await db.query("insert into public.comentarios_internos(aviso_id,id_postulante,texto) values('A','p1','ok')");
await assert.rejects(db.query(`select public.gth_iniciar_avance('C','[{"id_postulante":"p3","etapa":"postulado"}]'::jsonb)`), 'no inicia avance en confidencial');
assert.equal((await db.query('select debe_cambiar_clave from public.gth_perfiles where user_id=auth.uid()')).rows[0].debe_cambiar_clave, true);
await db.query('select public.gth_clave_cambiada()');
// Cola de envíos a Multitest: el general pide envíos de sus avisos visibles y solo ve los suyos; lee el latido
const pedido = (aviso) => db.query("insert into public.multitest_envios(aviso_id,registros) values($1,'[]'::jsonb) returning id", [aviso]);
await pedido('A');
await assert.rejects(pedido('C'), 'no pide envíos en confidencial');
await assert.rejects(db.query("insert into public.multitest_envios(aviso_id,registros,estado) values('A','[]'::jsonb,'ok')"), 'solo pedidos pendientes');
assert.equal((await db.query('select * from public.multitest_envios')).rows.length, 1, 've su pedido');
await assert.rejects(db.query("update public.multitest_envios set estado='ok'"), 'no cierra pedidos (lo hace el servidor)');
assert.equal((await db.query('select * from public.servidor_latido')).rows.length, 0, 'lee el latido (vacío)');
await assert.rejects(db.query("insert into public.servidor_latido(servicio) values('multitest')"), 'no finge el latido');
assert.equal((await db.query('select debe_cambiar_clave from public.gth_perfiles where user_id=auth.uid()')).rows[0].debe_cambiar_clave, false);

await user('3');
assert.equal(await avisos(), 'B', 'general con lista solo ve sus avisos');
assert.equal((await db.query('select * from public.multitest_envios')).rows.length, 0, 'no ve pedidos ajenos');
await user('4');
assert.equal(await avisos(), '', 'sin perfil no ve nada');

await user('1');
await db.query("delete from public.avisos_confidenciales where aviso_id='C'");
await user('2');
assert.equal(await avisos(), 'ABC', 'al desmarcar vuelve a ser visible');
await db.exec('reset role; set role anon;');
await assert.rejects(db.query('select * from public.gth_perfiles'));
await assert.rejects(db.query('select * from public.multitest_envios'));
console.log('PASS: niveles de acceso — maestro, general, lista de avisos, confidenciales, base centralizada y escrituras.');
await db.close();
