# Trayectoria laboral: implementación y operación

El aviso identifica cambios documentados; no predice renuncias ni modifica scores, Top-N o etapas.

## Activación en GTH_Bumeran

1. Aplicar `supabase/migrations/20261023022909_trayectoria_laboral.sql` después de las migraciones previas, especialmente `niveles_acceso`; luego aplicar `20261023041107_trayectoria_fechas_v2.sql`. No ejecutar sobre Lyra.
2. Actualizar la copia del scraper a ETAPA-I y desplegar la web de esa rama.
3. Con la conexión habitual del scraper configurada, ejecutar `python -m scraping.run --solo-trayectoria`. Se puede limitar con `--aviso ID`. No abre Chrome, no descarga PDF y no utiliza IA.
4. Abrir Candidatos y ranking, actualizar los datos y comprobar una ficha con evidencia conocida. Repetir la ejecución: los perfiles sin cambios deben reutilizar su análisis.

La migración no se aplica automáticamente desde la web. Si falta, el módulo muestra su indisponibilidad y mantiene accesibles el ranking y la importación. El scraper conserva el CSV aunque falle el análisis; el comando explícito devuelve el error para diagnosticar la activación.

## Fuentes, cobertura y reglas v2

Se leen Empresa, Puesto, Fecha Inicio, Fecha Fin, Descripción, Modalidad, Tipo de contrato y Tipo de empleo de todos los índices Exp[n] disponibles. No se infiere empleo dependiente por el nombre del puesto. La modalidad no especificada se muestra como nota informativa. Las transiciones con fechas válidas se separan entre acreditadas y posibles: solo las acreditadas pueden activar el aviso confirmado. Si un grupo de tres transiciones alcanza seis meses pero incluye modalidades desconocidas, el resultado es información insuficiente con el texto «Posibles cambios frecuentes: confirmar modalidad». Si ni siquiera las posibles alcanzan el umbral, la ausencia de modalidad por sí sola no bloquea el resultado sin patrón. Otros datos faltantes o incoherentes sí pueden impedir concluir.

Tres transiciones entre empleadores en una ventana de seis meses, dentro de los últimos 24 meses. Se usan meses calendario. Las fechas parciales conservan su incertidumbre: solo se confirma un patrón si el intervalo completo cumple. Las fechas anuales, futuras, inválidas o ausentes no se completan. Fin vacío no equivale a actualidad. Se admiten ISO con/sin hora y zona, fechas numéricas día/mes/año y año/mes/día, mes/año y nombres de meses en español/inglés. El formato numérico local es día/mes/año; no se intenta interpretar como mes/día/año ni adivinar años de dos dígitos o números seriales de Excel. Una fecha ISO cuyo día es 01 conserva precisión de día: solo la fuente podría acreditar que se generó desde un mes.

Las prácticas preprofesionales se excluyen. Las profesionales pueden contar, salvo término/duración contractual documentados. Freelance, proyectos y contratos de plazo fijo documentados se excluyen. Un practicante sin tipo queda como modalidad desconocida. Las exclusiones son por experiencia, no para todo el CV. No se unen artificialmente empleos separados por una experiencia excluida. Ascensos en la misma empresa, duplicados y periodos simultáneos no se cuentan automáticamente como cambios.

## Actualizar una instalación v1 ya activa

1. Actualizar la copia local de ETAPA-I (`git pull --ff-only`, con el árbol de trabajo limpio). No guardar credenciales en git.
2. Aplicar **solo** `supabase/migrations/20261023041107_trayectoria_fechas_v2.sql` en GTH_Bumeran. Requiere la migración original ya instalada. No repetir la original. Esta actualización no borra datos ni revisiones: cambia la versión vigente de la consulta y de la política de revisión a v2. Los v1 quedan desactualizados hasta recalcular.
3. Ejecutar primero `python -m scraping.run --solo-trayectoria --aviso 1118387829`. Los 11 candidatos se recalculan una vez por cambio de versión. Repetir: deben reutilizarse los 11 si no cambió la fuente ni venció el resultado.
4. Confirmar que el despliegue de la web contiene este cambio y abrir Perfil → Trayectoria laboral. El criterio y el resultado son párrafos distintos. Las fechas leídas incluyen su valor original; solo se pide aclarar el dato realmente ausente, no reconocido, anual, futuro o invertido. La falta de fin se informa también en experiencias excluidas sin hacerlas participar del conteo.
5. Validar el perfil de regresión: cero transiciones, sin patrón, solo fin no registrado en Exp[1], modalidades de Exp[2–4] como notas. No inferir desempleo ni motivo de salida.
6. Tras verificar el aviso piloto, ejecutar `python -m scraping.run --solo-trayectoria` para el resto de avisos.

Consulta de comprobación (separada del historial v1):

```sql
select version, estado, count(*) as cantidad
from public.gth_trayectoria_analisis
where aviso_id = '1118387829' and version = 'trayectoria-v2'
group by version, estado;
```

Una fecha presente pero no reconocida se presenta con el valor original y el motivo «formato no reconocido», nunca como «no registrada». La interpretación no reemplaza los datos originales del CSV. Los cargos se muestran completos tal como llegaron: no se puede recuperar desde este módulo texto que la fuente ya exportó truncado.

## Presentación en la ficha

La pestaña Perfil contiene una única sección **Experiencia laboral**. El resumen **Cambios entre empleadores** aparece al inicio; los cargos, fechas y funciones del historial se muestran una sola vez debajo.

- **Ver análisis** abre el criterio, los conteos, las ventanas detectadas o posibles y la información por aclarar. Solo se incluyen referencias breves a experiencias vinculadas a transiciones, incidencias o exclusiones; no se vuelven a copiar las funciones del puesto. Las fechas originales siguen disponibles al desplegarlas.
- La modalidad contractual ausente se agrupa en una nota con la cantidad de experiencias afectadas. Los otros motivos se conservan sin repetirlos por cada experiencia.
- **Registrar revisión** abre un formulario sin resultado preseleccionado. «Cambios justificados» solo se ofrece para patrones detectados o posibles; «Reportar dato incorrecto» y «Revisado por GTH» siguen disponibles. Cancelar elimina el borrador y devuelve el foco al botón. Un error al guardar mantiene el texto para reintentar.
- La revisión guardada aparece en el resumen y el historial puede consultarse en el análisis. Los resultados pendientes, desactualizados o no disponibles mantienen su acción de actualización y no permiten guardar revisiones sobre evidencia no vigente.

Este cambio de presentación solo requiere desplegar la web actualizada. **No agrega migraciones SQL ni requiere recalcular los análisis existentes.** No cambia los scores, las reglas de trayectoria ni la comparación salarial.

## Arquitectura

- `scraping/trayectoria.py` y `trayectoria_reglas.py`: extracción y reglas deterministas sin dependencias nuevas.
- `trayectoria_worker.py`: compara la huella laboral y procesa lotes de 200. BD.importar_csv lo invoca después del commit; paso_csv también lo invoca al reutilizar un CSV. Esto cubre importación local y panel.
- `gth_trayectoria_analisis`: snapshots por aviso, clave, huella, versión y fecha de referencia. Se conserva evidencia aunque se reemplace datos_json. La vigencia termina cuando una transición sale del horizonte o una fecha futura requiere reevaluación. Los cambios de versión generan snapshots nuevos y mantienen los anteriores.
- `gth_trayectoria_revisiones`: registro inmutable, atado al snapshot. Autor y fecha se asignan en la base; el cliente solo envía análisis, estado y texto. RLS valida acceso al aviso y vigencia del análisis.
- `gth_trayectoria_resumen`: páginas de 500, sin cronologías completas. La ficha carga su detalle y las diez revisiones más recientes en paralelo. El historial completo permanece en la base.
- El contexto transitorio se limpia al cambiar aviso/actualización o desmontar la sesión. No se persiste otro historial laboral en localStorage.

Una justificación no borra la detección. La etiqueta se mantiene como invitación a revisar; la ficha informa la revisión. Las importaciones manuales del navegador muestran que todavía no tienen análisis compartido; deben entrar al flujo del scraper para obtenerlo. No existe una segunda implementación divergente del detector en JavaScript.

## Pruebas

- `npm test`
- `npm run test:trayectoria:python`
- `npm run test:trayectoria:sql`
- `npm run test:workflow:sql`
- `npm run test:niveles:sql`
- `npm run test:postulaciones:sql`
- `npm run build`
- `npm run test:e2e:local -- trayectoria.spec.ts`

Los casos son sintéticos. El test SQL usa PostgreSQL embebido (PGlite), aplica todas las migraciones y prueba permisos, huella Unicode compartida con Python, vigencia, revisión inmutable y paginación. No sustituye la comprobación posterior contra el proyecto real.

## Desactivación

Se puede volver al commit anterior de web/scraper sin eliminar las tablas. El módulo no cambia scores, decisiones ni etapas existentes. Conservar tablas mantiene las evidencias y revisiones; no borrar datos para desactivar la interfaz.
