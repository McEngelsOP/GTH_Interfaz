import React, { ReactNode, useEffect, useState } from 'react';
import { IS_STAGE_ONE } from '../../config/edition.ts';
import { useApp } from '../../context/AppContext.tsx';
import { Badge } from '../common/Badge.tsx';
import { ShieldCheck, Calendar, Sliders, ArrowRightLeft, Clock, FileText, Scale, Wallet, SlidersHorizontal } from 'lucide-react';
import { timeAgo } from '../../services/bumeranSync.ts';
import { Button } from '../common/Button.tsx';
import { PesosRequisitosModal } from '../modals/PesosRequisitosModal.tsx';
import { CriteriosPesosModal } from '../modals/CriteriosPesosModal.tsx';
import type { SueldoAviso } from '../../services/useSueldoAviso.ts';

/** `aside`: contenido a la derecha del aviso (p. ej. candidatos activos y Top-N).
 *  `conDetalle`: muestra el desplegable con el aviso completo y los requisitos del puesto. */
export function ActiveJobBanner({ aside, conDetalle = false, sueldo, onSueldo }: {
  aside?: ReactNode; conDetalle?: boolean; sueldo?: SueldoAviso; onSueldo?: () => void;
} = {}) {
  const { activeJob, setCurrentView } = useApp();
  const [pesosAbierto, setPesosAbierto] = useState(false);
  const [criteriosAbierto, setCriteriosAbierto] = useState(false);
  useEffect(() => { setPesosAbierto(false); setCriteriosAbierto(false); }, [activeJob?.id]);

  if (!activeJob) return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        padding: '1.25rem 1.5rem',
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
          {activeJob.bumeran?.detalle?.area ? (
            <Badge variant="info" size="sm">{activeJob.bumeran.detalle.subarea || activeJob.bumeran.detalle.area}</Badge>
          ) : <Badge
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
          </Badge>}
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
            <strong>Área:</strong> {activeJob.bumeran?.detalle?.area
              ? [activeJob.bumeran.detalle.area, activeJob.bumeran.detalle.subarea].filter(Boolean).join(' › ')
              : activeJob.department}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            {activeJob.period}
          </span>
          {activeJob.bumeran && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title={activeJob.bumeran.updatedAt ? `Último CSV de Bumeran: ${new Date(activeJob.bumeran.updatedAt).toLocaleString()}` : undefined}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <strong>Actualizado:</strong> {timeAgo(activeJob.bumeran.updatedAt)}
            </span>
          )}
        </div>

        <div className="ranking-criteria-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
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
              width: 'fit-content',
            }}
          >
            <ShieldCheck size={14} style={{ color: 'var(--primary-red)', flexShrink: 0 }} />
            <span>
              <strong>Requisito obligatorio:</strong> {activeJob.knockoutRule}
            </span>
          </div>
          {conDetalle && activeJob.criteria.length > 0 && (
            <Button variant="outline" size="sm" icon={<Scale size={14} />} onClick={() => setPesosAbierto(true)}
              title="Ver los requisitos del aviso y ajustar su peso">
              Requisitos y pesos ({activeJob.criteria.length})
            </Button>
          )}
          {conDetalle && sueldo && <Button variant="outline" size="sm" icon={<SlidersHorizontal size={14} />}
            onClick={() => setCriteriosAbierto(true)} title="Ajustar los criterios de clasificación de esta convocatoria">
            Criterios y pesos
          </Button>}
          {conDetalle && onSueldo && <Button variant="secondary" size="sm" icon={<Wallet size={14} />}
            onClick={onSueldo} title="Sueldo ofertado del aviso y criterio salarial">Sueldo</Button>}
        </div>
      </div>

      {aside}

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

      {conDetalle && (activeJob.evaluationReference || activeJob.criteria.length > 0) && (
        <details className="aviso-detalle">
          <summary>
            <FileText size={15} style={{ color: 'var(--primary-red)' }} />
            Ver aviso y referencia del puesto
          </summary>
          <div className="aviso-detalle-cuerpo">
            <div>
              <h3>Requisitos que se comparan con cada perfil</h3>
              <ol>
                {activeJob.criteria.map((c, k) => (
                  <li key={c.id}><strong>R{k + 1}.</strong> {c.label} <span>· peso {c.weightPct}%</span></li>
                ))}
              </ol>
            </div>
            {activeJob.evaluationReference && (
              <div>
                <h3>Aviso publicado</h3>
                <p className="aviso-texto">{activeJob.evaluationReference}</p>
              </div>
            )}
          </div>
        </details>
      )}
      {conDetalle && <PesosRequisitosModal isOpen={pesosAbierto} onClose={() => setPesosAbierto(false)} job={activeJob} />}
      {conDetalle && criteriosAbierto && <CriteriosPesosModal key={activeJob.id} job={activeJob} onClose={() => setCriteriosAbierto(false)} />}
    </div>
  );
}

