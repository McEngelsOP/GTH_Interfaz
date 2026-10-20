/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// En localhost, /api/usuarios corre la misma función que en Vercel (api/usuarios.ts) con las claves de .env.local.
function apiUsuariosLocal(): Plugin {
  return {
    name: 'api-usuarios-local',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''));
      server.middlewares.use('/api/usuarios', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/usuarios.ts');
        await handler(req, res);
      });
    },
  };
}

// Solo en localhost: «Enviar Multitest» corre scripts/multitest-envio.mjs (Playwright con el Chrome de esta PC) y
// responde al terminar con el resultado de cada candidato. Solo atiende a esta misma PC (Vite también escucha en la red).
function apiMultitestLocal(): Plugin {
  const CAMPOS = ['id', 'proceso', 'dni', 'edad', 'genero', 'nombres', 'apellidos', 'correo'];
  let enCurso = false;
  return {
    name: 'api-multitest-local',
    configureServer(server) {
      server.middlewares.use('/api/multitest', (req, res) => {
        const responder = (status: number, body: object) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
        if (req.method !== 'POST') return responder(405, { error: 'Método no permitido' });
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')) return responder(403, { error: 'Solo desde esta PC' });
        if (enCurso) return responder(409, { error: 'Ya hay un envío a Multitest en curso. Espera a que termine.' });
        let cuerpo = '';
        req.on('data', (parte) => { cuerpo += parte; });
        req.on('end', () => {
          let registros: Record<string, string>[];
          try { registros = JSON.parse(cuerpo).registros; } catch { return responder(400, { error: 'Solicitud inválida' }); }
          const valido = Array.isArray(registros) && registros.length > 0 && registros.length <= 100 && registros.every((r) =>
            r && CAMPOS.every((c) => typeof r[c] === 'string' && r[c].length <= 200) && r.id && r.proceso && r.nombres && r.apellidos && r.correo);
          if (!valido) return responder(400, { error: 'Revisa los datos de los candidatos (proceso, nombre, apellido y correo).' });
          const carpeta = path.join('automatizacion', 'multitest');
          fs.mkdirSync(carpeta, { recursive: true });
          const archivo = path.join(carpeta, 'registros.json');
          const salida = path.join(carpeta, 'resultados.json');
          fs.writeFileSync(archivo, JSON.stringify({ registros: registros.map((r) => Object.fromEntries(CAMPOS.map((c) => [c, r[c]]))) }));
          fs.rmSync(salida, { force: true });
          const log = fs.openSync(path.join(carpeta, 'ultima-corrida.log'), 'w');
          enCurso = true;
          const hijo = spawn(process.execPath, ['scripts/multitest-envio.mjs', archivo, salida], { stdio: ['ignore', log, log] });
          hijo.on('close', () => {
            enCurso = false;
            fs.closeSync(log);
            try { responder(200, JSON.parse(fs.readFileSync(salida, 'utf8'))); }
            catch { responder(500, { error: 'La automatización se detuvo antes de terminar. Revisa automatizacion/multitest/ultima-corrida.log.' }); }
          });
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiUsuariosLocal(), apiMultitestLocal()],
  server: {
    port: 5173,
    host: true,
    // Los datos del scraper (CVs, CSV, perfil de Chrome) cambian mientras corre y no son parte de la web
    watch: { ignored: ['**/scraping/**', '**/matching/**', '**/_insumos/**'] },
    // Servicio local de matching por embeddings: python -m matching.embeddings.server
    proxy: {
      '/api/embeddings': 'http://127.0.0.1:8001'
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['legacy-vanilla/**', 'node_modules/**']
  }
});
