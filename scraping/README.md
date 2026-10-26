# Scraper de Bumeran (GTH)

Descarga automáticamente desde el portal de empresas de Bumeran:

1. **Lista de avisos en estado Publicado** (todas las páginas): título, fecha, visitas, recibidos, no leídos.
2. **CSV de postulaciones** de cada aviso nuevo o cuyo contador *Recibidos* cambió (o si pasaron más de 7 días).
3. **Detalle público del aviso** (descripción, requisitos, modalidad...), una sola vez por aviso.
4. **CV adjunto (PDF real)** de cada postulante que aún no se tenga, desde su perfil.

Todo queda en `scraping/data/` (SQLite `gth.db`, CSVs y PDFs). Esa carpeta **no se sube a GitHub**:
contiene datos personales (Ley 29733).

## Instalación (una vez)

```bat
cd "C:\Users\aaron\Documents\PROYECTO GTH\INTERFAZ\GTH_Interfaz"
pip install -r scraping\requirements.txt
```
Las credenciales de Bumeran van en `scraping\.env` (ignorado por git, nunca se sube):
```
BUMERAN_USUARIO=correo@esan.edu.pe
BUMERAN_CLAVE=contraseña
```
Ingreso: `/empresas/ingreso` → campos `#user` y `#password` → botón *Ingresar* → ESC para cerrar
el aviso de "contraseña débil" → lista de avisos.

## Supabase (registros) y Google Drive (PDFs)

**Registros → Supabase.** Si `scraping\.env` trae `SUPABASE_DB_URL`, todo se guarda en Supabase; si no, en SQLite local (`data\gth.db`).
1. Crear el proyecto y correr una vez `scraping\supabase_esquema.sql` en el SQL Editor (tablas, vista `v_postulaciones`,
   tabla `solicitudes` y RLS: sin sesión iniciada nadie lee).
2. `SUPABASE_DB_URL`: *Project Settings → Database → Connection string* (Session pooler). **Solo en esta PC**, nunca en la web ni en git.

**PDFs → Google Drive de ESAN** (no a Supabase: el plan gratuito tiene 1 GB de archivos).
1. En https://console.cloud.google.com con la cuenta de ESAN: crear un proyecto → *APIs y servicios* → habilitar **Google Drive API**.
2. *Pantalla de consentimiento OAuth*: tipo **Interno** (si ESAN lo permite) o Externo agregando la cuenta como usuario de prueba.
3. *Credenciales → Crear credenciales → ID de cliente OAuth → App de escritorio* → descargar el JSON y guardarlo como
   `scraping\google_credentials.json` (ignorado por git).
4. La primera corrida abre el navegador para autorizar; el permiso queda en `data\google_token.json`.
   Se usa el permiso mínimo `drive.file`: el scraper solo ve lo que él crea.
5. Los PDFs quedan en `GTH - CVs postulantes/<ID aviso> - <título>/alopez888.pdf`. Compartir esa carpeta con GTH desde Drive.
   En la BD, `cvs.drive_url` guarda el enlace de cada PDF (la vista `v_postulaciones` lo expone como `cv_url`).
6. `python -m scraping.run --subir-drive` sube los PDFs que hayan fallado; `--subir-drive RUTA` importa y sube una carpeta
   `cvs` bajada en otra PC con `--solo-pdfs` (se unen a cada postulante por DNI/correo usando `indice_pdfs_<aviso>.csv`).

No hay servidor encendido todo el día: el scraper corre en la PC con Chrome cuando está prendida.

Chrome debe estar instalado. Selenium descarga el chromedriver correcto; si la red lo bloquea,
poner la ruta del chromedriver en la variable de entorno `CHROMEDRIVER`.

## Panel temporal (botones)

`python -m scraping.panel` o doble clic en `scraping\abrir_panel.bat`. Abre una ventana con:

| Botón | Qué hace |
|---|---|
| 1. Revisar postulantes nuevos | Lee la lista de avisos Publicados y compara *Recibidos* con el último CSV (columna **Nuevos**) |
| 2. Descargar CSV | Exporta e importa el CSV de cada aviso (con la casilla marcada, solo los que cambiaron) |
| 3. Scrapear oferta | Guarda la descripción y requisitos publicados de cada aviso |
| 4. Descargar PDFs | Entra a cada aviso y baja el CV adjunto de los postulantes que faltan |

Si seleccionas filas (Ctrl+clic), los botones 2-4 se aplican solo a esos avisos. *Detener* para al terminar
el paso actual. Las filas amarillas tienen postulantes nuevos; las rojas, errores en PDFs.

## Servidor de GTH (Multitest y recálculo de puntaje)

Un solo servidor atiende los dos pedidos que la web deja en Supabase. Se enciende en esta laptop con
`scraping\iniciar_servidor_gth.bat` (o `python -m scraping.multitest_servidor`, con el Python de `.venv`, que tiene e5).

**Recalcular puntaje** («Requisitos y pesos» en el ranking) deja el pedido en `ranking_recalculos`. El servidor
recalcula el ranking e5 del aviso con los requisitos activos y pesos de `gth_aviso_requisitos` (`ranking.py`): reutiliza
la similitud de los requisitos que ya estaban y solo calcula con e5 los añadidos. El scraper diario usa esos mismos
requisitos y pesos. Requiere la migración `supabase/migrations/20261024120000_ranking_recalculos.sql`.

**Regla de prácticas** (`experiencia.py`): en los avisos de asistente, analista o coordinador, los requisitos «N años de
experiencia» valen min(1, años equivalentes / N), contando la experiencia laboral 1, la práctica profesional 0.5 y la
preprofesional (o «practicante» sin tipo) 0. Solo cuenta la experiencia relacionada: la que tiene una similitud e5 con
el requisito en la mitad alta de las experiencias del aviso (se guarda en `ranking_embeddings.ajustes` para no volver a
calcularla). Ese valor reemplaza la similitud e5 del requisito, dentro de su rango en el aviso.

**Revisión de Bumeran cada 5 minutos**: el servidor corre `python -m scraping.run --rapido` en un proceso
aparte, con la ventana de Chrome (sin ventana, Bumeran bloquea el acceso). Lee la lista de avisos y solo entra a los nuevos o con postulantes nuevos (CSV, oferta, ranking y CV en PDF).
El detalle queda en `data\scraper.log`. Con `--sin-scraping` el servidor no revisa Bumeran.

**Enviar Multitest** (Avance de candidatos, en la web publicada o local) deja el pedido en Supabase (`multitest_envios`).
El servidor:
agrega a los candidatos en Multitest con Playwright (`scripts/multitest-envio.mjs`), presiona Continuar → Enviar por
proceso y confirma los envíos en el avance compartido, aunque la página ya esté cerrada. Cada 15 s marca su latido en
`servidor_latido`; si pasan 90 s sin latido, la web muestra «Servidor apagado» y no deja enviar.

- Requiere `SUPABASE_DB_URL` en `scraping\.env`, `MULTITEST_USUARIO` y `MULTITEST_CLAVE` en `.env.local` y la
  migración `supabase/migrations/20261020180000_multitest_servidor.sql`.
- Chrome trabaja sin ventana; con `--ventana` se ve lo que hace. El detalle queda en `data\multitest_servidor.log` y
  en `automatizacion\multitest\ultima-corrida.log`.

## Uso por consola

Desde la raíz del repo (o doble clic en `scraping\iniciar_scraper.bat`):

| Comando | Qué hace |
|---|---|
| `python -m scraping.run --solo-lista` | Solo lee la lista de avisos. **Primera prueba.** |
| `python -m scraping.run --aviso 1118437785 --max-cvs 3` | Un aviso, solo 3 CVs. **Segunda prueba.** |
| `python -m scraping.run` | Sincronización completa (incremental). |
| `python -m scraping.run --sin-cvs` | Todo menos los PDFs. |
| `python -m scraping.run --forzar` | Vuelve a descargar aunque no haya cambios. |
| `python -m scraping.run --estado` | Muestra el estado de la BD sin abrir Chrome. |
| `python -m scraping.run --importar-csv archivo.csv` | Importa un CSV descargado a mano. |
| `python -m scraping.test_offline archivo.csv` | Prueba la importación sin navegador. |

La primera vez se abre un Chrome propio (perfil en `data\chrome_profile`). Si el ingreso automático
no funciona o aparece un captcha, **ingresa a mano en esa ventana**: el scraper espera hasta 5 minutos
y la sesión queda guardada para las siguientes corridas.

Se puede detener con `Ctrl+C` en cualquier momento: lo avanzado queda guardado y la siguiente corrida
continúa desde donde se quedó (los CVs ya descargados no se repiten).

## Cómo decide qué actualizar

- `avisos.recibidos` = contador actual de Bumeran; `avisos.recibidos_al_scrapear` = valor cuando se bajó el último CSV.
  Si son distintos, se vuelve a bajar el CSV y se buscan CVs nuevos.
- Cada CSV se importa con *upsert* (llave: aviso + DNI, o correo si no hay DNI): no duplica.
- Los CVs se identifican por la tarjeta del postulante; los ya resueltos (`descargado` / `sin_adjunto`) se saltan.
- La vista `v_postulaciones` une cada postulación con la ruta de su PDF (por DNI o correo).
- "Actualizado hace …" en la interfaz = `avisos.ultimo_csv_at` (o la última fila de `scrape_runs` del aviso).

## Notas

- Abrir el perfil de un postulante en Bumeran lo marca como leído (acordado: no importa).
- En la lista de postulantes se quitan los filtros activos (p. ej. experiencia por área) para ver a todos.
  Si GTH usa filtros guardados, los puede volver a aplicar desde "Búsquedas guardadas".
- Si algo falla, en `data\debug\` queda una captura y el HTML de la página, y en `data\scraper.log` el detalle.
- Los selectores de Bumeran están todos en `bumeran.py`.
