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
  const total = explicitTotal && explicitTotal > 0 ? explicitTotal : null;
  const met = total !== null && explicitMet !== undefined ? Math.max(0, Math.min(total, explicitMet)) : null;

  const statusLabel =
    status === 'verificado'
      ? 'Verificado'
      : status === 'parcial'
      ? 'Parcial'
      : status === 'no_cumple'
      ? 'No cumple'
      : 'Sin verificar';

  const tooltipText =
    justification || statusLabel;

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
        {met !== null && total !== null ? `${met}/${total} cumplen` : statusLabel}
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4.5px',
        }}
      >
        {total !== null && met !== null && Array.from({ length: total }).map((_, idx) => {
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

