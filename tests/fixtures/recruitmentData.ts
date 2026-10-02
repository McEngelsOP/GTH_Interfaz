// Perfiles inventados, utilizados exclusivamente en pruebas.
import { Candidate, Application, AppStateData } from '../../src/types/index.ts';
import { INITIAL_JOB_POSTINGS } from '../../src/data/initialData.ts';

export const INITIAL_CANDIDATES: Candidate[] = [
  // 10 iniciales de la especificación
  {
    id: 'cand-001',
    name: 'Marcia Samin',
    email: 'marcia.samin@cloudexpert.pe',
    phone: '+51 987 654 321',
    currentTitle: 'Senior Cloud Solutions Architect',
    currentCompany: 'Amazon Web Services',
    source: 'LinkedIn Recruiter',
    summary: 'Arquitecta de soluciones Cloud con 11 años de experiencia en infraestructura distribuida y Kubernetes. Maestría en Computación por la Universidad de Chile (inscrita en SUNEDU).',
    rawCvText: `### Resumen Profesional
Arquitecta Cloud con más de una década liderando migraciones a AWS en banca y retail en Latinoamérica.

### Formación Académica
- **Maestría en Ciencias de la Computación** - Univ. de Chile (Registro SUNEDU N° 458920).
- **Ingeniería de Sistemas** - Universidad Nacional de Ingeniería.

### Certificaciones
- AWS Certified Solutions Architect - Professional (Vigente).
- CKA (Certified Kubernetes Administrator).

### Experiencia Docente
- Docente invitada en cursos de extensión en Arquitectura Cloud (3 semestres).`,
    savedInTalentPool: false,
    potentialOpportunities: ['Cátedra de Ciberseguridad & Gobernanza de Datos', 'Cátedra de Inteligencia Artificial'],
  },
  {
    id: 'cand-002',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@belcorp.com',
    phone: '+51 991 234 567',
    currentTitle: 'Lead Software Architect',
    currentCompany: 'Belcorp Digital',
    source: 'Referencia Académica',
    summary: 'Líder técnico especializado en microservicios, Event-Driven Architecture y backend de alto rendimiento. Maestría en Ing. de Software en PUCP reconocida por SUNEDU.',
    rawCvText: `### Resumen Profesional
Especialista en escalabilidad de plataformas de comercio digital y liderazgo de equipos de desarrollo ágil.

### Formación Académica
- **Maestría en Ingeniería de Software** - PUCP (Registro SUNEDU N° 381022).
- **Ingeniería de Software** - UNMSM.

### Habilidades Clave
- Node.js, Go, TypeScript, Kafka, Docker, Terraform.
- 5 años de docencia universitaria en pregrado.`,
    savedInTalentPool: false,
    potentialOpportunities: ['Cátedra de Ciberseguridad'],
  },
  {
    id: 'cand-003',
    name: 'Ana Beltrán',
    email: 'ana.beltran@gcp-partner.io',
    phone: '+51 945 678 901',
    currentTitle: 'Principal DevOps & Cloud Engineer',
    currentCompany: 'Google Cloud Partner',
    source: 'Bolsa ESAN',
    summary: 'Ingeniera de infraestructura y pipelines CI/CD masivos con enfoque en observabilidad y seguridad en la nube. Grado de Maestría SUNEDU y certificación Google Cloud Fellow.',
    rawCvText: `### Resumen Profesional
Especialista en SRE y despliegues multi-cloud automatizados.

### Formación
- **Maestría en Gestión de TI** - Univ. Politécnica de Madrid (Convalida SUNEDU).
- **Ingeniería Informática** - Univ. de Lima.`,
    savedInTalentPool: false,
    potentialOpportunities: ['Cátedra de Inteligencia Artificial & Aprendizaje Automático'],
  },
  {
    id: 'cand-004',
    name: 'Paul Ladern',
    email: 'paul.ladern@meta.internal.org',
    phone: '+51 976 543 210',
    currentTitle: 'Senior Software Engineer',
    currentCompany: 'Meta',
    source: 'LinkedIn',
    summary: 'Desarrollador fullstack senior con contribuciones en proyectos open source de gran impacto. Maestría registrada en SUNEDU.',
    rawCvText: `### Resumen Profesional
Ingeniero enfocado en sistemas distribuidos, React, GraphQL y Rust.

### Formación
- **Maestría en Ciencias de la Computación** - Georgia Tech (Registrada en SUNEDU).`,
    savedInTalentPool: false,
  },
  {
    id: 'cand-005',
    name: 'Roberto Cáceres',
    email: 'roberto.caceres@globant.com',
    phone: '+51 965 432 109',
    currentTitle: 'Tech Lead Fullstack & Trainer',
    currentCompany: 'Globant Perú',
    source: 'Bumeran',
    summary: 'Tech Lead con alta vocación pedagógica y mentoría de más de 200 desarrolladores juniors. Maestría en Docencia e Informática SUNEDU.',
    rawCvText: `### Resumen Profesional
Líder técnico y formador corporativo en tecnologías web modernas y arquitecturas cloud.`,
    savedInTalentPool: false,
  },
  {
    id: 'cand-006',
    name: 'Jorge Alarcón',
    email: 'jorge.alarcon@sodexo.pe',
    phone: '+51 954 321 098',
    currentTitle: 'Técnico de Mantenimiento Integral',
    currentCompany: 'Sodexo Perú (Sede Campus)',
    source: 'Bolsa de Empleo Municipal',
    summary: 'Técnico con 8 años en facilities universitarios, mantenimiento electromecánico y gasfitería. Antecedentes penales y policiales limpios verificados.',
    rawCvText: `### Experiencia Operativa
- 8 años en mantenimiento integral de sedes educativas.
- Certificaciones en Primeros Auxilios y Trabajos en Altura.`,
    savedInTalentPool: false,
  },
  {
    id: 'cand-007',
    name: 'Rosa Quispe',
    email: 'rosa.quispe@limpiezaintegral.pe',
    phone: '+51 943 210 987',
    currentTitle: 'Líder de Cuadrilla de Mantenimiento y Limpieza',
    currentCompany: 'Limpieza Integral SAC',
    source: 'CompuTrabajo',
    summary: 'Líder operativa responsable de supervisión de protocolos sanitarios y cuadrillas de turno tarde-noche. Documentación verificada y residencia en Surco (15 min de campus).',
    rawCvText: `### Experiencia
- Supervisión de equipos de limpieza profunda hospitalaria y de campus.
- Residencia inmediata a Sede Monterrico.`,
    savedInTalentPool: false,
  },
  {
    id: 'cand-008',
    name: 'Manuel Benites',
    email: 'manuel.benites@markham.edu.pe',
    phone: '+51 932 109 876',
    currentTitle: 'Auxiliar de Servicios e Infraestructura',
    currentCompany: 'Colegio Markham',
    source: 'Referencia',
    summary: 'Auxiliar operativo con experiencia en mantenimiento de áreas comunes, jardines y redes eléctricas básicas en instituciones educativas.',
    rawCvText: `### Resumen
- Mantenimiento preventivo de instalaciones escolares y laboratorios.`,
    savedInTalentPool: false,
  },
  {
    id: 'cand-009',
    name: 'Patricia Valdivia',
    email: 'patricia.valdivia@ulima.edu.pe',
    phone: '+51 921 098 765',
    currentTitle: 'Coordinadora de Registros Académicos & Admisión',
    currentCompany: 'Universidad de Lima',
    source: 'Bolsa ESAN',
    summary: 'Administradora con 7 años coordinando procesos de matrícula en ERP Banner y atención de alta demanda para postulantes de pregrado. Título universitario registrado.',
    rawCvText: `### Trayectoria Profesional
- Coordinación de admisiones y validación de actas universitarias.
- Dominio avanzado de ERP Banner Student y módulo de admisiones.`,
    savedInTalentPool: false,
  },
  {
    id: 'cand-010',
    name: 'Gonzalo Herrera',
    email: 'gonzalo.herrera@utec.edu.pe',
    phone: '+51 910 987 654',
    currentTitle: 'Analista Senior de Admisiones y CRM',
    currentCompany: 'UTEC',
    source: 'LinkedIn',
    summary: 'Analista de captación de postulantes con manejo de Salesforce Education Cloud y analítica de conversión de embudo de admisión.',
    rawCvText: `### Experiencia
- Manejo de CRM educativo, análisis de cohortes y atención a postulantes.`,
    savedInTalentPool: false,
  },

  // Casos de prueba estructurados para la demo (Puntaje ausente, sin correo, etc.)
  {
    id: 'cand-011',
    name: 'Fiorella De La Cuba',
    email: null, // Caso honesto: Sin correo registrado
    phone: '+51 999 111 222',
    currentTitle: 'Docente Investigadora en Cloud',
    currentCompany: 'Univ. San Marcos',
    source: 'Referencia',
    summary: 'Caso de prueba: Candidata con perfil destacado pero sin correo electrónico en su CV (contacto telefónico exclusivo).',
    rawCvText: `CV estructurado de prueba. Contacto telefónico únicamente.`,
    savedInTalentPool: false,
  },
  {
    id: 'cand-012',
    name: 'Klaus Lindner',
    email: 'klaus.lindner@germany-ai.org',
    phone: null,
    currentTitle: 'Machine Learning Specialist',
    currentCompany: 'Kaggle Grandmaster',
    source: 'LinkedIn',
    summary: 'Caso de prueba: candidato con evaluación LLM registrada y requisito obligatorio pendiente de verificación.',
    rawCvText: `Especialista en LLMs y embeddings vectoriales. Aún sin homologación de experiencia técnica en sistema local.`,
    savedInTalentPool: false,
  },
  {
    id: 'cand-013',
    name: 'Esteban Zúñiga',
    email: 'esteban.zuniga@talento.pe',
    phone: '+51 981 726 354',
    currentTitle: 'Consultor de Gestión Operativa',
    currentCompany: 'Independiente',
    source: 'Banco de Talento Histórico',
    summary: 'Perfil guardado de demostración: Experiencia por revisar.',
    rawCvText: `Perfil importado desde archivo histórico de talento.`,
    savedInTalentPool: true,
    talentPoolNotes: 'Perfil con alta adaptabilidad para áreas operativas y de soporte.',
    potentialOpportunities: ['Auxiliar de Mantenimiento y Servicios Campus Monterrico'],
  },
  {
    id: 'cand-014',
    name: 'Milagros Paredes',
    email: 'milagros.paredes@talento.pe',
    phone: '+51 972 635 481',
    currentTitle: 'Analista de Procesos Institucionales',
    currentCompany: 'Independiente',
    source: 'Banco de Talento Histórico',
    summary: 'Perfil guardado de demostración: Experiencia por revisar.',
    rawCvText: `Perfil importado desde archivo histórico de talento.`,
    savedInTalentPool: true,
    talentPoolNotes: 'Candidata destacada para coordinación académica o admisiones.',
    potentialOpportunities: ['Coordinador de Admisiones y Procesos Académicos'],
  },
  {
    id: 'cand-015',
    name: 'Víctor Huamán',
    email: 'victor.huaman@talento.pe',
    phone: '+51 963 548 192',
    currentTitle: 'Supervisor de Infraestructura',
    currentCompany: 'Independiente',
    source: 'Banco de Talento Histórico',
    summary: 'Perfil guardado de demostración: Experiencia por revisar.',
    rawCvText: `Perfil importado desde archivo histórico de talento.`,
    savedInTalentPool: true,
    talentPoolNotes: 'Especialista en mantenimiento electromecánico y facilities.',
    potentialOpportunities: ['Auxiliar de Mantenimiento', 'Técnico Electricista'],
  },
  {
    id: 'cand-016',
    name: 'Dr. Rodrigo Salcedo',
    email: 'rodrigo.salcedo@investigacion.edu.pe',
    phone: '+51 954 819 203',
    currentTitle: 'Investigador Renacyt Nivel II',
    currentCompany: 'Consejo Nacional de Ciencia',
    source: 'Banco de Talento Histórico',
    summary: 'Perfil guardado de demostración: Experiencia por revisar.',
    rawCvText: `Doctor en Economía con 18 publicaciones en revistas indexadas Scopus Q1/Q2.`,
    savedInTalentPool: true,
    talentPoolNotes: 'Candidato con perfil para dirección de investigación o cátedras de posgrado.',
    potentialOpportunities: ['Director de Investigación, Producción Científica & Renacyt', 'Cátedra de Estrategia'],
  },
];

// --------------------------------------------------------------------------
// Postulaciones Iniciales (Applications)
// --------------------------------------------------------------------------
export const INITIAL_APPLICATIONS: Application[] = [
  // 1. Convocatoria REQ-2026-DOC-088 (5 candidatos iniciales + 2 casos de prueba)
  {
    id: 'app-001',
    jobPostingId: 'REQ-2026-DOC-088',
    candidateId: 'cand-001', // Marcia Samin
    stage: 'postulado',
    llmScore: 90,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Maestría en Computación verificada en registro SUNEDU con diploma N° 458920.',
    whyScoreNotes: {
      explanation: 'Máxima puntuación en experiencia práctica en AWS y docencia universitaria previa.',
      strengths: ['11 años en arquitecturas Cloud', 'Certificación AWS Solutions Architect Pro', 'Excelente afinidad con syllabus'],
      evidenceSummary: 'Comprobantes de servicio como Solution Architect en AWS y registro SUNEDU validado.',
    },
    criteriaBreakdown: {
      c1: { score: 96, evidence: '11 años en AWS y retail bancario' },
      c2: { score: 90, evidence: 'Alineación de 90% con syllabus de Cloud Computing' },
      c3: { score: 95, evidence: 'Dominio avanzado de AWS, Terraform y Kubernetes' },
      c4: { score: 90, evidence: '3 semestres de cátedra de posgrado' },
      c5: { score: 98, evidence: 'Certificación AWS Pro y CKA vigentes' },
    },
    suggestedRoles: ['Cátedra de Ciberseguridad & Gobernanza de Datos'],
    createdAt: '2026-08-20T10:15:00Z',
    updatedAt: '2026-08-20T10:15:00Z',
  },
  {
    id: 'app-002',
    jobPostingId: 'REQ-2026-DOC-088',
    candidateId: 'cand-002', // Carlos Mendoza
    stage: 'postulado',
    llmScore: 88,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Maestría en Ingeniería de Software en PUCP registrada en SUNEDU.',
    whyScoreNotes: {
      explanation: 'Fuerte perfil en arquitectura backend, microservicios y trayectoria académica de 5 años.',
      strengths: ['Liderazgo técnico en Belcorp', '5 años como docente universitario', 'Stack técnico en Go y Node'],
      evidenceSummary: 'Constancias de docencia en pregrado y certificaciones técnicas.',
    },
    criteriaBreakdown: {
      c1: { score: 92, evidence: '8 años de experiencia en desarrollo distribuido' },
      c2: { score: 88, evidence: 'Alta coincidencia con temas de diseño de software' },
      c3: { score: 90, evidence: 'Stack sólido en Cloud Native y Docker' },
      c4: { score: 94, evidence: '5 años en cátedras de ingeniería de software' },
      c5: { score: 85, evidence: 'Grado de Maestro registrado' },
    },
    createdAt: '2026-08-21T11:30:00Z',
    updatedAt: '2026-08-21T11:30:00Z',
  },
  {
    id: 'app-003',
    jobPostingId: 'REQ-2026-DOC-088',
    candidateId: 'cand-003', // Ana Beltrán
    stage: 'postulado',
    llmScore: 84,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Maestría en Gestión de TI convalidada en SUNEDU.',
    whyScoreNotes: {
      explanation: 'Amplio dominio en pipelines CI/CD multi-cloud y cultura DevOps.',
      strengths: ['Google Cloud Fellow', 'Automatización de infraestructura', 'Buenas referencias de la industria'],
      evidenceSummary: 'Portafolio de despliegues cloud en Google Partner.',
    },
    criteriaBreakdown: {
      c1: { score: 90, evidence: '7 años en consultoría cloud' },
      c2: { score: 84, evidence: 'Afinidad con cursos de DevOps y Cloud' },
      c3: { score: 92, evidence: 'GCP, Terraform, Kubernetes' },
      c4: { score: 78, evidence: 'Talleres corporativos (sin cátedra formal)' },
      c5: { score: 95, evidence: 'Google Cloud Fellow' },
    },
    createdAt: '2026-08-22T09:00:00Z',
    updatedAt: '2026-08-22T09:00:00Z',
  },
  {
    id: 'app-004',
    jobPostingId: 'REQ-2026-DOC-088',
    candidateId: 'cand-004', // Paul Ladern
    stage: 'postulado',
    llmScore: 82,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Maestría en Georgia Tech registrada en SUNEDU.',
    whyScoreNotes: {
      explanation: 'Excelente nivel de ingeniería de software con experiencia global en Meta.',
      strengths: ['Ingeniería de software en Big Tech', 'Rust y GraphQL', 'Proyectos Open Source'],
      evidenceSummary: 'Registro SUNEDU verificado y experiencia laboral internacional.',
    },
    criteriaBreakdown: {
      c1: { score: 94, evidence: '6 años en Silicon Valley / Meta' },
      c2: { score: 82, evidence: 'Afinidad con temas de programación avanzada' },
      c3: { score: 88, evidence: 'Sistemas distribuidos a gran escala' },
      c4: { score: 65, evidence: 'Poca experiencia docente formal' },
      c5: { score: 90, evidence: 'Grado de Georgia Tech' },
    },
    createdAt: '2026-08-23T14:20:00Z',
    updatedAt: '2026-08-23T14:20:00Z',
  },
  {
    id: 'app-005',
    jobPostingId: 'REQ-2026-DOC-088',
    candidateId: 'cand-005', // Roberto Cáceres
    stage: 'postulado',
    llmScore: 83,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Maestría en Docencia e Informática inscrita en SUNEDU.',
    whyScoreNotes: {
      explanation: 'Perfil con excelente habilidad pedagógica y experiencia como formador corporativo en Globant.',
      strengths: ['Capacidad de mentoría y didáctica', 'Fullstack moderno', 'Grado de maestría pedagógica'],
      evidenceSummary: 'Evaluaciones de satisfacción docente en programas de capacitación.',
    },
    criteriaBreakdown: {
      c1: { score: 80, evidence: '6 años como desarrollador y líder técnico' },
      c2: { score: 83, evidence: 'Afinidad pedagógica y didáctica con syllabus' },
      c3: { score: 82, evidence: 'JavaScript, React, Node y AWS' },
      c4: { score: 90, evidence: 'Instructor principal en academias técnicas' },
      c5: { score: 82, evidence: 'Maestría en Educación Superior' },
    },
    createdAt: '2026-08-24T16:00:00Z',
    updatedAt: '2026-08-24T16:00:00Z',
  },

  // Casos de prueba adicionales en REQ-2026-DOC-088:
  {
    id: 'app-006',
    jobPostingId: 'REQ-2026-DOC-088',
    candidateId: 'cand-011', // Fiorella De La Cuba (Sin correo)
    stage: 'postulado',
    llmScore: 76,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Maestría SUNEDU en Ingeniería de Sistemas verificada.',
    whyScoreNotes: {
      explanation: 'Candidata de prueba para validar interfaz cuando no hay correo electrónico registrado.',
      strengths: ['Investigación en Cloud', 'Experiencia en San Marcos'],
      evidenceSummary: 'Diploma SUNEDU validado.',
    },
    criteriaBreakdown: {
      c1: { score: 75, evidence: '4 años en desarrollo' },
      c2: { score: 76, evidence: 'Alineación con syllabus universitario' },
      c3: { score: 80, evidence: 'Linux y Cloud básico' },
      c4: { score: 82, evidence: 'Docente auxiliar' },
      c5: { score: 80, evidence: 'Maestría verificada' },
    },
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-08-25T10:00:00Z',
  },
  {
    id: 'app-007',
    jobPostingId: 'REQ-2026-DOC-088',
    candidateId: 'cand-012', // Klaus Lindner (requisito pendiente)
    stage: 'postulado',
    llmScore: 79,
    mandatoryRequirementStatus: 'sin_verificar', // REQUISITO SIN VERIFICAR
    requirementJustification: 'Pendiente entrega de constancia SUNEDU de maestría en el extranjero.',
    whyScoreNotes: {
      explanation: 'Caso de prueba: requisito obligatorio sin verificar. No es elegible para Top-N hasta verificarlo.',
      strengths: ['Gran afín en LLMs y algoritmos avanzados'],
      evidenceSummary: 'CV pendiente de validación física.',
    },
    criteriaBreakdown: {
      c1: { score: 0, evidence: 'Pendiente de homologación' },
      c2: { score: 79, evidence: 'Alta afinidad semántica con IA' },
      c3: { score: 85, evidence: 'Stack Python/PyTorch comprobado' },
      c4: { score: 0, evidence: 'Sin evidencia de docencia' },
      c5: { score: 0, evidence: 'Pendiente SUNEDU' },
    },
    createdAt: '2026-08-26T12:00:00Z',
    updatedAt: '2026-08-26T12:00:00Z',
  },

  // 2. Convocatoria REQ-2026-OPE-014 (3 candidatos iniciales)
  {
    id: 'app-008',
    jobPostingId: 'REQ-2026-OPE-014',
    candidateId: 'cand-006', // Jorge Alarcón
    stage: 'postulado',
    llmScore: 92,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Antecedentes policiales, penales y judiciales limpios verificados con Certiadulto.',
    whyScoreNotes: {
      explanation: 'Máxima idoneidad para operaciones de campus con experiencia en Sodexo dentro de sedes universitarias.',
      strengths: ['8 años en campus universitarios', 'Disponibilidad rotativa completa', 'Certificación SST'],
      evidenceSummary: 'Certificados laborales y constancia de antecedentes emitida en agosto 2026.',
    },
    criteriaBreakdown: {
      c1: { score: 95, evidence: '8 años en mantenimiento integral' },
      c2: { score: 96, evidence: 'Disponibilidad total para turnos rotativos' },
      c3: { score: 90, evidence: 'Vive en San Juan de Miraflores (30 min)' },
      c4: { score: 95, evidence: 'Cursos SST y primeros auxilios al día' },
      c5: { score: 92, evidence: '3 cartas de recomendación directas' },
    },
    createdAt: '2026-08-22T08:30:00Z',
    updatedAt: '2026-08-22T08:30:00Z',
  },
  {
    id: 'app-009',
    jobPostingId: 'REQ-2026-OPE-014',
    candidateId: 'cand-007', // Rosa Quispe
    stage: 'postulado',
    llmScore: 87,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Antecedentes limpios y disponibilidad horaria confirmada en entrevista previa.',
    whyScoreNotes: {
      explanation: 'Gran capacidad de liderazgo de cuadrillas y cercanía óptima al Campus Monterrico.',
      strengths: ['Vive en Surco (< 15 min de ESAN)', 'Experiencia liderando personal de limpieza profunda'],
      evidenceSummary: 'Comprobante de domicilio y cartas de recomendación de Limpieza Integral SAC.',
    },
    criteriaBreakdown: {
      c1: { score: 88, evidence: '6 años en mantenimiento y aseo' },
      c2: { score: 92, evidence: 'Turnos mañana y tarde sin restricción' },
      c3: { score: 98, evidence: 'Vive en Surco a 15 minutos del campus' },
      c4: { score: 80, evidence: 'Capacitación básica en SST' },
      c5: { score: 90, evidence: 'Referencias verificadas' },
    },
    createdAt: '2026-08-23T09:15:00Z',
    updatedAt: '2026-08-23T09:15:00Z',
  },
  {
    id: 'app-010',
    jobPostingId: 'REQ-2026-OPE-014',
    candidateId: 'cand-008', // Manuel Benites
    stage: 'postulado',
    llmScore: 83,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Certiadulto limpio y disponibilidad para turnos rotativos.',
    whyScoreNotes: {
      explanation: 'Experiencia técnica comprobada en colegios e instituciones educativas.',
      strengths: ['Mantenimiento preventivo', 'Puntualidad comprobada'],
      evidenceSummary: 'Carta de recomendación de Colegio Markham.',
    },
    criteriaBreakdown: {
      c1: { score: 85, evidence: '5 años en infraestructura escolar' },
      c2: { score: 90, evidence: 'Flexibilidad de turnos' },
      c3: { score: 80, evidence: 'Vive en Chorrillos (40 min)' },
      c4: { score: 85, evidence: 'Primeros auxilios' },
      c5: { score: 85, evidence: 'Carta verificada' },
    },
    createdAt: '2026-08-24T10:45:00Z',
    updatedAt: '2026-08-24T10:45:00Z',
  },

  // 3. Convocatoria REQ-2026-ADM-032 (2 candidatos iniciales)
  {
    id: 'app-011',
    jobPostingId: 'REQ-2026-ADM-032',
    candidateId: 'cand-009', // Patricia Valdivia
    stage: 'postulado',
    llmScore: 90,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Título profesional en Administración registrado en SUNEDU.',
    whyScoreNotes: {
      explanation: 'Dominio probado de ERP Banner y 7 años en admisiones universitarias.',
      strengths: ['Manejo experto de ERP Banner Student', 'Resolución de conflictos con postulantes', 'Inglés avanzado'],
      evidenceSummary: 'Título SUNEDU y constancia laboral de Universidad de Lima.',
    },
    criteriaBreakdown: {
      c1: { score: 95, evidence: '7 años configurando Banner y admisiones' },
      c2: { score: 92, evidence: 'Alta destreza en atención a postulantes y familias' },
      c3: { score: 90, evidence: 'Dashboards de conversión de admisiones' },
      c4: { score: 88, evidence: 'Nivel C1 certificado' },
      c5: { score: 90, evidence: 'Líder de 8 asistentes en ventanilla' },
    },
    createdAt: '2026-08-20T11:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  },
  {
    id: 'app-012',
    jobPostingId: 'REQ-2026-ADM-032',
    candidateId: 'cand-010', // Gonzalo Herrera
    stage: 'postulado',
    llmScore: 88,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Título universitario en Ingeniería Industrial registrado en SUNEDU.',
    whyScoreNotes: {
      explanation: 'Gran capacidad analítica y experiencia en CRM educativo para admisiones en UTEC.',
      strengths: ['Analítica de embudo de admisión', 'Salesforce Education Cloud', 'Orientación a resultados'],
      evidenceSummary: 'Registro SUNEDU y reporte de desempeño en UTEC.',
    },
    criteriaBreakdown: {
      c1: { score: 80, evidence: 'Experiencia con SAP y Salesforce (no Banner)' },
      c2: { score: 90, evidence: 'Excelente trato y empatía con jóvenes postulantes' },
      c3: { score: 95, evidence: 'Experto en métricas de conversión y Tableau' },
      c4: { score: 85, evidence: 'Inglés intermedio-avanzado' },
      c5: { score: 84, evidence: 'Coordinador de equipo comercial' },
    },
    createdAt: '2026-08-21T14:30:00Z',
    updatedAt: '2026-08-21T14:30:00Z',
  },

  // 4. Caso de prueba: Una persona postulando a 2 puestos diferentes
  // Ana Beltrán (cand-003) también tiene postulación en REQ-2026-DOC-093 (Cátedra de IA)
  {
    id: 'app-013',
    jobPostingId: 'REQ-2026-DOC-093',
    candidateId: 'cand-003',
    stage: 'postulado',
    llmScore: 86,
    mandatoryRequirementStatus: 'verificado',
    requirementJustification: 'Maestría registrada en SUNEDU.',
    whyScoreNotes: {
      explanation: 'Postulación secundaria independiente: Grato perfil en Cloud con interés en la cátedra de IA.',
      strengths: ['Infraestructura para modelos de IA', 'Multi-cloud'],
      evidenceSummary: 'Postulación registrada de forma independiente.',
    },
    criteriaBreakdown: {
      c1: { score: 80, evidence: 'Despliegues de inferencia en Kubernetes' },
      c2: { score: 86, evidence: 'Similitud con temas de infraestructura para IA' },
      c3: { score: 85, evidence: 'Stack en Python y contenedores' },
      c4: { score: 75, evidence: 'Artículos técnicos en blogs corporativos' },
    },
    createdAt: '2026-09-02T16:00:00Z',
    updatedAt: '2026-09-02T16:00:00Z',
  },
];

// Estado inicial completo para el AppContext y persistencia
export const INITIAL_APP_STATE: AppStateData = {
  jobPostings: INITIAL_JOB_POSTINGS,
  candidates: INITIAL_CANDIDATES,
  applications: INITIAL_APPLICATIONS,
  activities: [
    {
      id: 'act-001',
      applicationId: 'app-001',
      type: 'stage_change',
      title: 'Postulación registrada en sistema',
      details: 'Candidata ingresó al proceso mediante convocatoria web vinculada a LinkedIn Recruiter.',
      author: 'Equipo de GTHC',
      timestamp: '2026-08-20T10:15:00Z',
    },
    {
      id: 'act-002',
      applicationId: 'app-001',
      type: 'note',
      title: 'Verificación SUNEDU completada',
      details: 'Se corroboró el diploma de maestría N° 458920 en la plataforma en línea de SUNEDU.',
      author: 'Equipo de GTHC',
      timestamp: '2026-08-21T09:00:00Z',
    },
  ],
  decisionLogs: [
    {
      id: 'dec-001',
      jobPostingId: 'REQ-2026-DOC-088',
      applicationId: 'app-001',
      candidateId: 'cand-001',
      action: 'Validación de Requisitos Obligatorios',
      previousStage: 'postulado',
      newStage: 'postulado',
      author: 'Equipo de GTHC',
      timestamp: '2026-08-21T09:05:00Z',
      criteriaVersion: 'v2.4 (LLM)',
      evaluationContext: {
        llmScore: 90,
        method: 'LLM',
      },
      notes: 'Requisito obligatorio verificado exitosamente.',
    },
  ],
  emailDrafts: [],
  interviewRecords: [],
  activeJobPostingId: 'REQ-2026-DOC-088',
  selectedMethod: 'LLM',
  topN: 5,
  theme: 'light',
  reducedMotion: false,
};
