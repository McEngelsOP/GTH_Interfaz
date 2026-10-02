import React from 'react';
import { EvaluationMethod } from '../../types/index.ts';

interface ScoreBadgeProps {
  score: number | null;
  method: EvaluationMethod;
  size?: 'sm' | 'md';
}

export function ScoreBadge({ score, method, size = 'md' }: ScoreBadgeProps) {
  const color = 'var(--method-llm-color)';
  const bg = 'var(--method-llm-bg)';

  const isPending = score === null || score === undefined;

  return (
    <div
      style={{
        display: 'inline-flex',
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
      title={`Puntaje según LLM (similitud semántica): ${
        isPending ? 'Pendiente' : `${score} / 100`
      }`}
    >
      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.85 }}>{method}</span>
      <span className="tabular-nums">{isPending ? 'Pendiente' : score}</span>
    </div>
  );
}
