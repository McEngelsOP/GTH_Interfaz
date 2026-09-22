/* ==========================================================================
   TalentAI - GTHC · ESAN
   Mock Data: Realistic Candidate Pool & Dual-Matching Engine Metadata
   ========================================================================== */

export const MOCK_JOB_POSTING = {
  id: "REQ-2026-II-088",
  title: "Convocatoria Docente / Desarrollador de Software",
  period: "Semestre 2026-II",
  department: "Dirección de Tecnologías de Información / Pregrado",
  status: "Convocatoria Abierta",
  phase: "Evaluación Automática & Matching Dual",
  totalProcessed: 482,
  defaultTopN: 5,
  avgScore: 74.2,
  potentialTalentCount: 18,
  batchId: "#ESAN-2026-088",
  criteriaVersion: "v2.4 (Dual ML-Embeddings)",
  aiModel: "Claude 3.5 Sonnet + Text-Embedding-3-Large"
};

export const MOCK_CANDIDATES = [
  {
    id: "CAND-001",
    name: "Marcia Samin",
    company: "Amazon Web Services",
    role: "Senior Cloud Solutions Architect",
    source: "linkedin",
    score: 90,
    transferablePotential: true,
    mandatoryReqs: [
      {
        name: "Experiencia Profesional (5+ años)",
        status: "green",
        tooltipTitle: "Experiencia Laboral Comprobada",
        tooltipReason: "Cumple con 7 años en desarrollo de software distribuido y liderazgo técnico en AWS."
      },
      {
        name: "Arquitectura Cloud & Microservicios",
        status: "green",
        tooltipTitle: "Arquitectura Cloud",
        tooltipReason: "Excelente dominio comprobado en Kubernetes, Terraform, arquitecturas serverless y escalabilidad."
      },
      {
        name: "Stack Backend (Node/Python/Go)",
        status: "green",
        tooltipTitle: "Stack Técnico Backend",
        tooltipReason: "Experiencia verificada de más de 6 años programando microservicios de alto tráfico en Go y Python."
      },
      {
        name: "Docencia Universitaria o Mentoring",
        status: "green",
        tooltipTitle: "Habilidad Pedagógica / Mentoring",
        tooltipReason: "Profesor adjunto durante 2 años en cursos de computación en la nube y mentor interno."
      },
      {
        name: "Bases de Datos SQL y NoSQL",
        status: "green",
        tooltipTitle: "Persistencia de Datos",
        tooltipReason: "Dominio verificado en PostgreSQL de alto rendimiento, DynamoDB y Redis."
      }
    ],
    preferredCriteria: [
      { name: "AWS Solutions Architect Pro", matched: true },
      { name: "Maestría en Ciencias de la Computación", matched: true },
      { name: "Scrum Master Certificado", matched: false }
    ],
    mlScore: 92,
    llmScore: 89,
    narrative: {
      selectionReason: "Postulante sobresaliente que excede todos los requisitos obligatorios con alta experiencia en Big Tech y docencia universitaria previa. Máxima compatibilidad semántica con el syllabus de la cátedra de Ingeniería de Software.",
      strengths: [
        "100% de cumplimiento en años de experiencia requeridos (ML: 30%).",
        "Alta similitud semántica en proyectos de arquitectura Cloud distribuida (Embeddings LLM: 45%).",
        "Posee antecedentes directos de cátedra universitaria y mentoría comprobada."
      ],
      gap: "Ninguna brecha crítica detectada en requisitos obligatorios.",
      inclusionDetail: "Perfil idóneo para liderar tanto proyectos de desarrollo como cursos de especialización avanzada."
    },
    weights: [
      { label: "Experiencia Laboral Requerida", weightPct: 30, scoreObtained: 30, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica de Proyectos (LLM)", weightPct: 30, scoreObtained: 28, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico Específico", weightPct: 20, scoreObtained: 19, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente / Pedagógica", weightPct: 10, scoreObtained: 10, maxScore: 10, type: "ML" },
      { label: "Criterios Preferentes / Certificaciones", weightPct: 10, scoreObtained: 8, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Marcia Samin
**Senior Cloud Solutions Architect | Amazon Web Services**
*Contacto: marcia.samin@aws-talent.pe | LinkedIn: /in/marciasamin*

## Resumen Profesional
Ingeniera de Sistemas colegiada con 7+ años de trayectoria en el diseño, implementación y optimización de plataformas de software a gran escala. Apasionada por la docencia universitaria y la formación de talento técnico.

## Experiencia Laboral
### Senior Cloud Architect — Amazon Web Services (2022 - Presente)
- Liderazgo de arquitectura técnica para clientes corporativos de banca y retail en Latinoamérica.
- Diseño de arquitecturas serverless con AWS Lambda, DynamoDB y EventBridge, reduciendo latencias en un 38%.

### Tech Lead Backend — BCP (2019 - 2022)
- Conducción de un equipo de 9 ingenieros en la modernización del core transaccional a microservicios en Go.
- Implementación de pipelines de CI/CD automatizados con Kubernetes y Docker.

## Educación y Docencia
- **Maestría en Ciencias de la Computación** — Universidad Nacional de Ingeniería (2020 - 2022).
- **Docente Adjunta** — Cátedra de Sistemas Distribuidos (4 semestres académicos).
- **Licenciatura en Ingeniería de Software** — Pontificia Universidad Católica del Perú.`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:41:12",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet / Text-Embedding-3-Large",
      decisionHistory: [
        { time: "09:41:15", user: "Sistema TalentAI", action: "Clasificación automática en percentil superior (Score: 90)" },
        { time: "09:42:00", user: "Mariana Córdova (GTHC)", action: "Pre-marcada para avance a entrevista panel" }
      ]
    }
  },
  {
    id: "CAND-002",
    name: "Paul Ladern",
    company: "Meta",
    role: "Senior Software Engineer",
    source: "linkedin",
    score: 83,
    transferablePotential: true,
    mandatoryReqs: [
      {
        name: "Experiencia Profesional (5+ años)",
        status: "green",
        tooltipTitle: "Experiencia Comprobada",
        tooltipReason: "Cumple al 100% con años de experiencia requeridos (ML: 30%), registrando 6 años en sistemas concurrentes."
      },
      {
        name: "Arquitectura Cloud & Microservicios",
        status: "green",
        tooltipTitle: "Arquitectura Cloud",
        tooltipReason: "Posee alta similitud semántica en proyectos de arquitectura Cloud a gran escala (Embeddings LLM: 45%)."
      },
      {
        name: "Stack Backend (Node/Python/Go)",
        status: "green",
        tooltipTitle: "Backend Concurrente",
        tooltipReason: "Extenso historial en Python y C++ aplicados a backend transaccional de alta eficiencia."
      },
      {
        name: "Docencia Universitaria o Mentoring",
        status: "amber",
        tooltipTitle: "Capacidad Pedagógica",
        tooltipReason: "No cuenta con cátedra formal registrada, pero ha sido mentor técnico en hackathones y bootcamp interno."
      },
      {
        name: "Certificación Específica TypeScript",
        status: "red",
        tooltipTitle: "Brecha Técnica",
        tooltipReason: "No hay mención de certificación específica en TypeScript en el CV, por lo que el candidato no cumple formalmente este requisito (-10%)."
      }
    ],
    preferredCriteria: [
      { name: "Kubernetes Certified", matched: true },
      { name: "TypeScript Avanzado", matched: false },
      { name: "Metodologías Ágiles", matched: true }
    ],
    mlScore: 78,
    llmScore: 86,
    narrative: {
      selectionReason: "Por qué quedó seleccionado: Cumple al 100% con los años de experiencia requeridos (ML: 30%) y posee una sobresaliente similitud semántica en proyectos de arquitectura Cloud y sistemas concurrentes (Embeddings LLM: 45%).",
      strengths: [
        "Capacidad técnica comprobada en sistemas distribuidos en Meta.",
        "Gran versatilidad en backend de alto rendimiento (Go / Python).",
        "Alta afinidad pedagógica demostrada en programas de mentoría comunitaria."
      ],
      gap: "Brecha: No cuenta con certificación específica en TypeScript (-10%) ni antecedentes de cátedra universitaria reglada.",
      inclusionDetail: "Principio de Inclusión aplicado: Sus competencias en arquitecturas de backend compensan con holgura la falta de certificación puntual, habilitándolo como 'Potencial Transferible'."
    },
    weights: [
      { label: "Experiencia Laboral Requerida", weightPct: 30, scoreObtained: 30, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica de Proyectos (LLM)", weightPct: 30, scoreObtained: 27, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico Específico", weightPct: 20, scoreObtained: 14, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente / Pedagógica", weightPct: 10, scoreObtained: 6, maxScore: 10, type: "ML" },
      { label: "Criterios Preferentes / Certificaciones", weightPct: 10, scoreObtained: 6, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Paul Ladern
**Senior Software Engineer | Meta**
*Contacto: paul.ladern@meta-eng.io | Ubicación: Lima, Perú (Remoto global)*

## Resumen Ejecutivo
Ingeniero de Software Senior con más de 6 años de experiencia en infraestructura de backend distribuida y streaming de datos. Especializado en resiliencia de sistemas de baja latencia y optimización de recursos computacionales.

## Experiencia Profesional
### Senior Software Engineer — Meta (2021 - Presente)
- Diseño y optimización de microservicios en Go y C++ procesando más de 120k solicitudes concurrentes por segundo.
- Colaboración activa en la adopción de arquitecturas híbridas multi-región.

### Software Engineer II — Expedia Group (2018 - 2021)
- Desarrollo de APIs RESTful y gRPC en Python y Node.js para el motor de reservas hoteleras.
- Creación de pipelines de observabilidad mediante Prometheus y Grafana.

## Formación Académica
- **Bachiller en Ingeniería de Sistemas** — Universidad Peruana de Ciencias Aplicadas (2013 - 2018).
- **Certificaciones**: CKA (Certified Kubernetes Administrator), AWS Solutions Architect Associate.`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:38:22",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet / Text-Embedding-3-Large",
      decisionHistory: [
        { time: "09:38:25", user: "Sistema TalentAI", action: "Asignación de score 83/100 con tag de Potencial Transferible" },
        { time: "09:40:11", user: "Mariana Córdova (GTHC)", action: "Revisión manual de justificación de brecha TypeScript" }
      ]
    }
  },
  {
    id: "CAND-003",
    name: "Kevin Picus",
    company: "Expedia Group",
    role: "Senior Backend Developer",
    source: "computrabajo",
    score: 79,
    transferablePotential: true,
    mandatoryReqs: [
      {
        name: "Experiencia Profesional (5+ años)",
        status: "green",
        tooltipTitle: "Años de Experiencia",
        tooltipReason: "Registra 5.5 años de experiencia en desarrollo de software empresarial."
      },
      {
        name: "Arquitectura Cloud & Microservicios",
        status: "amber",
        tooltipTitle: "Arquitectura Cloud",
        tooltipReason: "Experiencia sólida en Docker pero en proceso de certificación para clusters Kubernetes avanzados."
      },
      {
        name: "Stack Backend (Node/Python/Go)",
        status: "green",
        tooltipTitle: "Stack Técnico",
        tooltipReason: "Experto en Java Spring Boot y Python para procesamiento asíncrono."
      },
      {
        name: "Docencia Universitaria o Mentoring",
        status: "amber",
        tooltipTitle: "Mentoring",
        tooltipReason: "Facilitador de talleres de código abierto y mentor en comunidades técnicas universitarias."
      },
      {
        name: "Frameworks Modernos",
        status: "red",
        tooltipTitle: "Frontend / React",
        tooltipReason: "Enfocado 95% en backend; sin experiencia demostrable en integración frontend moderna."
      }
    ],
    preferredCriteria: [
      { name: "Docker & CI/CD", matched: true },
      { name: "PostgreSQL Tuning", matched: true },
      { name: "Docencia Universitaria", matched: false }
    ],
    mlScore: 76,
    llmScore: 81,
    narrative: {
      selectionReason: "Perfil con sólidos fundamentos de arquitectura backend e ingeniería de datos. Destaca por su solvencia en optimización de consultas SQL y microservicios Java/Python.",
      strengths: [
        "Sólido conocimiento en diseño de bases de datos relacionales complejas.",
        "Capacidad comprobada en integración continua y despliegues seguros.",
        "Compromiso activo con la divulgación tecnológica estudiantil."
      ],
      gap: "Requiere apoyo para módulos que involucren desarrollo de interfaz de usuario o frontend reactivo.",
      inclusionDetail: "Recomendado para asignaturas orientadas al desarrollo backend y arquitectura de datos."
    },
    weights: [
      { label: "Experiencia Laboral Requerida", weightPct: 30, scoreObtained: 28, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica de Proyectos (LLM)", weightPct: 30, scoreObtained: 24, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico Específico", weightPct: 20, scoreObtained: 15, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente / Pedagógica", weightPct: 10, scoreObtained: 6, maxScore: 10, type: "ML" },
      { label: "Criterios Preferentes / Certificaciones", weightPct: 10, scoreObtained: 6, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Kevin Picus
**Senior Backend Developer | Expedia Group**
*Contacto: kevin.picus@dev-mail.com | Origen: Portal CompuTrabajo*

## Resumen
Desarrollador backend orientado a la confiabilidad de sistemas bancarios y transaccionales. Especialista en Spring Boot, RabbitMQ y persistencia políglota.`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:35:40",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet / Text-Embedding-3-Large",
      decisionHistory: [
        { time: "09:35:45", user: "Sistema TalentAI", action: "Puntuación 79 calculada - Candidato dentro del Top 5" }
      ]
    }
  },
  {
    id: "CAND-004",
    name: "Tery Anvez",
    company: "Microsoft",
    role: "Senior Software Specialist",
    source: "bumeran",
    score: 73,
    transferablePotential: false,
    mandatoryReqs: [
      {
        name: "Experiencia Profesional (5+ años)",
        status: "green",
        tooltipTitle: "Años de Experiencia",
        tooltipReason: "Cuenta con 5 años de trayectoria en desarrollo .NET Core y Azure Cloud."
      },
      {
        name: "Arquitectura Cloud & Microservicios",
        status: "green",
        tooltipTitle: "Azure Specialist",
        tooltipReason: "Certificado en Azure Solutions Architect con despliegues productivos continuos."
      },
      {
        name: "Stack Backend (Node/Python/Go)",
        status: "amber",
        tooltipTitle: "Stack Diversificado",
        tooltipReason: "Gran dominio de C# / .NET, pero menor experiencia en ecosistemas Linux/Python requeridos en el perfil."
      },
      {
        name: "Docencia Universitaria o Mentoring",
        status: "red",
        tooltipTitle: "Experiencia Docente",
        tooltipReason: "No registra experiencia formal en docencia, tutoría o facilitación académica."
      },
      {
        name: "Metodologías Ágiles & DevOps",
        status: "green",
        tooltipTitle: "DevOps & CI/CD",
        tooltipReason: "Experto en Azure DevOps, automatización de testing y entrega continua."
      }
    ],
    preferredCriteria: [
      { name: "Azure Solutions Architect", matched: true },
      { name: ".NET Core Expert", matched: true },
      { name: "Python para ML", matched: false }
    ],
    mlScore: 71,
    llmScore: 75,
    narrative: {
      selectionReason: "Postulante con excelente solvencia técnica en entornos Microsoft Enterprise. Aunque no posee experiencia docente, su bagaje práctico en Azure es altamente valorable.",
      strengths: ["Gran pericia en arquitectura empresarial .NET", "Certificaciones oficiales de Microsoft al día."],
      gap: "Falta de experiencia previa en cátedra universitaria y ecosistemas open source puros.",
      inclusionDetail: "Apto para roles técnicos directos; para docencia requerirá acompañamiento metodológico inicial."
    },
    weights: [
      { label: "Experiencia Laboral Requerida", weightPct: 30, scoreObtained: 27, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica de Proyectos (LLM)", weightPct: 30, scoreObtained: 23, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico Específico", weightPct: 20, scoreObtained: 13, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente / Pedagógica", weightPct: 10, scoreObtained: 3, maxScore: 10, type: "ML" },
      { label: "Criterios Preferentes / Certificaciones", weightPct: 10, scoreObtained: 7, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Tery Anvez
**Senior Software Specialist | Microsoft**
*Origen: Portal Bumeran | Especialidad: Azure & .NET Core Enterprise*`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:30:15",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet / Text-Embedding-3-Large",
      decisionHistory: [
        { time: "09:30:20", user: "Sistema TalentAI", action: "Clasificación automática fuera del corte preliminar N=3" }
      ]
    }
  },
  {
    id: "CAND-005",
    name: "Lucy Milenter",
    company: "Xapo Bank",
    role: "Senior Systems Architect",
    source: "gmail",
    score: 68,
    transferablePotential: false,
    mandatoryReqs: [
      {
        name: "Experiencia Profesional (5+ años)",
        status: "green",
        tooltipTitle: "Años de Experiencia",
        tooltipReason: "Más de 8 años en sistemas de seguridad y transaccionalidad bancaria."
      },
      {
        name: "Arquitectura Cloud & Microservicios",
        status: "amber",
        tooltipTitle: "Cloud Híbrida",
        tooltipReason: "Fuerte foco en servidores on-premise con migración paulatina a AWS."
      },
      {
        name: "Stack Backend (Node/Python/Go)",
        status: "amber",
        tooltipTitle: "Stack Tradicional",
        tooltipReason: "Dominio de C++ y Java Legacy; menor experiencia en tecnologías modernas solicitadas."
      },
      {
        name: "Docencia Universitaria o Mentoring",
        status: "amber",
        tooltipTitle: "Capacitaciones",
        tooltipReason: "Talleres corporativos de ciberseguridad sin registro de cátedra universitaria."
      },
      {
        name: "DevOps & Cloud Native",
        status: "red",
        tooltipTitle: "Cloud Native",
        tooltipReason: "Baja familiaridad demostrada con Kubernetes y microservicios desacoplados."
      }
    ],
    preferredCriteria: [
      { name: "Ciberseguridad Bancaria", matched: true },
      { name: "C++ Concurrente", matched: true },
      { name: "Docencia Universitaria", matched: false }
    ],
    mlScore: 66,
    llmScore: 70,
    narrative: {
      selectionReason: "Especialista en seguridad y robustez bancaria tradicional. Puntuación consolidada situada en 68/100.",
      strengths: ["Amplio bagaje en cumplimiento normativo y cifrado de datos."],
      gap: "Desalineada de las tecnologías modernas de microservicios y desarrollo ágil demandadas en el syllabus.",
      inclusionDetail: "Revisar para roles exclusivos de auditoría de seguridad informática."
    },
    weights: [
      { label: "Experiencia Laboral Requerida", weightPct: 30, scoreObtained: 28, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica de Proyectos (LLM)", weightPct: 30, scoreObtained: 19, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico Específico", weightPct: 20, scoreObtained: 10, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente / Pedagógica", weightPct: 10, scoreObtained: 5, maxScore: 10, type: "ML" },
      { label: "Criterios Preferentes / Certificaciones", weightPct: 10, scoreObtained: 6, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Lucy Milenter
**Senior Systems Architect | Xapo Bank**
*Origen: Correo directo convocatoria Gmail*`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:25:01",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet / Text-Embedding-3-Large",
      decisionHistory: [
        { time: "09:25:10", user: "Sistema TalentAI", action: "Clasificación automática fuera de Top-N" }
      ]
    }
  },
  {
    id: "CAND-006",
    name: "Carlos Mendoza",
    company: "Interbank",
    role: "Lead Software Architect",
    source: "linkedin",
    score: 88,
    transferablePotential: true,
    mandatoryReqs: [
      {
        name: "Experiencia Profesional (5+ años)",
        status: "green",
        tooltipTitle: "Años de Experiencia",
        tooltipReason: "8 años de trayectoria en banca digital y transformación de plataformas."
      },
      {
        name: "Arquitectura Cloud & Microservicios",
        status: "green",
        tooltipTitle: "Cloud & APIs",
        tooltipReason: "Arquitecto principal de la API abierta de banca móvil con millones de transacciones diarias."
      },
      {
        name: "Stack Backend (Node/Python/Go)",
        status: "green",
        tooltipTitle: "Backend Moderno",
        tooltipReason: "Especialista en Go, Node.js y arquitectura basada en eventos con Apache Kafka."
      },
      {
        name: "Docencia Universitaria o Mentoring",
        status: "green",
        tooltipTitle: "Docencia Comprobada",
        tooltipReason: "Docente tiempo parcial en ESAN durante 2024 en asignaturas de Arquitectura Empresarial."
      },
      {
        name: "Gestión de Equipos & Agile",
        status: "green",
        tooltipTitle: "Liderazgo",
        tooltipReason: "Gestión directa de 14 ingenieros bajo metodología SAFe."
      }
    ],
    preferredCriteria: [
      { name: "Apache Kafka Certified", matched: true },
      { name: "Maestría en TI", matched: true },
      { name: "Experiencia Previa ESAN", matched: true }
    ],
    mlScore: 89,
    llmScore: 87,
    narrative: {
      selectionReason: "Candidato de altísimo impacto con antecedentes exitosos en la casa de estudios ESAN y liderazgo probado en banca peruana.",
      strengths: [
        "Experiencia directa impartiendo cátedra en ESAN Graduate School of Business.",
        "Liderazgo en arquitecturas bancarias altamente reguladas y resilientes.",
        "Excelente comunicación y capacidad de articulación pedagógica."
      ],
      gap: "Disponibilidad horaria acotada a turnos nocturnos o fines de semana.",
      inclusionDetail: "Candidato prioritario para contratación docente de pregrado/postgrado."
    },
    weights: [
      { label: "Experiencia Laboral Requerida", weightPct: 30, scoreObtained: 30, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica de Proyectos (LLM)", weightPct: 30, scoreObtained: 27, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico Específico", weightPct: 20, scoreObtained: 18, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente / Pedagógica", weightPct: 10, scoreObtained: 10, maxScore: 10, type: "ML" },
      { label: "Criterios Preferentes / Certificaciones", weightPct: 10, scoreObtained: 9, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Carlos Mendoza
**Lead Software Architect | Interbank**
*Docente con experiencia previa en ESAN | Especialista en Fintech & Event-Driven Architecture*`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:20:10",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet / Text-Embedding-3-Large",
      decisionHistory: [
        { time: "09:20:14", user: "Sistema TalentAI", action: "Identificado como Candidato Destacado (Rank #2)" }
      ]
    }
  },
  {
    id: "CAND-007",
    name: "Ana Sofía Ramos",
    company: "Belcorp",
    role: "Senior Cloud & Backend Engineer",
    source: "computrabajo",
    score: 85,
    transferablePotential: true,
    mandatoryReqs: [
      {
        name: "Experiencia Profesional (5+ años)",
        status: "green",
        tooltipTitle: "Años de Experiencia",
        tooltipReason: "6 años desarrollando plataformas e-commerce con presencia en 14 países."
      },
      {
        name: "Arquitectura Cloud & Microservicios",
        status: "green",
        tooltipTitle: "Cloud Native",
        tooltipReason: "Experta en GCP (Google Cloud Platform) y AWS multi-region."
      },
      {
        name: "Stack Backend (Node/Python/Go)",
        status: "green",
        tooltipTitle: "Stack Técnico",
        tooltipReason: "Gran dominio de Python (FastAPI/Django) y Node.js para backend asíncrono."
      },
      {
        name: "Docencia Universitaria o Mentoring",
        status: "amber",
        tooltipTitle: "Comunidad & Mentoring",
        tooltipReason: "Instructora voluntaria en programas de inclusión tecnológica femenina (Laboratoria)."
      },
      {
        name: "Testing & Calidad de Software",
        status: "green",
        tooltipTitle: "Testing Automatizado",
        tooltipReason: "Cobertura de código superior al 90% con TDD y pipelines automatizados."
      }
    ],
    preferredCriteria: [
      { name: "Google Cloud Professional", matched: true },
      { name: "FastAPI / Python", matched: true },
      { name: "Scrum Master", matched: true }
    ],
    mlScore: 84,
    llmScore: 86,
    narrative: {
      selectionReason: "Perfil con alta consistencia técnica y compromiso social activo en formación tecnológica.",
      strengths: ["Dominio avanzado de Python y Google Cloud.", "Experiencia comprobada en mentoría de jóvenes profesionales."],
      gap: "Falta de experiencia en cátedra universitaria formalizada.",
      inclusionDetail: "Destacada con 'Potencial Transferible' por su dinamismo y aptitud formadora."
    },
    weights: [
      { label: "Experiencia Laboral Requerida", weightPct: 30, scoreObtained: 29, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica de Proyectos (LLM)", weightPct: 30, scoreObtained: 26, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico Específico", weightPct: 20, scoreObtained: 18, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente / Pedagógica", weightPct: 10, scoreObtained: 7, maxScore: 10, type: "ML" },
      { label: "Criterios Preferentes / Certificaciones", weightPct: 10, scoreObtained: 8, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Ana Sofía Ramos
**Senior Cloud & Backend Engineer | Belcorp**
*Especialista en Microservicios GCP / Python | Mentora técnica comunitaria*`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:15:33",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet / Text-Embedding-3-Large",
      decisionHistory: [
        { time: "09:15:40", user: "Sistema TalentAI", action: "Clasificada en Top 5 con score 85" }
      ]
    }
  },
  {
    id: "CAND-008",
    name: "Roberto Cáceres",
    company: "Globant",
    role: "Tech Lead Fullstack",
    source: "linkedin",
    score: 82,
    transferablePotential: true,
    mandatoryReqs: [
      {
        name: "Experiencia Profesional (5+ años)",
        status: "green",
        tooltipTitle: "Años de Experiencia",
        tooltipReason: "7 años en consultoría para clientes en Estados Unidos y Europa."
      },
      {
        name: "Arquitectura Cloud & Microservicios",
        status: "green",
        tooltipTitle: "Cloud & Micro-frontends",
        tooltipReason: "Líder de arquitectura en plataformas SaaS escalables con AWS."
      },
      {
        name: "Stack Backend (Node/Python/Go)",
        status: "green",
        tooltipTitle: "Stack Completo",
        tooltipReason: "Dominio de TypeScript, Node.js y React para soluciones integrales."
      },
      {
        name: "Docencia Universitaria o Mentoring",
        status: "amber",
        tooltipTitle: "Liderazgo de Capacitación",
        tooltipReason: "Head of Training interno en Globant University con más de 100 horas dictadas."
      },
      {
        name: "TypeScript Certificado",
        status: "green",
        tooltipTitle: "TypeScript Avanzado",
        tooltipReason: "Cumplimiento 100% certificado en tipado estricto y testing en TypeScript."
      }
    ],
    preferredCriteria: [
      { name: "TypeScript Specialist", matched: true },
      { name: "Inglés C1 Fluido", matched: true },
      { name: "Docencia Universitaria", matched: false }
    ],
    mlScore: 81,
    llmScore: 83,
    narrative: {
      selectionReason: "Perfil versátil con sólidas capacidades de oratoria técnica y formación continua en consultoría global.",
      strengths: ["Dominio integral del stack moderno TypeScript/Node/React.", "Gran capacidad pedagógica probada en Globant University."],
      gap: "No posee grado de maestría concluido.",
      inclusionDetail: "Excelente prospecto para materias de desarrollo web fullstack y proyectos integradores."
    },
    weights: [
      { label: "Experiencia Laboral Requerida", weightPct: 30, scoreObtained: 29, maxScore: 30, type: "ML" },
      { label: "Similitud Semántica de Proyectos (LLM)", weightPct: 30, scoreObtained: 25, maxScore: 30, type: "LLM" },
      { label: "Stack Tecnológico Específico", weightPct: 20, scoreObtained: 17, maxScore: 20, type: "ML" },
      { label: "Experiencia Docente / Pedagógica", weightPct: 10, scoreObtained: 7, maxScore: 10, type: "ML" },
      { label: "Criterios Preferentes / Certificaciones", weightPct: 10, scoreObtained: 7, maxScore: 10, type: "ML" }
    ],
    cvMarkdown: `# Roberto Cáceres
**Tech Lead Fullstack | Globant**
*Especialista en TypeScript, Node.js y formación de ingenieros junior*`,
    audit: {
      batchId: "#ESAN-2026-088",
      timestamp: "2026-09-22 09:10:18",
      criteriaVersion: "v2.4",
      model: "Claude 3.5 Sonnet / Text-Embedding-3-Large",
      decisionHistory: [
        { time: "09:10:25", user: "Sistema TalentAI", action: "Score 82 registrado con tag de Potencial Transferible" }
      ]
    }
  }
];
