# Plan de Implementación · TalentAI | GTHC · ESAN (Branch GEM)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una demo funcional completa, moderna, cálida e institucional para TalentAI | GTHC · ESAN utilizando React 19, TypeScript y Vite, cumpliendo las 30 secciones de la especificación técnica en la rama `GEM`.

**Architecture:** Aplicación modular con React + TypeScript + Vite. Capa de datos desacoplada con tipos estrictos (`JobPosting`, `Candidate`, `Application`), persistencia en `localStorage` versionado (`GTH_ESAN_STATE_V1`), reglas de negocio centralizadas en `recruitmentRules.ts`, componentes UI accesibles y tokens CSS institucionales ESAN (Rojo `#B71936` / `#C8102E`, superficies cálidas `#F6F3EF` / `#FFFEFD`, modo oscuro balanceado).

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS / Vanilla CSS Variables, Lucide React, Vitest para validación de reglas de negocio.

**Spec:** [`docs/superpowers/specs/2026-10-01-gth-esan-interface-design.md`](file:///c:/Users/quisp/OneDrive/Documentos/ESAN%20AI/GTH_Interfaz/docs/superpowers/specs/2026-10-01-gth-esan-interface-design.md)

## Global Constraints
- Rama de trabajo exclusiva: `GEM` (no tocar `main` ni `codex/convocatorias-demo-flow`).
- Separación estricta de identificadores: `jobPostingId`, `candidateId` y `id` propio de postulación (`applicationId`).
- ML y LLM son dos puntajes independientes (0–100); nunca se deben promediar ni fusionar en un "score global".
- La acción Liberar postulación retira de "En proceso" y del ranking, recalcula indicadores de inmediato y conserva la postulación en "No continúan" y en el "Banco de Talento".
- La acción Avanzar marcados traslada a "Preseleccionado", guarda borradores de correo locales y mantiene a los candidatos en "En proceso", "Todos" y el tablero de etapas.
- Una misma persona puede tener múltiples postulaciones con puntajes independientes en cada convocatoria.
- No incluir selector de roles ni autenticación ficticia (único perfil visible: "Equipo de GTHC").
- No incluir preguntas inventadas STAR ni pantallas de brechas retiradas.
- Todas las exportaciones CSV deben usar UTF-8 con BOM (`\uFEFF`) y delimitador punto y coma (`;`).
- Modos de apariencia: Claro, Oscuro y Según mi equipo, persistidos en `localStorage`.

---

## Tareas de Implementación

### Task 1: Scaffolding y Setup del Proyecto Vite + React + TypeScript
**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Move to legacy: `legacy-vanilla/` (mover `js/`, `css/`, `index.html` original como archivo histórico)

- [ ] **Step 1: Crear directorio de respaldo `legacy-vanilla` y mover archivos anteriores**
- [ ] **Step 2: Configurar `package.json` con dependencias (react, react-dom, lucide-react, vite, typescript, @vitejs/plugin-react, vitest)**
- [ ] **Step 3: Configurar `vite.config.ts`, `tsconfig.json` e `index.html` con fuentes Google Fonts (Outfit, Inter)**
- [ ] **Step 4: Configurar `src/index.css` con variables CSS institucionales ESAN y reset tipográfico**
- [ ] **Step 5: Instalar dependencias con `npm install` y verificar que `npm run build` o `vite` compila**
- [ ] **Step 6: Commit en Git (`chore: setup vite react typescript project structure`)**

---

### Task 2: Definición de Tipos y Dataset Inicial Completo
**Files:**
- Create: `src/types/index.ts`
- Create: `src/data/initialData.ts`

- [ ] **Step 1: Definir interfaces en `src/types/index.ts` (`JobPosting`, `Candidate`, `Application`, `Stage`, `Criterion`, `RequirementStatus`, `ActivityLog`, `DecisionLog`, `EmailDraft`)**
- [ ] **Step 2: Crear `initialData.ts` con el inventario completo de 18 convocatorias (8 docentes, 5 administrativas, 3 operativas, 2 directivas)**
- [ ] **Step 3: Agregar las 7 plantillas oficiales de perfiles de puesto con sus criterios y porcentajes (100%)**
- [ ] **Step 4: Incorporar los 10 candidatos de ejemplo en las 3 convocatorias activas, más casos de prueba (puntaje ausente `null`, requisito sin verificar, persona con dos postulaciones, contacto sin correo)**
- [ ] **Step 5: Commit en Git (`feat: add strict domain types and initial mock dataset`)**

---

### Task 3: Capa de Reglas de Negocio Centralizadas y Persistencia Local
**Files:**
- Create: `src/services/recruitmentRules.ts`
- Create: `src/services/storage.ts`
- Create: `src/services/__tests__/recruitmentRules.test.ts`

- [ ] **Step 1: Escribir pruebas unitarias en `src/services/__tests__/recruitmentRules.test.ts` para elegibilidad Top-N, liberación, avance y cálculo de métricas**
- [ ] **Step 2: Implementar funciones en `src/services/recruitmentRules.ts` (`isEligibleForTopN`, `getTopCandidates`, `advanceApplications`, `releaseApplication`, `calculateJobMetrics`)**
- [ ] **Step 3: Implementar `src/services/storage.ts` con versionado `GTH_ESAN_STATE_V1` y fallback a memoria si falla `localStorage`**
- [ ] **Step 4: Ejecutar `npm run test` (vitest) y verificar paso exitoso de todas las pruebas**
- [ ] **Step 5: Commit en Git (`feat: implement centralized business rules and versioned storage`)**

---

### Task 4: Sistema de Diseño Institucional y Componentes Base de Navegación
**Files:**
- Create: `src/context/AppContext.tsx`
- Create: `src/components/common/Button.tsx`, `Badge.tsx`, `Modal.tsx`, `Drawer.tsx`, `Tabs.tsx`, `Input.tsx`, `Select.tsx`
- Create: `src/components/layout/Header.tsx`, `Sidebar.tsx`, `ActiveJobBanner.tsx`, `MobileNav.tsx`

- [ ] **Step 1: Implementar `AppContext.tsx` con gestión del puesto activo, convocatorias, postulaciones, candidatos, tema y notificaciones toast**
- [ ] **Step 2: Crear componentes comunes accesibles con soporte para tema claro/oscuro y reducción de movimiento**
- [ ] **Step 3: Crear `Sidebar.tsx` con agrupación de navegación por tareas (Puestos, Candidatos, Seguimiento, Talento, Configuración, Resultados) y botón de colapso**
- [ ] **Step 4: Crear `Header.tsx` con selector rápido de convocatoria activa, indicador de equipo GTHC y alternador de tema**
- [ ] **Step 5: Integrar layout en `App.tsx` y verificar visualmente en navegador**
- [ ] **Step 6: Commit en Git (`feat: implement layout, theme support and core accessible components`)**

---

### Task 5: Componentes de Candidatos, Ficha Lateral (Drawer) y Acciones Rápidas
**Files:**
- Create: `src/components/candidate/StageBadge.tsx`, `RequirementPill.tsx`, `ScoreBadge.tsx`
- Create: `src/components/candidate/CandidateDrawer.tsx`
- Create: `src/components/modals/EmailDraftModal.tsx`, `ScheduleModal.tsx`, `NoteModal.tsx`

- [ ] **Step 1: Implementar `StageBadge.tsx`, `RequirementPill.tsx` y `ScoreBadge.tsx` con colores accesibles, iconos y etiquetas legibles**
- [ ] **Step 2: Implementar `CandidateDrawer.tsx` con cabecera informativa, pestañas ("Por qué este puntaje", "Otras oportunidades", "Detalle de criterios", "Ver CV legible", "Actividad", "Historial") y sin preguntas STAR inventadas**
- [ ] **Step 3: Implementar `EmailDraftModal.tsx` con plantillas (Personal, Avance, Cierre, Entrevista), variables `{nombre}` / `{puesto}`, vista previa y guardado como borrador local**
- [ ] **Step 4: Implementar `NoteModal.tsx` y `ScheduleModal.tsx` con registro cronológico en Actividad sin cambiar etapa automáticamente**
- [ ] **Step 5: Probar apertura, foco de teclado, edición en modales sobre el drawer y cierre con Escape**
- [ ] **Step 6: Commit en Git (`feat: implement candidate drawer, badges, and quick action modals`)**

---

### Task 6: Pantalla Central de Mejores Candidatos y Flujo de Decisión
**Files:**
- Create: `src/views/MejoresCandidatosView.tsx`
- Create: `src/components/candidate/CandidateTable.tsx`
- Create: `src/components/modals/AdvanceDecisionModal.tsx`, `ReleaseModal.tsx`

- [ ] **Step 1: Implementar `CandidateTable.tsx` con selector de densidad (cómoda/compacta), paginación (25/50/100), orden por ML o LLM y casillas de selección múltiple**
- [ ] **Step 2: Implementar resumen superior con métricas calculadas y controles de cantidad Top-N y método (ML/LLM) con botón "Elegir los mejores"**
- [ ] **Step 3: Implementar pestañas ("En proceso", "Mejores perfiles", "Marcados", "No continúan", "Todos") con conteos sincronizados**
- [ ] **Step 4: Implementar barra integrada de acciones sobre marcados (Limpiar, Ver marcados, Comparar, Decidir quién avanza)**
- [ ] **Step 5: Implementar `AdvanceDecisionModal.tsx` con vista previa de mensajes y opción explícita "Los otros perfiles evaluados no avanzan"**
- [ ] **Step 6: Implementar `ReleaseModal.tsx` explicando el resultado (pasa a No continúan y Banco de Talento, actualiza ranking)**
- [ ] **Step 7: Validar que avanzar o liberar recalcula posiciones y actualiza todas las pestañas sin borrar al candidato**
- [ ] **Step 8: Commit en Git (`feat: implement central candidate table and decision workflow`)**

---

### Task 7: Comparador Multicandidato y Tablero de Etapas (Avance de Candidatos)
**Files:**
- Create: `src/views/ComparadorView.tsx`
- Create: `src/views/AvanceCandidatosView.tsx`
- Create: `src/components/kanban/KanbanBoard.tsx`, `KanbanCard.tsx`

- [ ] **Step 1: Implementar `ComparadorView.tsx` con scroll horizontal sin límite artificial, matriz de criterios y evidencias, y botón "Decidir quién avanza"**
- [ ] **Step 2: Implementar `AvanceCandidatosView.tsx` con columnas por etapa (`postulado` a `contratado`) y tarjetas compactas con puntajes**
- [ ] **Step 3: Agregar controles accesibles (botones avanzar/retroceder y drag & drop) con validación de requisitos obligatorios**
- [ ] **Step 4: Validar coherencia de conteos y estados entre la tabla, el comparador y el tablero**
- [ ] **Step 5: Commit en Git (`feat: implement candidate comparator and accessible stage kanban board`)**

---

### Task 8: Convocatorias, Perfiles de Puestos y Asistente de Creación (Wizard 4 Pasos)
**Files:**
- Create: `src/views/ConvocatoriasView.tsx`
- Create: `src/views/PerfilesPuestosView.tsx`
- Create: `src/views/NuevaConvocatoriaView.tsx`

- [ ] **Step 1: Implementar `ConvocatoriasView.tsx` con tarjetas/grid de las 18 convocatorias, filtros por categoría/estado y cálculo de postulaciones reales**
- [ ] **Step 2: Implementar `PerfilesPuestosView.tsx` con las 7 plantillas de perfiles, vista de criterios y botón "Usar este perfil"**
- [ ] **Step 3: Implementar `NuevaConvocatoriaView.tsx` en 4 pasos (Elegir plantilla -> Datos del puesto -> Requisitos y Criterios 100% -> Revisión y Guardar activa/borrador)**
- [ ] **Step 4: Validar que una nueva convocatoria comience vacía sin heredar candidatos de otros puestos**
- [ ] **Step 5: Commit en Git (`feat: implement job postings, profile templates catalog and 4-step wizard`)**

---

### Task 9: Agregar Archivos (Carga & Lotes) y Banco de Talento
**Files:**
- Create: `src/views/AgregarArchivosView.tsx`
- Create: `src/views/BancoTalentoView.tsx`
- Create: `src/components/modals/LinkToJobModal.tsx`

- [ ] **Step 1: Implementar `AgregarArchivosView.tsx` con selector de archivos (PDF, Word, PNG/JPG, CSV), vista previa y aviso de OCR pendiente**
- [ ] **Step 2: Implementar generador de lotes ficticios demostrativos de 25, 100 y 500 perfiles asignados a la convocatoria activa**
- [ ] **Step 3: Implementar `BancoTalentoView.tsx` con lista paginada de talentos guardados y candidatos liberados con su puesto de origen**
- [ ] **Step 4: Implementar `LinkToJobModal.tsx` para vincular un talento a una nueva convocatoria (creando una postulación independiente con evaluación pendiente)**
- [ ] **Step 5: Commit en Git (`feat: implement file ingestion, batch generator and talent pool management`)**

---

### Task 10: Servicio de Exportación CSV Real y Comparativa de la Descarga
**Files:**
- Create: `src/services/exportService.ts`
- Update: `src/views/BancoTalentoView.tsx` con sección de descargas centrales

- [ ] **Step 1: Implementar `exportService.ts` con UTF-8, BOM (`\uFEFF`), delimitador `;` y sanitización de celdas contra inyecciones de fórmulas**
- [ ] **Step 2: Implementar descarga de candidatos con las 13 columnas especificadas (con puntajes ML y LLM separados)**
- [ ] **Step 3: Implementar bloque "Los mejores perfiles de esta descarga" y botón de comparativa CSV detallada**
- [ ] **Step 4: Implementar descarga del catálogo de perfiles de puestos con exactamente 4 columnas (`ID`, `Perfil`, `Categoría`, `Requisito`)**
- [ ] **Step 5: Probar generación y descarga de archivos en el navegador**
- [ ] **Step 6: Commit en Git (`feat: implement real UTF-8 BOM CSV exports and download comparison`)**

---

### Task 11: Criterios de Evaluación, Historial de Decisiones, Resultados y Resumen General
**Files:**
- Create: `src/views/CriteriosEvaluacionView.tsx`
- Create: `src/views/HistorialDecisionesView.tsx`
- Create: `src/views/ResultadosProcesoView.tsx`
- Create: `src/views/ResumenGeneralView.tsx`

- [ ] **Step 1: Implementar `CriteriosEvaluacionView.tsx` con sliders/inputs sumando 100% y simulación de antes/después manteniendo ML y LLM separados**
- [ ] **Step 2: Implementar `HistorialDecisionesView.tsx` con bitácora cronológica local filtrable por candidato y convocatoria**
- [ ] **Step 3: Implementar `ResultadosProcesoView.tsx` con métricas de contrataciones reales y apartados futuros marcados como "Pendiente de seguimiento"**
- [ ] **Step 4: Implementar `ResumenGeneralView.tsx` con métricas consolidadas de todas las convocatorias y tabla de puestos**
- [ ] **Step 5: Commit en Git (`feat: implement criteria simulation, decision history, hiring results and executive summary`)**

---

### Task 12: Asistente GTH Honesto y Ajustes Generales
**Files:**
- Create: `src/components/assistant/GTHAssistantDrawer.tsx`
- Create: `src/views/AjustesGeneralesView.tsx`

- [ ] **Step 1: Implementar `GTHAssistantDrawer.tsx` con aviso honesto "Asistente de demostración · Sin conexión a IA", preguntas sugeridas contextuales al puesto activo y enlaces a fichas**
- [ ] **Step 2: Implementar `AjustesGeneralesView.tsx` con selector de apariencia (Claro, Oscuro, Según mi equipo), reducción de animaciones y estado de integraciones futuras**
- [ ] **Step 3: Probar persistencia del modo oscuro y sincronización con el sistema operativo sin parpadeo claro**
- [ ] **Step 4: Commit en Git (`feat: implement honest demo assistant and appearance settings`)**

---

### Task 13: Verificación Final de Todos los Recorridos de Aceptación y Documentación
**Files:**
- Test & Verify: Recorridos de aceptación 1 al 13
- Update: `README.md` con instrucciones de ejecución local y lista de cobertura

- [ ] **Step 1: Ejecutar verificación en navegador para los 13 recorridos de aceptación descritos en la sección 27**
- [ ] **Step 2: Verificar respuesta táctil y diseño en móvil (390px y 360px), tablet y escritorio (1440px)**
- [ ] **Step 3: Ejecutar `npm run build` para validar que TypeScript y el empaquetado Vite no generan ningún error**
- [ ] **Step 4: Actualizar `README.md` explicando las decisiones de diseño, la lista de cobertura y cómo ejecutar la demo**
- [ ] **Step 5: Commit final en Git (`docs: complete demo verification, coverage report, and documentation`)**
