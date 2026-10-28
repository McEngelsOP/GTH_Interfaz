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

const CORTO: Partial<Record<Stage, string>> = {
  postulado: 'Postul.', preseleccionado: 'Presel.', en_entrevista: 'Entrev.', en_evaluacion: 'Evaluac.',
  en_oferta: 'Oferta', contratado: 'Contrat.', no_continua: 'No cont.',
};

interface StageBadgeProps {
  stage: Stage;
  size?: 'sm' | 'md';
  /** Etiqueta abreviada y más pequeña (columna Etapa del ranking); el nombre completo queda en el title */
  corto?: boolean;
}

export function StageBadge({ stage, size = 'md', corto = false }: StageBadgeProps) {
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

  if (corto) {
    return (
      <Badge variant={config.variant} size="xs" title={config.label}>
        {CORTO[stage] ?? config.label}
      </Badge>
    );
  }
  return (
    <Badge variant={config.variant} size={size} icon={config.icon}>
      {config.label}
    </Badge>
  );
}
