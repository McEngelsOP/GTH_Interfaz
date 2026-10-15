# Comentarios internos compartidos

Estado: código preparado; migración pendiente de aplicar y verificar en GTH_Bumeran (AaronSSL's Org).
El conector disponible durante este cambio solo mostraba Lyra en McEngelsOP's Org. No se modificó esa base.

## Activación

1. Confirmar que la URL pública de Supabase configurada en el entorno de ETAPA-I corresponde a GTH_Bumeran. No cambiar de proyecto sin comprobar que contiene las tablas del scraper y los usuarios del sistema.
2. Aplicar `supabase/migrations/20261015230000_comentarios_internos.sql` en GTH_Bumeran.
3. Añadir a `gth_colaboradores` los UUID de los colaboradores autorizados de Supabase Auth. La tabla es administrada desde el servidor; los usuarios del navegador no pueden darse acceso.
4. Verificar con dos sesiones del equipo: crear, editar y borrar una nota del mismo candidato y aviso; comprobar que llega al segundo navegador al recuperar el foco o en 30 segundos. Una sesión sin pertenencia al equipo debe ser rechazada; una sesión anónima tampoco debe acceder.
5. Verificar que el comentario no aparece en otro aviso y permanece después de reimportar al mismo postulante con su identificador externo.

## Comportamiento

Una nota compartida por aviso y postulante. Los miembros autorizados pueden leer, editar y borrar las notas del equipo. El servidor registra fecha y último autor; no acepta autor o fecha suministrados por el navegador. La edición más reciente reemplaza la anterior. No se guarda un historial de versiones de la nota.

Con Supabase configurado, la interfaz lee y escribe la tabla compartida y muestra errores sin presentar un guardado local como compartido. Si falla la escritura, el formulario conserva el texto para reintentar. Las notas antiguas del navegador se conservan en el estado local, pero no se suben automáticamente. Sin Supabase configurado, se mantiene el modo local anterior, identificado en el formulario.

Validación local: pruebas de lectura paginada, identidad externa, errores de permisos y creación/borrado mediante un cliente simulado. La integración real y las políticas RLS requieren ejecutar los pasos anteriores en el proyecto correcto.
