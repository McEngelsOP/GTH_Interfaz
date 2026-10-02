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
La edición comienza sin candidatos de demostración ni generadores ficticios.
Las convocatorias y criterios de referencia se mantienen en el selector.

La selección Top-N se habilita cuando hay postulaciones pendientes con puntaje
LLM y requisitos verificados; si falta algo, se explica junto al botón.
La comparación automática requiere al menos dos perfiles elegibles. Los
perfiles pendientes se pueden comparar manualmente. El selector del comparador
se ordena de A a Z según el alfabeto español, ignorando mayúsculas y tildes.
La tabla prioriza el puntaje LLM y ordena por nombre los empates y pendientes.

## Importación de perfiles

En Cargar CV seleccione uno o varios CSV o Excel `.xlsx`, revise la vista previa
y confirme **Incorporar perfiles válidos**. Los encabezados se reconocen entre
las primeras 50 filas. Se admiten CSV con coma, punto y coma, tabulación o `|`,
UTF-8 o Windows-1252, celdas entrecomilladas y texto multilínea.
Los Excel pueden incluir varias hojas; cada hoja debe tener encabezados de candidatos.
Máximo: 10 MB por archivo, 5.000 registros por lote y 200 columnas.

Se requiere nombre y al menos un documento, correo válido o ID de candidato.
Se reconocen nombre/apellido, E-Mail, teléfono, tipo/número de documento,
puesto/empresa, fuente y resumen, incluyendo `Exp[n]` y `Est[n]`. Todos los
campos poblados se conservan en el texto del perfil y en los registros de origen.
No se importan puntajes o requisitos verificados desde columnas del archivo.

Las coincidencias por documento tipificado, correo normalizado o ID externo
dentro de la misma fuente se consolidan en una ficha. Nunca se compara solo
el nombre. Los identificadores contradictorios o vinculados a varias fichas se
omiten con una advertencia. Una persona conserva una postulación por puesto;
repetir la carga no crea nuevas fichas ni reinicia etapas o decisiones.
La consolidación mantiene información distinta de experiencias/estudios y los
identificadores existentes. Si llega nueva evidencia, una postulación todavía
en Postulado vuelve a evaluación y verificación pendientes. Las decisiones ya
tomadas mantienen sus puntajes e historial.

Los perfiles se procesan en el navegador y se guardan localmente, sin enviarlos
a servicios externos. ETAPA-I usa `GTH_ESAN_STAGE_I_STATE_V2`: las personas de
la demo anterior no se cargan; se conserva su preferencia de apariencia.
OCR, conexión Bumeran, base compartida, envío de correo y calendarios requieren
integración del equipo. PDF, Word e imágenes se incorporarán con el extractor.
Las pruebas utilizan únicamente datos inventados.

## Contrato de evaluación LLM

`src/services/llmIntegration.ts` prepara una solicitud por expediente con
`applicationId`, `candidateId`, `jobPostingId`, `criteriaVersion`, `profileText`,
puesto, requisitos y criterios. El motor debe devolver las mismas identidades
y versión, `llmScore` (0–100), `explanation`, `strengths`, `evidenceSummary` y
`criteriaBreakdown` con puntaje y evidencia de cada criterio. El adaptador
rechaza resultados incompletos, ajenos, de versiones anteriores o de una etapa
ya decidida. La validación del requisito obligatorio permanece a cargo de GTH.
No hay proveedor conectado ni un botón que genere puntajes ficticios.

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
