# Avance de candidatos

El tablero muestra Postulado → Preseleccionado → En entrevista → Contratado. Los expedientes antiguos de En evaluación o En oferta se muestran dentro de En entrevista, sin eliminarlos. Los descartados siguen disponibles en Candidatos y ranking.

## Activar el registro compartido

En **AaronSSL's Org → GTH_Bumeran → SQL Editor**, ejecutar una vez `supabase/migrations/20261016001000_avance_compartido.sql`. Nombre sugerido para la consulta: **Avance y comunicaciones compartidas**. Requiere la migración previa de comentarios y los usuarios ya autorizados en `gth_colaboradores`; no hace falta volver a indicar sus correos.

La web debe seguir conectada a ese mismo proyecto mediante sus variables existentes de Supabase. No cambiar la URL ni las claves para esta función. No usar la clave service_role en el navegador.

Al abrir la web, se registran los expedientes nuevos con su etapa actual del navegador que los inicializa. Una vez registrado un expediente, su etapa compartida prevalece sobre copias locales antiguas. Durante la primera activación conviene abrir desde el navegador que tiene las decisiones vigentes. No se migran automáticamente correos ni entrevistas históricas; antes de enviar, verificar los contactos hechos fuera de este flujo.

Los movimientos y descartes se validan en el servidor con la etapa anterior. Se actualizan al recuperar el foco, pulsar Actualizar avance o cada 15 segundos. Sin la migración, las comunicaciones y los cambios conectados se bloquean; no se simula un guardado compartido.

## Configurar Multitest

1. Seleccionar el banner **Preseleccionado** y **Configurar Multitest**.
2. Indicar el enlace HTTPS real y el plazo. Guardar configuración.
3. Pulsar **Enviar Multitest**, revisar los destinatarios y editar asunto/mensaje si hace falta.

El enlace y plazo se guardan por convocatoria en este navegador. No se han configurado credenciales ni proveedores automáticos. La invitación usa un enlace común para los destinatarios elegidos; si el proveedor exige enlaces personales, prepararlos individualmente con el mensaje correspondiente.

## Preparación y envío

- **Preparar correo/WhatsApp** reserva los destinatarios de forma compartida y atómica. Si otro colaborador ya actuó o cambió la etapa, se rechaza toda la selección y hay que actualizarla.
- Gmail abre borradores con hasta 40 destinatarios en CCO por tanda. Entrevistas permiten elegir un candidato, fecha, lugar y correo o WhatsApp; no se envían invitaciones de calendario automáticamente.
- Abrir el borrador no acredita el envío. Tras enviarlo realmente, pulsar **Confirmar envío realizado** para esa tanda.
- Otros colaboradores ven la reserva y no pueden repetirla ni confirmar/liberar una preparación ajena. El autor puede retomar su preparación al volver al diálogo.
- **Liberar preparación** solo debe usarse si NO se envió el mensaje. Permite que el equipo vuelva a prepararlo.
- Una comunicación confirmada no puede repetirse desde este flujo, incluso si el candidato regresa de etapa. La identidad se separa por aviso y postulante.
- Confirmar el agradecimiento mueve a No continúan a quienes aún estaban en Postulado. No afecta a los candidatos preseleccionados, en entrevista o contratados.
- Los cambios de etapa o descartes se bloquean mientras el expediente tenga una comunicación en preparación. Confirmarla o liberarla primero.

El registro controla las acciones realizadas desde este flujo; no puede comprobar entregas externas ni detectar mensajes enviados directamente desde Gmail o WhatsApp fuera del sistema.

## Verificación

- `npm test`: reglas y contratos del cliente.
- `npm run test:workflow:sql`: crea una base Postgres temporal con PGlite y comprueba migración, RLS, colaboradores distintos, reservas, confirmación, cancelación, cierres, separación entre avisos y rollback de lotes.
- `npm run test:workflow:browser`: dos sesiones de navegador con API interceptada y base Postgres temporal; reserva compartida, bloqueo de duplicados, confirmaciones, entrevistas por WhatsApp y cierre por agradecimiento. No contacta servicios de correo ni Supabase real.
- `npm run test:e2e:local -- gthMeeting.spec.ts`: vista local, filtros, atajo, configuración y regresiones del comparador.

La comprobación contra GTH_Bumeran real requiere acceso al proyecto. No aplicar esta migración a Lyra ni a otro proyecto.
