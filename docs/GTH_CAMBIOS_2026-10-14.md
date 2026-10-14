# Cambios de la reunión GTHC del 14/10/2026

Rama: `ETAPA-I`. Base: `8122e5409d07dd805074650b94c1b65112f543c7`.

Se siguió el orden 5, 7, 6, 4, 3 y 1. Se reutilizaron Button, Modal, Tabs y los tokens de apariencia existentes, sin añadir dependencias al proyecto.

| Punto | Resultado |
| --- | --- |
| 5. Avance sin justificación | Arrastrar o usar Atrás/Avanzar mueve directamente a una etapa contigua. El motivo fijo `Movido desde el tablero de avance` queda en el historial. Se mantienen las validaciones existentes de etapas y convocatoria activa. |
| 7. Revisados | Nueva pestaña junto a Marcados, con contador y ayuda sobre la diferencia entre ambas. El hook existente se ejecuta una vez en la vista, con todas las postulaciones del aviso. Se conserva la tabla `en_revision`. |
| 6. Agradecimiento con selección | Casillas iniciales marcadas, buscador por nombre, selección total, contador y lista con scroll. Correos en CCO únicamente de los elegidos, deduplicados y en tandas de 50. Al reabrir se restablece la selección. |
| 4. WhatsApp | Botón en la tabla y la ficha. Normaliza celulares peruanos y números internacionales explícitos, prepara el mensaje neutral del documento y abre `wa.me`. Usa la cuenta activa de WhatsApp del navegador/aplicación del integrante; no vincula una cuenta emisora al aplicativo. Sin celular válido, queda deshabilitado. |
| 3. Comentarios | Columna y modal para agregar, editar y borrar una nota local por aviso y postulante. Mapa independiente de Application, con identidad externa estable. Persistencia mediante el estado existente en IndexedDB, sin escritura a Supabase. |
| 1. Comparador | Barras agrupadas por requisito y Score Embeddings total, leyenda, colores estables durante la comparación, descripción accesible, porcentaje/nombre al pasar el mouse y falta de evidencia diferenciada de cero. Temas claro/oscuro y ventana angosta. |
| 2. Multitest | Base preparada, sin botón ni envío activo, por indicación del usuario. `ListaDestinatarios` puede reutilizarse, y `emailComposition.ts` aporta selección/deduplicación, tandas, URL de composición y preparación del asunto/mensaje Multitest con URL HTTPS y plazo explícito. |

## Pendientes de definición o acceso

- Multitest: confirmar enlace común por convocatoria o individual, etapa destinataria y plazo. Integrar el modal y la persistencia del enlace una vez definida esa información. No se introdujo un campo de convocatoria sin un flujo que lo utilice.
- Punto 5: no se modificó `AdvanceDecisionModal`; quitar también allí la justificación requiere confirmar la duda abierta del documento.
- Punto 1: experiencia y grado académico permanecen en la matriz existente. Ampliar el gráfico a esas dimensiones requiere definición de GTHC.
- Revisados: la interfaz reutiliza la integración existente con Supabase. No se alteraron esquema, políticas ni datos. Queda pendiente comprobar con acceso al servicio la marca compartida entre dos computadoras.
- WhatsApp y Gmail preparan el mensaje; la persona revisa y envía en la aplicación externa. Abrir el enlace no registra ni acredita un envío.
- Comentarios: locales al navegador/dispositivo. No son notas compartidas y no se envían al postulante. Borrar los datos del navegador elimina este almacenamiento.

## Validación

- `npm run build`: correcto. Persiste el aviso de Vite sobre un chunk superior a 500 kB; no impide la compilación.
- `npm test`: 113 pruebas aprobadas, incluidas normalización de teléfonos, CCO/tandas, base Multitest, comentarios tras recarga/reimportación y motivo fijo de avance.
- `npm run test:e2e:local -- gthMeeting.spec.ts --retries=0`: seis flujos aprobados, con datos inventados aislados: botón y arrastre de avance, Revisados, destinatarios, WhatsApp, comentarios y gráfico.
- Revisión visual de las superficies modificadas en claro/oscuro y 1440/390 px. Se corrigió el ajuste del pie del agradecimiento en ventanas angostas. Detector Impeccable: sin hallazgos.
- La suite antigua completa se intentó con `--max-failures=4 --retries=0`: cuatro fallos en `assistant.spec.ts` al buscar el botón `Asistente GTH`; se detuvo sin ejecutar las otras 40 pruebas. El primer fallo se reprodujo también en la base original `8122e54`, sin estos cambios. No se cambiaron funcionalidades del asistente ni pruebas ajenas al alcance para hacer desaparecer ese fallo.
- No se enviaron correos ni mensajes reales durante las pruebas. Los datos de prueba solo se importan desde archivos de pruebas, nunca desde la aplicación de producción.

## Publicación

Solo se actualiza `ETAPA-I`, sin merge a main ni cambios de configuración de hosting. Las consultas directas a Vercel devolvieron 403 por permisos de acceso al equipo; el CLI no tiene credenciales disponibles. El estado del despliegue debe comprobarse por los checks del commit en GitHub o con acceso renovado a Vercel.
