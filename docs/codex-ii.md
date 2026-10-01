# Interfaz GTH · Codex-II

## Qué se puede revisar

1. Abrir una convocatoria y entrar en «Revisar candidatos».
2. Cambiar la cantidad de perfiles, escoger ML o LLM y pulsar «Elegir los mejores».
3. Ajustar la selección con las casillas. «Ver seleccionados» filtra la tabla; «Limpiar» retira la selección.
4. Pulsar «Comparar seleccionados». La comparación permite tantos perfiles como se elijan, con desplazamiento horizontal.
5. Pulsar «Pasar a seleccionados», revisar los nombres y editar los mensajes. La opción de que otros perfiles evaluados no avancen se marca expresamente. Quienes tienen datos pendientes conservan su estado.
6. Confirmar y revisar «Avance de candidatos». Los mensajes aparecen como borradores en el historial del perfil.
7. Entrar en Banco de Talento, elegir todos los candidatos, los mejores o los seleccionados, y descargar CSV. La comparación usa esos mismos perfiles y el mismo puesto.
8. Descargar el catálogo de puestos desde «También puedes descargar los perfiles de puestos». Conserva ID, Perfil, Categoría y Requisito, como el CSV proporcionado.
9. Abrir «Carga». Reconoce el formato de archivos y muestra una vista previa de catálogos CSV. La extracción de contenido de PDF, Word e imágenes queda pendiente de integración. Los lotes ficticios permiten probar listas grandes.

## Decisiones de diseño

- Navegación y acciones con palabras cotidianas: «Avance de candidatos», «Carga», «Historial de decisiones», «Perfiles de puestos» y «Criterios de evaluación».
- La selección y sus acciones se muestran junto al ranking. Se elimina la barra flotante de comparación.
- Dos puntajes, sin promediarlos. GTH elige qué método ordena la lista. Cambiar de método conserva la selección manual hasta que se vuelva a elegir.
- La explicación existente resume evidencias de ejemplo; no representa una explicación real obtenida de cada modelo. Los motores y sus justificaciones se conectarán después.
- Cada método recalcula sus criterios por separado dentro de la simulación. Si no tiene evidencias o criterios activos, queda pendiente.
- Un único espacio de trabajo para el equipo de GTHC. La decisión final se registra como decisión humana.

Las acciones por lote de [Greenhouse](https://support.greenhouse.io/hc/en-us/articles/360028064592-Move-candidates-to-another-stage-in-bulk) y la organización por etapas de [Workable](https://resources.workable.com/hiring-with-workable/how-to-manage-recruiting-pipeline) se revisaron como referencias para organizar selección y seguimiento. El diseño se adapta a los acuerdos del equipo GTH.

## Pendientes para conectar el sistema

- Tipo de aplicación, despliegue y servicios de Azure: definir con el profesor.
- Cantidad de postulantes y formato final de comparación: consultar a GTH. La demo no fija un máximo de cinco o cien para elegir perfiles.
- OCR y conversión de documentos a datos estructurados: responsabilidad del módulo de lectura.
- Modelos ML y LLM, métricas y explicaciones: responsabilidad del matching.
- Datos reales, permisos, almacenamiento, auditoría de servidor y servicio de mensajes: posteriores a esta interfaz.

## Verificación

`node --test tests/*.test.mjs` cubre orden independiente, Top-N, decisiones, borradores, persistencia, CSV y los flujos anteriores. `tests/browser-smoke.mjs` conserva el recorrido de navegador del proyecto, actualizado a la nueva comparación y etiquetas. `tests/browser-codex-ii.mjs` revisa las acciones nuevas y descargas. Se necesitan Playwright y Chromium para esos dos recorridos.

Los datos son de demostración. El límite de 1000 perfiles en los lotes ficticios corresponde al generador local para pruebas; no define la cantidad de postulantes del sistema final.
