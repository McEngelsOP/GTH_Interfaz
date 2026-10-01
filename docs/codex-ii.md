# Interfaz GTH · Codex-II

## Qué se puede revisar

1. Abrir una convocatoria y entrar en «Revisar candidatos».
2. Cambiar la cantidad de perfiles, escoger ML o LLM y pulsar «Elegir los mejores».
3. Ajustar la selección con las casillas. «Ver marcados» filtra la tabla; «Limpiar» retira solo las marcas y no cambia la etapa.
4. Pulsar «Comparar». La comparación permite tantos perfiles como se elijan, con desplazamiento horizontal.
5. Pulsar «Decidir quién avanza», revisar los nombres y editar los mensajes. La opción de que otros perfiles evaluados no avancen se marca expresamente. Quienes tienen datos pendientes conservan su estado.
6. Confirmar y revisar «Avance de candidatos». Quienes avanzan pasan a Preseleccionado, dejan los mejores pendientes y siguen en «En proceso». Las marcas se limpian; el Top-N se repone con otros perfiles pendientes. Los mensajes aparecen como borradores en la ficha.
7. Entrar en Banco de Talento, elegir todos los candidatos, los mejores o los seleccionados, y descargar CSV. La comparación usa esos mismos perfiles y el mismo puesto.
8. Descargar el catálogo de puestos desde «También puedes descargar los perfiles de puestos». Conserva ID, Perfil, Categoría y Requisito, como el CSV proporcionado.
9. Abrir «Agregar archivos». Reconoce el formato de archivos y muestra una vista previa de catálogos CSV. La extracción de contenido de PDF, Word e imágenes queda pendiente de integración. Los lotes ficticios permiten probar listas grandes.

10. Liberar una postulación desde la tabla o el expediente. Sale de «En proceso», deja de ocupar una posición y se recalculan los mejores y los indicadores. «No continúan» permite consultar el perfil, que también se conserva en el banco.
11. Abrir un perfil y pulsar «Responder por correo». Completar destinatario, copias opcionales, asunto y mensaje; elegir una plantilla o escribir el texto, revisar la vista previa y guardar el borrador. Español e inglés tienen plantillas editables. No se inventa el correo cuando falta.
12. Añadir una nota o agendar una entrevista desde la ficha. «Ver actividad» reúne borrador, entrevistas e historial. Una entrevista registrada no cambia la etapa ni envía una invitación.
13. Abrir «Ajustes generales», elegir Claro, Oscuro o Según mi equipo y opcionalmente reducir animaciones. La preferencia permanece al recargar. Se respeta también la preferencia de movimiento del dispositivo.
14. En Banco de Talento, revisar «Los mejores perfiles de esta descarga» y descargar la comparativa CSV con puesto, orden, etapa, fortalezas y criterios. Solo considera los perfiles activos y verificados incluidos en la descarga elegida.

## Decisiones de diseño

- Navegación y acciones con palabras cotidianas: «Avance de candidatos», «Agregar archivos», «Historial de decisiones», «Perfiles de puestos» y «Criterios de evaluación».
- La selección y sus acciones se muestran junto al ranking. Se elimina la barra flotante de comparación.
- Dos puntajes, sin promediarlos. GTH elige qué método ordena la lista. Cambiar de método conserva la selección manual hasta que se vuelva a elegir.
- La explicación existente resume evidencias de ejemplo; no representa una explicación real obtenida de cada modelo. Los motores y sus justificaciones se conectarán después.
- Cada método recalcula sus criterios por separado dentro de la simulación. Si no tiene evidencias o criterios activos, queda pendiente.
- Un único espacio de trabajo para el equipo de GTHC. La decisión final se registra como decisión humana.
- Una persona puede tener varias postulaciones. Solo se relacionan mediante su ID estable de persona, nunca por coincidencia de nombre. Avanzar o liberar una no modifica las demás. La ficha muestra las otras postulaciones registradas.
- Paleta cálida con rojo ESAN en acciones principales y detalles de navegación. El modo oscuro cubre también fichas, formularios, tablas y ventanas emergentes. Iconos con texto y transiciones de 130–220 ms.

Las acciones por lote de [Greenhouse](https://support.greenhouse.io/hc/en-us/articles/360028064592-Move-candidates-to-another-stage-in-bulk) y la organización por etapas de [Workable](https://resources.workable.com/hiring-with-workable/how-to-manage-recruiting-pipeline) se revisaron como referencias para organizar selección y seguimiento. El diseño se adapta a los acuerdos del equipo GTH.

La segunda revisión toma de [Workable](https://help.workable.com/hc/en-us/articles/115012857047-Candidate-profile-in-pipeline-view-overview) la separación por estado y las acciones agrupadas; de [Greenhouse](https://www.greenhouse.com/blog/why-we-redesigned-the-candidate-profile-in-greenhouse), la jerarquía entre información y acciones del perfil; y de [Ashby](https://docs.ashbyhq.com/candidate-reviews), las acciones sobre una selección explícita. La adaptación visual usa una barra lateral clara, superficies neutras, color institucional moderado, estados con texto, puntajes separados y requisitos con conteos para no depender únicamente del color.

La revisión actual incorpora la ficha y comunicación de [Workable](https://help.workable.com/hc/en-us/articles/115012857047-Candidate-profile-in-pipeline-view-overview) y el registro de notas y actividades de [Odoo](https://www.odoo.com/documentation/19.0/applications/productivity/discuss/chatter.html), junto con las capturas proporcionadas. Se adaptan al flujo de GTHC con acciones claras y un historial por postulación.

## Pendientes para conectar el sistema

- Tipo de aplicación, despliegue y servicios de Azure: definir con el profesor.
- Cantidad de postulantes y formato final de comparación: consultar a GTH. La demo no fija un máximo de cinco o cien para elegir perfiles.
- OCR y conversión de documentos a datos estructurados: responsabilidad del módulo de lectura.
- Modelos ML y LLM, métricas y explicaciones: responsabilidad del matching.
- Datos reales, permisos, almacenamiento, auditoría de servidor y servicio de mensajes: posteriores a esta interfaz.
- Gmail y calendario: autenticación, autorización de cuentas, envío real y confirmación de entrega se conectarán posteriormente. Guardar un borrador o entrevista no representa un envío.

## Verificación

`node --test tests/*.test.mjs` cubre orden independiente, Top-N, decisiones, borradores, persistencia, CSV y los flujos anteriores. `tests/profile-lifecycle.test.mjs` comprueba que avanzar no borra ni vuelve a seleccionar perfiles, que otras postulaciones son independientes y que los borradores y actividades persisten. `tests/browser-smoke.mjs` conserva el recorrido de navegador del proyecto. `tests/browser-codex-ii.mjs` revisa selección y descargas. `tests/browser-modernization.mjs` recorre correo, notas, entrevistas, modo oscuro persistente, comparativa y móvil. Estos recorridos requieren Playwright y Chromium.

Los datos son de demostración. El límite de 1000 perfiles en los lotes ficticios corresponde al generador local para pruebas; no define la cantidad de postulantes del sistema final.
