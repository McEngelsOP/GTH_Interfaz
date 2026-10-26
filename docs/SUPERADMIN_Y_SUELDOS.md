# Superadministración y sueldos compartidos

La entrega `GTH_ETAPA_I_PROYECTO_COMPLETO.zip` parte del proyecto de octubre 5. Sus siete archivos modificados incorporan administradores ficticios y sueldos locales. No se debe sustituir ETAPA-I por ese ZIP: faltan autenticación, API, scraper, base centralizada y cambios recientes de trayectoria. Se integra su objetivo sobre el código vigente, sin importar `AdminManagementDemo` ni sus registros de localStorage.

## Comportamiento

- `superadmin`: cuenta de Andrea, identificada por su UUID real, nunca por el nombre visible. Crea administradores (`maestro` en la base), crea cuentas generales, revoca accesos y cambia ofertas.
- `maestro`: conserva el acceso a todos los avisos y gestiona cuentas generales. No crea otros administradores, no gestiona otras cuentas administradoras ni cambia ofertas.
- `general`: conserva sus secciones y avisos habilitados. Consulta la oferta del aviso si tiene permiso de verlo.
- La cuenta superadministradora no puede eliminarse, desactivarse ni cambiarse de nivel desde la interfaz o la API. No se habilita un alta web de superadministradores.
- Eliminar una cuenta retira sus permisos y realiza un borrado lógico en Supabase Auth. Así se conservan las referencias de las decisiones previas; la cuenta desaparece del listado de usuarios de GTHC.

En **Candidatos y ranking**, el botón **Sueldo** aparece junto a **Requisitos y pesos** y **Criterios y pesos**. Cada candidato tiene un acceso salarial debajo de su nombre, con su estado visible antes de abrirlo. El comparador gráfico también muestra el indicador y permite abrir la comparación. La ficha de perfil ya no incluye la pestaña Sueldo.

Se usan importes mensuales en PEN. La comparación muestra oferta, pretensión, diferencia en soles y, si supera la oferta, el porcentaje de exceso. El selector de postulante permite revisar otra postulación del mismo aviso. El indicador usa un icono distinto y texto para cada estado:

| Estado | Regla |
| --- | --- |
| Dentro del presupuesto · check verde | Pretensión menor o igual que la oferta guardada. |
| Supera el presupuesto · cruz roja | Pretensión superior con criterio Estricto, o sin puntaje vigente alto en Manejable. |
| Manejable · manos ámbar | Criterio Manejable y pretensión superior, con Score Embeddings vigente de 0,70 o más. Es una propuesta de revisión, nunca una aprobación salarial. |
| Sin comparar · interrogación gris | Falta un importe verificable, no hay oferta o la consulta no está disponible. |

**Criterios y pesos** incluye el combo Sueldo con **Estricto (predeterminado)** y **Manejable**. Solo la superadministradora puede guardarlo, con los mismos permisos de la oferta. El modo se guarda por aviso en `gth_sueldos_ofertados.modo_sueldo`. La referencia 0,70 reutiliza el nivel de similitud alta existente en el comparador; no inventa etiquetas de calidad ni un límite porcentual de negociación. Los pesos del perfil siguen en **Requisitos y pesos**, accesible desde el nuevo panel. Este criterio señala revisión salarial: no cambia el puntaje, no reordena el ranking y no descarta ni avanza automáticamente a nadie.

La pretensión proviene de los campos salariales explícitos del CSV de Bumeran o del archivo importado. El scraper ya guarda ese CSV completo en `postulaciones.datos_json`: no requiere volver a bajar CVs. La importación asigna el sueldo a la postulación de ese aviso; no lo toma de la ficha consolidada entre varios avisos. Al actualizar el CSV, se actualiza su pretensión. Los rangos, otras monedas o periodicidades y los textos ambiguos no se convierten en un monto inventado. No hay corrección manual de la pretensión en la ficha.

La oferta se guarda en `gth_sueldos_ofertados`, con RLS y sello de fecha y autor. La vista consulta su configuración al entrar o cambiar de aviso. Solo se compara contra la oferta guardada; escribir un borrador o un fallo al guardar no cambia el resultado. Un campo vacío permite retirar la oferta. Los importes de la demo guardados en navegadores no se migran automáticamente a la base. Las convocatorias manuales mantienen su mecanismo de creación local previo; su oferta sí utiliza la tabla compartida.

La vista consulta una sola configuración salarial por convocatoria, compartida entre los indicadores y los dos paneles. Cambiar un importe actualiza todos los indicadores de esa vista. Las escrituras de importe y modo son parciales para no sobrescribirse mutuamente. Un fallo conserva el último valor guardado. Al cambiar de aviso se cierra el panel y se ignoran respuestas tardías del aviso anterior.

## Activación en el proyecto de GTHC

1. Aplicar `supabase/migrations/20261023153232_superadministracion_y_sueldos.sql` después de las migraciones existentes. No ejecutarla en Lyra.
   Para habilitar el selector Estricto/Manejable, aplicar también `supabase/migrations/20261026231414_criterios_sueldo_estricto_manejable.sql`. Conserva importes y políticas existentes; las filas anteriores quedan en Estricto. Hasta aplicarla, la web mantiene la comparación estricta y la edición de importes, y explica por qué el selector está deshabilitado.
2. Verificar el correo y UUID de la cuenta de Andrea en `public.gth_perfiles` y `auth.users`. Andrea debe tener una cuenta real antes de asignarle el nivel. La migración no promueve a ninguna persona automáticamente.
3. El responsable de la base puede asignar el rol con el UUID confirmado:

   ```sql
   update public.gth_perfiles
   set nivel = 'superadmin', activo = true
   where user_id = 'UUID_VERIFICADO_DE_ANDREA'::uuid;
   ```

   Confirmar que se actualizó exactamente una fila. Si estaba bloqueada en Auth, desbloquearla por el procedimiento administrativo del proyecto. Andrea debe recargar la aplicación tras el cambio. No se incluye un correo supuesto ni una contraseña en el código.
4. La API existente requiere `SUPABASE_URL` (o `VITE_SUPABASE_URL`) y `SUPABASE_SERVICE_ROLE_KEY` en el servidor. La clave de servicio nunca debe ser una variable `VITE_` ni incorporarse al navegador.
5. Probar con sesiones reales de Andrea y de un administrador: alta y eliminación de una cuenta de prueba, lectura desde otro navegador y ofertas con pretensiones menores, iguales y mayores. La baja debe impedir consultar los datos aun usando un token anterior.

El conector disponible no expone el proyecto GTHC; por ello no se modificó ninguna base remota ni cuenta real. La activación de la nueva migración y la prueba con sesiones reales quedan pendientes hasta disponer de acceso al proyecto GTHC.

## Validación reproducible

- `npm run build`
- `npm test`
- `npm run test:niveles:sql`
- `npm run test:superadmin:sql`
- `npx playwright test tests/e2e/sueldosAdmin.spec.ts tests/e2e/trayectoria.spec.ts`
- `npx playwright test tests/e2e/comparisonReference.spec.ts`

Las pruebas de API usan respuestas simuladas; las de políticas ejecutan PostgreSQL local con PGlite. Los datos de prueba no se suben a Supabase.
