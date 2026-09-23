# Arquitectura e integracion

## Responsabilidades actuales

| Capa | Archivos | Responsabilidad |
| --- | --- | --- |
| Arranque y navegacion | `js/app.js` | Controladores, roles visuales, URL y panel activo |
| Estado de la demo | `js/state.js` | Convocatoria activa, seleccion, ranking, transiciones y eventos |
| Dominio | `js/domain.js` | Normalizacion, evidencia desconocida, elegibilidad y reponderacion demostrativa |
| Datos ficticios | `js/services/demoRepository.js`, `js/mockData.js` | Semilla y persistencia local de demostracion |
| Lectura remota preparada | `js/services/apiClient.js` | HTTP, cancelacion, errores y validacion de paginas; no activada |
| Presentacion | Controladores `*View.js`, `dataGrid.js`, `drawer.js` | Tablas, filtros, paneles y acciones |
| Utilidades | `js/ui.js`, `js/pagination.js` | Escape de texto, modales, CSV y ventanas de filas |

Todas las vistas comparten las mismas postulaciones. El comparador no introduce candidatos automaticamente. Cambiar convocatoria limpia seleccion y expediente; Top N pertenece a cada convocatoria. La busqueda del ranking no filtra silenciosamente el Kanban. Los tableros institucionales cuentan todas las convocatorias; el ranking y sus KPIs solo la activa.

## Identidades y estados

- `candidateId`: persona estable entre convocatorias.
- `id`: postulacion unica de esa persona a un puesto.
- `jobPostingId`: convocatoria propietaria de la postulacion.
- `score: null` y `knockoutMet: null`: evaluacion y requisitos pendientes, nunca cero ni aprobado.
- `weights[].criterionId`: identificador estable del criterio; conservarlo al cambiar pesos.
- Etapas: `postulado -> preseleccionado -> entrevista -> evaluacion -> oferta -> contratado`.
- Solo se permiten movimientos adyacentes; avanzar requiere score y elegibilidad verificada. `liberado` y `contratado` son terminales en la demo.
- Liberar conserva el perfil en el banco, pero no envia correo. Vincularlo a otro puesto crea una postulacion pendiente y no copia su score anterior.

La reponderacion local mantiene la proporcion de evidencia disponible (`evidenceRatio`), incluso cuando un peso pasa por cero. No vuelve a ejecutar NLP ni LLM. Un criterio nuevo sin evidencia deja el score pendiente. Las decisiones siempre son manuales; el Top N no constituye una decision de contratacion.

## Contrato de lectura propuesto

`GET /api/v1/jobs/{jobId}/applications?limit=50&query=...&cursor=...`

```json
{
  "items": [{
    "id": "application-123",
    "candidateId": "person-456",
    "jobPostingId": "job-789",
    "name": "Perfil de ejemplo",
    "stage": "postulado",
    "score": null,
    "knockoutMet": null,
    "rank": 42,
    "inTopN": false,
    "mandatoryReqs": [],
    "weights": [],
    "gaps": []
  }],
  "total": 482,
  "nextCursor": "opaque-cursor",
  "snapshotId": "ranking-version-1"
}
```

El servidor debe ordenar, filtrar y calcular ranking y Top N sobre el conjunto completo. La interfaz nunca debe recalcular el ranking global con una sola pagina. `snapshotId` permite detectar resultados de una version anterior durante una recalibracion; su gestion en estado/UI sigue pendiente. El cliente valida IDs duplicados dentro de pagina y convocatoria, pero el servidor debe garantizar unicidad global y consistencia entre paginas.

La integracion requiere ampliar el repositorio a operaciones asincronas, estados de carga/error y resumen agregado del servidor. Cancelar solicitudes al cambiar convocatoria y descartar respuestas cuyo contexto o version ya no coincida. Separar explicitamente modo demo y modo remoto: nunca guardar postulaciones reales en el repositorio local ni volver silenciosamente a fixtures tras un error.

## Servicios que faltan

| Servicio | Contrato que debe acordarse |
| --- | --- |
| Identidad y acceso | Sesion, permisos por operacion y convocatoria, aislamiento institucional |
| Convocatorias | Crear, editar, activar y versionar criterios; validacion de reglas en servidor |
| Ingesta | Subida autorizada, tipos/tamanos, analisis de archivos, deduplicacion y estado por documento |
| OCR y extraccion | Trabajo asincrono, evidencia y pagina de origen, confianza, errores reintentables |
| Matching | Resultados ML y semanticos, modelo/version, evidencias y score por criterio |
| Ranking | Ranking global versionado, agregados y paginacion estable |
| Decisiones | Transicion atomica con version esperada, autorizacion y registro del actor autenticado |
| Notificaciones | Cola de envio idempotente y estados de entrega separados de la decision |
| Copiloto | Consultas limitadas a datos autorizados, referencias a evidencias y sin acciones autonomas |
| Efectividad | Contrataciones vinculadas con evaluaciones reales y metodologia acordada |

No insertar claves privadas, credenciales de modelos ni conexiones directas a la base de datos en JavaScript del navegador. El servidor sera responsable de autenticacion, autorizacion, retencion/borrado de documentos y auditoria persistente. La demo no ofrece garantias de cumplimiento normativo ni de equidad del modelo.

## Orden de conexion recomendado

1. Acordar IDs, contrato de postulacion y repositorio asincrono con el equipo backend.
2. Conectar sesiones, convocatorias y lectura paginada con agregados y errores visibles.
3. Conectar transiciones con control de concurrencia, pruebas de permisos e historial de servidor.
4. Incorporar almacenamiento de CVs, trabajos OCR y evaluaciones versionadas.
5. Conectar recalibracion, notificaciones y copiloto sobre esos contratos.
6. Medir rendimiento con el volumen objetivo y evaluar seguridad/accesibilidad antes de datos reales.

## Verificacion y deuda restante

Las pruebas de logica cubren conteos, persistencia, pesos, transiciones, roles, postulaciones vacias, paginacion/virtualizacion y errores del cliente HTTP. El recorrido de navegador comprueba 505 perfiles, cambios entre secciones, recarga, creacion, historial de navegacion y pantallas moviles.

La demo limita el volumen a 1000 por convocatoria y guarda el snapshot completo sin coordinacion entre pestanas. No representa una solucion multiusuario ni una prueba de carga del backend. El banco pagina de 25 en 25 y el Kanban monta inicialmente 25 por etapa; mostrar mas aumenta su DOM. El bootstrap aun tiene controladores acoplados al singleton, que habra que adaptar al repositorio remoto. Quedan pendientes pruebas con tecnologias de asistencia, concurrencia real, datos representativos y contratos de los futuros motores.
