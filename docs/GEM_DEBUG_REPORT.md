# Revisión funcional de GEM

La revisión corrige decisiones de reclutamiento y su propagación entre pantallas conservando el diseño React de GEM. La referencia funcional es el acta `Acta_Reunion_Equipo_Reclutamiento(2).docx`: motores ML y LLM separados, explicabilidad, decisión humana, CSV y comunicación asociada a los avances y cierres.

## Errores corregidos

| Problema observado | Comportamiento corregido |
| --- | --- |
| Cerrar a otros evaluados recorría todas las convocatorias | La decisión identifica el puesto y valida la selección completa antes de actualizar; solo cierra otros pendientes elegibles del mismo puesto |
| La ficha avanzaba la selección global, incluso de otras personas | La ficha confirma una decisión sobre su propio `applicationId` |
| El tablero mutaba objetos y listas sin actualizar el estado de React | Cambios inmutables, confirmación y motivo, historial y almacenamiento sincronizados |
| Acciones de fila y masivas permitían saltarse la validación de requisitos | Se revalida etapa, método, puntaje finito y requisito verificado en las reglas de negocio |
| Top-N se mezclaba con preseleccionados ya decididos | Top-N pendientes y Preseleccionados son conjuntos separados; Contratados tiene su propia pestaña |
| Vincular desde Banco inventaba puntajes altos y requisitos verificados, y retiraba el perfil del Banco | Nueva postulación con ambos puntajes pendientes y requisito sin verificar; se conserva la persona en Banco |
| Guardar en Banco mostraba un aviso sin guardar | Modifica el perfil y actualiza las vistas y contadores |
| Fichas desde Banco o historial podían mostrar el puesto seleccionado, en vez del expediente consultado | El puesto se resuelve desde el `applicationId` del evento; los perfiles sin postulación tienen una ficha propia |
| Cerrar a los no seleccionados no producía borradores ni preservaba los perfiles en Banco | Crea borradores de cierre y conserva los perfiles; no envía correo real |
| Guardar criterios no aplicaba la simulación y cambiar de puesto conservaba sliders antiguos | La simulación se aplica a pendientes con evidencias completas; los ya decididos conservan su evaluación; cambiar puesto sincroniza la edición |
| Evidencias ausentes generaban un puntaje de cero | Puntaje pendiente para el método cuya evidencia esté incompleta; no se promedian los motores |
| Auditoría usaba versiones y método constantes; filtros no coincidían con las acciones guardadas | Registra la versión y el método usados, filtra acciones existentes y abre el expediente del evento |
| Requisitos mostraban cantidades ficticias basadas en criterios y en umbrales de score | Muestra el estado registrado del requisito; no infiere cumplimiento a partir del score |
| Resultados mezclaba todos los puestos bajo el banner de uno y omitía En evaluación | Resultados respeta el puesto seleccionado e incluye En evaluación en el embudo |
| CSV informaba borradores por etapa y rompía encabezados con separadores | El estado del mensaje viene de borradores existentes; texto y encabezados se escapan y protegen para Excel |
| CSV de entrada usaba separación simple de líneas/celdas | Soporta BOM, celdas entrecomilladas, comillas escapadas, saltos internos y columnas reordenadas; reporta errores de catálogo |
| Carga afirmaba conectarse a portales y ejecutar OCR que no estaban implementados | La interfaz identifica detección, validación y simulación; OCR y conectores se muestran pendientes |
| Generadores seguían activos al salir de la vista o cambiar de puesto | Se cancelan sus temporizadores; los lotes son ficticios y sus puntajes se derivan de evidencias sintéticas reproducibles |
| Recargar perdía la vista y no funcionaban enlaces al puesto | Vista y convocatoria se mantienen en el hash; navegación anterior y enlaces conservan contexto |
| Datos corruptos de almacenamiento podían romper la aplicación y el reset reutilizaba objetos de la semilla | Valida registros e identidades, normaliza preferencias y devuelve copias independientes de los datos de demostración |
| Menú móvil permanecía visible y su botón estaba oculto | Menú móvil abre y cierra, acciones se ajustan al ancho y las notificaciones no cubren toda la pantalla |
| Escape podía cerrar una ficha y su modal simultáneamente | Diálogos apilados con Escape solo en el superior, foco contenido y restauración al cerrar |
| Los borradores de convocatoria carecían de activación y podían duplicar códigos | Código validado y acción de activar, registrada en historial sin crear postulantes |
| Vercel estaba configurado como HTML estático | Compilación Vite y salida `dist`, sin desplegar esta revisión |

## Validación reproducible

- `npm test`: 19 pruebas de reglas, aislamiento, etapas, criterios, CSV, almacenamiento y navegación.
- `npm run build`: TypeScript y bundle de producción.
- `npm run test:e2e`: pruebas Playwright de ficha y Top-N, tablero y recarga, Banco y vínculos pendientes, carga de 500 perfiles, las 13 vistas, criterios, tema y móvil.
- Descarga real de CSV comprobada en navegador: BOM UTF-8, dos puntajes y estado de los borradores.
- Revisión visual en escritorio y móvil, en tema oscuro.
- GitHub Actions ejecuta unitarias, compilación y navegador en pushes y pull requests de GEM.

Instalar el navegador de pruebas una vez con `npx playwright install chromium`. En CI se instala con sus dependencias Linux.

## Alcance actual

La aplicación sigue siendo una demo local con datos ficticios. PDF, Word e imágenes se detectan; el OCR real, la importación de datos de candidatos, los modelos ML/LLM, Gmail, calendarios y conectores de portales necesitan la integración del equipo. El CSV de catálogo se valida y previsualiza; esa acción no importa postulaciones. Los mensajes se guardan como borradores, sin envío. El historial local aporta trazabilidad de la demo y no es una auditoría institucional protegida contra modificaciones.

Las pruebas previenen regresiones en los escenarios cubiertos. Las futuras integraciones y cambios requieren ejecutar estos controles y añadir escenarios propios de su comportamiento.
