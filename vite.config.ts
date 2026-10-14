/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

