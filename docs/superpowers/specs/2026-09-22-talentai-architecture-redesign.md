# TalentAI: Rediseño Arquitectural Orientado al Puesto y Ciclo de Vida del Talento

**Fecha:** 2026-09-22  
**Organización:** Dirección de Gestión del Talento Humano y Conocimiento (GTHC) · ESAN Graduate School of Business  
**Objetivo:** Evolucionar TalentAI de una herramienta genérica de selección a una plataforma de inteligencia de talento enterprise orientada a la naturaleza del puesto, gobernanza explicable y efectividad longitudinal.

---

## 1. Diagnóstico del Problema y Fundamento Arquitectural

### Flujo Anterior (Centrado en Selección Genérica)
```
Convocatorias Activas → Carga OCR → Ranking Genérico → Auditoría
```
*Limitación:* Trata un puesto de Docente Universitario con las mismas métricas, campos y pesos que un puesto de Auxiliar de Limpieza o Asistente Administrativo. No existe retención de talento no seleccionado ni validación de efectividad a largo plazo.

### Flujo Rediseñado (Orientado al Puesto y Ciclo de Vida)
```
Tipo de Convocatoria & Perfil 
       ↓
Criterios, Pesos & Knockout Rules por Puesto
       ↓
Carga Masiva e Ingesta OCR
       ↓
Ranking Top-N (Podios & Vista Dual RRHH/Técnica)
       ↓
Evaluación de Brechas & Comparador Cara a Cara
       ↓
Pipeline Kanban (Postulado → Contratado)
       ↓
Auditoría Inmutable & Trazabilidad
       ↓
Efectividad Real a 6 Meses & Tuning de Criterios
       ↓
Banco de Talento Institucional & Marketplace Cruzado de Vacantes
```

---

## 2. Los 18 Cambios Estructurales Detallados

### Cambio #1: Separación de Convocatorias por Tipo de Puesto
- Tipos de Convocatoria soportados:
  1. **Docentes** (Cátedras de pregrado, posgrado y maestrías)
  2. **Administrativos** (Coordinadores, asistentes, especialistas)
  3. **Operativos** (Mantenimiento, limpieza, soporte de campus, seguridad)
  4. **Directivos** (Directores de programa, jefaturas de área)
  5. **Investigación** (Investigadores RENACYT, asistentes de investigación)
  6. **Practicantes** (Pre-profesionales y profesionales)
- Cada tipo altera completamente el esquema de datos, KPIs, criterios y formulario de ingesta.

### Cambio #2: Templates Inteligentes por Puesto
- Formulario de creación de convocatoria dinámico:
  - Si selecciona **Docente**: Requisitos de Grados SUNEDU (Maestría/Doctorado), Producción Scopus/WoS, Experiencia en Cátedra, Metodología Pedagógica.
  - Si selecciona **Operativo / Limpieza**: Disponibilidad de turnos rotativos, Proximidad al campus, Certificaciones SST, Experiencia en mantenimiento.
  - Si selecciona **Administrativo**: Manejo de ERP (SAP/Banner), Gestión por procesos, Servicio al cliente interno.

### Cambio #3: Criterios y Pesos Dependientes del Puesto
- Los criterios ya no son globales:
  - *Docente Cloud:* Experiencia Profesional (30%), Similitud Syllabus LLM (30%), Stack Técnico (20%), Experiencia Docente (10%), Certificaciones (10%).
  - *Operario de Limpieza:* Experiencia Operativa (40%), Disponibilidad Horaria (25%), Proximidad / Distancia (15%), Referencias Comprobadas (10%), Capacitaciones SST (10%).

### Cambio #4: Biblioteca de Perfiles Organizacionales
- Repositorio preconfigurado de perfiles tipo ESAN con un clic ("Usar Perfil Guardado"):
  - Docente TI / Ingeniería
  - Docente Finanzas y Contabilidad
  - Coordinador Académico
  - Auxiliar de Servicios Generales
  - Analista de Admisiones y Marketing

### Cambio #5: Separación de "Ranking" y "Evaluación"
- **Ranking:** Responde a *"¿Quiénes son los mejores?"* (Score global, corte Top-N, medallas de podio 🥇🥈🥉, ordenamiento rápido).
- **Evaluación & Brechas:** Responde a *"¿Por qué?", "¿Qué le falta?", "¿Qué riesgos tiene?"* (Semáforo de cumplimiento, análisis de gaps, preguntas de entrevista recomendadas).

### Cambio #6: Comparador de Candidatos Cara a Cara
- Selección de 2 a 5 candidatos en el grid o ranking.
- Vista comparativa en matriz y radar:
  - Experiencia (Años y relevancia)
  - Dominio técnico / metodológico
  - Nivel de formación / Grados
  - Brechas detectadas
  - Puntuación consolidada

### Cambio #7: Vista Kanban del Proceso de Selección
- Tablero ágil con 6 columnas de pipeline:
  1. *Postulados*
  2. *Preseleccionados (Top-N)*
  3. *Entrevista*
  4. *Evaluación de Brechas*
  5. *Oferta*
  6. *Contratado*
- Movimiento fluido de candidatos entre estados con registro de auditoría automático.

### Cambio #8: Dashboards de Métricas Específicos por Tipo de Convocatoria
- Si es **Docente**: Muestra % con Maestría SUNEDU, % con Doctorado, Índice de publicaciones, Score pedagógico.
- Si es **Operativo**: Muestra % con disponibilidad de turnos rotativos, radio geográfico de residencia, tiempo de respuesta.

### Cambio #9: Ocultación de Complejidad Técnica (Modo RRHH vs Modo Técnico)
- Switch en barra superior:
  - **Modo RRHH (Por defecto):** Lenguaje claro, explicabilidad funcional (*"Afinidad con Syllabus: Alta"*, *"Años de cátedra: 3 años"*, *"Potencial de crecimiento"*).
  - **Modo Técnico (TI/Auditoría):** Métricas de ingeniería (*"Cosine similarity: 0.892"*, *"LLM: Claude 3.5 Sonnet"*, *"Regla ML determinista: 30pts"*).

### Cambio #10: Módulo de Detección de Brechas (Gap Analysis)
- Identificación automatizada de lo que le falta al candidato para ser el perfil ideal:
  - Requisitos obligatorios no satisfechos o parciales.
  - Certificaciones pendientes.
  - Riesgos operacionales para la fase de entrevista.

### Cambio #11: Banco de Talento Institucional Transversal
- Los candidatos de alto valor no seleccionados en el Top-N (con score > 75) pasan automáticamente al **Banco de Talento**.
- Categorizado por especialidad y habilidades para contrataciones futuras sin volver a publicar convocatorias costosas.

### Cambio #12: Efectividad Real de Contratación (Longitudinal Closed-Loop)
- Seguimiento de candidatos contratados tras 3 y 6 meses.
- Comparación: *Score de Contratación TalentAI* vs *Evaluación de Desempeño Real*.
- Sugerencia inteligente de auto-calibración de pesos para optimizar convocatorias futuras.

### Cambio #13: Marketplace de Vacantes Cruzadas (Talent Mobility)
- Detección de compatibilidad de un postulante con otras vacantes abiertas en ESAN:
  - Ejemplo: Postulante con 82 en Cátedra Cloud es 91% compatible con la plaza de *Coordinador de Laboratorios TI*.
  - Botón: `[ Transferir a Vacante Alternativa ]`.

### Cambio #14: Asistente IA Contextual en la Ficha del Candidato
- Acciones rápidas contextuales directamente en el Drawer / Tarjeta del postulante:
  - `[ ⚡ Explicar Score ]`
  - `[ 🎯 Generar Preguntas de Entrevista (STAR) ]`
  - `[ 📝 Resumir Perfil ]`
  - `[ ⚠️ Identificar Brechas ]`
  - `[ ✉️ Redactar Correo de Avance ]`

### Cambio #15: Dashboard Ejecutivo para Decanos y Gerencia
- Vista simplificada de alto nivel sin saturación de CVs:
  - Número de convocatorias abiertas por área/facultad.
  - Tiempo medio de cobertura (Time-to-Hire en días).
  - Efectividad de contratación acumulada.
  - Fuentes de reclutamiento más eficientes (LinkedIn, Bumeran, Referencias).

### Cambio #16: Rediseño de Paleta (Menos Rojo, Más Azul ESAN)
- Paleta refinada:
  - **Azul Noche ESAN:** `#0B192C` y `#1E293B` para cabeceras, barras laterales y fondos principales.
  - **Rojo Carmesí ESAN:** `#C8102E` reservado para sellos de marca institucional, botones de acción destructiva o alertas críticas.
  - **Verde Éxito:** `#10B981` para estados de cumplimiento y corte Top-N.
  - **Fondos Neutrales:** Slate limpio `#F8FAFC` y tarjetas elevadas `#FFFFFF`.

### Cambio #17: Jerarquía Visual Optimizada
- Orden de lectura en filas y tarjetas:
  1. **Score y Posición de Podio**
  2. **Estado en el Pipeline**
  3. **Brechas y Alertas**
  4. **Potencial Transferible y Requisitos**

### Cambio #18: Top-N con Podio Visual Fuerte
- Distintivos icónicos y visuales de podio:
  - 🥇 **Top 1** (Acento dorado/ámbar con relieve)
  - 🥈 **Top 2** (Acento plata pulida)
  - 🥉 **Top 3** (Acento bronce destacado)
  - Etiquetas numéricas legibles para las demás posiciones dentro del corte.

---

## 3. Arquitectura de Navegación Refinada

```
TALENTAI · GTHC ESAN
[ Selector Activo: Convocatoria Docente TI 2026-II (Docente) ▾ ]

CONVOCATORIAS
  ├── Catálogo de Convocatorias (Filtro por Tipo: Docentes, Admin, Operativo, etc.)
  └── + Nueva Convocatoria (Asistente por Tipo & Perfil)

PROCESO (Convocatoria Activa)
  ├── 📥 Carga e Ingesta OCR
  ├── 🏆 Ranking Top-N (Podios 🥇🥈🥉, Switch RRHH / Técnica)
  ├── 📋 Evaluación & Brechas (Semáforo de cumplimiento y riesgos)
  ├── ⚖️ Comparador (Matriz 2-5 candidatos cara a cara)
  └── 📌 Tablero Kanban (Etapas de selección)

TALENTO INSTITUCIONAL
  ├── 👥 Banco de Talento (Perfiles preservados de alto valor)
  └── 🔄 Marketplace Interno (Compatibilidad con vacantes abiertas)

GOBERNANZA & CONFIGURACIÓN
  ├── ⚙️ Criterios y Pesos por Rol
  ├── 📚 Biblioteca de Perfiles (Templates guardados)
  ├── 🛡️ Auditoría & Trazabilidad
  └── 📈 Efectividad IA (Calibración a 6 meses)

ANALÍTICA
  ├── 📊 Dashboard RRHH (Operatividad y tiempos)
  └── 👔 Dashboard Ejecutivo (KPIs para Decanos y Gerencia)
```
