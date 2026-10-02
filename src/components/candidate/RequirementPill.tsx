import React from 'react';
import { RequirementStatus } from '../../types/index.ts';

export interface RequirementPillProps {
  status: RequirementStatus;
  justification?: string;
  size?: 'sm' | 'md';
  metCount?: number;
  totalCount?: number;
  criteriaBreakdown?: Record<string, { score: number; evidence: string }>;
}

export function RequirementPill({
  status,
  justification,
  size = 'sm',
  metCount: explicitMet,
  totalCount: explicitTotal,
  criteriaBreakdown,
}: RequirementPillProps) {
  // Cantidad total de requisitos (por defecto 5 para ajustarse al modelo del puesto)
  const total =
    explicitTotal ??
    (criteriaBreakdown && Object.keys(criteriaBreakdown).length > 0
      ? Object.keys(criteriaBreakdown).length
      : 5);

  // Cantidad de requisitos cumplidos
  let met = 0;
  if (explicitMet !== undefined) {
    met = explicitMet;
  } else if (status === 'no_cumple' || status === 'sin_verificar') {
    met = 0;
  } else if (status === 'verificado') {
    met = total;
  } else if (status === 'parcial') {
    if (criteriaBreakdown && Object.keys(criteriaBreakdown).length > 0) {
      met = Object.values(criteriaBreakdown).filter((c) => c.score >= 60).length;
      if (met === 0) met = Math.max(1, Math.floor(total * 0.6));
    } else {
      met = Math.max(1, Math.floor(total * 0.6));
    }
  }

  const statusLabel =
    status === 'verificado'
      ? 'Verificado'
      : status === 'parcial'
      ? 'Parcial'
      : status === 'no_cumple'
      ? 'No cumple'
      : 'Sin verificar';

  const tooltipText =
    justification || `${met}/${total} requisitos cumplidos (${statusLabel})`;

  return (
    <div
      title={tooltipText}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '4px',
        cursor: 'help',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: size === 'sm' ? '0.8125rem' : '0.875rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {met}/{total} cumplen
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4.5px',
        }}
      >
        {Array.from({ length: total }).map((_, idx) => {
          const isMet = idx < met;
          return (
            <span
              key={idx}
              style={{
                width: '6.5px',
                height: '6.5px',
                borderRadius: '50%',
                backgroundColor: isMet ? '#10B981' : '#94A3B8',
                display: 'inline-block',
                transition: 'background-color 150ms ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
