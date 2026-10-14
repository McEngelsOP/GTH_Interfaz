// Corre las pruebas e2e (Playwright) en una PC de desarrollo sin cambiar playwright.config.ts:
//  - usa el Chrome instalado si Playwright no tiene navegador propio (GTH_TEST_BROWSER_PATH);
//  - desactiva Supabase solo para las pruebas (si .env.local lo configura, la app pediría iniciar sesión);
//  - permite 1 reintento: la primera carga del servidor de pruebas puede superar el tiempo límite mientras Vite compila.
// Uso: npm run test:e2e:local [-- archivo.spec.ts u otras opciones de Playwright]
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const chromes = [
  process.env.GTH_TEST_BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const chrome = chromes.find((ruta) => existsSync(ruta));

const args = process.argv.slice(2);
if (!args.some((a) => a.startsWith('--retries'))) args.push('--retries=1');

const env = { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };
if (chrome) env.GTH_TEST_BROWSER_PATH = chrome;
else console.warn('No se encontró Chrome: se usará el navegador de Playwright (npx playwright install).');

const r = spawnSync('npx', ['playwright', 'test', ...args], { stdio: 'inherit', env, shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
