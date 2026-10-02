/* ==========================================================================
   TalentAI | GTHC · ESAN — Servicio de Exportación CSV Real (Sección 18)
   UTF-8 con BOM (\uFEFF) y delimitador ';' para compatibilidad Excel
   ========================================================================== */

import { Application, Candidate, JobPosting, EvaluationMethod, ProfileTemplate, EmailDraft } from '../types/index.ts';
import { getScoreByMethod, isEligibleForTopN } from './recruitmentRules.ts';

/**
 * Sanitiza texto para evitar inyecciones de fórmulas en hojas de cálculo
 * y escapa comillas dobles y punto y coma.
 */
export function sanitizeCell(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();

  // Prevenir inyección de fórmulas de Excel
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Si contiene punto y coma, comillas o saltos de línea, envolver en comillas
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Descarga en el navegador un archivo de texto con BOM UTF-8
 */
function triggerDownload(content: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. Exportación de Candidatos de una Convocatoria (12 columnas)
 * ID; Candidato; Perfil; Categoría; Requisito; Convocatoria; Puntaje según LLM; Ordenado según; Etapa; Fuente; Explicación; Estado del mensaje
 */
export function exportCandidatesCSV(params: {
  emailDrafts?: EmailDraft[];
  applications: Application[];
  candidates: Candidate[];
  job: JobPosting;
  method: EvaluationMethod;
  scopeName: string; // 'Todos', 'Mejores_perfiles', 'Marcados'
}) {
  const { applications, candidates, job, method, scopeName, emailDrafts = [] } = params;

  const candidateMap = new Map<string, Candidate>();
  candidates.forEach((c) => candidateMap.set(c.id, c));

  const headers = [
    'ID',
    'Candidato',
    'Perfil',
    'Categoría',
    'Requisito',
    'Convocatoria',
    'Puntaje según LLM',
    'Ordenado según',
    'Etapa',
    'Fuente',
    'Explicación',
    'Estado del mensaje',
  ];

  const rows = applications.map((app) => {
    const cand = candidateMap.get(app.candidateId);
    return [
      app.id,
      cand?.name || 'Desconocido',
      job.title,
      job.category,
      app.mandatoryRequirementStatus,
      job.code,
      app.llmScore !== null ? String(app.llmScore) : 'Pendiente',
      method,
      app.stage,
      cand?.source || 'No registrada',
      app.whyScoreNotes?.explanation || '',
      emailDrafts.some((draft) => draft.applicationId === app.id) ? 'Borrador guardado' : 'Sin mensaje',
    ].map(sanitizeCell).join(';');
  });

  const csv = [headers.map(sanitizeCell).join(';'), ...rows].join('\r\n');
  const filename = `Candidatos_${job.code}_${scopeName}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csv, filename);
}

/**
 * 2. Comparativa CSV Detallada de los Mejores de la Descarga
 */
export function exportComparisonCSV(params: {
  applications: Application[];
  candidates: Candidate[];
  job: JobPosting;
  method: EvaluationMethod;
}) {
  const { applications, candidates, job, method } = params;
  const candidateMap = new Map<string, Candidate>();
  candidates.forEach((c) => candidateMap.set(c.id, c));

  // Ordenar por el método seleccionado
  const sorted = [...applications].sort((a, b) => {
    const sA = getScoreByMethod(a, method) ?? -1;
    const sB = getScoreByMethod(b, method) ?? -1;
    return sB - sA;
  });

  const baseHeaders = [
    'Puesto',
    'Convocatoria',
    'Posición comparativa',
    'Candidato',
    'Etapa',
    'Puntaje LLM',
    'Método que ordenó',
    'Estado de requisitos',
    'Fortalezas',
    'Explicación del score',
  ];

  // Agregar columnas por cada criterio del puesto
  const criteriaHeaders = job.criteria.map((c) => `Criterio: ${c.label} (${c.type} ${c.weightPct}%)`);
  const headers = [...baseHeaders, ...criteriaHeaders];

  const rows = sorted.map((app, index) => {
    const cand = candidateMap.get(app.candidateId);
    const row = [
      job.title,
      job.code,
      String(index + 1),
      cand?.name || 'Candidato',
      app.stage,
      app.llmScore !== null ? String(app.llmScore) : 'Pendiente',
      method,
      app.mandatoryRequirementStatus,
      app.whyScoreNotes?.strengths?.join(' | ') || '',
      app.whyScoreNotes?.explanation || '',
    ];

    // Valores por criterio
    job.criteria.forEach((c) => {
      const breakdown = app.criteriaBreakdown[c.id];
      row.push(breakdown ? `${breakdown.score}/100 - ${breakdown.evidence}` : 'Sin datos');
    });

    return row.map(sanitizeCell).join(';');
  });

  const csv = [headers.map(sanitizeCell).join(';'), ...rows].join('\r\n');
  const filename = `Comparativa_${job.code}_Mejores_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csv, filename);
}

/**
 * 3. Catálogo de Perfiles de Puestos (4 columnas exactas: ID; Perfil; Categoría; Requisito)
 */
export function exportProfileCatalogCSV(templates: ProfileTemplate[]) {
  const headers = ['ID', 'Perfil', 'Categoría', 'Requisito'];

  const rows = templates.map((tpl) => {
    return [tpl.code, tpl.name, tpl.category, tpl.knockoutRule]
      .map(sanitizeCell)
      .join(';');
  });

  const csv = [headers.map(sanitizeCell).join(';'), ...rows].join('\r\n');
  const filename = `Catalogo_Perfiles_Puestos_ESAN_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csv, filename);
}

/**
 * 4. Exportación de Perfiles del Banco de Talento
 */
export function exportTalentPoolCSV(candidates: Candidate[]) {
  const headers = [
    'ID',
    'Candidato',
    'Puesto actual o experiencia',
    'Organización',
    'Correo de contacto',
    'Teléfono',
    'Puesto de procedencia',
    'Motivo de conservación en Banco',
    'Oportunidades sugeridas',
  ];

  const rows = candidates.map((cand) => {
    return [
      cand.id,
      cand.name,
      cand.currentTitle,
      cand.currentCompany,
      cand.email || 'No registrado',
      cand.phone || 'No registrado',
      cand.talentPoolOriginJob || 'Archivo de talento institucional',
      cand.talentPoolNotes || 'Perfil conservado para futuras oportunidades',
      cand.potentialOpportunities?.join(' | ') || 'Sin sugerencias registradas',
    ]
      .map(sanitizeCell)
      .join(';');
  });

  const csv = [headers.map(sanitizeCell).join(';'), ...rows].join('\r\n');
  const filename = `Banco_Talento_ESAN_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csv, filename);
}

/**
 * 5. Exportación de Contrataciones (Reporte de resultados)
 */
export function exportHiresCsv(
  applications: Application[],
  candidates: Candidate[],
  jobs: JobPosting[]
) {
  const headers = [
    'ID Candidato',
    'Nombre Completo',
    'Correo Electrónico',
    'Teléfono',
    'Código Convocatoria',
    'Puesto Institucional',
    'Área o Departamento',
    'Score LLM',
    'Etapa',
    'Fecha de Contratación',
  ];

  const candidateMap = new Map<string, Candidate>();
  candidates.forEach((c) => candidateMap.set(c.id, c));

  const jobMap = new Map<string, JobPosting>();
  jobs.forEach((j) => jobMap.set(j.id, j));

  const hiredApps = applications.filter((a) => a.stage === 'contratado');

  const rows = hiredApps.map((app) => {
    const cand = candidateMap.get(app.candidateId);
    const job = jobMap.get(app.jobPostingId);

    return [
      app.candidateId,
      cand?.name || 'Candidato',
      cand?.email || '',
      cand?.phone || '',
      job?.code || app.jobPostingId,
      job?.title || '',
      job?.department || '',
      app.llmScore !== null && app.llmScore !== undefined ? String(app.llmScore) : '',
      app.stage,
      app.updatedAt || '',
    ]
      .map(sanitizeCell)
      .join(';');
  });

  const csv = [headers.map(sanitizeCell).join(';'), ...rows].join('\r\n');
  const filename = `Contrataciones_ESAN_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csv, filename);
}

