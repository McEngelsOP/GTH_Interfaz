# TalentAI · GTHC ESAN — ETAPA I

Rama `ETAPA-I`, derivada de `main` después de consolidar el desarrollo de GEM.
La evaluación activa es únicamente LLM; no hay selector ni puntaje de ML.

## Alcance

| Grupo | Secciones |
|---|---|
| Candidatos | Cargar CV, Mejores candidatos, Comparador |
| Seguimiento | Avance de candidatos |

La convocatoria se selecciona en el encabezado. Las otras rutas regresan a
Mejores candidatos. El asistente y las pantallas de configuración, puestos,
banco, auditoría y resultados no forman parte de esta edición.

Se conservan fichas, Top-N, comparaciones, decisiones confirmadas, borradores
de correo, descargas CSV, avances de etapa, persistencia y los temas de GEM.
Los datos de demostración y el generador de lotes son locales. OCR, portales,
proveedor LLM, envío de correo y calendarios requieren integración real.

## Desarrollo y validación

```bash
git checkout ETAPA-I
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`src/config/edition.ts` limita navegación y accesos a esta etapa. `src/App.tsx`
importa y renderiza únicamente las cuatro vistas. Los datos guardados de GEM
se normalizan a LLM conservando personas, postulaciones, evidencias y etapas.
Las decisiones históricas conservan el método previo en sus metadatos.
