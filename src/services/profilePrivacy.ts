import type { Candidate } from '../types/index.ts';

export const PRIVACY_VERSION = 'professional-fields-v1';
export type ProfessionalField = { label: string; text: string };
export type DepuratedProfile = { fields: ProfessionalField[]; excludedFields: number; redactions: number; issues: string[] };
const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const key = (text: string) => fold(text).replace(/[^a-z0-9]/g, '');
const labels: Record<string, string> = {
  puestoactual: 'Puesto', puesto: 'Puesto', cargo: 'Puesto', currenttitle: 'Puesto',
  experiencia: 'Experiencia', experienciaprofesional: 'Experiencia', experiencialaboral: 'Experiencia',
  habilidades: 'Habilidades', skills: 'Habilidades', conocimientos: 'Conocimientos',
  conocimientosinformaticos: 'Conocimientos', competencias: 'Competencias',
  idiomas: 'Idiomas', certificaciones: 'Certificaciones', cursos: 'Cursos',
  formacion: 'Formación', formacionacademica: 'Formación', educacion: 'Formación',
  estudios: 'Formación', niveldeestudios: 'Nivel académico', niveleducativo: 'Nivel académico',
  gradoacademico: 'Grado académico', titulo: 'Título', carrera: 'Carrera', especialidad: 'Especialidad',
};
// Solo etiquetas canónicas viajan al servidor; nunca los encabezados originales.
export function professionalLabel(header: string): string | null {
  const h = key(header);
  if (labels[h]) return labels[h];
  const exp = h.match(/^exp(?:eriencia)?\d*(puesto|cargo|descripcion|tareas|responsabilidades|desde|hasta|fechainicio|fechafin|duracion|actualidad)$/);
  if (exp) return /puesto|cargo/.test(exp[1]) ? 'Puesto' : /descripcion|tareas|responsabilidades/.test(exp[1]) ? 'Experiencia' : 'Periodo laboral';
  const est = h.match(/^est(?:udios)?\d*(titulo|carrera|especialidad|nivel|estado|desde|hasta|fechainicio|fechafin)$/);
  if (est) return /desde|hasta|fecha/.test(est[1]) ? 'Periodo académico' : 'Formación';
  return null;
}
export const PROFESSIONAL_LABELS = [...new Set([...Object.values(labels), 'Periodo laboral', 'Periodo académico'])];

// Patrones deliberadamente conservadores. No son un reconocimiento universal de entidades.
const email = /[\p{L}\p{N}._%+\-]+\s*@\s*[\p{L}\p{N}.\-]+\.[\p{L}]{2,}/gu;
const url = /(?:https?:\/\/|www\.)[^\s<>]+|\b(?:linkedin|facebook|instagram|github)\.com\/[^\s]+/gi;
const longNumber = /(?:\+?\d[\d\s().\-]{5,}\d)/g;
const sensitiveLine = /\b(?:correo|e-?mail|telefon[oa]|celular|whatsapp|dni|pasaporte|carn[eé]t\s+de\s+extranjer[ií]a|documento\s+(?:de\s+identidad|n[úu]mero)|direcci[oó]n|domicilio|residencia|fecha\s+de\s+nacimiento|naci[oó]|nacimient[o]|edad|estado\s+civil|casad[oa]|solter[oa]|divorciad[oa]|viud[oa]|hijos|sexo|g[eé]nero|nacionalidad|discapacidad|salud|embaraz|religi[oó]n|afiliaci[oó]n|referencia\s+personal|referencias\s+laborales|contact[oa]r|mi\s+nombre|me\s+llamo|se[nñ]or(?:a)?|dr\.?|dra\.?|lic\.?|sr\.?|sra\.?)\b|\b\d{1,3}\s+a[nñ]os\s+de\s+edad\b|\b(?:av(?:enida)?\.?|calle|jr\.?|jir[oó]n|urbanizaci[oó]n|pasaje|psje\.?|carretera|barrio|mz\.?|manzana|lote)\s+\S+/iu;
const date = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
const obscuredContact = /\b(?:arroba|at\s+sign|punto\s+(?:com|pe|org|net)|at\s+(?:gmail|hotmail|outlook)|gmail|hotmail|outlook)\b/iu;
const instruction = /(?:ignora|ignore|olvida|forget|desobedece|override|system\s*prompt|instrucciones\s+(?:anteriores|del\s+sistema)|prompt\s+del\s+sistema)/iu;

export function hasSensitivePatterns(text: string): boolean {
  return new RegExp(email.source, 'iu').test(text) || new RegExp(url.source, 'i').test(text) ||
    [...text.matchAll(new RegExp(longNumber.source,'g'))].some((match) => match[0].replace(/\D/g,'').length >= 7) || sensitiveLine.test(text) || new RegExp(date.source).test(text) || obscuredContact.test(text);
}
export function containsInstruction(text: string) { return instruction.test(text); }
function knownTerms(candidate?: Candidate): string[] {
  if (!candidate) return [];
  const terms = [candidate.name, ...(candidate.name.split(/\s+/).filter((part) => part.length >= 3)),
    candidate.email, candidate.phone, candidate.importedProfile?.documentNumber, candidate.importedProfile?.externalId,
    ...(candidate.importedProfile?.emails || [])];
  // Valores de columnas personales/entidades, excluidos también si se repiten en una descripción.
  for (const record of candidate.importedProfile?.records || []) for (const [header, value] of Object.entries(record)) {
    if (/nombre|apellido|correo|email|telefono|celular|document|dni|direccion|domicilio|empresa|institucion|universidad|referencia/.test(key(header))) terms.push(value);
  }
  return [...new Set(terms.filter((value): value is string => !!value && value.trim().length >= 3).map((value) => value.trim()))].sort((a,b) => b.length - a.length);
}
export function redactProfessionalText(value: string, candidate?: Candidate): { text: string; count: number } {
  let text = value.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '');
  let count = 0;
  const remove = (pattern: RegExp, replacement = '[DATO OMITIDO]') => { text = text.replace(pattern, () => { count++; return replacement; }); };
  for (const term of knownTerms(candidate)) {
    // NFD + máscara de igual longitud para detectar tildes/case sin reconstruir valores privados.
    const escaped = fold(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const regexp = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu');
    const indices: [number, number][] = [];
    // Usar offsets sobre texto sin diacríticos y convertirlos a posiciones de texto original.
    const chars = [...text], positions: number[] = []; let offset = 0;
    const masked = chars.map((char) => { const folded = fold(char); for (let i=0;i<folded.length;i++) positions.push(offset); offset += char.length; return folded; }).join('');
    for (const match of masked.matchAll(regexp)) indices.push([positions[match.index!], (positions[match.index! + match[0].length] ?? text.length)]);
    for (const [start,end] of indices.reverse()) { text = text.slice(0,start) + '[DATO OMITIDO]' + text.slice(end); count++; }
  }
  // Descripciones con datos personales se omiten por oración/línea completa.
  text = text.split(/(?<=[.;!?])\s+|[\r\n]+/).filter((line) => {
    if (sensitiveLine.test(line) || obscuredContact.test(line)) { count++; return false; } return true;
  }).join('\n');
  remove(email); remove(url); remove(date);
  text = text.replace(longNumber, (match) => { if (match.replace(/\D/g,'').length < 7) return match;count++;return '[DATO OMITIDO]'; });
  return { text: text.replace(/\s*\[DATO OMITIDO\](?:\s*\[DATO OMITIDO\])*/g, ' [DATO OMITIDO]').trim(), count };
}
export function prepareEvaluationProfile(candidate: Candidate): DepuratedProfile {
  const fields: ProfessionalField[] = [], issues: string[] = [];
  let excludedFields = 0, redactions = 0;
  const records = candidate.importedProfile?.records || [];
  if (!records.length) issues.push('Este perfil no contiene columnas profesionales estructuradas. Vuelve a cargar CSV/Excel con experiencia, estudios o habilidades.');
  for (const record of records) for (const [header, value] of Object.entries(record)) {
    const label = professionalLabel(header);
    if (!label) { excludedFields++; continue; }
    // Fechas laborales/académicas se reducen a años; las fechas personales no entran a la lista.
    const period = label.startsWith('Periodo');
    const years = period ? [...value.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]).join(' a ') : '';
    const input = period ? (years || (/^(actualidad|presente|actual)$/i.test(value.trim()) ? 'Actualidad' : '')) : value;
    const cleaned = redactProfessionalText(input, candidate); redactions += cleaned.count;
    if (containsInstruction(cleaned.text)) { issues.push('Una descripción contiene instrucciones ajenas al perfil. Revisa el archivo de origen.'); continue; }
    if (hasSensitivePatterns(cleaned.text)) { issues.push('Una descripción conserva datos que requieren revisión. Corrige el archivo de origen.'); continue; }
    if (!cleaned.text || !/[\p{L}\p{N}]/u.test(cleaned.text.replaceAll('[DATO OMITIDO]', ''))) continue;
    fields.push({ label, text: cleaned.text });
  }
  const unique = [...new Map(fields.map((field) => [JSON.stringify(field), field])).values()];
  if (!unique.length) issues.push('No hay información profesional suficiente en las columnas permitidas. No se envía este perfil.');
  if (unique.length > 100 || unique.some((field) => field.text.length > 6000) || JSON.stringify(unique).length > 24000) issues.push('El perfil depurado supera el tamaño admitido. Divide o resume los campos profesionales antes de evaluar.');
  return { fields: unique, excludedFields, redactions, issues: [...new Set(issues)] };
}
