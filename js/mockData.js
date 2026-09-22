/* ==========================================================================
   TalentAI - GTHC · ESAN
   Mock Data: Multi-Role Job Postings, Realistic Candidates & Analytics
   ========================================================================== */

export const MOCK_JOB_POSTINGS = [
  // 1. DOCENTES (8 vacantes)
  {
    id: "REQ-2026-DOC-088",
    title: "Convocatoria Docente / Desarrollador Cloud & Software",
    roleType: "docente",
    roleTypeName: "Docente Universitario",
    categoryGroup: "Docente",
    period: "Semestre 2026-II",
    department: "Dirección de Tecnologías de Información / Pregrado y Posgrado",
    status: "Convocatoria Abierta",
    phase: "Evaluación Automática & Matching Dual",
    totalProcessed: 482,
    defaultTopN: 5,
    avgScore: 78.4,
    potentialTalentCount: 18,
    batchId: "#ESAN-2026-088",
    criteriaVersion: "v2.4 (Dual ML-Embeddings)",
    aiModel: "Claude 3.5 Sonnet + Text-Embedding-3-Large",
    knockoutRule: "Maestría registrada en SUNEDU (Ley Universitaria N° 30220)",
    weights: [
      { label: "Experiencia Profesional Comprobada", weightPct: 30, type: "ML" },
      { label: "Similitud Semántica Proyectos & Syllabus", weightPct: 30, type: "LLM" },
      { label: "Stack Tecnológico (Cloud/Backend)", weightPct: 20, type: "ML" },
      { label: "Experiencia Docente Universitaria", weightPct: 10, type: "ML" },
      { label: "Certificaciones & Grado Académico", weightPct: 10, type: "ML" }
    ],
    roleMetrics: {
      metric1Label: "% Maestría SUNEDU",
      metric1Value: "92%",
      metric2Label: "% Doctorado / Renacyt",
      metric2Value: "44%",
      metric3Label: "Afinidad Syllabus Promedio",
      metric3Value: "84.5%",
      metric4Label: "Score Pedagógico Medio",
      metric4Value: "81/100"
    }
  },
  {
    id: "REQ-2026-DOC-089",
    title: "Profesor de Finanzas Cuantitativas & Mercado de Capitales",
    roleType: "docente",
    roleTypeName: "Docente Universitario",
    categoryGroup: "Docente",
    period: "Semestre 2026-II",
    department: "Departamento Académico de Finanzas",
    status: "Convocatoria Abierta",
    phase: "Evaluación Curricular",
    totalProcessed: 134,
    defaultTopN: 4,
    avgScore: 82.1,
    potentialTalentCount: 9,
    batchId: "#ESAN-2026-089",
    criteriaVersion: "v2.2",
    aiModel: "Claude 3.5 Sonnet",
    knockoutRule: "Maestría en Finanzas y certificación CFA/FRM",
    weights: [
      { label: "Trayectoria en Mercado Financiero", weightPct: 35, type: "ML" },
      { label: "Producción de Casos de Negocio", weightPct: 25, type: "LLM" },
      { label: "Habilidades Pedagógicas / Método Caso", weightPct: 20, type: "ML" },
      { label: "Certificaciones CFA / FRM", weightPct: 10, type: "ML" },
      { label: "Red Institucional y Networking", weightPct: 10, type: "ML" }
    ],
    roleMetrics: { metric1Label: "% Certificación CFA/FRM", metric1Value: "78%", metric2Label: "Publicaciones Scopus", metric2Value: "35%", metric3Label: "Afinidad Syllabus", metric3Value: "88%", metric4Label: "Pedagogía", metric4Value: "85/100" }
  },
  {
    id: "REQ-2026-DOC-090",
    title: "Profesor de Marketing Digital & Analítica de Clientes",
    roleType: "docente",
    roleTypeName: "Docente Universitario",
    categoryGroup: "Docente",
    period: "Semestre 2026-II",
    department: "Departamento Académico de Marketing",
    status: "Convocatoria Abierta",
    phase: "Preselección",
    totalProcessed: 98,
    defaultTopN: 3,
    avgScore: 79.5,
    potentialTalentCount: 7,
    batchId: "#ESAN-2026-090",
    criteriaVersion: "v2.1",
    aiModel: "Claude 3.5 Sonnet",
    knockoutRule: "Maestría SUNEDU y 4+ años en dirección de marketing",
    weights: [
      { label: "Gestión de Campañas Digitales & ROI", weightPct: 30, type: "ML" },
      { label: "Analítica de Datos & MarTech", weightPct: 30, type: "LLM" },
      { label: "Experiencia en Posgrado", weightPct: 20, type: "ML" },
      { label: "Metodologías Activas en Aula", weightPct: 10, type: "ML" },
      { label: "Certificaciones Google/Meta", weightPct: 10, type: "ML" }
    ],
    roleMetrics: { metric1Label: "% MarTech Avanzado", metric1Value: "82%", metric2Label: "% Maestría SUNEDU", metric2Value: "95%", metric3Label: "Afinidad Syllabus", metric3Value: "86%", metric4Label: "Pedagogía", metric4Value: "83/100" }
  },
  {
    id: "REQ-2026-DOC-091",
    title: "Profesor de Operaciones, Logística & Supply Chain 4.0",
    roleType: "docente",
    roleTypeName: "Docente Universitario",
    categoryGroup: "Docente",
    period: "Semestre 2026-II",
    department: "Departamento de Operaciones y TI",
    status: "Convocatoria Abierta",
    phase: "Evaluación Curricular",
    totalProcessed: 87,
    defaultTopN: 3,
    avgScore: 77.3,
    potentialTalentCount: 6,
    batchId: "#ESAN-2026-091",
    criteriaVersion: "v1.9",
    aiModel: "Claude 3.5 Sonnet",
    knockoutRule: "Maestría SUNEDU y liderazgo de cadena de suministro",
    weights: [
      { label: "Gestión Logística Global & Supply Chain", weightPct: 35, type: "ML" },
      { label: "Simulación de Procesos & ERP", weightPct: 25, type: "LLM" },
      { label: "Trayectoria en Cátedra", weightPct: 20, type: "ML" },
      { label: "Certificación CSCP o CPIM", weightPct: 10, type: "ML" },
      { label: "Casos de Industria Aplicados", weightPct: 10, type: "ML" }
    ],
    roleMetrics: { metric1Label: "% CSCP/CPIM", metric1Value: "68%", metric2Label: "% Maestría SUNEDU", metric2Value: "91%", metric3Label: "Afinidad Syllabus", metric3Value: "81%", metric4Label: "Pedagogía", metric4Value: "79/100" }
  },
  {
    id: "REQ-2026-DOC-092",
    title: "Cátedra de Ciberseguridad & Gobernanza de Datos",
    roleType: "docente",
    roleTypeName: "Docente Universitario",
    categoryGroup: "Docente",
    period: "Semestre 2026-II",
    department: "Dirección de TI / Posgrado",
    status: "Convocatoria Abierta",
    phase: "Matching Dual",
    totalProcessed: 112,
    defaultTopN: 3,
    avgScore: 80.9,
    potentialTalentCount: 8,
    batchId: "#ESAN-2026-092",
    criteriaVersion: "v2.3",
    aiModel: "Claude 3.5 Sonnet",
    knockoutRule: "Maestría SUNEDU y certificación CISSP/CISM",
    weights: [
      { label: "Arquitectura de Seguridad & SOC", weightPct: 35, type: "ML" },
      { label: "Cumplimiento Normativo (ISO 27001/NIST)", weightPct: 25, type: "LLM" },
      { label: "Stack Forense & Red/Blue Team", weightPct: 20, type: "ML" },
      { label: "Docencia Universitaria", weightPct: 10, type: "ML" },
      { label: "Certificaciones CISSP/CISM/CEH", weightPct: 10, type: "ML" }
    ],
    roleMetrics: { metric1Label: "% CISSP / CISM", metric1Value: "74%", metric2Label: "% Maestría SUNEDU", metric2Value: "96%", metric3Label: "Afinidad Syllabus", metric3Value: "89%", metric4Label: "Pedagogía", metric4Value: "82/100" }
  },
  {
    id: "REQ-2026-DOC-093",
    title: "Cátedra de Inteligencia Artificial & Aprendizaje Automático",
    roleType: "docente",
    roleTypeName: "Docente Universitario",
    categoryGroup: "Docente",
    period: "Semestre 2026-II",
    department: "Dirección de TI / Centro de IA ESAN",
    status: "Convocatoria Abierta",
    phase: "Evaluación Automática",
    totalProcessed: 165,
    defaultTopN: 4,
    avgScore: 83.4,
    potentialTalentCount: 14,
    batchId: "#ESAN-2026-093",
    criteriaVersion: "v2.5",
    aiModel: "Claude 3.5 Sonnet + Embeddings",
    knockoutRule: "Maestría o Doctorado en Computación o IA, SUNEDU",
    weights: [
      { label: "Investigación & Algoritmos LLM/ML", weightPct: 35, type: "LLM" },
      { label: "Producción Scopus / Papers", weightPct: 25, type: "ML" },
      { label: "Implementación Práctica en PyTorch/TensorFlow", weightPct: 20, type: "ML" },
      { label: "Docencia Universitaria", weightPct: 10, type: "ML" },
      { label: "Grado de Doctor (Ph.D.)", weightPct: 10, type: "ML" }
    ],
    roleMetrics: { metric1Label: "% Doctorado / Renacyt", metric1Value: "62%", metric2Label: "% Scopus Q1/Q2", metric2Value: "71%", metric3Label: "Afinidad Syllabus", metric3Value: "92%", metric4Label: "Pedagogía", metric4Value: "87/100" }
  },
  {
    id: "REQ-2026-DOC-094",
    title: "Profesor de Analítica de Negocios & Big Data Analytics",
    roleType: "docente",
    roleTypeName: "Docente Universitario",
    categoryGroup: "Docente",
    period: "Semestre 2026-II",
    department: "Departamento Académico de Economía y Administración",
    status: "Convocatoria Abierta",
    phase: "Preselección",
    totalProcessed: 95,
    defaultTopN: 3,
    avgScore: 78.8,
    potentialTalentCount: 8,
    batchId: "#ESAN-2026-094",
    criteriaVersion: "v2.0",
    aiModel: "Claude 3.5 Sonnet",
    knockoutRule: "Maestría SUNEDU y dominio avanzado de Python/SQL/Tableau",
    weights: [
      { label: "Modelamiento Estadístico & Business Analytics", weightPct: 35, type: "ML" },
      { label: "Resolución de Problemas Empresariales", weightPct: 25, type: "LLM" },
      { label: "Herramientas BI & Cloud Data Lake", weightPct: 20, type: "ML" },
      { label: "Experiencia Pedagógica", weightPct: 10, type: "ML" },
      { label: "Publicaciones / Casos", weightPct: 10, type: "ML" }
    ],
    roleMetrics: { metric1Label: "% SQL/Python Avanzado", metric1Value: "88%", metric2Label: "% Maestría SUNEDU", metric2Value: "94%", metric3Label: "Afinidad Syllabus", metric3Value: "85%", metric4Label: "Pedagogía", metric4Value: "80/100" }
  },
  {
    id: "REQ-2026-DOC-095",
    title: "Cátedra de Estrategia Empresarial & Transformación Digital",
    roleType: "docente",
    roleTypeName: "Docente Universitario",
    categoryGroup: "Docente",
    period: "Semestre 2026-II",
    department: "Área Académica de Administración General",
    status: "Convocatoria Abierta",
    phase: "Evaluación Curricular",
    totalProcessed: 78,
    defaultTopN: 3,
    avgScore: 81.6,
    potentialTalentCount: 7,
    batchId: "#ESAN-2026-095",
    criteriaVersion: "v2.0",
    aiModel: "Claude 3.5 Sonnet",
    knockoutRule: "Maestría y 6+ años como Director General o Gerente de Área",
    weights: [
      { label: "Experiencia en Alta Dirección Corporativa", weightPct: 40, type: "ML" },
      { label: "Liderazgo de Transformación Digital", weightPct: 25, type: "LLM" },
      { label: "Pedagogía en MBA & Educación Ejecutiva", weightPct: 20, type: "ML" },
      { label: "Redes y Reputación Profesional", weightPct: 15, type: "ML" }
    ],
    roleMetrics: { metric1Label: "% C-Level / Gerencia", metric1Value: "89%", metric2Label: "% MBA / Maestría", metric2Value: "100%", metric3Label: "Afinidad Syllabus", metric3Value: "87%", metric4Label: "Pedagogía", metric4Value: "84/100" }
  },

  // 2. ADMINISTRATIVOS (5 vacantes)
  {
    id: "REQ-2026-ADM-032",
    title: "Coordinador de Admisiones y Procesos Académicos",
    roleType: "administrativo",
    roleTypeName: "Personal Administrativo",
    categoryGroup: "Administrativo",
    period: "Convocatoria 2026-II",
    department: "Dirección de Admisiones & Registros Académicos",
    status: "Convocatoria Abierta",
    phase: "Evaluación Curricular y Competencias de Gestión",
    totalProcessed: 215,
    defaultTopN: 3,
    avgScore: 76.8,
    potentialTalentCount: 15,
    batchId: "#ESAN-2026-032",
    criteriaVersion: "v2.1 (Matching Híbrido Gestión)",
    aiModel: "Claude 3.5 Sonnet + Modelo Predictivo de Servicio",
    knockoutRule: "Título profesional universitario y experiencia mínima 3 años en educación superior",
    weights: [
      { label: "Gestión de Procesos Académicos & ERP (Banner/SAP)", weightPct: 35, type: "ML" },
      { label: "Atención al Usuario & Resolución de Conflictos", weightPct: 25, type: "LLM" },
      { label: "Análisis de Datos & Métricas de Admisión", weightPct: 20, type: "ML" },
      { label: "Dominio de Inglés Intermedio-Avanzado", weightPct: 10, type: "ML" },
      { label: "Liderazgo de Equipos de Front-Desk", weightPct: 10, type: "LLM" }
    ],
    roleMetrics: {
      metric1Label: "Dominio Banner / SAP",
      metric1Value: "72%",
      metric2Label: "Experiencia en Universidades",
      metric2Value: "85%",
      metric3Label: "Nivel de Inglés B2/C1",
      metric3Value: "64%",
      metric4Label: "Orientación al Servicio",
      metric4Value: "89/100"
    }
  },
  {
    id: "REQ-2026-ADM-033",
    title: "Gestor de Plataforma ERP Banner & Registros de Grados",
    roleType: "administrativo",
    roleTypeName: "Personal Administrativo",
    categoryGroup: "Administrativo",
    period: "Convocatoria 2026-II",
    department: "Secretaría General & Registros Académicos",
    status: "Convocatoria Abierta",
    phase: "Verificación de Requisitos",
    totalProcessed: 64,
    defaultTopN: 3,
    avgScore: 79.1,
    potentialTalentCount: 5,
    batchId: "#ESAN-2026-033",
    criteriaVersion: "v1.8",
    aiModel: "Reglas Duras NLP",
    knockoutRule: "Experiencia comprobada en administración de Ellucian Banner Student",
    weights: [
      { label: "Dominio Técnico de ERP Banner", weightPct: 45, type: "ML" },
      { label: "Normativa SUNEDU de Grados y Títulos", weightPct: 25, type: "ML" },
      { label: "Manejo de SQL y Reportes de Auditoría", weightPct: 20, type: "ML" },
      { label: "Atención a Facultades", weightPct: 10, type: "LLM" }
    ],
    roleMetrics: { metric1Label: "Certificación Banner", metric1Value: "81%", metric2Label: "Conocimiento SUNEDU", metric2Value: "92%", metric3Label: "SQL Queries", metric3Value: "78%", metric4Label: "Precisión", metric4Value: "96/100" }
  },
  {
    id: "REQ-2026-ADM-034",
    title: "Jefe de Servicios Estudiantiles & Bienestar Universitario",
    roleType: "administrativo",
    roleTypeName: "Personal Administrativo",
    categoryGroup: "Administrativo",
    period: "Convocatoria 2026-II",
    department: "Dirección de Bienestar Estudiantil",
    status: "Convocatoria Abierta",
    phase: "Entrevistas",
    totalProcessed: 52,
    defaultTopN: 2,
    avgScore: 82.4,
    potentialTalentCount: 6,
    batchId: "#ESAN-2026-034",
    criteriaVersion: "v2.0",
    aiModel: "Claude 3.5 Sonnet",
    knockoutRule: "Licenciatura en Psicología, Administración o afines con 4+ años de gestión",
    weights: [
      { label: "Liderazgo de Programas de Bienestar y Salud", weightPct: 35, type: "LLM" },
      { label: "Gestión de Presupuesto y Eventos de Campus", weightPct: 25, type: "ML" },
      { label: "Manejo de Casos de Tutoría y Apoyo Psicológico", weightPct: 25, type: "LLM" },
      { label: "Habilidades Comunicacionales y Empatía", weightPct: 15, type: "LLM" }
    ],
    roleMetrics: { metric1Label: "Experiencia Bienestar", metric1Value: "87%", metric2Label: "Manejo Protocolos", metric2Value: "94%", metric3Label: "Resolución de Crisis", metric3Value: "90%", metric4Label: "Satisfacción Alumnos", metric4Value: "93/100" }
  },
  {
    id: "REQ-2026-ADM-035",
    title: "Especialista en Atracción del Talento y Selección GTHC",
    roleType: "administrativo",
    roleTypeName: "Personal Administrativo",
    categoryGroup: "Administrativo",
    period: "Convocatoria 2026-II",
    department: "Gerencia de Talento Humano y Cultura (GTHC)",
    status: "Convocatoria Abierta",
    phase: "Preselección",
    totalProcessed: 118,
    defaultTopN: 3,
    avgScore: 80.5,
    potentialTalentCount: 11,
    batchId: "#ESAN-2026-035",
    criteriaVersion: "v2.2",
    aiModel: "Claude 3.5 Sonnet",
    knockoutRule: "Titulado en Psicología u Organizacional con 3+ años en reclutamiento masivo",
    weights: [
      { label: "Reclutamiento de Perfiles Académicos y Técnicos", weightPct: 35, type: "ML" },
      { label: "Entrevistas por Competencias y Metodología STAR", weightPct: 25, type: "LLM" },
      { label: "Manejo de ATS e Inteligencia de Talento", weightPct: 20, type: "ML" },
      { label: "Indicadores de Cobertura y Retención", weightPct: 20, type: "ML" }
    ],
    roleMetrics: { metric1Label: "Dominio STAR", metric1Value: "91%", metric2Label: "Manejo ATS", metric2Value: "88%", metric3Label: "Afinidad Cultural ESAN", metric3Value: "89%", metric4Label: "Eficacia Selección", metric4Value: "92/100" }
  },
  {
    id: "REQ-2026-ADM-036",
    title: "Asistente de Gestión Académica de Posgrado (Maestrías)",
    roleType: "administrativo",
    roleTypeName: "Personal Administrativo",
    categoryGroup: "Administrativo",
    period: "Convocatoria 2026-II",
    department: "Escuela de Posgrado / Maestrías Especializadas",
    status: "Convocatoria Abierta",
    phase: "Evaluación de CVs",
    totalProcessed: 89,
    defaultTopN: 3,
    avgScore: 75.6,
    potentialTalentCount: 8,
    batchId: "#ESAN-2026-036",
    criteriaVersion: "v1.7",
    aiModel: "Reglas NLP",
    knockoutRule: "Bachiller universitario y dominio intermedio de Excel y CRM",
    weights: [
      { label: "Atención a Estudiantes Ejecutivos de Posgrado", weightPct: 35, type: "LLM" },
      { label: "Coordinación con Docentes y Horarios Lectivos", weightPct: 30, type: "ML" },
      { label: "Manejo de CRM y Plataformas Virtuales", weightPct: 20, type: "ML" },
      { label: "Redacción Formal Institucional", weightPct: 15, type: "ML" }
    ],
    roleMetrics: { metric1Label: "Servicio Ejecutivo", metric1Value: "86%", metric2Label: "Excel Avanzado", metric2Value: "80%", metric3Label: "Organización", metric3Value: "84%", metric4Label: "Puntualidad", metric4Value: "88/100" }
  },

  // 3. OPERATIVOS (3 vacantes)
  {
    id: "REQ-2026-OPE-014",
    title: "Auxiliar de Mantenimiento y Servicios Campus Monterrico",
    roleType: "operativo",
    roleTypeName: "Personal Operativo",
    categoryGroup: "Operativo",
    period: "Convocatoria 2026-II",
    department: "Dirección de Operaciones e Infraestructura Campus",
    status: "Convocatoria Abierta",
    phase: "Verificación Operativa & Disponibilidad",
    totalProcessed: 146,
    defaultTopN: 4,
    avgScore: 81.2,
    potentialTalentCount: 12,
    batchId: "#ESAN-2026-014",
    criteriaVersion: "v1.8 (Criterios Operativos Ponderados)",
    aiModel: "Motor Determinista Reglas Duras + Verificación de Referencias",
    knockoutRule: "Antecedentes policiales limpios y disponibilidad para turnos rotativos",
    weights: [
      { label: "Experiencia Operativa en Mantenimiento", weightPct: 40, type: "ML" },
      { label: "Disponibilidad Horaria / Turnos Rotativos", weightPct: 25, type: "ML" },
      { label: "Proximidad Geográfica al Campus (Surco)", weightPct: 15, type: "ML" },
      { label: "Certificaciones SST y Primeros Auxilios", weightPct: 10, type: "ML" },
      { label: "Referencias Laborales Verificadas", weightPct: 10, type: "ML" }
    ],
    roleMetrics: {
      metric1Label: "Disponibilidad Inmediata",
      metric1Value: "88%",
      metric2Label: "Turnos Rotativos Aptos",
      metric2Value: "94%",
      metric3Label: "Radio < 45 min del Campus",
      metric3Value: "76%",
      metric4Label: "Certificación SST Vigente",
      metric4Value: "68%"
    }
  },
  {
    id: "REQ-2026-OPE-015",
    title: "Técnico Electricista & Climatización de Data Center Campus",
    roleType: "operativo",
    roleTypeName: "Personal Operativo",
    categoryGroup: "Operativo",
    period: "Convocatoria 2026-II",
    department: "Dirección de Infraestructura Tecnológica",
    status: "Convocatoria Abierta",
    phase: "Prueba Práctica",
    totalProcessed: 43,
    defaultTopN: 2,
    avgScore: 84.7,
    potentialTalentCount: 4,
    batchId: "#ESAN-2026-015",
    criteriaVersion: "v2.0",
    aiModel: "Reglas Técnicas Certificadas",
    knockoutRule: "Técnico titulado (Senati/Tecsup), certificación en media tensión y HVAC",
    weights: [
      { label: "Experiencia en UPS, Grupos Electrógenos y HVAC", weightPct: 45, type: "ML" },
      { label: "Disponibilidad de Guardia 24x7 ante emergencias", weightPct: 25, type: "ML" },
      { label: "Certificaciones de Trabajo Seguro en Altura/Eléctrico", weightPct: 20, type: "ML" },
      { label: "Cercanía Geográfica", weightPct: 10, type: "ML" }
    ],
    roleMetrics: { metric1Label: "Certificado HVAC", metric1Value: "91%", metric2Label: "Guardias 24x7", metric2Value: "95%", metric3Label: "Titulado Técnico", metric3Value: "100%", metric4Label: "SST Eléctrico", metric4Value: "92/100" }
  },
  {
    id: "REQ-2026-OPE-016",
    title: "Supervisor de Facilities, Control de Accesos & Seguridad",
    roleType: "operativo",
    roleTypeName: "Personal Operativo",
    categoryGroup: "Operativo",
    period: "Convocatoria 2026-II",
    department: "Dirección de Seguridad Patrimonial y Campus",
    status: "Convocatoria Abierta",
    phase: "Entrevistas",
    totalProcessed: 38,
    defaultTopN: 2,
    avgScore: 82.0,
    potentialTalentCount: 4,
    batchId: "#ESAN-2026-016",
    criteriaVersion: "v1.9",
    aiModel: "Reglas Duras y Antecedentes",
    knockoutRule: "Antecedentes limpios, carné Sucamec y 4+ años en supervisión de campus",
    weights: [
      { label: "Supervisión de Turnos y Protocolos de Seguridad", weightPct: 40, type: "ML" },
      { label: "Manejo de CCTV y Control de Accesos Peatonal/Vehicular", weightPct: 30, type: "ML" },
      { label: "Gestión de Brigadas de Evacuación y Defensa Civil", weightPct: 20, type: "ML" },
      { label: "Capacidad de Mando y Trato al Visitante", weightPct: 10, type: "LLM" }
    ],
    roleMetrics: { metric1Label: "Carné Sucamec", metric1Value: "95%", metric2Label: "CCTV Avanzado", metric2Value: "88%", metric3Label: "Indeci / Brigadas", metric3Value: "85%", metric4Label: "Liderazgo", metric4Value: "89/100" }
  },

  // 4. DIRECTIVOS (2 vacantes)
  {
    id: "REQ-2026-DIR-001",
    title: "Director de la Escuela de Posgrado en Administración",
    roleType: "directivo",
    roleTypeName: "Personal Directivo",
    categoryGroup: "Directivo",
    period: "Convocatoria 2026-2029",
    department: "Vicerrectorado Académico y Consejo Directivo",
    status: "Convocatoria Abierta",
    phase: "Evaluación por Comité de Búsqueda",
    totalProcessed: 14,
    defaultTopN: 2,
    avgScore: 88.5,
    potentialTalentCount: 3,
    batchId: "#ESAN-2026-DIR-01",
    criteriaVersion: "v3.0 (Alta Dirección Académica)",
    aiModel: "Claude 3.5 Sonnet + Matriz de Liderazgo Estratégico",
    knockoutRule: "Grado de Doctor (Ph.D.) en Administración/Economía y 10+ años en alta dirección",
    weights: [
      { label: "Visión Estratégica y Acreditaciones Internacionales (AACSB/AMBA)", weightPct: 35, type: "LLM" },
      { label: "Liderazgo de Claustro Docente y Programas de Posgrado", weightPct: 25, type: "LLM" },
      { label: "Relacionamiento con Sector Empresarial y Alianzas Globales", weightPct: 20, type: "ML" },
      { label: "Producción Científica y Grado de Ph.D.", weightPct: 20, type: "ML" }
    ],
    roleMetrics: {
      metric1Label: "Doctorado Ph.D. Sunedu",
      metric1Value: "100%",
      metric2Label: "Exp. AACSB / AMBA",
      metric2Value: "92%",
      metric3Label: "Liderazgo Ejecutivo",
      metric3Value: "95%",
      metric4Label: "Networking Global",
      metric4Value: "91/100"
    }
  },
  {
    id: "REQ-2026-DIR-002",
    title: "Director de Investigación, Producción Científica & Renacyt",
    roleType: "directivo",
    roleTypeName: "Personal Directivo",
    categoryGroup: "Directivo",
    period: "Convocatoria 2026-2029",
    department: "Dirección de Investigación y Vicerrectorado",
    status: "Convocatoria Abierta",
    phase: "Comité de Búsqueda y Evaluación",
    totalProcessed: 18,
    defaultTopN: 2,
    avgScore: 89.2,
    potentialTalentCount: 4,
    batchId: "#ESAN-2026-DIR-02",
    criteriaVersion: "v3.0",
    aiModel: "Claude 3.5 Sonnet + Matriz Bibliométrica",
    knockoutRule: "Calificación Renacyt Nivel I o Investigador Distinguido y Ph.D.",
    weights: [
      { label: "Publicaciones en Revistas Scopus/WoS Q1 y Q2", weightPct: 40, type: "ML" },
      { label: "Fondos Concursables Obtenidos (ProCiencia / Internacionales)", weightPct: 25, type: "ML" },
      { label: "Liderazgo de Grupos y Semilleros de Investigación", weightPct: 20, type: "LLM" },
      { label: "Gobernanza de Ética en Investigación y Propiedad Intelectual", weightPct: 15, type: "LLM" }
    ],
    roleMetrics: {
      metric1Label: "Renacyt Nivel I / Distinguido",
      metric1Value: "100%",
      metric2Label: "Publicaciones Q1 Scopus",
      metric2Value: "94%",
      metric3Label: "Fondos Internacionales",
      metric3Value: "88%",
      metric4Label: "H-Index Medio",
      metric4Value: "14.2"
    }
  }
];

// Candidates for DOCENTE Vacancy (REQ-2026-DOC-088)
export const MOCK_DOCENTE_CANDIDATES = [
  {
    id: "CAND-001",
    jobPostingId: "REQ-2026-DOC-088",
    name: "Marcia Samin",
    company: "Amazon Web Services",
    role: "Senior Cloud Solutions Architect",
    source: "linkedin",
    score: 92,
    stage: "entrevista",
    knockoutMet: true,
    transferablePotential: true,
    gaps: [
      { item: "Falta certificación formal Scrum Master", severity: "low", tip: "Compensado con liderazgo técnico ágil en AWS por 4 años." }
    ],
    risks: [
      "Disponibilidad horaria diurna limitada por jornada laboral en AWS (requiere cátedra noche o sábados)."
    ],
    crossMatches: [
      { jobCode: "REQ-2026-ADM-032", jobTitle: "Coordinador de Infraestructura TI", matchPct: 89, reason: "Afinidad alta en gestión de plataformas y gobernanza tecnológica." }
    ],
    performance6m: {
      hired: true,
      scoreInitial: 92,
      score6m: 95,
      review: "Cátedra con 97% de aprobación estudiantil; lideró proyecto de nube para alumnos de posgrado.",
      retentionStatus: "Excelente"
    },
    interviewStarQuestions: [
      "Situación: Describa un caso donde tuvo que diseñar una arquitectura serverless tolerante a fallos.",
      "Tarea: ¿Cómo sintetiza conceptos abstractos de microservicios para estudiantes sin experiencia previa en cloud?",
      "Acción: Ante la falta de certificación Scrum, ¿qué rituales ágiles aplica en sus equipos técnicos?",
      "Resultado: ¿Cuál fue la métrica de éxito o reducción de costos en su proyecto más relevante en AWS?"
    ],
    mandatoryReqs: [
      { name: "Experiencia Profesional (5+ años)", status: "green", tooltipTitle: "Años Comprobados", tooltipReason: "7 años en desarrollo distribuido y arquitectura en AWS." },
      { name: "Arquitectura Cloud & Microservicios", status: "green", tooltipTitle: "Cloud Avanzado", tooltipReason: "Dominio verificado en Kubernetes, Terraform y arquitecturas serverless." },
      { name: "Stack Backend (Node/Python/Go)", status: "green", tooltipTitle: "Backend Concurrente", tooltipReason: "6+ años programando microservicios de alto tráfico en Go y Python." },
      { name: "Docencia Universitaria o Mentoring", status: "green", tooltipTitle: "Pedagogía y Cátedra", tooltipReason: "Profesor adjunto durante 2 años en cursos de computación en la nube (UNI)." },
      { name: "Bases de Datos SQL y NoSQL", status: "green", tooltipTitle: "Persistencia", tooltipReason: "Experiencia en PostgreSQL de alto rendimiento, DynamoDB y Redis." }
    ],
    preferredCriteria: [
      { name: "AWS Solutions Architect Pro", matched: true },
      { name: "Maestría en Computación SUNEDU", matched: true },
      { name: "Scrum Master Certificado", matched: false }
    ],
    mlScore: 94,
    llmScore: 90,
    narrative: {
      selectionReason: "Postulante sobresaliente que excede todos los requisitos obligatorios. Máxima compatibilidad semántica con el syllabus de Arquitectura Cloud de ESAN.",
      strengths: [
        "100% cumplimiento en años requeridos (ML: 30%).",
        "Alta similitud semántica con el syllabus de cátedra (LLM: 30%).",
        "Maestría inscrita en SUNEDU y 2 años de experiencia como docente adjunta."
      ],
      gap: "Sin certificación Scrum formal; riesgo leve de horario diurno.",
      inclusionDetail: "Perfil idóneo para liderar tanto cursos de pregrado avanzado como seminarios de maestría."
    },
    weights: [
      { label: "Experiencia Profesional Comprobada", weightPct: 30, scoreObtained: 30, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica Proyectos & Syllabus", weightPct: 30, scoreObtained: 28, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico (Cloud/Backend)", weightPct: 20, scoreObtained: 19, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente Universitaria", weightPct: 10, scoreObtained: 10, maxScore: 10, type: "ML" },
      { label: "Certificaciones & Grado Académico", weightPct: 10, scoreObtained: 5, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Marcia Samin
**Senior Cloud Solutions Architect | AWS**
*Contacto: marcia.samin@aws-talent.pe | LinkedIn: /in/marciasamin*

## Resumen
Ingeniera de Sistemas colegiada con 7+ años diseñando plataformas resilientes y microservicios de alto tráfico.

## Educación
- **Maestría en Ciencias de la Computación** — Universidad Nacional de Ingeniería (SUNEDU Verificado).
- **Docente Adjunta** — Cátedra Sistemas Distribuidos (4 semestres).`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:41:12",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet / Text-Embedding-3-Large",
      decisionHistory: [
        { time: "09:41:15", user: "Sistema TalentAI", action: "Clasificación automática en Podio Top 1 (Score: 92)" },
        { time: "10:15:00", user: "Mariana Córdova (GTHC)", action: "Avanzada a Entrevista Técnica con Decano" }
      ]
    }
  },
  {
    id: "CAND-002",
    jobPostingId: "REQ-2026-DOC-088",
    name: "Carlos Mendoza",
    company: "Belcorp Digital",
    role: "Lead Software Architect",
    source: "linkedin",
    score: 89,
    stage: "entrevista",
    knockoutMet: true,
    transferablePotential: false,
    gaps: [
      { item: "Experiencia en Go básica (domina Java/Python)", severity: "medium", tip: "Requiere inducción en Go antes de iniciar semestre." }
    ],
    risks: ["Su enfoque es corporativo/retail; poca investigación teórica pura."],
    crossMatches: [
      { jobCode: "REQ-2026-ADM-032", jobTitle: "Jefe de Sistemas Transaccionales", matchPct: 86, reason: "Amplio background en ERP y arquitectura corporativa." }
    ],
    performance6m: {
      hired: true,
      scoreInitial: 89,
      score6m: 91,
      review: "Excelente pedagogía práctica enfocada en resolución de problemas reales.",
      retentionStatus: "Muy Bueno"
    },
    interviewStarQuestions: [
      "Situación: Describa la migración monolítica a microservicios más compleja que lideró.",
      "Tarea: ¿Cómo nivelaría a estudiantes con poco dominio de Python en 4 semanas?",
      "Acción: ¿De qué manera evalúa el código limpio y testing unitario en sus clases?"
    ],
    mandatoryReqs: [
      { name: "Experiencia Profesional (5+ años)", status: "green", tooltipTitle: "8 Años de Trayectoria", tooltipReason: "Cumple con 8 años liderando equipos en Belcorp e Interbank." },
      { name: "Arquitectura Cloud & Microservicios", status: "green", tooltipTitle: "Cloud Híbrido", tooltipReason: "Gran dominio de Azure Kubernetes Service y eventos Kafka." },
      { name: "Stack Backend (Node/Python/Go)", status: "amber", tooltipTitle: "Backend Mixto", tooltipReason: "Fuerte en Java y Python, pero experiencia en Go es menor a 1 año." },
      { name: "Docencia Universitaria o Mentoring", status: "green", tooltipTitle: "Docente Titular", tooltipReason: "3 años dictando Ingeniería de Software en pregrado." },
      { name: "Bases de Datos SQL y NoSQL", status: "green", tooltipTitle: "Bases de Datos", tooltipReason: "Experto en Oracle, MongoDB y Snowflake." }
    ],
    preferredCriteria: [
      { name: "Azure Solutions Architect", matched: true },
      { name: "Maestría SUNEDU", matched: true },
      { name: "Scrum Master", matched: true }
    ],
    mlScore: 90,
    llmScore: 88,
    narrative: {
      selectionReason: "Sólido perfil con amplia trayectoria docente y liderazgo en grandes corporaciones peruanas.",
      strengths: ["3 años de cátedra comprobada", "Maestría en Dirección Estratégica de TI", "Certificado Scrum y Azure."],
      gap: "Falta profundizar en Go para el laboratorio de microservicios.",
      inclusionDetail: "Aporta visión de negocio y buenas prácticas de ingeniería corporativa."
    },
    weights: [
      { label: "Experiencia Profesional Comprobada", weightPct: 30, scoreObtained: 30, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica Proyectos & Syllabus", weightPct: 30, scoreObtained: 26, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico (Cloud/Backend)", weightPct: 20, scoreObtained: 15, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente Universitaria", weightPct: 10, scoreObtained: 10, maxScore: 10, type: "ML" },
      { label: "Certificaciones & Grado Académico", weightPct: 10, scoreObtained: 8, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Carlos Mendoza
**Lead Software Architect | Belcorp**
*Contacto: c.mendoza@belcorp.biz*`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:43:00",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet",
      decisionHistory: [
        { time: "09:43:10", user: "Sistema TalentAI", action: "Clasificación en Podio Top 2 (Score: 89)" }
      ]
    }
  },
  {
    id: "CAND-003",
    jobPostingId: "REQ-2026-DOC-088",
    name: "Ana Beltrán",
    company: "Google Cloud Partner",
    role: "Principal DevOps & Cloud Engineer",
    source: "computrabajo",
    score: 86,
    stage: "preseleccionado",
    knockoutMet: true,
    transferablePotential: true,
    gaps: [
      { item: "Experiencia docente formal limitada a talleres", severity: "medium", tip: "Ha dictado webinars y talleres corporativos, pero no semestre completo." }
    ],
    risks: ["Requiere acompañamiento en pedagogía universitaria las primeras 2 semanas."],
    crossMatches: [
      { jobCode: "REQ-2026-ADM-032", jobTitle: "Coordinador de Plataformas Virtuales", matchPct: 84, reason: "Afinidad con entornos Google Workspace y LMS." }
    ],
    performance6m: null,
    interviewStarQuestions: [
      "Situación: ¿Cómo maneja situaciones de conflicto o reclamos de notas con estudiantes?",
      "Tarea: Describa su plan para diseñar un syllabus de CI/CD orientado a proyectos reales."
    ],
    mandatoryReqs: [
      { name: "Experiencia Profesional (5+ años)", status: "green", tooltipTitle: "6 Años DevOps", tooltipReason: "Extensa práctica en pipelines, automatización e infraestructura como código." },
      { name: "Arquitectura Cloud & Microservicios", status: "green", tooltipTitle: "GCP Expert", tooltipReason: "Certificada Google Cloud Professional Cloud Architect." },
      { name: "Stack Backend (Node/Python/Go)", status: "green", tooltipTitle: "Python y Go", tooltipReason: "Desarrollo de operadores de Kubernetes en Go." },
      { name: "Docencia Universitaria o Mentoring", status: "amber", tooltipTitle: "Mentora Técnica", tooltipReason: "Mentora en Women in Tech Perú; talleres técnicos dictados." },
      { name: "Bases de Datos SQL y NoSQL", status: "green", tooltipTitle: "Cloud Spanner & Postgres", tooltipReason: "Experta en bases de datos cloud modernas." }
    ],
    preferredCriteria: [
      { name: "GCP Professional Architect", matched: true },
      { name: "Maestría SUNEDU", matched: true },
      { name: "Scrum Master", matched: false }
    ],
    mlScore: 88,
    llmScore: 84,
    narrative: {
      selectionReason: "Ingeniera con conocimiento técnico de punta en infraestructura moderna y DevOps.",
      strengths: ["Certificación Google Cloud de alto nivel", "Maestría en Ciencias de la Información", "Gran comunicadora."],
      gap: "Falta horas de cátedra formal universitaria.",
      inclusionDetail: "Excelente potencial transferible para cátedras prácticas y talleres de posgrado."
    },
    weights: [
      { label: "Experiencia Profesional Comprobada", weightPct: 30, scoreObtained: 28, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica Proyectos & Syllabus", weightPct: 30, scoreObtained: 26, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico (Cloud/Backend)", weightPct: 20, scoreObtained: 18, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente Universitaria", weightPct: 10, scoreObtained: 6, maxScore: 10, type: "ML" },
      { label: "Certificaciones & Grado Académico", weightPct: 10, scoreObtained: 8, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Ana Beltrán
**Principal DevOps Engineer | Google Cloud Partner**`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:44:00",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet",
      decisionHistory: [
        { time: "09:44:10", user: "Sistema TalentAI", action: "Clasificación en Podio Top 3 (Score: 86)" }
      ]
    }
  },
  {
    id: "CAND-004",
    jobPostingId: "REQ-2026-DOC-088",
    name: "Paul Ladern",
    company: "Meta",
    role: "Senior Software Engineer",
    source: "linkedin",
    score: 83,
    stage: "postulado",
    knockoutMet: true,
    transferablePotential: true,
    gaps: [
      { item: "Sin certificación TypeScript formal", severity: "low", tip: "Verificado dominio práctico en repositorio GitHub." },
      { item: "Sin cátedra universitaria previa", severity: "high", tip: "Requiere test pedagógico obligatorio." }
    ],
    risks: ["Riesgo de desinterés si no hay proyectos de investigación vinculados."],
    crossMatches: [
      { jobCode: "REQ-2026-ADM-032", jobTitle: "Asesor Técnico de Innovación", matchPct: 82, reason: "Experiencia en metodologías de Silicon Valley." }
    ],
    performance6m: null,
    interviewStarQuestions: [
      "Situación: En Meta, ¿cómo aseguraba la calidad de código en despliegues con millones de usuarios?",
      "Tarea: Plantee cómo estructuraría una clase de 2 horas sobre patrones de diseño en microservicios."
    ],
    mandatoryReqs: [
      { name: "Experiencia Profesional (5+ años)", status: "green", tooltipTitle: "6 Años en Big Tech", tooltipReason: "6 años en sistemas concurrentes y backend distribuido." },
      { name: "Arquitectura Cloud & Microservicios", status: "green", tooltipTitle: "Arquitectura a Gran Escala", tooltipReason: "Infraestructura propietaria Meta y contenedores." },
      { name: "Stack Backend (Node/Python/Go)", status: "green", tooltipTitle: "Backend Concurrente", tooltipReason: "Python y C++ aplicados a backend transaccional." },
      { name: "Docencia Universitaria o Mentoring", status: "amber", tooltipTitle: "Mentor en Bootcamps", tooltipReason: "Mentor técnico interno en Meta, sin cátedra formal." },
      { name: "Bases de Datos SQL y NoSQL", status: "green", tooltipTitle: "Bases de Datos", tooltipReason: "RocksDB, MySQL distribuido y Cassandra." }
    ],
    preferredCriteria: [
      { name: "Kubernetes Certified", matched: true },
      { name: "Maestría SUNEDU", matched: true },
      { name: "Scrum Master", matched: false }
    ],
    mlScore: 84,
    llmScore: 82,
    narrative: {
      selectionReason: "Experiencia técnica de primer nivel internacional que prestigia la plana docente.",
      strengths: ["Experiencia comprobada en Meta", "Gran rigor en ingeniería de software."],
      gap: "Falta experiencia didáctica en aula universitaria peruana.",
      inclusionDetail: "Candidato con altísimo potencial para cátedras magistrales."
    },
    weights: [
      { label: "Experiencia Profesional Comprobada", weightPct: 30, scoreObtained: 30, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica Proyectos & Syllabus", weightPct: 30, scoreObtained: 24, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico (Cloud/Backend)", weightPct: 20, scoreObtained: 17, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente Universitaria", weightPct: 10, scoreObtained: 5, maxScore: 10, type: "ML" },
      { label: "Certificaciones & Grado Académico", weightPct: 10, scoreObtained: 7, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Paul Ladern
**Senior Software Engineer | Meta**`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:45:00",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet",
      decisionHistory: [
        { time: "09:45:05", user: "Sistema TalentAI", action: "Clasificación Top 4 (Score: 83)" }
      ]
    }
  },
  {
    id: "CAND-005",
    jobPostingId: "REQ-2026-DOC-088",
    name: "Roberto Cáceres",
    company: "Globant Perú",
    role: "Tech Lead Fullstack & Trainer",
    source: "referrals",
    score: 82,
    stage: "postulado",
    knockoutMet: true,
    transferablePotential: true,
    gaps: [
      { item: "Maestría en trámite de inscripción SUNEDU", severity: "high", tip: "Requiere constancia formal de registro antes de firma de contrato." }
    ],
    risks: ["Riesgo de trámite administrativo con grado académico extranjero."],
    crossMatches: [
      { jobCode: "REQ-2026-ADM-032", jobTitle: "Coordinador de Educación Continua", matchPct: 85, reason: "Experiencia como Head of Training en Globant University." }
    ],
    performance6m: null,
    interviewStarQuestions: [
      "Situación: ¿Cuál es el estado exacto de su homologación de maestría ante SUNEDU?",
      "Tarea: Comparta ejemplos de material pedagógico que haya diseñado en Globant University."
    ],
    mandatoryReqs: [
      { name: "Experiencia Profesional (5+ años)", status: "green", tooltipTitle: "7 Años Consultoría", tooltipReason: "7 años liderando proyectos de software en Globant." },
      { name: "Arquitectura Cloud & Microservicios", status: "green", tooltipTitle: "Cloud & Frontend", tooltipReason: "Arquitecturas cloud y micro-frontends en AWS." },
      { name: "Stack Backend (Node/Python/Go)", status: "green", tooltipTitle: "Node.js & TypeScript", tooltipReason: "Experto en TypeScript, Node y Python." },
      { name: "Docencia Universitaria o Mentoring", status: "green", tooltipTitle: "Head of Training", tooltipReason: "Head of Training en Globant University con más de 120 horas dictadas." },
      { name: "Bases de Datos SQL y NoSQL", status: "green", tooltipTitle: "Bases de Datos", tooltipReason: "MongoDB, Postgres y DynamoDB." }
    ],
    preferredCriteria: [
      { name: "TypeScript Specialist", matched: true },
      { name: "Maestría SUNEDU", matched: false },
      { name: "Scrum Master", matched: true }
    ],
    mlScore: 81,
    llmScore: 83,
    narrative: {
      selectionReason: "Destacado formador corporativo con gran habilidad oratoria y empatía con el estudiante.",
      strengths: ["Liderazgo pedagógico comprobado", "Dominio pleno de TypeScript y Node."],
      gap: "Grado de maestría pendiente de validación SUNEDU.",
      inclusionDetail: "Muy recomendable para módulos de desarrollo web y proyectos aplicados."
    },
    weights: [
      { label: "Experiencia Profesional Comprobada", weightPct: 30, scoreObtained: 28, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica Proyectos & Syllabus", weightPct: 30, scoreObtained: 25, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico (Cloud/Backend)", weightPct: 20, scoreObtained: 17, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente Universitaria", weightPct: 10, scoreObtained: 8, maxScore: 10, type: "ML" },
      { label: "Certificaciones & Grado Académico", weightPct: 10, scoreObtained: 4, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Roberto Cáceres
**Tech Lead Fullstack | Globant**`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:46:00",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet",
      decisionHistory: [
        { time: "09:46:10", user: "Sistema TalentAI", action: "Clasificación Top 5 (Score: 82)" }
      ]
    }
  }
];

// Candidates for OPERATIVO Vacancy (REQ-2026-OPE-014)
export const MOCK_OPERATIVO_CANDIDATES = [
  {
    id: "CAND-OPE-001",
    jobPostingId: "REQ-2026-OPE-014",
    name: "Jorge Alarcón",
    company: "Sodexo Perú (Sede Campus)",
    role: "Técnico de Mantenimiento Integral",
    source: "computrabajo",
    score: 93,
    stage: "entrevista",
    knockoutMet: true,
    transferablePotential: false,
    gaps: [
      { item: "Sin brechas detectadas", severity: "none", tip: "Cumple 100% de requisitos y reside a 20 min del campus." }
    ],
    risks: ["Ninguno reportado."],
    crossMatches: [
      { jobCode: "REQ-2026-ADM-032", jobTitle: "Supervisor de Logística de Almacén", matchPct: 81, reason: "Control de inventarios de repuestos y materiales." }
    ],
    performance6m: {
      hired: true,
      scoreInitial: 93,
      score6m: 96,
      review: "Cero incidencias en turnos nocturnos, proactivo en mantenimiento preventivo de aulas magnas.",
      retentionStatus: "Excelente"
    },
    interviewStarQuestions: [
      "Situación: Describa una emergencia eléctrica o de gas que haya resuelto en un campus universitario.",
      "Tarea: ¿Cómo organiza la ronda de verificación de luminarias y equipos de aire acondicionado en aulas magnas?",
      "Acción: ¿Tiene disponibilidad inmediata para asumir turno rotativo de fin de semana?",
      "Resultado: ¿Cuáles fueron las mejoras de seguridad que implementó en su puesto anterior?"
    ],
    mandatoryReqs: [
      { name: "Experiencia Operativa (3+ años)", status: "green", tooltipTitle: "5 Años en Mantenimiento", tooltipReason: "5 años en mantenimiento de campus universitarios y clínicas con Sodexo." },
      { name: "Disponibilidad Turnos Rotativos", status: "green", tooltipTitle: "Disponibilidad Plena", tooltipReason: "Acepta turnos mañana, tarde y noche sin restricciones familiares." },
      { name: "Proximidad al Campus (< 45 min)", status: "green", tooltipTitle: "Residencia Surco", tooltipReason: "Vive en Surco a 15 minutos en bus del campus ESAN." },
      { name: "Certificaciones SST y Primeros Auxilios", status: "green", tooltipTitle: "SST Certificado", tooltipReason: "Certificado en Trabajos en Altura, Riesgo Eléctrico y Primeros Auxilios." },
      { name: "Referencias Laborales Verificadas", status: "green", tooltipTitle: "Referencias Óptimas", tooltipReason: "2 cartas de recomendación directas de supervisores de Sodexo." }
    ],
    preferredCriteria: [
      { name: "Técnico Electricista SENATI", matched: true },
      { name: "Licencia de Conducir A-1", matched: true },
      { name: "Manejo de Pintura y Drywall", matched: true }
    ],
    mlScore: 94,
    llmScore: 92,
    narrative: {
      selectionReason: "Postulante operativo modelo. Experiencia probada en sedes universitarias, cercanía geográfica inmejorable y certificaciones de seguridad vigentes.",
      strengths: ["5 años de experiencia", "Reside a 15 min de ESAN", "Técnico egresado de SENATI."],
      gap: "Ninguna brecha operativa detectada.",
      inclusionDetail: "Capacidad de respuesta inmediata ante emergencias de infraestructura del campus."
    },
    weights: [
      { label: "Experiencia Operativa en Mantenimiento", weightPct: 40, scoreObtained: 40, maxScore: 40, type: "ML" },
      { label: "Disponibilidad Horaria / Turnos Rotativos", weightPct: 25, scoreObtained: 25, maxScore: 25, type: "ML" },
      { label: "Proximidad Geográfica al Campus (Surco)", weightPct: 15, scoreObtained: 15, maxScore: 15, type: "ML" },
      { label: "Certificaciones SST y Primeros Auxilios", weightPct: 10, scoreObtained: 10, maxScore: 10, type: "ML" },
      { label: "Referencias Laborales Verificadas", weightPct: 10, scoreObtained: 3, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Jorge Alarcón
**Técnico de Mantenimiento | Residencia: Santiago de Surco**
*Técnico Electricista SENATI con 5 años de experiencia en facilities corporativos.*`,
    audit: {
      batchId: "#ESAN-2026-014",
      timestamp: "2026-09-22 10:00:00",
      criteriaVersion: "v1.8",
      model: "Motor Determinista Reglas Duras",
      decisionHistory: [
        { time: "10:00:10", user: "Sistema TalentAI", action: "Clasificación en Podio Top 1 Operativo (Score: 93)" }
      ]
    }
  },
  {
    id: "CAND-OPE-002",
    jobPostingId: "REQ-2026-OPE-014",
    name: "Rosa Quispe",
    company: "Limpieza Integral SAC",
    role: "Líder de Cuadrilla de Mantenimiento y Limpieza",
    source: "bumeran",
    score: 88,
    stage: "entrevista",
    knockoutMet: true,
    transferablePotential: true,
    gaps: [
      { item: "Falta certificación en trabajos de alto riesgo eléctrico", severity: "medium", tip: "Experta en bioseguridad y químicos, pero no en tableros de alta tensión." }
    ],
    risks: ["Requiere equipo de apoyo para mantenimiento eléctrico mayor."],
    crossMatches: [
      { jobCode: "REQ-2026-ADM-032", jobTitle: "Auxiliar de Servicios Generales y Archivo", matchPct: 83, reason: "Orden riguroso y gestión de insumos institucionales." }
    ],
    performance6m: null,
    interviewStarQuestions: [
      "Situación: ¿Cómo distribuye las tareas de desinfección profunda en auditorios y baños antes de eventos magnos?",
      "Tarea: Describa el protocolo de uso de equipos de protección personal (EPP) que exige a su equipo."
    ],
    mandatoryReqs: [
      { name: "Experiencia Operativa (3+ años)", status: "green", tooltipTitle: "6 Años en el Rubro", tooltipReason: "6 años liderando cuadrillas de limpieza en edificios corporativos." },
      { name: "Disponibilidad Turnos Rotativos", status: "green", tooltipTitle: "Turnos Rotativos", tooltipReason: "Disponibilidad total para turno de madrugada y tarde." },
      { name: "Proximidad al Campus (< 45 min)", status: "green", tooltipTitle: "Residencia Chorrillos", tooltipReason: "Vive en Chorrillos a 30 minutos del campus ESAN." },
      { name: "Certificaciones SST y Primeros Auxilios", status: "amber", tooltipTitle: "SST Básico", tooltipReason: "Certificado en manejo de sustancias químicas peligrosas; falta electricidad." },
      { name: "Referencias Laborales Verificadas", status: "green", tooltipTitle: "Cartas Verificadas", tooltipReason: "Referencias excelentes con mención de honradez y puntualidad." }
    ],
    preferredCriteria: [
      { name: "Manejo de Maquinaria Industrial", matched: true },
      { name: "Capacitación en Manejo de Residuos", matched: true },
      { name: "Electricidad Básica", matched: false }
    ],
    mlScore: 89,
    llmScore: 87,
    narrative: {
      selectionReason: "Amplia experiencia en supervisión operativa y desinfección de grandes espacios.",
      strengths: ["Liderazgo de equipos operativos", "Excelente puntualidad", "Dominio de maquinaria industrial de pulido."],
      gap: "No realiza reparaciones eléctricas complejas.",
      inclusionDetail: "Muy recomendable para supervisión de servicios generales en el campus."
    },
    weights: [
      { label: "Experiencia Operativa en Mantenimiento", weightPct: 40, scoreObtained: 38, maxScore: 40, type: "ML" },
      { label: "Disponibilidad Horaria / Turnos Rotativos", weightPct: 25, scoreObtained: 25, maxScore: 25, type: "ML" },
      { label: "Proximidad Geográfica al Campus (Surco)", weightPct: 15, scoreObtained: 13, maxScore: 15, type: "ML" },
      { label: "Certificaciones SST y Primeros Auxilios", weightPct: 10, scoreObtained: 6, maxScore: 10, type: "ML" },
      { label: "Referencias Laborales Verificadas", weightPct: 10, scoreObtained: 6, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Rosa Quispe
**Supervisora de Servicios Generales | Chorrillos**`,
    audit: {
      batchId: "#ESAN-2026-014",
      timestamp: "2026-09-22 10:02:00",
      criteriaVersion: "v1.8",
      model: "Reglas Duras",
      decisionHistory: [
        { time: "10:02:10", user: "Sistema TalentAI", action: "Clasificación en Podio Top 2 Operativo (Score: 88)" }
      ]
    }
  },
  {
    id: "CAND-OPE-003",
    jobPostingId: "REQ-2026-OPE-014",
    name: "Manuel Benites",
    company: "Colegio Markham",
    role: "Auxiliar de Servicios e Infraestructura",
    source: "computrabajo",
    score: 84,
    stage: "preseleccionado",
    knockoutMet: true,
    transferablePotential: false,
    gaps: [
      { item: "Tiempo de traslado de 50 minutos (SJM)", severity: "low", tip: "Reside en San Juan de Miraflores; toma tren eléctrico y alimentador." }
    ],
    risks: ["Posible retraso en turnos de apertura a las 6:00 AM si hay congestión."],
    crossMatches: [],
    performance6m: null,
    interviewStarQuestions: [
      "Situación: ¿Cómo asegura su puntualidad en turnos que inician a las 6:30 AM desde su distrito?",
      "Tarea: Describa su experiencia en reparaciones de carpintería y cerrajería en aulas escolares."
    ],
    mandatoryReqs: [
      { name: "Experiencia Operativa (3+ años)", status: "green", tooltipTitle: "4 Años en Colegios", tooltipReason: "Experiencia directa en mantenimiento preventivo en centros educativos." },
      { name: "Disponibilidad Turnos Rotativos", status: "green", tooltipTitle: "Disponibilidad", tooltipReason: "Disponible para turnos rotativos." },
      { name: "Proximidad al Campus (< 45 min)", status: "amber", tooltipTitle: "50 Minutos Traslado", tooltipReason: "Reside en San Juan de Miraflores (50 minutos de viaje)." },
      { name: "Certificaciones SST y Primeros Auxilios", status: "green", tooltipTitle: "SST al Día", tooltipReason: "Certificación en brigadas de evacuación y primeros auxilios." },
      { name: "Referencias Laborales Verificadas", status: "green", tooltipTitle: "Carta Colegio Markham", tooltipReason: "Carta de recomendación de Jefe de Operaciones." }
    ],
    preferredCriteria: [
      { name: "Cerrajería y Carpintería", matched: true },
      { name: "Mantenimiento Sanitario", matched: true },
      { name: "Licencia de Conducir", matched: false }
    ],
    mlScore: 85,
    llmScore: 83,
    narrative: {
      selectionReason: "Técnico habilidoso en cerrajería y carpintería con experiencia en instituciones de enseñanza.",
      strengths: ["Cuidado meticuloso del mobiliario escolar/universitario", "Honradez verificada."],
      gap: "Distancia al campus levemente superior al corte ideal (50 min).",
      inclusionDetail: "Apto para el equipo de mantenimiento de aulas y auditorios."
    },
    weights: [
      { label: "Experiencia Operativa en Mantenimiento", weightPct: 40, scoreObtained: 36, maxScore: 40, type: "ML" },
      { label: "Disponibilidad Horaria / Turnos Rotativos", weightPct: 25, scoreObtained: 24, maxScore: 25, type: "ML" },
      { label: "Proximidad Geográfica al Campus (Surco)", weightPct: 15, scoreObtained: 9, maxScore: 15, type: "ML" },
      { label: "Certificaciones SST y Primeros Auxilios", weightPct: 10, scoreObtained: 8, maxScore: 10, type: "ML" },
      { label: "Referencias Laborales Verificadas", weightPct: 10, scoreObtained: 7, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Manuel Benites
**Auxiliar de Infraestructura | SJM**`,
    audit: {
      batchId: "#ESAN-2026-014",
      timestamp: "2026-09-22 10:04:00",
      criteriaVersion: "v1.8",
      model: "Reglas Duras",
      decisionHistory: [
        { time: "10:04:10", user: "Sistema TalentAI", action: "Clasificación en Podio Top 3 Operativo (Score: 84)" }
      ]
    }
  }
];

// Candidates for ADMINISTRATIVO Vacancy (REQ-2026-ADM-032)
export const MOCK_ADMIN_CANDIDATES = [
  {
    id: "CAND-ADM-001",
    jobPostingId: "REQ-2026-ADM-032",
    name: "Patricia Valdivia",
    company: "Universidad de Lima",
    role: "Coordinadora de Registros Académicos & Admisión",
    source: "linkedin",
    score: 91,
    stage: "entrevista",
    knockoutMet: true,
    transferablePotential: true,
    gaps: [
      { item: "Sin brechas críticas en ERP", severity: "none", tip: "Domina Banner Student y SAP a nivel avanzado." }
    ],
    risks: ["Expectativa salarial alta que requiere validación presupuestal con GTHC."],
    crossMatches: [
      { jobCode: "REQ-2026-DOC-088", jobTitle: "Docente de Gestión por Procesos", matchPct: 80, reason: "Título en Ingeniería Industrial y experiencia pedagógica interna." }
    ],
    performance6m: {
      hired: true,
      scoreInitial: 91,
      score6m: 94,
      review: "Optimizó el proceso de matrícula reduciendo tiempos de atención en 32%.",
      retentionStatus: "Excelente"
    },
    interviewStarQuestions: [
      "Situación: Describa una jornada crítica de matrícula con caída de sistema o saturación de cupos.",
      "Tarea: ¿Qué estrategia implementó para contener reclamos de postulantes y apoderados?",
      "Acción: ¿Cómo utilizó el módulo de Banner para generar reportes analíticos de admisión en tiempo real?",
      "Resultado: ¿En qué porcentaje mejoró la conversión de inscritos a matriculados?"
    ],
    mandatoryReqs: [
      { name: "Gestión de Procesos Académicos & ERP", status: "green", tooltipTitle: "Banner Student Certificado", tooltipReason: "5 años administrando módulos de admisión y matrícula en Banner." },
      { name: "Atención al Usuario & Resolución", status: "green", tooltipTitle: "Resolución de Conflictos", tooltipReason: "Lideró módulo de reclamos y atención personalizada a apoderados." },
      { name: "Análisis de Datos & Reportes", status: "green", tooltipTitle: "Data & PowerBI", tooltipReason: "Construcción de dashboards de seguimiento de embudo de admisión." },
      { name: "Dominio de Inglés (B2+)", status: "green", tooltipTitle: "Inglés Avanzado", tooltipReason: "Certificado TOEFL ITP con puntaje B2+/C1." },
      { name: "Liderazgo de Equipos de Front-Desk", status: "green", tooltipTitle: "Líder de 8 Asistentes", tooltipReason: "Supervisó equipo de 8 colaboradores en campañas masivas de admisión." }
    ],
    preferredCriteria: [
      { name: "Manejo Banner Student", matched: true },
      { name: "Power BI Intermedio-Avanzado", matched: true },
      { name: "Especialización en Gestión Universitaria", matched: true }
    ],
    mlScore: 92,
    llmScore: 90,
    narrative: {
      selectionReason: "Candidata sumamente calificada con experiencia directa en el sector universitario privado de primer nivel.",
      strengths: ["5 años coordinando admisiones universitarias", "Dominio experto de Banner", "Gran empatía en atención."],
      gap: "Expectativa económica por validar.",
      inclusionDetail: "Capacidad de liderar el rediseño digital del proceso de admisión ESAN."
    },
    weights: [
      { label: "Gestión de Procesos Académicos & ERP (Banner/SAP)", weightPct: 35, scoreObtained: 35, maxScore: 35, type: "ML" },
      { label: "Atención al Usuario & Resolución de Conflictos", weightPct: 25, scoreObtained: 23, maxScore: 25, type: "LLM" },
      { label: "Análisis de Datos & Métricas de Admisión", weightPct: 20, scoreObtained: 19, maxScore: 20, type: "ML" },
      { label: "Dominio de Inglés Intermedio-Avanzado", weightPct: 10, scoreObtained: 9, maxScore: 10, type: "ML" },
      { label: "Liderazgo de Equipos de Front-Desk", weightPct: 10, scoreObtained: 5, maxScore: 10, type: "LLM" }
    ],
    cvMarkdown: `# Patricia Valdivia
**Coordinadora de Admisiones y Registros Académicos | U. de Lima**`,
    audit: {
      batchId: "#ESAN-2026-032",
      timestamp: "2026-09-22 10:10:00",
      criteriaVersion: "v2.1",
      model: "Claude 3.5 Sonnet",
      decisionHistory: [
        { time: "10:10:10", user: "Sistema TalentAI", action: "Clasificación en Podio Top 1 Administrativo (Score: 91)" }
      ]
    }
  },
  {
    id: "CAND-ADM-002",
    jobPostingId: "REQ-2026-ADM-032",
    name: "Gonzalo Herrera",
    company: "UTEC",
    role: "Analista Senior de Admisiones y CRM",
    source: "linkedin",
    score: 87,
    stage: "preseleccionado",
    knockoutMet: true,
    transferablePotential: true,
    gaps: [
      { item: "Experiencia en SAP limitada (experto en Salesforce/HubSpot)", severity: "low", tip: "Muy adaptable a ERP corporativo gracias a su background en CRM." }
    ],
    risks: ["Enfocado más en analítica que en atención presencial de ventanilla."],
    crossMatches: [],
    performance6m: null,
    interviewStarQuestions: [
      "Situación: ¿Cómo diseñó las campañas de seguimiento a postulantes rezagados en UTEC?",
      "Tarea: Describa su curva de aprendizaje para dominar un ERP académico como Banner o SAP."
    ],
    mandatoryReqs: [
      { name: "Gestión de Procesos Académicos & ERP", status: "amber", tooltipTitle: "CRM & ERP Híbrido", tooltipReason: "Experto en Salesforce CRM y Banner básico (1 año)." },
      { name: "Atención al Usuario & Resolución", status: "green", tooltipTitle: "Atención Digital", tooltipReason: "Gestión de canales omnicanal WhatsApp y correo corporativo." },
      { name: "Análisis de Datos & Métricas", status: "green", tooltipTitle: "Analítica Avanzada", tooltipReason: "Modelos predictivos de deserción de postulantes en Python y Excel." },
      { name: "Dominio de Inglés (B2+)", status: "green", tooltipTitle: "Inglés Avanzado", tooltipReason: "Egresado bilingüe con fluidez profesional." },
      { name: "Liderazgo de Equipos de Front-Desk", status: "green", tooltipTitle: "Líder de Proyectos", tooltipReason: "Coordinó brigadas de orientación vocacional en colegios." }
    ],
    preferredCriteria: [
      { name: "Salesforce Education Cloud", matched: true },
      { name: "SQL Intermedio", matched: true },
      { name: "Gestión Banner", matched: false }
    ],
    mlScore: 86,
    llmScore: 88,
    narrative: {
      selectionReason: "Perfil moderno orientado a datos, CRM y prospección inteligente de postulantes.",
      strengths: ["Analítica predictiva de admisión", "Inglés fluido", "Automatización de correos y WhatsApp."],
      gap: "Falta profundizar en el módulo financiero de Banner/SAP.",
      inclusionDetail: "Aporta innovación tecnológica para la captación digital de postulantes a ESAN."
    },
    weights: [
      { label: "Gestión de Procesos Académicos & ERP (Banner/SAP)", weightPct: 35, scoreObtained: 28, maxScore: 35, type: "ML" },
      { label: "Atención al Usuario & Resolución de Conflictos", weightPct: 25, scoreObtained: 24, maxScore: 25, type: "LLM" },
      { label: "Análisis de Datos & Métricas de Admisión", weightPct: 20, scoreObtained: 20, maxScore: 20, type: "ML" },
      { label: "Dominio de Inglés Intermedio-Avanzado", weightPct: 10, scoreObtained: 9, maxScore: 10, type: "ML" },
      { label: "Liderazgo de Equipos de Front-Desk", weightPct: 10, scoreObtained: 6, maxScore: 10, type: "LLM" }
    ],
    cvMarkdown: `# Gonzalo Herrera
**Analista Senior de Admisiones | UTEC**`,
    audit: {
      batchId: "#ESAN-2026-032",
      timestamp: "2026-09-22 10:12:00",
      criteriaVersion: "v2.1",
      model: "Claude 3.5 Sonnet",
      decisionHistory: [
        { time: "10:12:10", user: "Sistema TalentAI", action: "Clasificación en Podio Top 2 Administrativo (Score: 87)" }
      ]
    }
  }
];

// Institutional Talent Bank (CAMBIO #11)
export const MOCK_TALENT_POOL = [
  {
    id: "TAL-001",
    name: "Esteban Zúñiga",
    roleCategory: "Docentes TI & Data",
    previousVacancy: "Convocatoria Docente 2026-I (REQ-2026-I-042)",
    scoreObtained: 85,
    matchReason: "Candidato con gran bagaje en Machine Learning y Big Data; no quedó en Top 2 por empate técnico.",
    tags: ["Data Science", "Python", "Maestría SUNEDU", "AWS Big Data"],
    availability: "Inmediata / Nocturna",
    lastContact: "Hace 2 meses",
    crossMatchOpportunity: "Apto para Cátedra de Inteligencia Artificial Pregrado (Coincidencia: 94%)"
  },
  {
    id: "TAL-002",
    name: "Milagros Paredes",
    roleCategory: "Administrativo & Admisiones",
    previousVacancy: "Coordinador de Servicios Estudiantiles 2025-II",
    scoreObtained: 84,
    matchReason: "Excelente evaluación en servicio al cliente y gestión de eventos académicos.",
    tags: ["Atención al Alumno", "Banner", "Eventos Académicos"],
    availability: "Tiempo Completo",
    lastContact: "Hace 3 semanas",
    crossMatchOpportunity: "Apto para Jefatura de Bienestar Estudiantil (Coincidencia: 88%)"
  },
  {
    id: "TAL-003",
    name: "Víctor Huamán",
    roleCategory: "Operativo & Facilities",
    previousVacancy: "Convocatoria Técnica Campus 2026-I",
    scoreObtained: 86,
    matchReason: "Técnico en Refrigeración y Climatización; finalista no seleccionado por cupo único.",
    tags: ["HVAC", "Aire Acondicionado", "SST Avanzado", "Surco"],
    availability: "Inmediata / Turnos",
    lastContact: "Hace 1 mes",
    crossMatchOpportunity: "Apto para Mantenimiento de Data Center y Laboratorios (Coincidencia: 91%)"
  },
  {
    id: "TAL-004",
    name: "Dr. Rodrigo Salcedo",
    roleCategory: "Docentes Finanzas & Economía",
    previousVacancy: "Cátedra Finanzas Corporativas 2025-II",
    scoreObtained: 88,
    matchReason: "Doctor en Economía (Ph.D.) con publicaciones en Scopus Q1.",
    tags: ["Finanzas", "Ph.D.", "Scopus Q1", "Renacyt"],
    availability: "Horas Lectivas",
    lastContact: "Hace 4 meses",
    crossMatchOpportunity: "Apto para Programa de Doctorado en Administración (Coincidencia: 96%)"
  }
];

// Organizational Profiles Library (CAMBIO #4)
// Organizational Profiles Library (Módulo Biblioteca de Perfiles)
export const ORGANIZATIONAL_TEMPLATES = [
  {
    id: "TPL-DOC-TI",
    title: "Profesor de Cátedra TI & Computación Cloud",
    roleType: "docente",
    category: "Docentes",
    description: "Diseñado para cátedras técnicas de ingeniería de software, arquitectura cloud y ciberseguridad.",
    knockoutRule: "Maestría inscrita en SUNEDU y 3+ años de experiencia profesional",
    historyCount: 6,
    historicalEffectiveness: "94.8% retención a 6 meses (97% satisfacción estudiantil)",
    criteria: [
      { name: "Experiencia Profesional Práctica en Industria", weight: 30 },
      { name: "Alineamiento Semántico con Syllabus", weight: 30 },
      { name: "Dominio de Stack Tecnológico Específico", weight: 20 },
      { name: "Experiencia en Cátedra Universitaria", weight: 10 },
      { name: "Certificaciones Técnicas Vigentes", weight: 10 }
    ]
  },
  {
    id: "TPL-DOC-FIN",
    title: "Profesor de Finanzas, Inversiones & Mercado de Capitales",
    roleType: "docente",
    category: "Docentes",
    description: "Para programas de maestría y especialización en finanzas cuantitativas y corporativas.",
    knockoutRule: "Grado de Maestro o Doctor y certificación CFA/FRM deseable",
    historyCount: 5,
    historicalEffectiveness: "92.3% retención (Casos de estudio premiados)",
    criteria: [
      { name: "Trayectoria en Banca y Mercados Financieros", weight: 35 },
      { name: "Publicaciones / Producción de Casos de Negocio", weight: 25 },
      { name: "Habilidades Pedagógicas y Método del Caso", weight: 20 },
      { name: "Certificaciones Financieras (CFA/FRM/CAIA)", weight: 10 },
      { name: "Red de Contactos Institucionales", weight: 10 }
    ]
  },
  {
    id: "TPL-ADM-PROCESOS",
    title: "Coordinador de Procesos Académicos & Admisiones",
    roleType: "administrativo",
    category: "Administrativos",
    description: "Gestión de matrícula, atención a alumnos y apoderados y manejo de ERP Banner/SAP.",
    knockoutRule: "Título universitario y experiencia mínima 3 años en universidades",
    historyCount: 4,
    historicalEffectiveness: "91.0% retención (-32% tiempo en colas de matrícula)",
    criteria: [
      { name: "Manejo de ERP Académico (Banner/SAP)", weight: 35 },
      { name: "Resolución de Conflictos y Atención al Usuario", weight: 25 },
      { name: "Análisis de Datos y Reportes de Gestión", weight: 20 },
      { name: "Dominio de Inglés Intermedio-Avanzado", weight: 10 },
      { name: "Liderazgo de Equipos de Atención", weight: 10 }
    ]
  },
  {
    id: "TPL-ADM-TALENTO",
    title: "Especialista en Atracción del Talento & Selección",
    roleType: "administrativo",
    category: "Administrativos",
    description: "Reclutamiento masivo, evaluación de competencias y sourcing en educación superior.",
    knockoutRule: "Titulado en Psicología/Administración y 3+ años en selección universitaria",
    historyCount: 3,
    historicalEffectiveness: "95.0% cumplimiento en KPIs de reclutamiento",
    criteria: [
      { name: "Reclutamiento de Perfiles Técnicos y Docentes", weight: 35 },
      { name: "Entrevistas por Competencias (STAR)", weight: 25 },
      { name: "Gestión de ATS e IA de Talento", weight: 20 },
      { name: "Tiempos de Cobertura y Retención", weight: 20 }
    ]
  },
  {
    id: "TPL-OPE-CAMPUS",
    title: "Auxiliar Operativo de Mantenimiento de Infraestructura",
    roleType: "operativo",
    category: "Operativos",
    description: "Evaluación de personal de mantenimiento eléctrico, sanitario y facilities del campus.",
    knockoutRule: "Antecedentes policiales limpios y disponibilidad inmediata de turnos",
    historyCount: 8,
    historicalEffectiveness: "96.5% cumplimiento de turnos y cero accidentes",
    criteria: [
      { name: "Experiencia Operativa Comprobada", weight: 40 },
      { name: "Disponibilidad Horaria y Turnos Rotativos", weight: 25 },
      { name: "Cercanía Geográfica al Campus (< 45 min)", weight: 15 },
      { name: "Certificaciones SST y Primeros Auxilios", weight: 10 },
      { name: "Cartas de Referencia Verificadas", weight: 10 }
    ]
  },
  {
    id: "TPL-DIR-ESCUELA",
    title: "Director de Escuela de Posgrado en Negocios",
    roleType: "directivo",
    category: "Directivos",
    description: "Liderazgo de programas de maestría, acreditaciones internacionales y relacionamiento empresarial.",
    knockoutRule: "Doctorado Ph.D. en Administración/Economía y 10+ años en alta dirección",
    historyCount: 2,
    historicalEffectiveness: "100% de cumplimiento en acreditaciones internacionales",
    criteria: [
      { name: "Visión Estratégica & Acreditaciones (AACSB/AMBA)", weight: 35 },
      { name: "Liderazgo de Claustro Docente de Posgrado", weight: 25 },
      { name: "Relaciones Empresariales y Networking Global", weight: 20 },
      { name: "Producción Científica y Grado de Doctor", weight: 20 }
    ]
  },
  {
    id: "TPL-DIR-INVESTIGACION",
    title: "Director de Investigación, Producción Científica & Renacyt",
    roleType: "directivo",
    category: "Directivos",
    description: "Supervisión de semilleros, gestión de fondos concursables y publicaciones Scopus/WoS.",
    knockoutRule: "Investigador Renacyt Nivel I / Distinguido y Ph.D. verificado",
    historyCount: 2,
    historicalEffectiveness: "Incremento de +42% en publicaciones Scopus Q1",
    criteria: [
      { name: "Publicaciones en Revistas Q1 Scopus/WoS", weight: 40 },
      { name: "Adjudicación de Fondos Concursables", weight: 25 },
      { name: "Liderazgo de Semilleros y Grupos de Investigación", weight: 20 },
      { name: "Gobernanza Ética y Propiedad Intelectual", weight: 15 }
    ]
  }
];

// OCR Monitoring & Batch Processing Incidences
export const MOCK_OCR_INCIDENCES = {
  summary: {
    total: 489,
    successful: 482,
    review: 5,
    error: 2
  },
  items: [
    { id: "INC-01", file: "CV_Carlos_Vargas_2026.pdf", status: "review", channel: "LinkedIn Recruiter", type: "Docente", issue: "Baja resolución OCR (150 DPI)", action: "Revisar DNI y fecha de colegiatura manualmente", candidateName: "Carlos Vargas Alva" },
    { id: "INC-02", file: "CV_Lucia_Mendoza_Docente.pdf", status: "review", channel: "Gmail Convocatoria", type: "Docente", issue: "Grado internacional", action: "Pendiente cotejo de apostilla de La Haya y SUNEDU", candidateName: "Lucía Mendoza Ríos" },
    { id: "INC-03", file: "CV_Eduardo_Perez_IT.docx", status: "review", channel: "CompuTrabajo API", type: "Docente", issue: "Tabla laboral anidada", action: "Confirmar 2 años de experiencia solapados en empresas simultáneas", candidateName: "Eduardo Pérez Silva" },
    { id: "INC-04", file: "CV_Mariana_Soto_Admin.pdf", status: "review", channel: "Bumeran Portal", type: "Administrativo", issue: "Imagen ilegible", action: "Certificado de inglés B2 adjunto como captura borrosa", candidateName: "Mariana Soto Balbín" },
    { id: "INC-05", file: "CV_Gonzalo_Rivas_SST.pdf", status: "review", channel: "CompuTrabajo API", type: "Operativo", issue: "Validación de firma digital", action: "Carné SST y primeros auxilios con firma pendiente en Reniec", candidateName: "Gonzalo Rivas Peña" },
    { id: "INC-06", file: "CV_Raul_Castro_Protected.pdf", status: "error", channel: "Gmail Convocatoria", type: "Docente", issue: "Archivo encriptado", action: "PDF protegido por contraseña del postulante; no procesable", candidateName: "Raúl Castro Medina" },
    { id: "INC-07", file: "CV_Patricia_Luna_Corrupted.pdf", status: "error", channel: "CompuTrabajo API", type: "Administrativo", issue: "Flujo de bytes corrupto", action: "Descarga truncada desde API externa; se requiere resincronización", candidateName: "Patricia Luna Ramos" }
  ]
};

// Executive Metrics (CAMBIO #15)
export const EXECUTIVE_METRICS = {
  openVacanciesCount: 18,
  evaluatedCandidatesYTD: 845,
  avgCoverageDays: 12.4,
  targetCoverageDays: 15.0,
  successfulHires6mRate: 89.2,
  costSavingsPct: 41.5,
  facultyBreakdown: [
    { faculty: "Ingeniería & TI", activeJobs: 6, hiresRate: "94%" },
    { faculty: "Administración & Finanzas", activeJobs: 5, hiresRate: "88%" },
    { faculty: "Operaciones Campus", activeJobs: 4, hiresRate: "91%" },
    { faculty: "Posgrado & Maestrías", activeJobs: 3, hiresRate: "85%" }
  ],
  topChannels: [
    { name: "LinkedIn Recruiter", pct: 45, quality: "Excelente" },
    { name: "CompuTrabajo", pct: 28, quality: "Bueno" },
    { name: "Red de Referencias ESAN", pct: 17, quality: "Sobresaliente" },
    { name: "Bumeran / Otros", pct: 10, quality: "Aceptable" }
  ]
};

// Default export initial pointer for backwards-compatibility
export const MOCK_JOB_POSTING = MOCK_JOB_POSTINGS[0];
export const MOCK_CANDIDATES = MOCK_DOCENTE_CANDIDATES;
