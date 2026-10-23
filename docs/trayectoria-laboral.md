# Trayectoria laboral: implementación y operación

El aviso identifica cambios documentados; no predice renuncias ni modifica scores, Top-N o etapas.

## Activación en GTH_Bumeran

1. Aplicar `supabase/migrations/20261023022909_trayectoria_laboral.sql` después de las migraciones previas, especialmente `niveles_acceso`. No ejecutar sobre Lyra.
2. Actualizar la copia del scraper a ETAPA-I y desplegar la web de esa rama.
3. Con la conexión habitual del scraper configurada, ejecutar `python -m scraping.run --solo-trayectoria`. Se puede limitar con `--aviso ID`. No abre Chrome, no descarga PDF y no utiliza IA.
4. Abrir Candidatos y ranking, actualizar los datos y comprobar una ficha con evidencia conocida. Repetir la ejecución: los perfiles sin cambios deben reutilizar su análisis.

La migración no se aplica automáticamente desde la web. Si falta, el módulo muestra su indisponibilidad y mantiene accesibles el ranking y la importación. El scraper conserva el CSV aunque falle el análisis; el comando explícito devuelve el error para diagnosticar la activación.

## Fuentes, cobertura y reglas v1

Se leen Empresa, Puesto, Fecha Inicio, Fecha Fin, Descripción, Modalidad, Tipo de contrato y Tipo de empleo de todos los índices Exp[n] disponibles. No se infiere empleo dependiente por el nombre del puesto. Si Bumeran no exporta modalidad suficiente, la cobertura será menor: se muestra información insuficiente y se conserva la evidencia. Evaluar cobertura antes de flexibilizar esta regla o añadir extracción de texto.

Tres transiciones entre empleadores en una ventana de seis meses, dentro de los últimos 24 meses. Se usan meses calendario. Las fechas parciales conservan su incertidumbre: solo se confirma un patrón si el intervalo completo cumple. Las fechas anuales, futuras, inválidas o ausentes no se completan. Fin vacío no equivale a actualidad.

Las prácticas preprofesionales se excluyen. Las profesionales pueden contar, salvo término/duración contractual documentados. Freelance, proyectos y contratos de plazo fijo documentados se excluyen. Un practicante sin tipo queda como modalidad desconocida. Las exclusiones son por experiencia, no para todo el CV. No se unen artificialmente empleos separados por una experiencia excluida. Ascensos en la misma empresa, duplicados y periodos simultáneos no se cuentan automáticamente como cambios.

## Arquitectura

- `scraping/trayectoria.py` y `trayectoria_reglas.py`: extracción y reglas deterministas sin dependencias nuevas.
- `trayectoria_worker.py`: compara la huella laboral y procesa lotes de 200. BD.importar_csv lo invoca después del commit; paso_csv también lo invoca al reutilizar un CSV. Esto cubre importación local y panel.
- `gth_trayectoria_analisis`: snapshots por aviso, clave, huella, versión y fecha de referencia. Se conserva evidencia aunque se reemplace datos_json. La vigencia termina cuando una transición sale del horizonte.
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
