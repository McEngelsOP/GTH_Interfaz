# Especificación de Diseño Técnico · TalentAI | GTHC · ESAN (Branch GEM)

**Fecha:** 2026-10-01  
**Estado:** Propuesta de Diseño Aprobada para Desarrollo  
**Rama de Git:** `GEM`  
**Objetivo:** Construir una demo funcional completa, moderna, cálida e institucional para TalentAI GTHC · ESAN con React, TypeScript y Vite, cumpliendo rigurosamente los 30 apartados y reglas de la especificación técnica.

---

## 1. Arquitectura General y Tecnologías

### 1.1 Stack Tecnológico
- **Framework & Bundler:** React 19 + TypeScript + Vite 6.
- **Estilos & Diseño:** Tokens de diseño en CSS puro y utilidades fluidas con Tailwind CSS / Vanilla CSS Variables para máximo control y rendimiento.
- **Iconografía:** Lucide React (familia lineal consistente con accesibilidad semántica).
- **Almacenamiento:** Persistencia local versionada (`localStorage`) con namespace `GTH_ESAN_STATE_V1` y degradación elegante a memoria en caso de bloqueo o cuota.
- **Exportación de Archivos:** Generador nativo de CSV UTF-8 con BOM (`\uFEFF`) y separador `;` para compatibilidad completa con Microsoft Excel en español sin alterar tildes ni caracteres especiales.

### 1.2 Estructura de Directorios del Proyecto
```
GTH_Interfaz/ (Branch GEM)
├── index.html                     # HTML raíz con fuentes Outfit e Inter de Google Fonts
├── package.json                   # Dependencias de React, Vite, TS, Lucide
├── vite.config.ts                 # Configuración de Vite
├── tsconfig.json                  # Tipado estricto TS
├── legacy-vanilla/                # Respaldo histórico del prototipo previo
├── public/                        # Favicon, assets e imágenes institucionales
└── src/
    ├── main.tsx                   # Punto de entrada de React
    ├── App.tsx                    # Componente raíz con Router de estado y tema
    ├── index.css                  # Design Tokens (Colores ESAN, espaciados, tipografías, dark mode)
    ├── types/                     # Definiciones de tipos TS (JobPosting, Candidate, Application, etc.)
    ├── data/                      # Datos iniciales de referencia (18 convocatorias, 7 plantillas, candidatos)
    ├── services/                  # Lógica de negocio y persistencia
    │   ├── storage.ts             # Persistencia local versionada y fallback
    │   ├── recruitmentRules.ts    # Centralización de reglas (elegibilidad, Top-N, avance, liberación)
    │   └── exportService.ts       # Descargas CSV formateadas con BOM
    ├── context/                   # Contexto de aplicación (AppContext: puesto activo, tema, notificaciones)
    ├── components/                # Componentes reutilizables
    │   ├── layout/                # Sidebar, Header, MobileNav, ActiveJobBanner
    │   ├── common/                # Button, Badge, Modal, Drawer, Table, Tabs, Input, Select
    │   ├── candidate/             # CandidateDrawer, CandidateCard, StageBadge, RequirementPill
    │   ├── modals/                # AdvanceDecisionModal, ReleaseModal, EmailDraftModal, ScheduleModal, NoteModal
    │   └── assistant/             # GTHAssistantDrawer (Asistente honesto de demostración)
    └── views/                     # Pantallas principales
        ├── ConvocatoriasView.tsx      # Gestión de convocatorias y catálogo de puestos
        ├── PerfilesPuestosView.tsx    # Biblioteca de 7 plantillas de perfiles
        ├── NuevaConvocatoriaView.tsx  # Wizard de 4 pasos para crear convocatoria
        ├── AgregarArchivosView.tsx    # Carga de documentos, validación CSV y generador de lotes
        ├── MejoresCandidatosView.tsx  # Vista central: tabla, Top-N, orden ML/LLM, pestañas y acciones
        ├── ComparadorView.tsx         # Matriz comparativa de 2 a N candidatos
        ├── AvanceCandidatosView.tsx   # Tablero de etapas (Kanban de avance)
        ├── BancoTalentoView.tsx       # Repositorio de talento, perfiles liberados y descargas CSV
        ├── CriteriosEvaluacionView.tsx# Edición de ponderaciones (100%) y simulación de puntajes
        ├── HistorialDecisionesView.tsx# Auditoría cronológica local de decisiones del puesto
        ├── ResultadosProcesoView.tsx  # Métricas de contratación y estados de seguimiento futuro
        ├── ResumenGeneralView.tsx     # Dashboard ejecutivo consolidado
        └── AjustesGeneralesView.tsx   # Preferencias de tema (claro/oscuro/sistema) y animaciones
```

---

## 2. Modelo de Datos y Entidades Centrales

Para garantizar la integridad y evitar mezclas o datos contradictorios entre pantallas:
- **`JobPosting`**: Identificador `id` (ej. `REQ-2026-DOC-088`), título, categoría (`docente`, `administrativo`, `operativo`, `directivo`), área, período, estado (`activa`, `borrador`), vacantes previstas (`number | null`), requisito obligatorio, criterios con ponderaciones y método asignado (`ML` | `LLM`).
- **`Candidate`**: Identificador `candidateId` (ej. `cand-001`), nombre completo, contacto real (`email?: string | null`, `phone?: string | null`), puesto actual, empresa, fuente, texto del CV estructurado en Markdown, guardado en banco (`boolean`), notas.
- **`Application`**: Identificador `id` de postulación (ej. `app-001`), `jobPostingId`, `candidateId`, etapa actual (`postulado`, `preseleccionado`, `en_entrevista`, `en_evaluacion`, `en_oferta`, `contratado`, `no_continua`), `mlScore: number | null`, `llmScore: number | null`, estado de requisitos obligatorios (`verificado`, `parcial`, `no_cumple`, `sin_verificar`), desglose de evidencia por criterio, justificación explicable (`porQueEstePuntaje`, fortalezas, requisitos).
- **`Activity`**: Registro cronológico por postulación (`stage_change`, `note`, `interview`, `draft_email`), autor, fecha y detalles.
- **`DecisionLog`**: Registro inmutable de auditoría local por puesto (`jobPostingId`, `applicationId`, acción, autor, timestamp, versión de criterios, contexto ML y LLM).

---

## 3. Reglas de Negocio Centralizadas (`recruitmentRules.ts`)

1. **Elegibilidad para "Mejores perfiles" y Primera Decisión de Avance:**
   - La postulación debe estar exactamente en etapa `postulado`.
   - El requisito obligatorio debe estar en estado `verificado` (el valor `sin_verificar` nunca se asume como cumplido).
   - Debe contar con puntaje registrado para el método seleccionado (`mlScore !== null` si el método es `ML`, o `llmScore !== null` si el método es `LLM`).
2. **Independencia de ML y LLM:**
   - No se calcula promedio ni puntaje ponderado global. Ambos números se muestran y operan por separado (0–100).
   - Si falta el puntaje del método elegido, se marca como motivo de bloqueo.
3. **Selección Dinámica Top-N ("Elegir los mejores"):**
   - Ordena los candidatos elegibles pendientes por el método seleccionado descendentemente.
   - Marca la cantidad seleccionada. Si hay menos perfiles elegibles que la cantidad solicitada, informa explícitamente cuántos se pudieron marcar.
4. **Confirmación de Avance:**
   - Transfiere a los seleccionados de `postulado` a `preseleccionado`.
   - Limpia marcas temporales de revisión.
   - Los seleccionados dejan de ser "pendientes de primera decisión" (salen de la pestaña *Mejores perfiles*), pero continúan activos en *En proceso*, *Todos* y el tablero *Avance de candidatos*.
   - Los borradores de correo configurados se guardan localmente en la postulación con estado `borrador`.
5. **Liberación de Postulaciones:**
   - La postulación pasa inmediatamente a estado `no_continua`.
   - Se retira del ranking activo, de las marcas y de *En proceso*.
   - Se recalculan indicadores y posiciones de inmediato.
   - Permanece registrada en la pestaña *No continúan* y en el *Banco de Talento*.
6. **Múltiples Postulaciones de una misma Persona:**
   - Se enlazan por `candidateId`, pero cada `Application` tiene su propio `id`, su propia convocatoria y sus propios puntajes independientes. Avanzar o liberar en un puesto no altera al otro puesto.

---

## 4. Dirección Visual y Diseño Institucional

### 4.1 Paleta de Color
- **Rojo ESAN Principal:** `#B71936` (acciones principales, estado activo en navegación, indicadores clave).
- **Rojo Alternativo:** `#C8102E`.
- **Fondo Claro Cálido:** `#F6F3EF`.
- **Superficies Claras:** `#FFFEFD` / `#FFFFFF`.
- **Texto Principal:** `#263243`.
- **Texto Secundario:** `#596373`.
- **Modo Oscuro Cálido:** Fondo `#14171C`, Superficie `#1E232B`, Superficie Elevada `#272D37`, Bordes `#353D4A`, Texto `#F3F4F6`.
- **Estados Semánticos:**
  - Verificado / Éxito: `#15803D` (Verde esmeralda con icono `CheckCircle2`).
  - Parcial / Alerta: `#B45309` (Ámbar con icono `AlertTriangle`).
  - No cumple / Error: `#DC2626` (Rojo con icono `XCircle`).
  - Sin verificar / Pendiente: `#64748B` (Gris slate con icono `Clock`).

### 4.2 Tipografía
- Títulos: `Outfit`, sans-serif (pesos 600, 700).
- Cuerpo, tablas y formularios: `Inter`, sans-serif (pesos 400, 500, 600).
- Jerarquía legible: Sin fuentes diminutas ilegibles; tamaños mínimos de 13px para metadatos y 14-16px para texto regular.

### 4.3 Movimiento y Accesibilidad
- Duración de transiciones: 140–200 ms.
- Soporte para `prefers-reduced-motion` y botón manual en Ajustes Generales.
- Teclado: Cierre de modales y drawers con tecla `Escape`, navegación accesible por pestañas y tablas.

---

## 5. Cobertura de Pantallas y Funcionalidades

| Módulo / Pantalla | Funcionalidades Clave |
|---|---|
| **Convocatorias** | Catálogo de 18 convocatorias (8 docentes, 5 adm, 3 ope, 2 dir). Conteo real calculado de candidatos. Filtro por categoría, búsqueda por código/área. Cambio inmediato del contexto activo. |
| **Perfiles de Puestos** | Catálogo de 7 plantillas completas con requisitos y criterios. Acción "Usar este perfil" para precargar formulario de nueva convocatoria. |
| **Nueva Convocatoria** | Asistente de 4 pasos (Plantilla -> Datos -> Criterios sumando 100% -> Revisión y Guardado como activa o borrador). Comienza vacía sin candidatos falsos. |
| **Agregar Archivos** | Carga de archivos por selección y drag & drop (PDF, DOCX, imágenes, CSV). Validación estricta del CSV de catálogo. Aviso transparente de OCR pendiente. Generador de lotes demostrativos de 25, 100 y 500 candidatos. |
| **Mejores Candidatos** | Indicadores reales de la convocatoria. Selector Top-N numérico y de método (ML / LLM). Botón "Elegir los mejores". Tabla con densidades cómoda/compacta, paginación, filtros. Pestañas: En proceso, Mejores perfiles, Marcados, No continúan, Todos. Franja de acciones para marcados (Comparar, Decidir avance, Limpiar). |
| **Comparador** | Matriz horizontal para 2 a N candidatos sin tope forzado. Detalle de criterios, fortalezas, evidencias y botón para decidir quién avanza. |
| **Ficha del Candidato** | Slide-over drawer accesible. Acciones rápidas (Correo, Entrevista, Nota, Actividad). Pestañas de detalle de puntajes, otras oportunidades, criterios, CV ficticio legible, actividad y registro de decisiones. |
| **Borrador de Correo** | Editor modal con plantillas (Personal, Avance, Cierre, Entrevista), variables `{nombre}`, `{puesto}`, vista previa y guardado en actividad con aviso de integración Gmail pendiente. |
| **Notas y Entrevistas** | Formularios rápidos que registran actividades fechadas sin alterar automáticamente la etapa del candidato. |
| **Avance de Candidatos** | Tablero visual de 6 etapas con tarjetas compactas, botones para avanzar/retroceder y drag & drop accesible. |
| **Banco de Talento** | Registro permanente de candidatos guardados y postulaciones liberadas. Vinculación a nuevo puesto como nueva postulación independiente. |
| **Exportación CSV** | Descargas reales UTF-8 con BOM (Candidatos con 13 columnas acordadas, Comparativa de los mejores, Catálogo de perfiles con 4 columnas, y perfiles de banco). |
| **Criterios de Evaluación** | Ajuste interactivo de ponderaciones (suma 100%) y simulación previa de recálculo antes de guardar versión. |
| **Historial de Decisiones** | Bitácora cronológica de acciones de selección por puesto y candidato. |
| **Resultados del Proceso** | Métricas de contrataciones reales y apartados futuros con aviso de "Pendiente de seguimiento". |
| **Resumen General** | Vista gerencial consolidada con indicadores agregados y tabla comparativa de todas las convocatorias. |
| **Asistente GTH** | Panel lateral de asistente con preguntas sugeridas contextuales al puesto activo y enlaces directos a fichas, indicando honestamente que es un asistente de demostración sin conexión real a IA. |
| **Ajustes Generales** | Configuración de tema (Claro / Oscuro / Según mi equipo) y selector de reducción de movimiento. |

---

## 6. Procedimiento de Verificación y Criterios de Aceptación
1. Abrir convocatoria vacía: Debe mostrar estado vacío y botón para agregar archivos sin candidatos heredados de otros puestos.
2. Crear convocatoria con plantilla: Precarga datos de plantilla y valida criterios al 100%.
3. Cambiar cantidad y método: Elige la cantidad indicada de candidatos elegibles pendientes, ordenados estrictamente por el método seleccionado (ML o LLM).
4. Marcar y limpiar: Marcar casillas no cambia etapas; limpiar quita marcas sin perder registros.
5. Comparar más de 5 candidatos: La tabla comparativa hace scroll horizontal sin desbordar la ventana.
6. Confirmar avance: Candidatos pasan a Preseleccionado, dejan "Mejores perfiles" y siguen visibles en "En proceso" y "Avance de candidatos".
7. Liberar candidato: Sale de mejores pendientes y de "En proceso", se recalcula el ranking de inmediato y se conserva en "No continúan" y "Banco de Talento".
8. Multiconvocatoria: La postulación de una persona en otro puesto conserva su propio estado y puntajes independientes.
9. Correo y Entrevista: Quedan como borrador / registro local sin simular envíos no realizados.
10. Descargas CSV: Archivos reales compatibles con Excel con acentos y delimitador `;`.
11. Tema oscuro y recarga: Persistencia en `localStorage` sin parpadeos visuales ni pérdida de datos.
