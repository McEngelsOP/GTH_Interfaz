# Validación de trayectoria laboral

## Corrección v2: fechas, diagnósticos y modalidad

Base: entrega `54d126c27bff95818eac54ed41592008fafa6230` de ETAPA-I.

- 150 pruebas Vitest aprobadas (incluyen contrato de fechas interpretadas y compatibilidad con detalles anteriores).
- 40 pruebas Python aprobadas. Incluyen formatos ISO con hora/zona, numéricos, meses escritos, bisiestos, CSV UTF-8/CP1252, fechas ausentes frente a no reconocidas, mes en curso, fechas invertidas/futuras y cambio de versión con conservación de historial.
- Script SQL de trayectoria aprobado aplicando todas las migraciones, también la nueva `20261023041107_trayectoria_fechas_v2.sql`. Verifica conservación de revisiones v1 y rechazo de nuevas revisiones sobre análisis v1, selección del v2 compatible aunque exista un v1 posterior, RLS, cambio de fuente, vigencia y paginación de 1201 perfiles.
- Tres scripts SQL existentes aprobados: avance compartido, niveles de acceso y postulaciones/Base Centralizada (4200+ filas).
- TypeScript y compilación de producción aprobados. Permanece el aviso previo del bundle mayor de 500 kB.
- Cuatro pruebas de navegador del módulo aprobadas: revisión compartida y ranking en escritorio/móvil; perfil de regresión sin falsas fechas faltantes; modalidad desconocida como provisional; migración ausente. Seis pruebas existentes de comparador y Base Centralizada también aprobadas. Se inspeccionaron capturas de escritorio y móvil.

El perfil reconstruido con las cuatro experiencias compartidas se prueba con empresas ficticias y la misma cronología. Resultado esperado y obtenido: `sin_patron`, cero transiciones, fin ausente únicamente en Exp[1], tres notas de modalidad y ninguna ventana de patrón. No se infiere desempleo ni se completa el fin vacío con actualidad.

Esta corrección no se ha aplicado al proyecto real desde el agente: la conexión Supabase disponible sigue listando solo Lyra. La actualización SQL y la reevaluación en GTH_Bumeran deben ejecutarse siguiendo `trayectoria-laboral.md`. No se utilizaron las credenciales compartidas en el chat ni se añadieron CV reales a los tests. La suite E2E histórica completa sigue sin declararse aprobada por los fallos preexistentes documentados abajo.

## Validación de la primera entrega (v1)

Base revisada: ETAPA-I, commit `1155753d6ae73061738a44ed1e3b0616436855ab`.

## Comprobaciones aprobadas

| Comprobación | Resultado |
|---|---|
| Vitest, servicios nuevos y existentes | 148 pruebas aprobadas |
| Python, reglas e integración SQLite | 22 pruebas aprobadas |
| SQL nuevo, aplicando el esquema y todas las migraciones en PGlite | Aprobado: permisos, Unicode Python/SQL, revisión inmutable, vigencia, cambio/reversión de fuente y paginación de 1201 postulaciones |
| SQL existente de avance compartido | Aprobado |
| SQL existente de niveles de acceso | Aprobado |
| SQL existente de historial y Base Centralizada | Aprobado, incluyendo 4200+ registros |
| TypeScript y build de producción | Aprobado; permanece el aviso previo de bundle superior a 500 kB |
| Playwright del módulo y regresión de comparador/Base Centralizada | 8 pruebas aprobadas |
| Detector Impeccable de los componentes afectados | Sin hallazgos |

El navegador comprobó etiqueta, cronología y evidencias, justificación compartida, orden de ranking, ausencia de llamadas a IA, bloqueo de revisión al quedar desactualizado y comportamiento con migración ausente. Se revisaron capturas de escritorio y móvil y acceso al formulario mediante desplazamiento.

El entorno bloquea sockets Unix, por lo que para ejecutar Chromium se utilizó Headless Shell con un proceso y un navegador por prueba. La adaptación fue temporal y externa al repositorio; los tests entregados usan Playwright estándar. No se cambiaron dependencias del producto para resolver esa limitación.

## Suite histórica pendiente de actualización

La ejecución general encontró pruebas antiguas que buscan controles que ya no aparecen en la interfaz de base:

- `assistant.spec.ts`: espera el botón «Asistente GTH».
- `import.spec.ts`: espera «Importar perfiles» o el formulario de carga sin haber creado una convocatoria, aunque la app redirige a Convocatorias.

Se reprodujeron los dos primeros casos en un worktree del commit base sin el módulo de trayectoria. Para poder descubrir esos tests en Node se aplicó solamente la misma guarda de compatibilidad de `import.meta.env`, que también se incluye en esta entrega. Los fallos de selectores persistieron. La suite completa de 69 casos no se declara aprobada; se detuvo y se ejecutaron por separado los flujos relevantes. No se reescribieron los flujos antiguos del producto para satisfacer pruebas obsoletas.

## Límite de la validación inicial v1

No se aplicó la migración ni se procesaron CV reales en GTH_Bumeran. La conexión disponible sigue mostrando únicamente Lyra. La activación y verificación sobre la base real quedan pendientes siguiendo `trayectoria-laboral.md`.

En v1 la modalidad dependiente debía estar explícita para evaluar la trayectoria. En v2 sigue siendo necesaria para acreditar transiciones dependientes, pero se separan las transiciones posibles y las notas informativas; ver el apartado de corrección v2.
