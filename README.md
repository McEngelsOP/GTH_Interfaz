# TalentAI | GTHC · ESAN
### Plataforma de Reclutamiento Masivo & Evaluación Explicable de Candidatos

Sistema Enterprise SaaS de alta densidad de datos para la gestión y evaluación de convocatorias de talento en **ESAN Graduate School of Business (GTHC)**.

La interfaz experimental usa un **perfil principal del equipo de GTHC** para gestionar convocatorias y postulaciones, consultar las recomendaciones explicadas por IA y registrar las etapas y decisiones humanas. Las acciones y los datos están simulados en el navegador: esta versión no envía notificaciones ni conecta con un sistema de contratación real.

Implementa un **Motor de Matching Dual**:
1. **Camino 1 · ML Tradicional (30%)**: Reglas duras, verificación de años de experiencia comprobada, stacks técnicos específicos y ponderación determinista.
2. **Camino 2 · Embeddings LLM (70%)**: Similitud semántica vectorial a partir del CV estructurado en Markdown contrastado contra el syllabus y perfil de la cátedra mediante modelos Claude / OpenAI.

---

## 🚀 Características Principales

- **Diseño Institucional ESAN**: Paleta moderna con Rojo Carmesí ESAN (`#C8102E`), fondo neutro slate (`#F8FAFC`), acentos esmeralda (`#10B981`) y ámbar (`#F59E0B`).
- **Data Grid de Candidatos de Alta Densidad**:
  - Cápsulas verticales de requisitos obligatorios con **tooltips interactivos con justificación técnica contextual** al pasar el cursor.
  - Indicador circular SVG de **Score Dual Consolidado (0-100)**.
  - Badge de **Principio de Inclusión ("Potencial Transferible")** para perfiles con altas capacidades transferibles.
  - **Top-N Dinámico**: Selector de vacantes en tiempo real que recalcula automáticamente los cortes de la convocatoria.
  - Botones de acción directa: *"Avanzar a Siguiente Paso"* y *"Liberar y Notificar"*.
- **Panel Desplegable (Slide-Over Drawer) de Auditoría y Explicabilidad**:
  - *Explicación del Score*: Bloque narrativo transparente de selección, fortalezas y análisis de brechas.
  - *Desglose por Pesos*: Gráfico analítico de pesos configurados vs puntuaciones obtenidas.
  - *CV Markdown*: Visor del CV estructurado obtenido tras el OCR inteligente.
  - *Registro de Auditoría*: Sello inmutable de trazabilidad con ID de lote `#ESAN-2026-088`, fecha/hora y registro de decisiones del reclutador.
- **Copiloto IA ("ESA IA GTH Assistant")**:
  - Asistente conversacional con chips de consulta rápida, generación de tarjetas de recomendación del Top 3 y aviso legal de supervisión humana.
- **Módulo de Carga Masiva & OCR**:
  - Conexión simulada multi-canal con LinkedIn Recruiter, Gmail, CompuTrabajo y Bumeran.
  - Pipeline interactivo de extracción OCR, conversión Markdown e indexación de embeddings.

---

## 💻 Tecnologías Utilizadas

- **HTML5 Semántico**: Estructura accesible y modular.
- **CSS3 Puro**: Custom Properties (Design Tokens), Grid y Flexbox, sin dependencias de frameworks externos.
- **JavaScript Moderno (ES Modules)**: Arquitectura limpia y reactiva con gestión de estado centralizada (`state.js`).
- **Google Fonts**: Tipografías corporativas *Outfit* e *Inter*.

---

## 🛠️ Ejecución Local

Para visualizar el proyecto localmente:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/McEngelsOP/GTH_Interfaz.git
   ```
2. Abre la carpeta del proyecto y ejecuta cualquier servidor local estático:
   - Con Python:
     ```bash
     python -m http.server 8080
     ```
   - O con Node:
     ```bash
     npx serve .
     ```
3. Abre en tu navegador preferido:
   ```
   http://localhost:8080/index.html
   ```

---

## 🌐 Despliegue en GitHub Pages

Este proyecto está listo para ser publicado inmediatamente con **GitHub Pages**:
1. En GitHub, dirígete a **Settings** > **Pages**.
2. En **Build and deployment** > **Branch**, selecciona `main` y la carpeta `/ (root)`.
3. Haz clic en **Save**. En un par de minutos estará disponible en vivo en:
   `https://mcengelsop.github.io/GTH_Interfaz/`

---
*Desarrollado para la Dirección de Gestión del Talento Humano y Conocimiento (GTHC) · ESAN 2026.*
