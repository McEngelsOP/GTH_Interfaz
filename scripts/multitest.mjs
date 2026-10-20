// Graba y reproduce pasos en Multitest con Playwright, usando el Chrome instalado.
//  grabar:     abre Chrome con el grabador de Playwright; todo lo que hagas (clics, textos, selecciones) se va
//              escribiendo como código. Cierra la ventana cuando llegues hasta donde quieres automatizar.
//  reproducir: vuelve a ejecutar esa grabación tal cual, en una ventana visible.
// La sesión (cookies) queda en automatizacion/multitest/.sesion.json: la siguiente grabación ya entra con sesión.
// Grabaciones y sesión pueden traer contraseñas o datos de postulantes: están en .gitignore y nunca se suben.
// Uso: npm run multitest:grabar -- [nombre] [url]      (por defecto: «envio» y la URL de MULTITEST_URL)
//      npm run multitest:reproducir -- [nombre]
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const CARPETA = join('automatizacion', 'multitest');
const SESION = join(CARPETA, '.sesion.json');
const [accion, nombre = 'envio', url = process.env.MULTITEST_URL || ''] = process.argv.slice(2);
const grabacion = join(CARPETA, `${nombre}.cjs`);   // el grabador genera CommonJS (require); el repo es ESM
const correr = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' }).status ?? 1;

mkdirSync(CARPETA, { recursive: true });
if (accion === 'grabar') {
  if (existsSync(grabacion)) console.warn(`Se reemplazará la grabación ${grabacion}.`);
  const args = ['playwright', 'codegen', '--channel=chrome', '--target=javascript', '-o', grabacion, '--save-storage', SESION];
  if (existsSync(SESION)) args.push('--load-storage', SESION);
  if (url) args.push(url);
  console.log('Haz los pasos en Chrome y cierra la ventana al terminar. La grabación queda en', grabacion);
  process.exit(correr('npx', args));
} else if (accion === 'reproducir') {
  if (!existsSync(grabacion)) {
    console.error(`No existe ${grabacion}. Primero: npm run multitest:grabar -- ${nombre}`);
    process.exit(1);
  }
  process.exit(correr('node', [grabacion]));
} else {
  console.error('Uso: node scripts/multitest.mjs grabar|reproducir [nombre] [url]');
  process.exit(1);
}
