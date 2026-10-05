import React from 'react';
import { EvaluationMethod } from '../../types/index.ts';
import type { evaluationSummary } from '../../services/evaluationSummary.ts';

interface ScoreBadgeProps {
  score: number | null;
  method: EvaluationMethod;
  size?: 'sm' | 'md';
  summary?: ReturnType<typeof evaluationSummary>;
}

export function ScoreBadge({ score, method, size = 'md', summary }: ScoreBadgeProps) {
  const color = 'var(--method-llm-color)';
  const bg = 'var(--method-llm-bg)';

  const isPending = score === null || score === undefined;
  const label = !isPending ? String(score) : summary?.specialCase ? 'Caso especial' : summary?.evaluated
    ? summary.partialScore === null ? 'Sin evidencia' : `Parcial · ${summary.partialScore}` : 'Pendiente';
  const detail = isPending && summary?.evaluated ? `Evaluación recibida. Cobertura: ${summary.coverage}%. Falta: ${summary.missingLabels.join('; ')}. El parcial sirve para revisión; el avance requiere un puntaje completo.`
    : summary?.specialCase ? 'La evaluación requiere revisión de información.' : `Puntaje según LLM: ${isPending ? 'Pendiente' : `${score} / 100`}`;

  return (
    <div
      style={{
        display: 'inline-flex',
        whiteSpace: 'nowrap',
        alignItems: 'center',
        gap: '0.35rem',
        padding: size === 'sm' ? '0.15rem 0.45rem' : '0.25rem 0.6rem',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: bg,
        color: color,
        fontWeight: 600,
        fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
        border: `1px solid rgba(109, 40, 217, 0.25)`,
      }}
      title={detail}
    >
      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.85 }}>{method}</span>
      <span className="tabular-nums">{label}</span>
    </div>
  );
}
