import React from 'react';
import { IS_STAGE_ONE } from '../../config/edition.ts';
import { useApp } from '../../context/AppContext.tsx';
import { Badge } from '../common/Badge.tsx';
import { ShieldCheck, Users, Calendar, Sliders, ArrowRightLeft } from 'lucide-react';
import { Button } from '../common/Button.tsx';

export function ActiveJobBanner() {
  const { activeJob, activeJobApplications, setCurrentView } = useApp();

  if (!activeJob) return null;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0, flex: '1 1 280px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Badge variant="primary" size="sm">
            {activeJob.code}
          </Badge>
          <Badge
            variant={
              activeJob.category === 'docente'
                ? 'purple'
                : activeJob.category === 'administrativo'
                ? 'info'
                : activeJob.category === 'directivo'
                ? 'warning'
                : 'neutral'
            }
            size="sm"
          >
            {activeJob.category.charAt(0).toUpperCase() + activeJob.category.slice(1)}
          </Badge>
          <span
            style={{
              fontSize: '0.75rem',
              color: activeJob.status === 'activa' ? 'var(--status-verified-text)' : 'var(--text-muted)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            ● {activeJob.status === 'activa' ? 'Convocatoria Abierta' : 'Borrador'}
          </span>
        </div>

        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
          {activeJob.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <strong>Área:</strong> {activeJob.department}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            {activeJob.period}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Users size={14} style={{ color: 'var(--text-muted)' }} />
            <strong>Vacantes previstas:</strong> {activeJob.vacancies !== null ? activeJob.vacancies : 'No registrado'}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-base)',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            marginTop: '0.2rem',
            width: 'fit-content',
          }}
        >
          <ShieldCheck size={14} style={{ color: 'var(--primary-red)', flexShrink: 0 }} />
          <span>
            <strong>Requisito obligatorio:</strong> {activeJob.knockoutRule}
          </span>
        </div>
      </div>

      {/* Botones de acción contextual rápida */}
      {!IS_STAGE_ONE && <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '100%', alignItems: 'center', gap: '0.65rem' }}>
        <Button
          variant="secondary"
          size="sm"
          icon={<Sliders size={15} />}
          onClick={() => setCurrentView('criterios_evaluacion')}
          style={{ maxWidth: '100%', whiteSpace: 'normal' }}
          title="Ver o simular ponderación de criterios"
        >
          Criterios ({activeJob.criteriaVersion})
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<ArrowRightLeft size={15} />}
          onClick={() => setCurrentView('convocatorias')}
          title="Cambiar a otra convocatoria"
        >
          Cambiar puesto
        </Button>
      </div>}
    </div>
  );
}

