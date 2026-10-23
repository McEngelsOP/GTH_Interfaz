# Validación de trayectoria laboral

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

## Límite de la validación

No se aplicó la migración ni se procesaron CV reales en GTH_Bumeran. La conexión disponible sigue mostrando únicamente Lyra. La activación y verificación sobre la base real quedan pendientes siguiendo `trayectoria-laboral.md`.

La modalidad dependiente debe estar explícita; un cargo ordinario no la acredita. Si el CSV no incluye modalidad suficiente, habrá perfiles con «Información insuficiente». Esta cobertura debe medirse con una muestra autorizada antes de considerar extracción adicional o cambiar las reglas.
