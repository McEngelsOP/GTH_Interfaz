import { PROFESSIONAL_LABELS, hasSensitivePatterns, containsInstruction } from './profilePrivacy.js';
import type { ProfessionalField } from './profilePrivacy.js';

export const MAX_EVALUATION_BATCH = 25;
export const EVALUATION_INTERVAL_MS = 12_000;
export interface EvaluationPayload {
  requestId: string;
  profile: ProfessionalField[];
  job: { title: string; reference: string; criteria: { key: string; label: string; weightPct: number }[] };
}
export interface EvaluationReply {
  requestId: string; model: string; evaluatedAt: string; llmScore: number | null;
  explanation: string; strengths: string[]; evidenceSummary: string;
  criteria: { key: string; score: number | null; evidence: string | null }[];
}
const object = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Formato de evaluación inválido.');
  return value as Record<string, unknown>;
};
const exact = (value: Record<string, unknown>, keys: string[]) => {
  if (Object.keys(value).length !== keys.length || Object.keys(value).some((key) => !keys.includes(key))) throw new Error('La evaluación contiene campos no permitidos.');
};
export function safeText(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || hasSensitivePatterns(value) || containsInstruction(value)) throw new Error('El texto requiere depuración o revisión antes de evaluar.');
  return value.trim();
}
export function validateEvaluationPayload(value: unknown): EvaluationPayload {
  const body = object(value); exact(body, ['requestId','profile','job']);
  if (typeof body.requestId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.requestId)) throw new Error('Identificador temporal inválido.');
  if (!Array.isArray(body.profile) || !body.profile.length || body.profile.length > 100 || JSON.stringify(body.profile).length > 24_000) throw new Error('El perfil depurado es vacío o demasiado grande.');
  const profile = body.profile.map((value) => {
    const field = object(value); exact(field, ['label','text']);
    if (typeof field.label !== 'string' || !PROFESSIONAL_LABELS.includes(field.label)) throw new Error('Campo profesional no permitido.');
    return { label: field.label, text: safeText(field.text, 6000) };
  });
  const job = object(body.job); exact(job, ['title','reference','criteria']);
  if (typeof job.reference !== 'string') throw new Error('Referencia del puesto inválida.');
  if (!Array.isArray(job.criteria) || !job.criteria.length || job.criteria.length > 20) throw new Error('Criterios inválidos.');
  const criteria = job.criteria.map((value, index) => {
    const item = object(value); exact(item, ['key','label','weightPct']);
    if (item.key !== `criterion-${index + 1}` || typeof item.weightPct !== 'number' || !Number.isFinite(item.weightPct) || item.weightPct < 0 || item.weightPct > 100) throw new Error('Criterios inválidos.');
    return { key: item.key as string, label: safeText(item.label, 1000), weightPct: item.weightPct };
  });
  if (Math.abs(criteria.reduce((sum, criterion) => sum + criterion.weightPct, 0) - 100) > .01) throw new Error('Los pesos deben sumar 100 %.');
  return { requestId: body.requestId, profile, job: { title: safeText(job.title, 500), reference: job.reference.trim() ? safeText(job.reference, 8000) : '', criteria } };
}
export function validateEvaluationOutput(value: unknown, payload: EvaluationPayload) {
  const result = object(value); exact(result, ['explanation','strengths','evidenceSummary','criteria']);
  if (!Array.isArray(result.strengths) || result.strengths.length > 5 || !Array.isArray(result.criteria) || result.criteria.length !== payload.job.criteria.length) throw new Error('Gemini devolvió una evaluación incompleta.');
  const source = payload.profile.map((field) => field.text);
  const criteria = payload.job.criteria.map((criterion) => {
    const matching = result.criteria as unknown[];
    const values = matching.filter((value) => object(value).key === criterion.key);
    if (values.length !== 1) throw new Error('Gemini devolvió criterios desconocidos o repetidos.');
    const item = object(values[0]); exact(item, ['key','score','evidence']);
    if (item.score === null && item.evidence === null) return { key: criterion.key, score: null, evidence: null };
    if (typeof item.score !== 'number' || !Number.isFinite(item.score) || item.score < 0 || item.score > 100) throw new Error('Puntaje inválido.');
    const evidence = safeText(item.evidence, 600);
    if (evidence === '[DATO OMITIDO]' || !source.some((text) => text.normalize('NFC').replace(/\s+/g,' ').includes(evidence.normalize('NFC').replace(/\s+/g,' ')))) throw new Error('La evidencia no corresponde al perfil depurado.');
    return { key: criterion.key, score: Math.round(item.score * 10) / 10, evidence };
  });
  const llmScore = criteria.some((item, index) => item.score === null && payload.job.criteria[index].weightPct > 0) ? null
    : Math.round(criteria.reduce((sum,item,index) => sum + (item.score ?? 0) * payload.job.criteria[index].weightPct / 100, 0) * 10) / 10;
  return { llmScore, criteria, explanation: safeText(result.explanation, 1800),
    strengths: result.strengths.map((value) => safeText(value, 300)), evidenceSummary: safeText(result.evidenceSummary, 1000) };
}

/** Google referencia fragmentos; el servidor genera la evidencia sin aceptar citas inventadas. */
export function validateProviderEvaluation(value: unknown, payload: EvaluationPayload) {
  const result=object(value); exact(result,['explanation','strengths','evidenceSummary','criteria']);
  if(!Array.isArray(result.criteria)) throw new Error('Gemini devolvió una evaluación incompleta.');
  const criteria=result.criteria.map((value) => {
    const item=object(value);exact(item,['key','score','evidenceKey']);
    if(item.score===null && item.evidenceKey===null) return {key:item.key,score:null,evidence:null};
    const index=typeof item.evidenceKey==='string' ? payload.profile.findIndex((_,index) => item.evidenceKey===`field-${index+1}`) : -1;
    if(index<0) throw new Error('La fuente de evidencia no corresponde al perfil depurado.');
    return {key:item.key,score:item.score,evidence:payload.profile[index].text};
  });
  return validateEvaluationOutput({explanation:result.explanation,strengths:result.strengths,evidenceSummary:result.evidenceSummary,criteria},payload);
}
