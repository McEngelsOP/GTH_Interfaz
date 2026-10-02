# 🏛️ Manual de Arquitectura, Estructura, Funcionalidad y Diseño del Sistema TalentAI · ESAN


La revisión funcional posterior está documentada en [docs/GEM_DEBUG_REPORT.md](docs/GEM_DEBUG_REPORT.md). Ese informe describe las reglas corregidas de Top-N, decisiones por expediente, vinculación con evaluación pendiente y límites de las integraciones de esta demo.

Este documento detalla exhaustivamente la arquitectura técnica, la estructura visual, la funcionalidad de cada componente y vista, y el sistema de diseño implementado en la plataforma **TalentAI** para la Dirección de Gestión del Talento Humano y Colaboradores (**GTHC**) de **ESAN Graduate School of Business**.

---

## 1. 🎨 Sistema y Filosofía de Diseño (Design System)

La interfaz fue diseñada bajo un enfoque **Craft-First**, garantizando sobriedad académica, alto contraste, densidad de información óptima y un acabado moderno.

### 1.1 Paleta Institucional y Variables Semánticas (`src/index.css`)
El sistema utiliza variables CSS con valores HSL y HEX diseñadas para adaptarse instantáneamente a temas claro y oscuro:

- **Rojo Carmesí Institucional ESAN:**
  - Primario: `#C8102E` (`--primary-red`)
  - Hover / Acento Oscuro: `#B71936` (`--primary-red-hover`)
  - Fondos suaves / Badges: `rgba(200, 16, 46, 0.08)` (`--primary-red-subtle`)
- **Modo Claro (Superficies Cálidas y Profesionales):**
  - Fondo Base del Canvas: `#F6F3EF` (`--bg-base`) — tono pergamino/marfil corporativo que reduce el cansancio visual.
  - Superficie de Tarjetas y Modales: `#FFFFFF` (`--bg-surface`).
  - Bordes y Separadores: `#E2DDD5` (`--border-default`) y `#ECE8E1` (`--border-subtle`).
  - Textos: `#1A1D20` (Primario), `#5A626A` (Secundario), `#8C96A0` (Muted/Placeholder).
- **Modo Oscuro (Grafito y Carbón Cálido):**
  - Fondo Base: `#14171C` (`--bg-base`).
  - Superficie de Tarjetas: `#1E232B` (`--bg-surface`).
  - Superficie Elevada: `#282E38` (`--bg-elevated`).
  - Bordes: `#323A46` (`--border-default`).
  - Textos: `#F0F2F5` (Primario), `#9BA3AF` (Secundario), `#636B78` (Muted).
- **Colores de Doble Análisis (Dualidad Analítica):**
  - **Machine Learning (ML):** Azul analítico `#2563EB` (`--method-ml-color`), badge con fondo `#EFF6FF`.
  - **Modelos de Lenguaje (LLM):** Púrpura semántico `#7C3AED` (`--method-llm-color`), badge con fondo `#F5F3FF`.
- **Estados Semánticos y Verificación:**
  - Cumplido / Verificado: Verde esmeralda (`#059669`, fondo `#ECFDF5`).
  - Knockout / No Cumple / Error: Rojo alerta (`#DC2626`, fondo `#FEF2F2`).
  - Sin Verificar / Pendiente: Ámbar advertencia (`#D97706`, fondo `#FFFBEB`).

### 1.2 Tipografía y Jerarquía
- **Familia tipográfica:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`.
- **Escalas:**
  - Títulos principales (`h1`): `1.35rem` a `1.5rem`, `font-weight: 700`.
  - Títulos de tarjeta / sección (`h2`, `h3`): `1.05rem` a `1.2rem`, `font-weight: 600`.
  - Textos de contenido / tablas: `0.8125rem` a `0.875rem`, `line-height: 1.45`.
  - Etiquetas y micro-copys: `0.75rem`, `font-weight: 600`.

### 1.3 Micro-Interacciones y Accesibilidad
- **Transiciones:** `150ms` a `220ms` con curva cúbica suave (`cubic-bezier(0.4, 0, 0.2, 1)`).
- **Feedback táctil y hover:** Efectos de elevación (`translateY(-2px)` y sombra `var(--shadow-md)`), iluminaciones de borde (`border-color: var(--primary-red)` en enfoque).
- **Accesibilidad:** Regla nativa `@media (prefers-reduced-motion: reduce)` que desactiva animaciones y transiciones para usuarios con sensibilidad vestibular o modo de rendimiento activado.

---

## 2. 🏗️ Arquitectura de la Interfaz (Shell & Layout)

La aplicación sigue un diseño estructural en tres áreas principales coordinadas mediante `src/context/AppContext.tsx`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER SUPERIOR (Marca ESAN, Selector de Puesto, Asistente, Tema, Usuario)  │
├───────────────┬─────────────────────────────────────────────────────────────┤
│               │ BANNER DE PUESTO ACTIVO (Código, Título, Área, Semestre)    │
│ SIDEBAR       ├─────────────────────────────────────────────────────────────┤
│ LATERAL       │                                                             │
│ (Navegación   │ ÁREA DE TRABAJO PRINCIPAL (Vista dinámica activa)           │
│  Jerárquica   │ (13 Vistas operativas y estratégicas)                       │
│  por Módulos) │                                                             │
│               │                                                             │
└───────────────┴─────────────────────────────────────────────────────────────┘
  DRAWER FLOTANTE: Asistente GTH / Bitácora de Auditoría
  TOAST NOTIFICATIONS: Feedback instantáneo en esquina superior derecha
```

### 2.1 Header Superior (`src/components/layout/Header.tsx`)
- **Identidad de Marca:** Logotipo institucional de ESAN, texto "TalentAI · ESAN" y subtítulo "GTHC · Selección".
- **Botón Colapsar Menú:** Permite alternar la barra lateral entre modo expandido y modo icono compacto.
- **Selector de Puesto Activo (`ActiveJobSelector`):** Dropdown que lista las convocatorias vigentes con su código, departamento y etiqueta de estado. Cambiar de puesto actualiza automáticamente el contexto global.
- **Acceso Asistente GTH:** Botón para desplegar el drawer interactivo del Asistente IA.
- **Alternador de Tema (Dark/Light):** Conmutador rápido de un clic con persistencia en `localStorage`.
- **Identificador de Usuario:** Badge del evaluador ("Equipo de GTHC · Universidad ESAN").

### 2.2 Barra Lateral (`src/components/layout/Sidebar.tsx`)
Organizada temáticamente en 6 bloques jerárquicos:

1. **PUESTOS:**
   - `Convocatorias` (`convocatorias`): Catálogo general con contador de convocatorias activas (18).
   - `Perfiles de puestos` (`perfiles_puestos`): Biblioteca de perfiles institucionales predefinidos.
   - `Nueva convocatoria` (`nueva_convocatoria`): Creador guiado de nuevas plazas.
2. **CANDIDATOS:**
   - `Cargar CV's` (`agregar_archivos`): Ingesta masiva automática y generación de lotes de prueba.
   - `Mejores candidatos` (`mejores_candidatos`): Matriz principal de evaluación con badge de total de postulantes activos (ej. 113).
   - `Comparador` (`comparador`): Comparativa paralela multidimensional.
3. **SEGUIMIENTO:**
   - `Avance de candidatos` (`avance_candidatos`): Tablero Kanban de 6 etapas de selección.
4. **TALENTO:**
   - `Banco de Talento` (`banco_talento`): Repositorio central de candidatos para futuras oportunidades con badge dinámico.
5. **CONFIGURACIÓN:**
   - `Criterios de evaluación` (`criterios_evaluacion`): Ponderación y simulación de impacto de scores.
   - `Historial de decisiones` (`historial_decisiones`): Registro inmutable de auditoría.
   - `Resultados del proceso` (`resultados_proceso`): Métricas de conversión y contrataciones.
   - `Ajustes generales` (`ajustes_generales`): Preferencias del sistema, tema, animaciones y estado de integraciones.
6. **RESULTADOS:**
   - `Resumen general` (`resumen_general`): Dashboard ejecutivo consolidado.

### 2.3 Banner de Convocatoria Activa (`src/components/layout/ActiveJobBanner.tsx`)
Se renderiza en la parte superior de las vistas operativas para anclar el contexto:
- Código oficial de requerimiento (ej. `REQ-2026-DOC-088`).
- Nombre del puesto y área de adscripción.
- Estado actual de la convocatoria (`publicada`, `en_evaluacion`, etc.).
- Acceso directo para cambiar de convocatoria activa.

### 2.4 Asistente GTH (`src/components/layout/CopilotDrawer.tsx`)
Drawer lateral derecho que funciona como asesor en la toma de decisiones:
- Sugerencias rápidas preconfiguradas basadas en el estado del puesto actual.
- Respuestas automáticas con base en evidencias estructuradas (ML y LLM).
- Recordatorios de cumplimiento normativo (Knockouts de Ley Universitaria SUNEDU).

### 2.5 Sistema de Notificaciones Toast (`src/components/layout/ToastContainer.tsx`)
- Mensajes no intrusivos (`success`, `error`, `info`, `warning`) que confirman acciones como guardado de criterios, avances de etapa, liberaciones o exportaciones de datos.

---

## 3. 📄 Estructura y Función de Cada Vista

### 3.1 `ResumenGeneralView.tsx` (Dashboard Ejecutivo)
- **Función:** Proporcionar una visión macroscópica e instantánea del estado de reclutamiento institucional.
- **Componentes:**
  - Tarjetas KPI: Total de convocatorias (18), postulaciones activas, promedio de tiempo de contratación y tasa de efectividad.
  - Gráfico de embudo de candidatos (Postulados → Preseleccionados → Evaluados → Entrevistados → Seleccionados → Contratados).
  - Acceso directo a convocatorias que requieren atención inmediata.

### 3.2 `ConvocatoriasView.tsx` (Catálogo de Puestos)
- **Función:** Administrar todas las convocatorias vigentes y finalizadas.
- **Componentes:**
  - Barra de búsqueda por código, título o departamento.
  - Filtros por área: Todas, Pregrado, Posgrado, TI, Gestión.
  - Cuadrícula de tarjetas de convocatoria con contadores en vivo de candidatos, fecha límite, estado y botón para "Seleccionar como Puesto Activo".

### 3.3 `PerfilesPuestosView.tsx` (Biblioteca de Perfiles)
- **Función:** Consultar y estructurar las plantillas base de ESAN (7 perfiles académicos y administrativos).
- **Componentes:**
  - Matriz de competencias requeridas por perfil.
  - Requisitos knockout vinculados a SUNEDU.
  - Ponderaciones sugeridas para evaluación algorítmica.

### 3.4 `NuevaConvocatoriaView.tsx` (Asistente de Creación)
- **Función:** Crear nuevas convocatorias garantizando el cumplimiento de normas internas.
- **Flujo en 4 Pasos:**
  1. *Datos Generales:* Código, cargo, departamento, vacantes, fecha límite.
  2. *Requisitos Excluyentes (Knockout):* Definición de filtros obligatorios (ej. grado SUNEDU).
  3. *Criterios y Ponderaciones:* Configuración de pesos relativos (ML y LLM) con validación estricta al 100%.
  4. *Revisión y Publicación:* Resumen previo antes de la persistencia oficial.

### 3.5 `MejoresCandidatosView.tsx` (Centro Operativo de Evaluación)
- **Función:** Evaluar candidatos del puesto activo mediante la dualidad de scores sin promedios artificiales.
- **Componentes:**
  - **Filtros de Estado:** "Todos", "En proceso", "Preseleccionados", "No continúan".
  - **Corte Top-N:** Botón para marcar de inmediato a los mejores N candidatos (ej. Top 3, Top 5, Top 10) que cumplan los requisitos obligatorios.
  - **Matriz de Postulantes:**
    - Identificación del candidato (Nombre, correo, grado, verificación SUNEDU).
    - Score ML (0–100) en color azul analítico con desglose de experiencia comprobada y stack técnico.
    - Score LLM (0–100) en color púrpura con similitud semántica de syllabus y proyectos.
    - Etiqueta de Knockout: `Cumple` (verde) o `No cumple` (rojo).
    - Etiqueta de Etapa actual en el proceso.
  - **Acciones Masivas e Individuales:**
    - Selección por casillas de verificación.
    - *Avanzar seleccionados:* Pasa a la siguiente etapa con borrador de notificación.
    - *Liberar seleccionado:* Abre modal con campo obligatorio de justificación de descarte y envía al candidato al Banco de Talento.
    - *Exportar selección a CSV:* Descarga inmediata en formato compatible con Microsoft Excel (UTF-8 con BOM).

### 3.6 `ComparadorView.tsx` (Matriz Comparativa Horizontal)
- **Función:** Comparar en paralelo perfiles seleccionados sin límites artificiales (superando la limitación histórica de 5 candidatos).
- **Componentes:**
  - Tabla de contraste columna por columna: experiencia docente, grados académicos, certificaciones en la nube, puntuaciones ML y LLM lado a lado.
  - Visualización de fortalezas y brechas relativas.

### 3.7 `AvanceCandidatosView.tsx` (Tablero Kanban)
- **Función:** Gestión visual del flujo de postulaciones a lo largo del proceso selectivo.
- **6 Columnas de Etapa:**
  1. `Recibido` (Postulaciones iniciales)
  2. `En Revisión` (Revisión curricular)
  3. `Preseleccionado` (Cumplen perfil base)
  4. `En Entrevista` (Fase de paneles docentes/técnicos)
  5. `Seleccionado` (Candidatos elegidos para la plaza)
  6. `No Continúa` (Candidatos liberados / descartados)
- **Interacción:** Soporte fluido de Drag & Drop (arrastrar y soltar) con botones de avance rápido accesibles por teclado.

### 3.8 `AgregarArchivosView.tsx` (Carga de CVs y Generación de Lotes)
- **Función:** Procesamiento de expedientes y generación de simulaciones masivas.
- **Componentes:**
  - **Banner de Carga Automática:** Simula la ingesta desde portales de empleo universitarios, procesamiento por OCR y conversión a Markdown para análisis vectorial eficiente.
  - **Zona Drag & Drop de Archivos:** Validación de formato y tamaño de documentos.
  - **Generador Determinista de Lotes (Demo):** Botones para inyectar al puesto activo lotes de prueba de **25**, **100** o **500** candidatos con datos consistentes y realistas.

### 3.9 `BancoTalentoView.tsx` (Repositorio Continuo de Talento)
- **Función:** Almacenar y reasignar perfiles destacados para futuras convocatorias.
- **Componentes:**
  - Buscador global por palabras clave, especialidad o competencias.
  - Selección individual y múltiple mediante checkboxes ("Seleccionar todos").
  - Botón *"Vincular al Puesto Activo"*: Mueve el candidato del banco a la convocatoria activa.
  - Botón *"Exportar Selección / Todo a CSV"*: Descarga institucional de expedientes con codificación Excel UTF-8.

### 3.10 `CriteriosEvaluacionView.tsx` (Ponderaciones y Simulación de Impacto)
- **Función:** Modificar los pesos de evaluación de la convocatoria activa y simular en tiempo real el efecto en el ranking antes de guardar.
- **Componentes:**
  - Controles deslizantes (Sliders) y entradas numéricas por cada criterio (Experiencia comprobada, Similitud semántica, Stack tecnológico, etc.).
  - Validador estricto de suma al 100%: Alerta en rojo si la suma no coincide y deshabilita el guardado.
  - **Tabla de Simulación de Impacto con Paginación y Scroll Interno:**
    - Muestra la comparativa de scores anteriores vs. simulados para ML y LLM de forma desacoplada.
    - Contenedor con altura fija (`maxHeight: 480px`) y desplazamiento interno vertical.
    - Cabecera fija (*Sticky Header*) para mantener visibles las columnas durante el scroll.
    - Paginación de **15 en 15 por defecto**, con selector para 30, 50 o todos los registros.

### 3.11 `HistorialDecisionesView.tsx` (Auditoría Inmutable)
- **Función:** Garantizar transparencia total y trazabilidad de todas las acciones del comité evaluador.
- **Componentes:**
  - Línea de tiempo cronológica con fecha, hora, usuario responsable, convocatoria afectada, candidato y motivo de la decisión.
  - Filtros por tipo de evento: Avance de etapa, Liberación, Cambio de ponderaciones, Vinculación al banco.

### 3.12 `ResultadosProcesoView.tsx` (Métricas de Efectividad)
- **Función:** Evaluar la calidad y rapidez del reclutamiento una vez concluidas las fases.
- **Componentes:**
  - Tasa de retención temprana estimada.
  - Comparativa de concordancia entre la recomendación algorítmica y la decisión del evaluador humano.

### 3.13 `AjustesGeneralesView.tsx` (Configuración del Sistema)
- **Función:** Administrar preferencias de apariencia, accesibilidad e integraciones de la plataforma.
- **Componentes:**
  - Selector visual de tema: **Claro**, **Oscuro** y **Sincronizado con el Sistema**.
  - Interruptor de Movimiento Reducido (`prefers-reduced-motion`).
  - Monitor de estado de servicios externos (Conexión SUNEDU, Motor ML, Gateway LLM).

---

## 4. 🧠 Principios de Arquitectura y Reglas Críticas del Sistema

1. **Separación Estricta de Identidades:**
   - `jobPostingId`: Identifica inequívocamente la convocatoria (ej. `REQ-2026-DOC-088`).
   - `candidateId`: Identifica a la persona física en el sistema global.
   - `applicationId`: Identifica el expediente particular del candidato en una convocatoria dada.
   *(Un mismo candidato puede postular a varios puestos sin que sus notas o etapas se mezclen).*
2. **Dualidad Analítica Sin Mezcla Arbitraria:**
   - ML Score y LLM Score son métricas ortogonales (0–100).
   - **Bajo ninguna circunstancia se promedian en un score único compuesto**, respetando que evalúan dimensiones cualitativas y cuantitativas distintas.
3. **Supervisión Humana Activa (Human-in-the-Loop):**
   - El sistema actúa como copiloto analítico, nunca como decisor autónomo.
   - Toda liberación requiere justificación explícita registrada en la bitácora inmutable.
4. **Filtro Excluyente (Knockout Rule):**
   - Los candidatos que no acrediten el requisito legal obligatorio (ej. Maestría registrada en SUNEDU según Ley Universitaria 30220) quedan excluidos de la preselección automática.
5. **Compatibilidad Nativa de Exportación CSV:**
   - Exportaciones generadas con **Byte Order Mark UTF-8 (`\uFEFF`)** y separador punto y coma (`;`).
   - Sanitización contra inyección de fórmulas de hojas de cálculo (`'`, `=`, `+`, `-`, `@`).

---

## 5. 📁 Resumen de Archivos y Rutas Clave

```
GTH_Interfaz/
├── src/
│   ├── components/
│   │   ├── common/             # Button, Badge, Modal, Input, Checkbox
│   │   └── layout/             # Header, Sidebar, ActiveJobBanner, CopilotDrawer, ToastContainer
│   ├── context/
│   │   └── AppContext.tsx      # Estado global unificado y manejadores de acción
│   ├── data/
│   │   └── mockData.ts         # Convocatorias iniciales, perfiles de puesto y candidatos base
│   ├── services/
│   │   ├── csvExport.ts        # Exportador sanitizado con BOM UTF-8 para Excel
│   │   ├── recruitmentRules.ts # Motor matemático de recálculo ML/LLM y knockouts
│   │   └── storage.ts          # Persistencia en localStorage con clave versionada
│   ├── types/
│   │   └── index.ts            # Definiciones TypeScript de entidades y estados
│   ├── views/                  # Las 13 vistas de la plataforma
│   ├── App.tsx                 # Enrutador principal de vistas y layouts
│   └── index.css               # Design Tokens CSS, temas claro/oscuro y utilidades
├── ARQUITECTURA_Y_DISENO.md    # Este documento
├── README.md                   # Resumen técnico de ejecución y escenarios de aceptación
└── package.json                # Dependencias (React 19, TypeScript, Lucide, Vite, Vitest)
```

