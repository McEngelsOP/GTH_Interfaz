import React from 'react';
import { Stage } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import {
  FileText,
  UserCheck,
  Calendar,
  ClipboardCheck,
  Gift,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface StageBadgeProps {
  stage: Stage;
  size?: 'sm' | 'md';
}

export function StageBadge({ stage, size = 'md' }: StageBadgeProps) {
  const stageConfig: Record<
    Stage,
    { label: string; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'; icon: React.ReactNode }
  > = {
    postulado: {
      label: 'Postulado',
      variant: 'neutral',
      icon: <FileText size={13} />,
    },
    preseleccionado: {
      label: 'Preseleccionado',
      variant: 'info',
      icon: <UserCheck size={13} />,
    },
    en_entrevista: {
      label: 'En entrevista',
      variant: 'warning',
      icon: <Calendar size={13} />,
    },
    en_evaluacion: {
      label: 'En evaluación',
      variant: 'purple',
      icon: <ClipboardCheck size={13} />,
    },
    en_oferta: {
      label: 'En oferta',
      variant: 'primary',
      icon: <Gift size={13} />,
    },
    contratado: {
      label: 'Contratado',
      variant: 'success',
      icon: <CheckCircle size={13} />,
    },
    no_continua: {
      label: 'No continúa',
      variant: 'danger',
      icon: <XCircle size={13} />,
    },
  };

  const config = stageConfig[stage] || stageConfig.postulado;

  return (
    <Badge variant={config.variant} size={size} icon={config.icon}>
      {config.label}
    </Badge>
  );
}
