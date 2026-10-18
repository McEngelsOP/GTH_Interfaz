# Historial de postulaciones y base paginada

Extensión de la interfaz existente: añade el historial por persona, una acción de recurrencia en la tabla y paginación de la Base centralizada. Hereda los colores neutros cálidos y el rojo ESAN, las fuentes Outfit/Inter, los tokens, los iconos Lucide, los componentes y la densidad de tabla actuales. No introduce un nuevo sistema visual ni modifica los documentos de diseño o contexto.

## Uso

- Abrir el expediente de un postulante y seleccionar **Postulaciones**. Cada fila muestra aviso, fecha y score del aviso, del proceso más reciente al más antiguo. El proceso abierto queda identificado.
- Cuando se comprueba participación en más de un aviso, **Postuló en N procesos** abre directamente esa pestaña desde la tabla.
- El score pertenece a los requisitos de cada aviso; no compara a una persona entre procesos. Se consulta el ranking vigente respecto de la versión de criterios del aviso. Si no hay puntaje vigente, se muestra **Sin puntaje vigente**; un cero válido se conserva.
- La Base centralizada mantiene filtros, resumen y exportación Excel. Muestra **50 personas por página**; el Excel recupera todas las personas que cumplen los filtros en bloques de **250**. La base continúa sin score porque no evalúa contra un aviso.

## Implementación y permisos

La migración aditiva `supabase/migrations/20261018023948_historial_recurrencia_base_paginada.sql` incorpora:

| Recurso | Función |
| --- | --- |
| `gth_interno.identidades` | Resuelve la identidad con DNI/documento normalizado y correo sin espacios exteriores ni diferencias entre mayúsculas y minúsculas. |
| `gth_historial_postulaciones` | Devuelve una fila por aviso, con fecha y ranking vigente. Incluye las postulaciones almacenadas de procesos cerrados o anteriores, aunque ya no estén en el último CSV o listado. |
| `gth_resumen_postulaciones` | Cuenta avisos distintos por persona; filas duplicadas del mismo aviso no aumentan la recurrencia. |
| `v_gth_personas_base` y `gth_base_centralizada` | Agrupan por persona en el servidor antes de filtrar y paginar, conservando sus avisos juntos. Usan el alcance de la vista existente `v_base_postulantes`. |

El DNI/documento tiene prioridad. Un correo sin documento se une al documento asociado solo cuando ese correo tiene un único documento identificable. Un correo ambiguo con documentos contradictorios no une esas personas; sin documento ni correo se conserva una identidad por fila, sin deducir coincidencias por nombre.

Las vistas y RPC usan `SECURITY INVOKER`: RLS limita los avisos consultables para la sesión, también en los conteos, resúmenes y opciones de filtros. No se elevan privilegios para completar el historial. La vista con identidad cruda permanece en `gth_interno`, fuera de los esquemas expuestos por la Data API; no debe agregarse ese esquema a la configuración de exposición. `anon` no tiene acceso a estos recursos.

Los servicios `src/services/postulaciones.ts` y `src/services/baseCentralizada.ts` consultan las RPC. Si aún falta la migración, la Base centralizada conserva la carga anterior desde `v_base_postulantes` y filtra/pagina localmente. Si falta la RPC de historial, muestra que el historial completo todavía no está disponible y permite reintentar; no inventa recurrencia. Sin Supabase configurado, la pestaña identifica expresamente las postulaciones disponibles en el dispositivo.

## Activación pendiente

1. **Verificar primero el proyecto Supabase real que utiliza ETAPA-I**, contrastando su URL/referencia con `VITE_SUPABASE_URL` de ese entorno. El conector de esta sesión solo enumera **Lyra**; eso no acredita acceso al proyecto GTH y no autoriza aplicar allí esta migración.
2. En el proyecto confirmado, comprobar que está aplicada `20261017120000_niveles_acceso.sql` y ejecutar después la migración aditiva `20261018023948_historial_recurrencia_base_paginada.sql`. Mantener `gth_interno` fuera de los esquemas expuestos por la Data API. La migración solicita recargar la caché de esquema de PostgREST.
3. Verificar con cuentas maestra y general el historial, la recurrencia, los avisos confidenciales, los conteos y las opciones de filtros; revisar los asesores de Supabase en ese proyecto y comprobar filtros, cambio de página y Excel en ETAPA-I.

En esta sesión **no se aplicó la migración ni se ejecutaron asesores sobre el GTH real**. La inspección directa del proyecto Vercel devolvió 403 y la CLI no tenía credenciales. Los checks del commit en GitHub permiten consultar el resultado del despliegue; la activación de base de datos requiere acceso al proyecto GTH confirmado.

## Evidencia de verificación

- `npm run build`: correcto. Suite unitaria: **139 pruebas correctas**.
- `npm run test:postulaciones:sql`: identidad, deduplicación, fechas, criterios, filtros, paginación y RLS correctos, incluidos **más de 4.200 registros**. La consulta local tardó aproximadamente **350 ms**; es una medición local, no un SLA de producción.
- `npm run test:niveles:sql`: prueba existente de acceso correcta.
- Navegador: **cuatro pruebas nuevas** de postulaciones y la prueba existente de disposición de la Base centralizada correctas. También pasaron las **cuatro pruebas actuales de `comparisonReference`**, WhatsApp y comentarios.
- La prueba antigua de `gthMeeting.spec.ts`, **«comparador distingue cero de pendiente y refleja los conteos en las donas»**, falla de la misma forma en el commit inicial limpio `26c0e2c`: espera un mapa de calor obsoleto. No se modificó esa prueba en este cambio.
- Impeccable: detector sin hallazgos (`[]`); revisión de las **nueve imágenes** con disposición **ship**, sin correcciones materiales. Se aceptaron la acción compacta de recurrencia, el drawer existente, las filas simples, la explicación del score por proceso y la adaptación móvil. Las capturas y los fixtures de prueba no forman parte de la interfaz de producto.
