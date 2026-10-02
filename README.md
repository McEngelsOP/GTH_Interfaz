# TalentAI · Gestión del Talento Humano y Colaboradores (GTHC) · ESAN
### Demo Funcional Independiente — Rama `GEM`

> **Nota de rama:** Esta versión se encuentra construida en la rama experimental **`GEM`** como un proyecto moderno e independiente en **React 19 + TypeScript + Vite**, siguiendo estrictamente la especificación de 30 secciones para el rediseño de la plataforma GTH de **ESAN Graduate School of Business**.
> La versión original en vanilla HTML/JS ha sido preservada intacta en la carpeta `legacy-vanilla/`.

---

## 🏛️ Propósito y Filosofía del Sistema

TalentAI es una plataforma de soporte para la toma de decisiones del comité evaluador de reclutamiento institucional de ESAN. Se rige por los siguientes principios rectores:

1. **Separación Estricta de Identidades:** Se diferencian inequívocamente `jobPostingId` (convocatoria), `candidateId` (persona física) y `applicationId` (expediente de postulación).
2. **Dualidad Analítica Sin Mezcla Arbitraria:** Los puntajes de **Machine Learning (ML)** y **Modelos de Lenguaje (LLM)** son métricas ortogonales (0–100) y **nunca se promedian en un score único compuesto artificial**.
3. **Supervisión Humana Activa (Human-in-the-Loop):** Toda preselección o liberación requiere confirmación consciente con justificación registrada en un historial local de decisiones.
4. **Honestidad Técnica Total:** No se simula telemetría falsa de ERP ni preguntas STAR inventadas. Las capacidades futuras se marcan explícitamente como pendientes de integración institucional.
5. **Compatibilidad Excel Nativa:** Todas las descargas CSV utilizan codificación **UTF-8 con BOM (`\uFEFF`)** y delimitador de punto y coma (`;`), con sanitización activa para prevenir inyección de fórmulas (`'`, `=`, `+`, `-`, `@`).

---

## 🚀 Arquitectura y Tecnologías

- **Framework:** React 19 + Vite 6 + TypeScript 5.7
- **Iconografía:** Lucide React
- **Estilos:** Vanilla CSS con Design Tokens en `src/index.css` (Variables HSL, superficies cálidas ESAN `#F6F3EF`, carmesí institucional `#B71936` y `#C8102E`, modo oscuro carbón `#14171C` y `#1E232B`, soporte de `prefers-reduced-motion`).
- **Pruebas Automatizadas:** Vitest (ejecuta pruebas unitarias de reglas de negocio en `src/services/__tests__/`).
- **Persistencia Local:** `src/services/storage.ts` con esquema versionado `GTH_ESAN_STATE_V1` en `localStorage` y respaldo de estado en memoria.

---

## 📂 Vistas Implementadas (Navegación Completa)

| Vista | Identificador | Descripción |
|---|---|---|
| **Resumen General** | `resumen_general` | KPIs globales consolidados de 18 convocatorias, accesos rápidos y actividad reciente. |
| **Convocatorias** | `convocatorias` | Catálogo de las 18 convocatorias institucionales con filtros por área y contadores en vivo. |
| **Perfiles de Puesto** | `perfiles_puestos` | Biblioteca de 7 plantillas base de ESAN con matriz de criterios y reglas knockout. |
| **Nueva Convocatoria** | `nueva_convocatoria` | Asistente guiado de 4 pasos con validación estricta de suma al 100% de ponderaciones. |
| **Mejores Candidatos** | `mejores_candidatos` | Grilla con ML / LLM separados, Top-N pendientes, preseleccionados, contratados y decisiones confirmadas. |
| **Comparador** | `comparador` | Matriz horizontal comparativa de candidatos sin límite artificial de 5 perfiles. |
| **Tablero de Avance** | `avance_candidatos` | Tablero Kanban de 6 etapas institucionales con soporte Drag & Drop y botones accesibles. |
| **Carga y Lotes** | `agregar_archivos` | Validador de archivos CSV y generador determinista de lotes de prueba (25, 100 y 500 registros). |
| **Banco de Talento** | `banco_talento` | Repositorio institucional de perfiles para futuras oportunidades y centro de descargas CSV. |
| **Criterios de Evaluación** | `criterios_evaluacion` | Sliders de ponderación con validación al 100% y simulación previa de recálculo en vivo. |
| **Historial y Auditoría** | `historial_decisiones` | Historial cronológico local de decisiones tomadas con filtros por acción y convocatoria. |
| **Resultados del Proceso** | `resultados_proceso` | Embudo de efectividad de postulaciones y seguimiento de contrataciones formalizadas. |
| **Configuración** | `ajustes_generales` | Selector de tema (Claro / Oscuro / Sistema), modo de movimiento reducido y diagnóstico de integraciones. |

---

## 🛠️ Instalación y Ejecución Local

### Prerrequisitos
- Node.js 18+ (recomendado Node 20 o superior)
- npm 9+

### Pasos
```bash
# 1. Asegúrate de estar en la rama GEM
git checkout GEM

# 2. Instalar dependencias
npm install

# 3. Ejecutar servidor de desarrollo local
npm run dev

# 4. Ejecutar pruebas unitarias
npm run test

# 5. Compilar para producción (validación de tipos y bundle Vite)
npm run build
```

El servidor local se abrirá típicamente en `http://localhost:5173/`.

---

## 🧪 Verificación de Escenarios de Aceptación (Sección 27)

Esta demo incluye datos iniciales precargados específicamente diseñados para validar cada uno de los escenarios de aceptación:

1. **Avanzar candidatos marcados:** Seleccionar candidatos en `Mejores Candidatos` y hacer clic en *"Avanzar seleccionados"*. Pasan a etapa `preseleccionado`, se genera un borrador de correo en su expediente y permanecen visibles con el filtro *"En proceso"*.
2. **Liberar candidato individual:** En la tabla de candidatos o expediente, presionar *"Liberar"*, ingresar el motivo y confirmar. La postulación pasa a `no_continua`, el ranking se recalcula inmediatamente y el perfil queda disponible en *"No continúan"* y *"Banco de Talento"*.
3. **Candidato multipostulación (Caso Javier Morales):** Javier Morales postula tanto a `REQ-2026-DOC-088` como a `REQ-2026-ADM-042`. Sus expedientes, notas y puntajes son totalmente independientes entre ambas convocatorias.
4. **Candidato con requisito no cumplido (Knockout):** Candidatos con requisito obligatorio en estado `no_cumple` o `sin_verificar` no son elegibles para el Top-N automático y muestran la advertencia correspondiente.
5. **Simulación de Criterios (Suma 100%):** Al mover los controles deslizantes en *Criterios de Evaluación*, el botón de guardar se bloquea si la suma es distinta de 100% y la tabla de simulación muestra la variación de puntajes ML y LLM antes de aplicar el cambio.
6. **Descarga de archivos CSV:** Las descargas de *Candidatos*, *Comparativa*, *Catálogo de Perfiles* y *Banco de Talento* abren de forma nativa en Microsoft Excel respetando tildes y caracteres especiales en español.
7. **Generador de Lotes (25 / 100 / 500):** En *Agregar Archivos*, seleccionar 25, 100 o 500 y presionar *"Generar lote de prueba"*. Los expedientes se vinculan al puesto activo y se reflejan de inmediato en los contadores y vistas.

---

## 🏛️ Créditos y Licencia

Desarrollado para **ESAN Graduate School of Business** — Dirección de Gestión del Talento Humano y Colaboradores (GTHC). Todos los derechos reservados.


## Revisión funcional y prevención de regresiones

La revisión de GEM y sus correcciones se documentan en [docs/GEM_DEBUG_REPORT.md](docs/GEM_DEBUG_REPORT.md). El perfil del Banco permanece guardado al vincularlo a otro puesto; esa nueva postulación empieza sin puntajes y con requisitos pendientes. El Top-N solo reúne pendientes de primera decisión; los preseleccionados y contratados tienen sus propias pestañas.

Para ejecutar las pruebas de navegador:

```bash
npx playwright install chromium
npm run test:e2e
```

GitHub Actions ejecuta pruebas unitarias, compilación y estos escenarios al actualizar GEM. Los cambios de esta revisión no publican la web de producción. OCR, motores ML/LLM, portales, Gmail y calendarios continúan pendientes de integración. El CSV de catálogo se valida y previsualiza sin importar candidatos.
