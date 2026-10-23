# Superadministración y sueldos compartidos

La entrega `GTH_ETAPA_I_PROYECTO_COMPLETO.zip` parte del proyecto de octubre 5. Sus siete archivos modificados incorporan administradores ficticios y sueldos locales. No se debe sustituir ETAPA-I por ese ZIP: faltan autenticación, API, scraper, base centralizada y cambios recientes de trayectoria. Se integra su objetivo sobre el código vigente, sin importar `AdminManagementDemo` ni sus registros de localStorage.

## Comportamiento

- `superadmin`: cuenta de Andrea, identificada por su UUID real, nunca por el nombre visible. Crea administradores (`maestro` en la base), crea cuentas generales, revoca accesos y cambia ofertas.
- `maestro`: conserva el acceso a todos los avisos y gestiona cuentas generales. No crea otros administradores, no gestiona otras cuentas administradoras ni cambia ofertas.
- `general`: conserva sus secciones y avisos habilitados. Consulta la oferta del aviso si tiene permiso de verlo.
- La cuenta superadministradora no puede eliminarse, desactivarse ni cambiarse de nivel desde la interfaz o la API. No se habilita un alta web de superadministradores.
- Eliminar una cuenta retira sus permisos y realiza un borrado lógico en Supabase Auth. Así se conservan las referencias de las decisiones previas; la cuenta desaparece del listado de usuarios de GTHC.

En **Ver detalle**, la pretensión aparece verde si es menor o igual a la oferta y roja si la supera. Se usan importes mensuales en PEN. Sin monto verificable o sin oferta, queda pendiente. El resultado incluye texto e icono y no modifica el ranking.

La pretensión proviene de los campos salariales explícitos del CSV de Bumeran o del archivo importado. El scraper ya guarda ese CSV completo en `postulaciones.datos_json`: no requiere volver a bajar CVs. La importación asigna el sueldo a la postulación de ese aviso; no lo toma de la ficha consolidada entre varios avisos. Al actualizar el CSV, se actualiza su pretensión. Los rangos, otras monedas o periodicidades y los textos ambiguos no se convierten en un monto inventado. No hay corrección manual de la pretensión en la ficha.

La oferta se guarda en `gth_sueldos_ofertados`, con RLS y sello de fecha y autor. La ficha vuelve a consultarla al abrirse. Solo se compara contra la oferta guardada; escribir un borrador o un fallo al guardar no cambia el resultado. Un campo vacío permite retirar la oferta. Los importes de la demo guardados en navegadores no se migran automáticamente a la base. Las convocatorias manuales mantienen su mecanismo de creación local previo; su oferta sí utiliza la tabla compartida.

## Activación en el proyecto de GTHC

1. Aplicar `supabase/migrations/20261023153232_superadministracion_y_sueldos.sql` después de las migraciones existentes. No ejecutarla en Lyra.
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

En esta revisión, el conector de Supabase solo expuso Lyra; por ello no se modificó ninguna base remota ni cuenta real. La configuración institucional y la prueba con sesiones reales quedan pendientes hasta disponer del proyecto GTHC y de la identidad verificada de Andrea.

## Validación reproducible

- `npm run build`
- `npm test`
- `npm run test:niveles:sql`
- `npm run test:superadmin:sql`
- `npx playwright test tests/e2e/sueldosAdmin.spec.ts tests/e2e/trayectoria.spec.ts`

Las pruebas de API usan respuestas simuladas; las de políticas ejecutan PostgreSQL local con PGlite. Los datos de prueba no se suben a Supabase.
