/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// En localhost, /api/usuarios y /api/correo corren la misma función que en Vercel (api/*.ts) con las claves de .env.local.
function apiUsuariosLocal(): Plugin {
  return {
    name: 'api-usuarios-local',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''));
      for (const ruta of ['/api/usuarios', '/api/correo']) {
        server.middlewares.use(ruta, async (req, res) => {
          const { default: handler } = await server.ssrLoadModule(`${ruta}.ts`);
          await handler(req, res);
        });
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiUsuariosLocal()],
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
