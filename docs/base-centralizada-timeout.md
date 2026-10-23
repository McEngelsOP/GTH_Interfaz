# Base centralizada: cancelación por tiempo de espera

La respuesta real de ETAPA-I fue `57014: canceling statement due to statement timeout`, con peticiones de unos 8,3 segundos. El bundle público consultaba el proyecto `zppjjbmkpegkxnrhcdnu`.

## Corrección

La migración `20261019191138_optimizar_base_centralizada_cv.sql` reemplaza solamente la definición de `v_base_postulantes`. La vista anterior buscaba el enlace y el estado de CV con subconsultas correlacionadas por cada postulación; la agrupación del servidor procesa toda la base antes de paginar. Con miles de CV, esas búsquedas repetidas crecen con el volumen de datos.

La nueva vista lee los CV visibles una vez y agrupa las coincidencias por aviso y documento/correo antes de unirlas con los postulantes. Conserva las columnas, `SECURITY INVOKER`, los permisos existentes y las políticas RLS. No cambia datos, funciones de acceso ni el límite de ejecución. Si hay más de un CV disponible, prioriza la coincidencia por documento y usa `card_id` como orden estable dentro de cada identidad. Un CV disponible conserva prioridad frente al estado sin adjunto.

El cliente identifica expresamente el código `57014`; no lo presenta como un problema de conexión ni inicia una descarga completa alternativa.

## Validación local

- Mismo escenario con 4.204 personas, 4.200 CV y texto de experiencia: aproximadamente 103.201 ms antes y 771 ms después, en PGlite. Son medidas locales orientativas, no tiempos de producción.
- Comparación con 404 personas: resultado JSON idéntico antes y después, aproximadamente 1.096 ms frente a 123 ms.
- `npm run test:postulaciones:sql`: correcto con 4.200+ postulaciones y CV, incluidos documentos, correos con mayúsculas, CV duplicados, sin adjunto, filtros, identidad, historial, paginación y aislamiento de CV de avisos confidenciales.
- `npm test -- src/services/__tests__/postulaciones.test.ts`: cinco pruebas correctas.
- `npm run build`: correcto; permanece el aviso de tamaño de bundle.

## Aplicación en GTH pendiente

El conector de Supabase de la sesión solo permite consultar Lyra. No se ejecutó esta migración ni asesores sobre GTH y no se ha medido el plan real de producción. El rendimiento y la recuperación completa deben verificarse allí después de aplicar el cambio.

1. Abrir el Supabase de GTH que usa ETAPA-I; comprobar la referencia `zppjjbmkpegkxnrhcdnu` en la URL del proyecto, contrastándola con las variables del despliegue actual.
2. En SQL Editor, ejecutar completo `20261019191138_optimizar_base_centralizada_cv.sql`. Es transaccional y puede repetirse; requiere la vista existente de la Base centralizada.
3. En la web, pulsar Actualizar en Base centralizada y verificar una respuesta 200, personas, filtros, siguiente página y Excel. Repetir con una cuenta general para comprobar el alcance permitido.
4. Si todavía devuelve `57014`, inspeccionar el plan con la identidad y rol autenticado reales y revisar bloqueos/carga de producción. No elevar el timeout global como sustituto de esa revisión.

El SQL hace efecto sin redesplegar la web. La mejora del texto de error requiere integrar la propuesta del cliente en ETAPA-I.
