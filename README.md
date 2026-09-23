# TalentAI | GTHC - ESAN

Prototipo de interfaz para convocatorias, evaluacion explicable y seguimiento de postulaciones. **No es todavia un sistema de reclutamiento conectado a servicios reales.**

## Estado actual

- HTML, CSS y JavaScript con modulos ES; no necesita compilacion.
- Creacion de convocatorias, biblioteca de perfiles y selector de contexto.
- Ranking compacto de 52 px, densidad comoda de 66 px, paginacion y filas virtualizadas.
- Comparador explicito de hasta cinco postulaciones y expediente con evidencias, brechas, CV e historial.
- Criterios reponderables sobre evidencias ficticias, con version e historial anterior.
- Etapas compartidas entre ranking, comparador, expediente y Kanban; banco de talento paginado.
- Indicadores calculados a partir de los registros disponibles, sin extrapolar datos de ejemplo.
- Lotes sinteticos de 25, 100 o 500 perfiles; limite demostrativo de 1000 por convocatoria.
- Navegacion por URL con convocatoria, vista, candidato y pestana; soporte para atras/adelante.

Los datos iniciales contienen 18 convocatorias, pero solo tres tienen postulaciones de ejemplo (10 en total). Las demas empiezan vacias. No se reutilizan automaticamente candidatos de otros puestos.

## Limites importantes

No hay autenticacion real, OCR, motor ML/LLM, correo, almacenamiento de documentos ni auditoria de servidor. El copiloto responde con logica de demostracion. Los roles son controles de interfaz, no una barrera de seguridad.

La demo guarda datos ficticios en `localStorage` (`talentai.demo.workspace.v2`) y migra convocatorias de `talentai.demo.jobs.v1`. No introducir CVs ni datos personales reales. Borrar ambas claves reinicia la demo. Si el navegador bloquea el almacenamiento, los cambios duran solo la sesion y se muestra un aviso.

## Ejecucion

Desde la carpeta del repositorio:

```bash
git switch codex/convocatorias-demo-flow
python -m http.server 8080
```

Abrir `http://localhost:8080`. No abrir `index.html` con `file://`: los modulos necesitan un servidor HTTP.

## Verificacion

Con Node.js 22 o posterior:

```bash
node --test tests/*.test.mjs
```

El recorrido opcional `tests/browser-smoke.mjs` usa Playwright y un servidor local en el puerto 4173. Con Playwright y Chromium instalados:

```bash
python -m http.server 4173
# En otra terminal:
node tests/browser-smoke.mjs
```

Variables opcionales: `TEST_URL`, `SCREENSHOT_DIR`, `PLAYWRIGHT_MODULE` (ruta al modulo instalado) y `CHROMIUM_MODULE` (adaptador opcional de Chromium). El script usa un contexto de navegador aislado y solo datos ficticios.

## Publicacion

La rama de trabajo es `codex/convocatorias-demo-flow`, con los cambios propuestos en el PR #2. El despliegue de produccion asociado a `main` no cambia hasta integrar la rama o cambiar expresamente su configuracion. Una Preview de la rama permite revisar antes de hacerlo. No se necesita un backend para alojar esta demo estatica.

## Integracion futura

Consultar [docs/integracion.md](docs/integracion.md). El cliente de lectura `js/services/apiClient.js` es una base probada, **todavia no esta conectado al arranque de la aplicacion**. No basta con sustituir `mockData.js` por datos reales: la autoridad del ranking, permisos, transiciones y auditoria debe pasar al servidor.
