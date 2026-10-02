# TalentAI · GTHC ESAN — ETAPA I

Rama `ETAPA-I`, derivada de `main` después de consolidar el desarrollo de GEM.
La evaluación activa es únicamente LLM; no hay selector ni puntaje de ML.

## Alcance

| Grupo | Secciones |
|---|---|
| Candidatos | Cargar CV, Mejores candidatos, Comparador |
| Seguimiento | Avance de candidatos |

La convocatoria se selecciona en el encabezado. Las otras rutas regresan a
Mejores candidatos. Las pantallas de configuración, puestos, banco, auditoría
y resultados no forman parte de esta edición. El Asistente GTH está disponible
en el encabezado, conectado a Google Gemini cuando se configura su clave.

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

La importación procesa los perfiles en el navegador y los guarda localmente.
ETAPA-I usa `GTH_ESAN_STAGE_I_STATE_V2`: las personas de
la demo anterior no se cargan; se conserva su preferencia de apariencia.
OCR, conexión Bumeran, base compartida, envío de correo y calendarios requieren
integración del equipo. PDF, Word e imágenes se incorporarán con el extractor.
Las pruebas utilizan únicamente datos inventados.

## Chatbot con Google Gemini

1. Cree o copie una clave en [Google AI Studio](https://aistudio.google.com/app/apikey).
2. En Vercel abra el proyecto **etapa_1 → Settings → Environment Variables**.
3. Cree **GEMINI_API_KEY**, pegue su clave en Value, seleccione **Production** y guarde.
4. Opcionalmente cree **GEMINI_MODEL** con el ID de un modelo de texto disponible
   en su proyecto. Por defecto se usa `gemini-3.5-flash-lite`.
5. En **Deployments**, haga **Redeploy** de la versión de la rama **ETAPA-I**.
   Los cambios de variables se aplican a nuevos despliegues.
6. En la web abra **Asistente GTH → Actualizar estado → Probar conexión**.

La clave se lee solo en `api/chat.ts`/`server/geminiChat.ts`, nunca en el
navegador, localStorage o el bundle. No use un nombre con prefijo `VITE_`
para la clave. La función `/api/chat` de Vercel usa `generateContent` vía REST;
no requiere un SDK adicional. GET informa si existe configuración; POST
prueba la conexión o responde consultas. Configurar una clave no implica que
Google la acepte: **Probar conexión** realiza una solicitud real mínima.

Al enviar una pregunta se comparten con Google la conversación y el contexto
de la convocatoria: criterios, métricas, requisitos y etapas agregadas. Los
nombres, etapas y puntajes se incluyen únicamente al marcar la opción del
chatbot (máximo 50 perfiles, ordenados por puntaje y nombre). No se incluyen
CV completos, documentos, correos, teléfonos ni registros originales. Cambiar
la opción de compartir o la convocatoria limpia el historial. El historial
del chat permanece solo durante la sesión y no se guarda en el estado local.
El chatbot consulta registros existentes; no cambia estados ni calcula el
scoring oficial. El motor de evaluación sigue siendo una integración separada.

La función valida tamaño y campos permitidos, limita la longitud de consultas
y respuestas, corta llamadas a los 40 segundos y aplica un límite de 8
consultas/minuto por IP **en cada instancia**. Este límite es de mejor esfuerzo
y se reinicia en instancias nuevas; no reemplaza autenticación ni una cuota
centralizada. Para el piloto privado puede usarse Deployment Protection de
Vercel; las cuotas de Gemini se administran en el proyecto de Google.
Errores de clave, permisos, modelo, cuota y tiempo de espera se muestran en el chat
sin devolver respuestas crudas del proveedor ni secretos.

`npm run dev` sirve la interfaz; para probar la función localmente use
`vercel dev` con variables de Development, o la versión desplegada. Las pruebas
de navegador sustituyen únicamente `/api/chat` por respuestas inventadas; las
pruebas del servidor interceptan las llamadas al proveedor.

## Contrato de evaluación LLM

`src/services/llmIntegration.ts` prepara una solicitud por expediente con
`applicationId`, `candidateId`, `jobPostingId`, `criteriaVersion`, `profileText`,
puesto, requisitos y criterios. El motor debe devolver las mismas identidades
y versión, `llmScore` (0–100), `explanation`, `strengths`, `evidenceSummary` y
`criteriaBreakdown` con puntaje y evidencia de cada criterio. El adaptador
rechaza resultados incompletos, ajenos, de versiones anteriores o de una etapa
ya decidida. La validación del requisito obligatorio permanece a cargo de GTH.
El chatbot sí dispone de conexión configurable a Gemini. El contrato de
evaluación aún no tiene un motor conectado ni genera puntajes ficticios.

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
