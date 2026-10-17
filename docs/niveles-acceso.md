# Niveles de acceso

| Nivel | Qué ve |
| --- | --- |
| Maestro | Todas las secciones y todos los avisos, también los confidenciales. Administra «Usuarios y permisos». |
| General | Las secciones y los avisos que le habilite una cuenta maestra. Nunca ve los avisos confidenciales. |

Supabase hace cumplir los avisos con RLS (`gth_puede_ver_aviso`) en avisos, postulaciones, CVs, ranking, revisados, comentarios, avance y acciones; la Base centralizada queda filtrada sola. Las secciones del menú solo se ocultan en la web. El scraper entra como `postgres` y no se ve afectado.

«Creado por» ya lo guarda el scraper en `avisos.creado_por` y se muestra en la pestaña «Avisos confidenciales». Un aviso confidencial lo marca a mano una cuenta maestra.

Cada usuario tiene su propia copia local (IndexedDB), y al sincronizar se borran de ella los avisos que dejó de ver.

## Activar

1. En **GTH_Bumeran → SQL Editor**, ejecutar una vez `supabase/migrations/20261017120000_niveles_acceso.sql`. Las cuentas que ya existían quedan como maestras.
2. Agregar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (localhost) y en las variables de entorno de Vercel. Esa clave nunca lleva el prefijo `VITE_` ni va al navegador.
3. Con una cuenta maestra, ir a **Usuarios y permisos → Nueva cuenta**. La contraseña temporal se muestra una sola vez y la persona la cambia al ingresar.

## Probar

- `npm run test:niveles:sql`: RLS en PGlite (maestro, general, lista de avisos, confidenciales, base centralizada y escrituras).
- `src/services/__tests__/permisos.test.ts`: secciones, limpieza de la copia local y respuestas de `api/usuarios`.
