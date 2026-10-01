# TalentAI | GTHC - ESAN

Prototipo de interfaz para convocatorias, evaluacion explicable y seguimiento de postulaciones. **No es todavia un sistema de reclutamiento conectado a servicios reales.**

## Actualización Codex-II

- Diseño con pasos visibles: revisar, comparar y seguir el avance. Lenguaje sencillo y adaptable a pantallas pequeñas.
- Top-N editable, selección manual, comparación sin un máximo fijo de cinco y revisión antes de decidir.
- Ranking ordenable por ML o LLM. Los resultados se conservan y exportan por separado. El campo histórico `score` no se utiliza para ordenar, decidir ni mostrar un promedio entre métodos.
- Mensajes personalizados de avance/no avance guardados como **borradores**, con decisión explícita de GTH. Los perfiles pendientes no reciben una decisión automática.
- Descargas centralizadas en Banco de Talento: candidatos de una convocatoria, candidatos guardados y catálogo de puestos compatible con el CSV de ejemplo.
- Detección local del formato de archivos y vista previa de catálogos CSV. PDF, Word e imágenes quedan pendientes de lectura y conversión cuando se conecte el OCR.
- Se retiran el banner flotante, la guía STAR y las pantallas de brechas.

Ver [docs/codex-ii.md](docs/codex-ii.md) para el recorrido de revisión y los pendientes de integración.

## Estado actual

- HTML, CSS y JavaScript con modulos ES; no necesita compilacion.
- Creacion de convocatorias, biblioteca de perfiles y selector de contexto.
- Ranking compacto de 52 px, densidad comoda de 66 px, paginacion y filas virtualizadas.
- Comparación de la cantidad de perfiles que elija GTH; expediente con puntajes independientes, evidencias, CV e historial.
- Criterios reponderables sobre evidencias ficticias, con version e historial anterior.
- Etapas compartidas entre ranking, comparador, expediente y Kanban; banco de talento paginado.
- Indicadores calculados a partir de los registros disponibles, sin extrapolar datos de ejemplo.
- Lotes sinteticos de 25, 100 o 500 perfiles; limite demostrativo de 1000 por convocatoria.
- Navegacion por URL con convocatoria, vista, candidato y pestana; soporte para atras/adelante.

Los datos iniciales contienen 18 convocatorias, pero solo tres tienen postulaciones de ejemplo (10 en total). Las demas empiezan vacias. No se reutilizan automaticamente candidatos de otros puestos.

## Limites importantes

No hay autenticacion real, OCR, motor ML/LLM, correo, almacenamiento de documentos ni auditoria de servidor. El copiloto responde con logica de demostracion. El único perfil de interfaz es Equipo de GTHC. No constituye autenticación ni una barrera de seguridad.

La demo guarda datos ficticios en `localStorage` (`talentai.demo.workspace.v2`) y migra convocatorias de `talentai.demo.jobs.v1`. No introducir CVs ni datos personales reales. Borrar ambas claves reinicia la demo. Si el navegador bloquea el almacenamiento, los cambios duran solo la sesion y se muestra un aviso.

## Ejecucion

Desde la carpeta del repositorio:

```bash
git switch Codex-II
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

La rama de esta actualización es `Codex-II`, creada desde `codex/convocatorias-demo-flow` (8e83e69). El despliegue de produccion asociado a `main` no cambia hasta integrar la rama o cambiar expresamente su configuracion. Una Preview de la rama permite revisar antes de hacerlo. No se necesita un backend para alojar esta demo estatica.

## Integracion futura

Consultar [docs/integracion.md](docs/integracion.md). El cliente de lectura `js/services/apiClient.js` es una base probada, **todavia no esta conectado al arranque de la aplicacion**. No basta con sustituir `mockData.js` por datos reales: la autoridad del ranking, permisos, transiciones y auditoria debe pasar al servidor.
