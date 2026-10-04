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


## Evaluador Gemini con depuración local (ETAPA-I)

En **Mejores candidatos**, `Evaluar todos los pendientes` prepara todas las postulaciones que sigan postuladas y sin puntaje, sin el límite anterior de 25. `Evaluar seleccionados` permite preparar solo una selección. No hay envíos al importar ni al abrir la vista previa.

Este flujo está preparado para **pruebas con perfiles creados por el usuario**, según la autorización recibida. No verifica por sí mismo si los datos son sintéticos ni acredita una revisión humana. Antes de usar datos reales debe revisarse la seguridad del piloto.

1. Completar, si corresponde, **Referencia del puesto o syllabus** con expectativas profesionales sin datos personales. Se guarda en el navegador. Un cambio invalida los puntajes pendientes de decisión para esa convocatoria.
2. El filtro local selecciona columnas profesionales permitidas de CSV/XLSX: puestos, experiencia, formación, habilidades, idiomas y certificaciones. No usa `rawCvText` como carga del endpoint. Identidad, contacto, domicilios, empleadores, instituciones y encabezados desconocidos quedan fuera. Elimina valores personales conocidos, detecta patrones sensibles y reduce fechas laborales/académicas a años. Perfiles sin campos estructurados, instrucciones incrustadas y tamaños excesivos quedan bloqueados y no se envían.
3. La vista previa es opcional y muestra 25 perfiles por página para mantener la interfaz ágil; esa paginación no limita la cola. Se pueden omitir campos. Cada omisión cancela la autorización general para confirmar el contenido modificado.
4. Marcar una sola confirmación: **«Ya revisé estos perfiles: son datos de prueba creados por mí y autorizo enviar todo el lote depurado a Google Gemini»**. No hace falta abrir ni marcar cada candidato. La confirmación solo vive en el modal actual y se reinicia al preparar o cerrar una cola. El filtro reduce exposición, sin garantizar anonimato universal.
5. Pulsar `Evaluar X perfiles`. La cola procesa todos los perfiles listos, aunque no se hayan abierto sus páginas. Se mantiene una petición por perfil y al menos 12 s entre inicios por pestaña, incluidos reintentos. Mantener la pestaña abierta: no es una cola persistente en el servidor. Pausar y continuar conserva la confirmación y excluye los resultados ya recibidos en esa cola. Cerrar o cambiar de convocatoria cancela la recepción en curso y evita envíos posteriores; una solicitud ya entregada al proveedor puede terminar allí. Los fallos individuales de validación de respuestas (HTTP 422, incluidos fragmentos de evidencia inexistentes) pasan a **Casos especiales · revisión de información** y el lote continúa. Los fallos de cuota, conexión o configuración detienen el lote, conservando resultados previos.

Los casos especiales se guardan por postulación en el estado local existente, con motivo, código, fecha y número de intentos con incidencia. No cambian etapa, puntaje ni requisito obligatorio. Quedan fuera de `Evaluar todos los pendientes` y de su selección automática hasta recibir una evaluación válida o nueva información que invalide el estado anterior. `Revisar perfil` abre la ficha; `Reintentar evaluación` prepara únicamente ese caso y requiere una nueva autorización. Un reintento fallido actualiza la incidencia; uno válido la elimina. La reimportación de evidencia o los cambios de criterios/referencia limpian las incidencias de postulaciones aún postuladas. Las evaluaciones parciales válidas también se conservan y no vuelven a enviarse automáticamente al reabrir el modal.

El endpoint `api/evaluate.ts` usa la misma **GEMINI_API_KEY** del chatbot. Opcional: **GEMINI_EVALUATION_MODEL** para un modelo específico de evaluación; si falta, usa GEMINI_MODEL y luego gemini-3.5-flash-lite. La clave permanece en el servidor. GET muestra únicamente configuración/modelo/limites, nunca la clave. El cliente y el servidor validan una carga con solo identificador temporal, campos profesionales y criterios/referencia. Ni el identificador temporal se incorpora al prompt de Google. No se envían nombres, IDs reales, estado completo, snapshot ni hash del original al endpoint.

Se solicita JSON con puntajes por criterio y referencias a fragmentos depurados de hasta 600 caracteres. El servidor recupera las citas originales por esas referencias; no acepta citas reformuladas por el modelo. Se exige cobertura de todos los criterios, score 0–100 o null, evidencia válida y ausencia de patrones personales. El servidor calcula el total ponderado; no acepta un total generado por el modelo. Un criterio con peso positivo sin evidencia deja el total en null. Un criterio que depende de syllabus/referencia ausente debe quedar pendiente. No se atribuye ese resultado a un motor de embeddings. Es evaluación generativa orientativa, no una escala calibrada de selección ni prueba documental.

El navegador valida que la respuesta corresponda a la solicitud y al perfil, etapa, versión, referencia y criterios vigentes antes de aplicarla. Se conserva localmente modelo, fecha, versión, hash y criterios sin evidencia, junto con puntajes y explicación. Cambios posteriores del perfil o definiciones invalidan la evaluación vigente. Solo ajustes de pesos sobre las mismas definiciones recalculan las evidencias existentes.

**Requisito obligatorio:** en la ficha, `Revisar requisito` registra estado y evidencia/fuente revisada por GTHC, con actividad local. Gemini no marca ese requisito verificado ni avanza/rechaza personas. Top-N conserva su condición de puntaje válido, etapa postulada y requisito verificado. Resultados y perfiles permanecen en almacenamiento local del navegador; no hay base de datos compartida.

**Capacidad y acceso:** el límite local del endpoint es 5 solicitudes/minuto/IP por instancia caliente (memoria, no distribuido ni autenticación), máximo 100 campos/24.000 caracteres por perfil y 20 criterios con pesos al 100 %. La cuota real de Google depende del proyecto/modelo y puede ser menor. El intervalo de la cola no garantiza capacidad ni tiempo de respuesta del proveedor. El endpoint público no tiene autenticación institucional; aplicar control de acceso/Deployment Protection antes de abrir un piloto con datos reales a otros usuarios. El servicio no registra CVs ni errores crudos de Google; revisar también las políticas/configuración de registros del hosting y del proveedor.

Verificación con datos inventados: canarios de nombre/correo/teléfono/documento/dirección/columna desconocida y entidades; inspección de la carga real del navegador y del prompt de Google mediante mocks; salida insegura, evidencia inventada, criterio faltante, respuestas antiguas, cuotas, cancelación, persistencia y verificación humana. No se evalúan los registros personales de los archivos compartidos para estas pruebas.
