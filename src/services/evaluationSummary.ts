import type { Application, Criterion } from '../types/index.ts';

/** Un puntaje parcial informa sobre criterios evaluados, sin habilitar Top-N. */
export function evaluationSummary(application: Application, criteria: Criterion[]) {
  const assessed = criteria.filter(c => c.weightPct > 0 && application.criteriaBreakdown[c.id]);
  const coverage = assessed.reduce((sum,c) => sum + c.weightPct,0);
  const partialScore = coverage > 0 ? Math.round(assessed.reduce((sum,c) => sum + application.criteriaBreakdown[c.id].score * c.weightPct,0) / coverage * 10) / 10 : null;
  return { evaluated: Boolean(application.llmEvaluation), coverage: Math.round(coverage * 10) / 10, partialScore,
    missingLabels: criteria.filter(c => c.weightPct > 0 && !application.criteriaBreakdown[c.id]).map(c => c.label),
    specialCase: Boolean(application.evaluationIssue) };
}
