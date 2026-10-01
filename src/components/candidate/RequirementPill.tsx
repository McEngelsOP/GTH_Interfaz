import React from 'react';
import { RequirementStatus } from '../../types/index.ts';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Badge } from '../common/Badge.tsx';

interface RequirementPillProps {
  status: RequirementStatus;
  justification?: string;
  size?: 'sm' | 'md';
}

export function RequirementPill({ status, justification, size = 'sm' }: RequirementPillProps) {
  const config = {
    verificado: {
      label: 'Verificado',
      variant: 'success' as const,
      icon: <CheckCircle2 size={13} />,
      title: justification || 'Requisito obligatorio verificado',
    },
    parcial: {
      label: 'Parcial',
      variant: 'warning' as const,
      icon: <AlertTriangle size={13} />,
      title: justification || 'Cumplimiento parcial de requisitos',
    },
    no_cumple: {
      label: 'No cumple',
      variant: 'danger' as const,
      icon: <XCircle size={13} />,
      title: justification || 'No cumple con el requisito obligatorio',
    },
    sin_verificar: {
      label: 'Sin verificar',
      variant: 'neutral' as const,
      icon: <Clock size={13} />,
      title: justification || 'Requisito pendiente de verificación documental',
    },
  }[status];

  return (
    <span title={config.title} style={{ cursor: 'help', display: 'inline-flex' }}>
      <Badge variant={config.variant} size={size} icon={config.icon}>
        {config.label}
      </Badge>
    </span>
  );
}
