import { AppStateData, Candidate, JobPosting } from '../types/index.ts';
import { parseCSV } from './csvService.ts';
import { createPendingApplication } from './workflow.ts';

export type ImportTable = { fileName: string; sheetName?: string; rows: string[][] };
export type ImportIssue = { fileName: string; row: number; message: string };
export type ImportRow = { fileName: string; row: number; candidate: Candidate };
export type ImportAnalysis = {
  rows: ImportRow[]; issues: ImportIssue[]; errors: string[];
  files: { name: string; sheet?: string; headerRow: number; count: number }[];
};
export type ImportSummary = {
  newCandidates: number; newApplications: number; duplicateRows: number;
  updatedCandidates: number; existingApplications: number; conflicts: number;
};
export type ImportPlan = {
  candidates: Candidate[]; applications: AppStateData['applications'];
  summary: ImportSummary; issues: ImportIssue[];
  preview: { name: string; email: string | null; action: string; source: string }[];
};

const clean = (value: string) => value.trim().replace(/\s+/g, ' ');
export const normalizedHeader = (value: string) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const documentTypeKey = (type: string) => ({ documentonacionaldeidentidad: 'dni', carnetdeextranjeria: 'ce' }[normalizedHeader(type)] || normalizedHeader(type));
const documentKey = (type: string, number: string) => number ? `${documentTypeKey(type)}:${number.replace(/[^a-z0-9]/gi, '').toUpperCase()}` : '';
const emailKey = (email: string | null) => email?.trim().toLowerCase() || '';
const sourceKey = (source: string) => normalizedHeader(source).replace(/archivo$/, '');
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const aliases = {
  name: ['nombre', 'nombres', 'nombrecompleto', 'nombrescompletos', 'candidato', 'postulante', 'fullname', 'name'],
  surname: ['apellido', 'apellidos', 'lastname'],
  email: ['email', 'correo', 'correoelectronico', 'emailaddress'],
  phone: ['telefonocelular', 'celular', 'telefono', 'phone', 'mobile'],
  document: ['nrodocumento', 'numerodocumento', 'numerodedocumento', 'documento', 'dni', 'documentnumber'],
  documentType: ['tipodocumento', 'tipodedocumento', 'documenttype'],
  externalId: ['idcandidato', 'iddepostulante', 'idpostulante', 'candidateid', 'iddecandidato'],
  title: ['puestoactual', 'puesto', 'cargo', 'currenttitle', 'exp1puesto'],
  company: ['empresaactual', 'empresa', 'currentcompany', 'exp1empresa'],
  source: ['fuente', 'origen', 'source'],
  summary: ['resumen', 'perfilprofesional', 'summary', 'cv', 'textocv', 'rawcvtext'],
} satisfies Record<string, string[]>;

function indexes(headers: string[]) {
  const normalized = headers.map(normalizedHeader);
  return Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, normalized.findIndex((h) => names.includes(h))])) as Record<keyof typeof aliases, number>;
}

function headerIndex(rows: string[][]) {
  return rows.slice(0, 50).findIndex((row) => {
    const columns = indexes(row);
    return columns.name >= 0 && (columns.email >= 0 || columns.document >= 0 || columns.externalId >= 0);
  });
}

export function tableFromCSV(text: string, fileName: string): ImportTable {
  const choices = [',', ';', '\t', '|'].map((separator) => {
    const parsed = parseCSV(text, separator, true);
    const index = headerIndex(parsed.records);
    return { ...parsed, index, width: index >= 0 ? parsed.records[index].length : 0 };
  }).sort((a, b) => b.width - a.width);
  const best = choices[0];
  if (best.errors.length) throw new Error(best.errors.join(' '));
  return { fileName, rows: best.records };
}

export async function readCandidateFile(file: File): Promise<ImportTable[]> {
  if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera 10 MB. Divida la exportación en archivos más pequeños.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    const buffer = await file.arrayBuffer();
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
    catch { text = new TextDecoder('windows-1252').decode(buffer); }
    return [tableFromCSV(text, file.name)];
  }
  if (extension === 'xlsx') {
    const { default: readWorkbook } = await import('read-excel-file/browser');
    const sheets = await readWorkbook(file, { parseNumber: (value: string) => value });
    return sheets.map((sheet) => ({ fileName: file.name, sheetName: sheet.sheet,
      rows: sheet.data.map((row) => row.map((cell) => cell instanceof Date ? cell.toISOString().slice(0, 10) : cell === null ? '' : String(cell))),
    }));
  }
  throw new Error('Cargue CSV o Excel (.xlsx). Para PDF, Word e imágenes se necesita conectar la extracción documental.');
}

export function analyzeCandidateTables(tables: ImportTable[]): ImportAnalysis {
  const result: ImportAnalysis = { rows: [], issues: [], errors: [], files: [] };
  let totalRecords = 0;
  for (const table of tables) {
    const header = headerIndex(table.rows);
    if (header < 0) {
      result.errors.push(`${table.fileName}${table.sheetName ? ` · ${table.sheetName}` : ''}: no se identificaron columnas de candidatos. Se requiere nombre y documento, correo o ID de candidato.`);
      continue;
    }
    const headers = table.rows[header].map(clean);
    const usedHeaders = headers.filter(Boolean).map(normalizedHeader);
    if (headers.length > 200 || new Set(usedHeaders).size !== usedHeaders.length) {
      result.errors.push(`${table.fileName}: hay encabezados repetidos o más de 200 columnas. Corrija el archivo antes de cargarlo.`);
      continue;
    }
    const columns = indexes(headers);
    const rows = table.rows.slice(header + 1).map((row, i) => ({ row, number: header + i + 2 })).filter(({ row }) => row.some((v) => v.trim()));
    if (rows.length + totalRecords > 5000) {
      result.errors.push(`${table.fileName}: el lote supera 5.000 registros. Divídalo en archivos más pequeños.`);
      continue;
    }
    totalRecords += rows.length;
    result.files.push({ name: table.fileName, sheet: table.sheetName, headerRow: header + 1, count: rows.length });
    for (const { row, number } of rows) {
      const issue = (message: string) => result.issues.push({ fileName: table.fileName, row: number, message });
      if (row.length > headers.length && row.slice(headers.length).some((v) => v.trim())) { issue('Hay valores fuera de las columnas del encabezado.'); continue; }
      if (headers.some((label, index) => !label && row[index]?.trim())) { issue('Hay datos en una columna sin encabezado. Añada un nombre a esa columna.'); continue; }
      if (row.some((cell) => cell.length > 50000)) { issue('Una celda supera 50.000 caracteres. Revise el registro.'); continue; }
      const get = (field: keyof typeof aliases) => columns[field] >= 0 ? clean(row[columns[field]] || '') : '';
      const fullNameColumn = ['nombrecompleto', 'nombrescompletos', 'fullname'].includes(normalizedHeader(headers[columns.name]));
      const name = [get('name'), fullNameColumn ? '' : get('surname')].filter(Boolean).join(' ');
      if (!name) { issue('Falta el nombre del candidato.'); continue; }
      const suppliedEmail = get('email');
      const email = validEmail(suppliedEmail) ? emailKey(suppliedEmail) : null;
      if (suppliedEmail && !email) issue('Correo inválido: se conservará en el texto del perfil, sin utilizarlo para identificar ni contactar.');
      const documentNumber = get('document').replace(/[^a-z0-9]/gi, '').toUpperCase();
      const documentType = get('documentType') || (normalizedHeader(headers[columns.document] || '') === 'dni' ? 'DNI' : '');
      const externalId = get('externalId');
      if (!email && !documentNumber && !externalId) { issue('Falta un identificador fiable: documento, correo válido o ID de candidato. Corrija el registro para incorporarlo.'); continue; }
      const fields: Record<string, string> = Object.create(null);
      headers.forEach((label, index) => { if (label && row[index]?.trim()) fields[label] = row[index].trim(); });
      const rawCvText = Object.entries(fields).map(([label, value]) => `${label}: ${value}`).join('\n');
      const source = get('source') || (headers.some((h) => /^(exp|est)\[/i.test(h)) ? 'Bumeran (archivo)' : 'Archivo CSV/Excel');
      result.rows.push({ fileName: table.fileName, row: number, candidate: {
        id: '', name, email, phone: get('phone') || null, currentTitle: get('title'), currentCompany: get('company'),
        source, summary: get('summary') || [get('title'), get('company')].filter(Boolean).join(' · '), rawCvText,
        savedInTalentPool: false, importedProfile: { documentType, documentNumber, externalId, emails: email ? [email] : [], records: [fields] },
      } });
    }
  }
  return result;
}

const recordKey = (record: Record<string, string>) => JSON.stringify(Object.entries(record).map(([k, v]) => {
  const key = normalizedHeader(k);
  return [key, aliases.email.includes(key) ? emailKey(v) : clean(v)];
}).sort(([a], [b]) => a.localeCompare(b)));
const completeness = (candidate: Candidate) => candidate.rawCvText.length + [candidate.email, candidate.phone, candidate.currentTitle, candidate.currentCompany].filter(Boolean).length * 100;
function mergeCandidate(existing: Candidate, incoming: Candidate): Candidate {
  const records = [...(existing.importedProfile?.records || []), ...(incoming.importedProfile?.records || [])];
  const distinct = new Map<string, Record<string, string>>();
  records.forEach((record) => { const key = recordKey(record); if (!distinct.has(key)) distinct.set(key, record); });
  const unique = [...distinct.values()];
  const preferred = completeness(incoming) > completeness(existing) ? incoming : existing;
  const other = preferred === existing ? incoming : existing;
  const profile = existing.importedProfile;
  const nextProfile = incoming.importedProfile!;
  const texts = unique.map((record) => Object.entries(record).map(([k, v]) => `${k}: ${v}`).join('\n'));
  if (!profile && existing.rawCvText.trim()) texts.unshift(existing.rawCvText);
  return { ...existing, name: preferred.name || other.name,
    email: preferred.email || other.email, phone: preferred.phone || other.phone,
    currentTitle: preferred.currentTitle || other.currentTitle, currentCompany: preferred.currentCompany || other.currentCompany,
    summary: preferred.summary || other.summary, rawCvText: [...new Set(texts)].join('\n\n'),
    importedProfile: {
      documentType: profile?.documentType || nextProfile.documentType,
      documentNumber: profile?.documentNumber || nextProfile.documentNumber,
      externalId: profile?.externalId || nextProfile.externalId,
      emails: [...new Set([...(profile?.emails || []), ...(nextProfile.emails || []), existing.email, incoming.email].filter((email): email is string => !!email).map(emailKey))],
      records: unique,
    },
  };
}

// Se revalida contra el estado vigente al confirmar. Nunca se deduplica por nombre.
export function planCandidateImport(state: AppStateData, job: JobPosting, rows: ImportRow[]): ImportPlan {
  const candidates = state.candidates.map((candidate) => ({ ...candidate }));
  let applications = [...state.applications];
  const summary: ImportSummary = { newCandidates: 0, newApplications: 0, duplicateRows: 0, updatedCandidates: 0, existingApplications: 0, conflicts: 0 };
  const preview: ImportPlan['preview'] = [], issues: ImportIssue[] = [];
  const seen = new Set<string>(), updated = new Set<string>();
  const id = () => crypto.randomUUID();
  for (const row of rows) {
    const incoming = row.candidate, identity = incoming.importedProfile!;
    const doc = documentKey(identity.documentType, identity.documentNumber);
    const matches = candidates.filter((candidate) => {
      const known = candidate.importedProfile;
      return (doc && known && documentKey(known.documentType, known.documentNumber) === doc) ||
        (incoming.email && [candidate.email, ...(known?.emails || [])].some((email) => emailKey(email) === emailKey(incoming.email))) ||
        (identity.externalId && known?.externalId === identity.externalId && sourceKey(candidate.source) === sourceKey(incoming.source));
    });
    const contradictory = matches.some((known) => {
      const previous = known.importedProfile;
      return previous?.documentNumber && identity.documentNumber &&
        (previous.documentNumber !== identity.documentNumber ||
          (previous.documentType && identity.documentType && documentTypeKey(previous.documentType) !== documentTypeKey(identity.documentType)));
    });
    if (matches.length > 1 || contradictory) {
      summary.conflicts++;
      issues.push({ fileName: row.fileName, row: row.row, message: 'Identificadores contradictorios o vinculados a varias fichas. No se incorporó este registro; revise documento, correo e ID.' });
      continue;
    }
    let candidate = matches[0];
    let action = 'Nuevo candidato';
    if (candidate) {
      if (seen.has(candidate.id)) summary.duplicateRows++;
      const merged = mergeCandidate(candidate, incoming);
      if (JSON.stringify(merged) !== JSON.stringify(candidate)) {
        candidates[candidates.findIndex((c) => c.id === candidate.id)] = merged;
        if (state.candidates.some((c) => c.id === candidate.id)) updated.add(candidate.id);
        if (merged.rawCvText !== candidate.rawCvText) {
          applications = applications.map((app) => app.candidateId === candidate.id && app.stage === 'postulado' ? {
            ...app, llmScore: null, llmEvaluation: undefined, evaluationIssue: undefined, mandatoryRequirementStatus: 'sin_verificar', criteriaBreakdown: {},
            requirementJustification: 'Perfil actualizado. Requisito pendiente de revisión.',
            whyScoreNotes: { explanation: 'Perfil actualizado. Evaluación LLM pendiente.', strengths: [], evidenceSummary: 'Se incorporó información del archivo cargado.' },
          } : app);
        }
        candidate = merged; action = 'Ficha consolidada';
      } else action = 'Duplicado omitido';
    } else {
      candidate = { ...incoming, id: `cand-import-${id()}` };
      candidates.push(candidate); summary.newCandidates++;
    }
    const alreadyLinked = applications.some((app) => app.candidateId === candidate.id && app.jobPostingId === job.id);
    if (!alreadyLinked) {
      const app = createPendingApplication(candidate.id, job);
      applications.push({ ...app, id: `app-import-${id()}`,
        whyScoreNotes: { explanation: 'Perfil importado. Evaluación LLM pendiente para esta convocatoria.', strengths: [], evidenceSummary: 'Información declarada en el archivo cargado; pendiente de evaluación y verificación.' },
      });
      summary.newApplications++;
      if (matches.length) action += ' · Nueva postulación';
    } else if (!seen.has(candidate.id)) summary.existingApplications++;
    if (!seen.has(candidate.id)) preview.push({ name: candidate.name, email: candidate.email, action, source: candidate.source });
    seen.add(candidate.id);
  }
  summary.updatedCandidates = updated.size;
  return { candidates, applications, summary, preview, issues };
}

export function applyCandidateImport(state: AppStateData, jobId: string, rows: ImportRow[]): { state: AppStateData; plan: ImportPlan } {
  const job = state.jobPostings.find((j) => j.id === jobId && j.status === 'activa');
  if (!job) throw new Error('Seleccione una convocatoria activa para importar.');
  const plan = planCandidateImport(state, job, rows);
  return { state: { ...state, candidates: plan.candidates, applications: plan.applications }, plan };
}
