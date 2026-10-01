// Shared data boundary. Unknown evidence stays unknown; it is never a pass.
export const STAGES = ['postulado', 'preseleccionado', 'entrevista', 'evaluacion', 'oferta', 'contratado'];
export const STAGE_LABELS = { postulado: 'Postulado', preseleccionado: 'Preseleccionado', entrevista: 'En entrevista', evaluacion: 'En evaluación', oferta: 'En oferta', contratado: 'Contratado', liberado: 'No continúa' };
export const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
export const numberOrNull = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const array = value => Array.isArray(value) ? value.filter(v => v && typeof v === 'object') : [];
const strings = value => Array.isArray(value) ? value.filter(v => typeof v === 'string') : [];
const evidenceWeights = value => array(value).map((w,i) => ({ criterionId: text(w.criterionId, `criterion-${i}`), label: text(w.label), weightPct: numberOrNull(w.weightPct) ?? 0, maxScore: numberOrNull(w.maxScore) ?? 0, scoreObtained: numberOrNull(w.scoreObtained), evidenceRatio: numberOrNull(w.evidenceRatio), type: w.type === 'LLM' ? 'LLM' : 'ML' }));
export const MODEL_LABELS = { ml: 'Machine Learning', llm: 'LLM (embeddings)' };
export const candidateScore = (candidate, model = 'ml') => numberOrNull(candidate?.[model === 'llm' ? 'llmScore' : 'mlScore']);
export const isEligible = (c, model = 'ml') => c.knockoutMet === true && !['liberado','contratado'].includes(c.stage) && candidateScore(c, model) !== null;
const validScore = value => numberOrNull(value) === null ? null : Math.max(0, Math.min(100, value));

export function normalizeCandidate(input, jobId) {
  if (!input || typeof input.id !== 'string' || !input.id.trim()) throw new Error('La postulación requiere un ID estable.');
  if (input.jobPostingId && input.jobPostingId !== jobId) throw new Error('La postulación pertenece a otra convocatoria.');
  const score = numberOrNull(input.score);
  return {
    id: input.id, candidateId: text(input.candidateId, input.id), jobPostingId: jobId,
    name: text(input.name, 'Perfil sin nombre'), role: text(input.role, 'Puesto no registrado'), company: text(input.company, 'Organización no registrada'),
    email: text(input.email), phone: text(input.phone),
    source: ['linkedin', 'computrabajo', 'bumeran', 'gmail', 'referido', 'interno'].includes(input.source) ? input.source : 'otro',
    score: score === null ? null : Math.max(0, Math.min(100, score)),
    stage: [...STAGES, 'liberado'].includes(input.stage) ? input.stage : 'postulado',
    knockoutMet: typeof input.knockoutMet === 'boolean' ? input.knockoutMet : null,
    transferablePotential: input.transferablePotential === true,
    mandatoryReqs: array(input.mandatoryReqs).map(r => ({ name: text(r.name, 'Requisito'), status: ['green','amber','red'].includes(r.status) ? r.status : 'unknown', tooltipTitle: text(r.tooltipTitle, 'Pendiente de verificación'), tooltipReason: text(r.tooltipReason, 'No hay evidencia registrada.') })),
    preferredCriteria: array(input.preferredCriteria).map(r => ({ name: text(r.name), met: r.met === true })),
    gaps: array(input.gaps).map(g => ({ item: text(g.item, 'Evidencia pendiente'), severity: ['none','low','medium','high'].includes(g.severity) ? g.severity : 'unknown', tip: text(g.tip), impact: text(g.impact) })),
    risks: strings(input.risks), interviewStarQuestions: strings(input.interviewStarQuestions),
    crossMatches: array(input.crossMatches).map(m => ({ jobTitle: text(m.jobTitle), reason: text(m.reason), matchPct: numberOrNull(m.matchPct) })),
    weights: evidenceWeights(input.weights),
    mlScore: validScore(input.mlScore), llmScore: validScore(input.llmScore),
    messageDraft: input.messageDraft && typeof input.messageDraft === 'object' ? { outcome: text(input.messageDraft.outcome), recipient: text(input.messageDraft.recipient), cc: text(input.messageDraft.cc), language: input.messageDraft.language === 'en' ? 'en' : 'es', template: text(input.messageDraft.template, 'personal'), subject: text(input.messageDraft.subject), body: text(input.messageDraft.body), status: 'Borrador', timestamp: text(input.messageDraft.timestamp) } : null,
    activities: array(input.activities).map(a => ({ id: text(a.id), type: text(a.type), title: text(a.title), scheduledAt: text(a.scheduledAt), details: text(a.details), timestamp: text(a.timestamp) })),
    narrative: { selectionReason: text(input.narrative?.selectionReason, 'Evaluación pendiente. Revisa las evidencias disponibles.'), strengths: strings(input.narrative?.strengths), inclusionDetail: text(input.narrative?.inclusionDetail) },
    cvMarkdown: text(input.cvMarkdown),
    audit: { batchId: text(input.audit?.batchId, 'Sin lote'), criteriaVersion: text(input.audit?.criteriaVersion, 'Sin evaluación'), model: text(input.audit?.model, 'Sin motor conectado'), decisionHistory: array(input.audit?.decisionHistory).map(e => ({ time: text(e.time), timestamp: text(e.timestamp), user: text(e.user), action: text(e.action) })) },
    evaluationHistory: array(input.evaluationHistory).map(e => ({ timestamp: text(e.timestamp), score: numberOrNull(e.score), mlScore: validScore(e.mlScore), llmScore: validScore(e.llmScore), criteriaVersion: text(e.criteriaVersion), weights: evidenceWeights(e.weights), strengths: strings(e.strengths) })), demo: input.demo !== false
  };
}

export function validateWeights(weights) {
  if (!Array.isArray(weights) || !weights.length || weights.some(w => !text(w.label).trim() || !Number.isInteger(w.weightPct) || w.weightPct < 0 || w.weightPct > 100) || weights.reduce((sum,w) => sum + w.weightPct, 0) !== 100) throw new Error('Los criterios deben tener nombre y sumar exactamente 100 %.');
  return weights.map((w,i) => ({ criterionId: text(w.criterionId, `criterion-${i}`), label: w.label.trim(), weightPct: w.weightPct, type: w.type === 'LLM' ? 'LLM' : 'ML' }));
}

// Demonstration only: reweight known evidence; missing dimensions do not receive invented scores.
export function reweightCandidate(candidate, weights) {
  const rows = weights.map(w => {
    const previous = candidate.weights.find(p => p.criterionId === w.criterionId && p.label === w.label) || candidate.weights.find(p => p.label === w.label);
    const known = numberOrNull(previous?.evidenceRatio) ?? (previous && previous.maxScore > 0 && Number.isFinite(previous.scoreObtained) ? previous.scoreObtained / previous.maxScore : null);
    const fraction = known === null ? null : Math.max(0, Math.min(1, known));
    return { ...w, evidenceRatio: fraction, maxScore: w.weightPct, scoreObtained: w.weightPct === 0 ? 0 : fraction === null ? null : Math.round(fraction * w.weightPct * 100) / 100 };
  });
  const modelScore = type => {
    const group = rows.filter(w => w.type === type && w.weightPct > 0);
    const total = group.reduce((sum,w) => sum + w.weightPct, 0);
    return !total || group.some(w => w.scoreObtained === null) ? null : Math.round(group.reduce((sum,w) => sum + w.scoreObtained,0) / total * 1000) / 10;
  };
  return { weights: rows, mlScore: modelScore('ML'), llmScore: modelScore('LLM'), score: rows.some(w => w.scoreObtained === null) ? null : Math.round(rows.reduce((sum,w) => sum + w.scoreObtained,0) * 10) / 10 };
}
