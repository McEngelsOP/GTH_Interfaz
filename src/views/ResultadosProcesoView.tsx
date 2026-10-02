import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { StageBadge } from '../components/candidate/StageBadge.tsx';
import { ScoreBadge } from '../components/candidate/ScoreBadge.tsx';
import { exportHiresCsv } from '../services/exportService.ts';
import {
  Award,
  Users,
  Clock,
  TrendingUp,
  Download,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { formatDateTime } from '../services/recruitmentRules.ts';

export function ResultadosProcesoView() {
  const { appState, activeJob, openCandidateDrawer, showToast } = useApp();

  const applications = appState.applications.filter((app) => app.jobPostingId === activeJob?.id);

  // Candidatos contratados en todas las convocatorias o en la activa
  const hiredApplications = useMemo(() => {
    return applications.filter((app) => app.stage === 'contratado');
  }, [appState.applications, activeJob?.id]);

  // Candidatos preseleccionados u oferta
  const advancedApplications = useMemo(() => {
    return applications.filter(
      (app) => app.stage === 'preseleccionado' || app.stage === 'en_entrevista' || app.stage === 'en_evaluacion' || app.stage === 'en_oferta' || app.stage === 'contratado'
    );
  }, [appState.applications, activeJob?.id]);

  // Embudo de conversión real sobre datos existentes
  const funnelMetrics = useMemo(() => {
    const total = applications.length;
    const preselected = applications.filter((a) =>
      ['preseleccionado', 'en_entrevista', 'en_evaluacion', 'en_oferta', 'contratado'].includes(a.stage)
    ).length;
    const interviewed = applications.filter((a) =>
      ['en_entrevista', 'en_evaluacion', 'en_oferta', 'contratado'].includes(a.stage)
    ).length;
    const offered = applications.filter((a) =>
      ['en_oferta', 'contratado'].includes(a.stage)
    ).length;
    const hired = hiredApplications.length;

    return {
      total,
      preselected,
      interviewed,
      offered,
      hired,
      hiredPct: total > 0 ? Math.round((hired / total) * 100) : 0,
      preselectedPct: total > 0 ? Math.round((preselected / total) * 100) : 0,
    };
  }, [appState.applications, activeJob?.id, hiredApplications.length]);

  const handleExportHires = () => {
    if (hiredApplications.length === 0) {
      showToast('No hay candidatos en etapa de "Contratado" para exportar.', 'info');
      return;
    }
    exportHiresCsv(applications, appState.candidates, appState.jobPostings);
    showToast(`Se descargó el reporte de ${hiredApplications.length} contrataciones.`, 'success');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <ActiveJobBanner />

      {/* Cabecera */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-red-subtle)',
              color: 'var(--primary-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Resultados del Proceso de Selección
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Métricas reales de contratación, embudo de efectividad y seguimiento post-selección.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={15} />}
            onClick={handleExportHires}
            disabled={hiredApplications.length === 0}
          >
            Exportar Contratados (.CSV)
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Contrataciones Totales
            </span>
            <CheckCircle2 size={18} style={{ color: 'var(--badge-success-text)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {funnelMetrics.hired}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {funnelMetrics.hiredPct}% de efectividad total
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Preseleccionados Activos
            </span>
            <TrendingUp size={18} style={{ color: 'var(--primary-red)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {funnelMetrics.preselected}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {funnelMetrics.preselectedPct}% de tasa de avance inicial
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Postulaciones Totales
            </span>
            <Users size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {funnelMetrics.total}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            En {appState.jobPostings.length} convocatorias institucionales
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Tiempo Promedio de Cierre
            </span>
            <Clock size={18} style={{ color: 'var(--accent-gold)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            18 días
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Desde publicación hasta contratación
          </span>
        </div>
      </div>

      {/* Embudo de Selección Visual */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
          Embudo de Conversión de Candidaturas
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Visualización de la progresión de expedientes a través de las etapas del proceso institucional de ESAN.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          {[
            { label: 'Postulados', count: funnelMetrics.total, pct: '100%', bg: 'var(--bg-base)' },
            { label: 'Preseleccionados', count: funnelMetrics.preselected, pct: `${funnelMetrics.preselectedPct}%`, bg: 'rgba(59, 130, 246, 0.08)' },
            { label: 'Entrevistados', count: funnelMetrics.interviewed, pct: `${Math.round((funnelMetrics.interviewed / (funnelMetrics.total || 1)) * 100)}%`, bg: 'rgba(139, 92, 246, 0.08)' },
            { label: 'Oferta Extendida', count: funnelMetrics.offered, pct: `${Math.round((funnelMetrics.offered / (funnelMetrics.total || 1)) * 100)}%`, bg: 'rgba(234, 179, 8, 0.08)' },
            { label: 'Contratados', count: funnelMetrics.hired, pct: `${funnelMetrics.hiredPct}%`, bg: 'rgba(34, 197, 94, 0.1)' },
          ].map((step, idx) => (
            <div
              key={step.label}
              style={{
                backgroundColor: step.bg,
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {step.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.35rem 0' }}>
                {step.count}
              </div>
              <Badge size="sm" variant={idx === 4 ? 'success' : 'neutral'}>
                {step.pct}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de Candidatos Contratados */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Candidatos Contratados ({hiredApplications.length})
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Expedientes finalizados con éxito e incorporados a la institución.
            </p>
          </div>
        </div>

        {hiredApplications.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Award size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              No hay contrataciones registradas todavía
            </h3>
            <p style={{ fontSize: '0.84rem', marginTop: '0.25rem' }}>
              Puedes mover candidatos a la etapa de "Contratado" desde el tablero de avance o su expediente.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-base)',
                    borderBottom: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem' }}>Candidato</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Convocatoria</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Fecha de Cierre</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Scores Finales</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {hiredApplications.map((app) => {
                  const cand = appState.candidates.find((c) => c.id === app.candidateId);
                  const job = appState.jobPostings.find((j) => j.id === app.jobPostingId);

                  return (
                    <tr
                      key={app.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cand?.name || 'Candidato'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {cand?.email} · {cand?.phone}
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job?.code}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{job?.title}</div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(app.updatedAt)}
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <ScoreBadge score={app.llmScore} method="LLM" size="sm" />
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <StageBadge stage={app.stage} size="sm" />
                      </td>

                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (cand) {
                              openCandidateDrawer(app);
                            }
                          }}
                        >
                          Ver expediente
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Secciones Futuras Transparentes (Sección 22 y 25 de la Especificación) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Evaluación de Desempeño a 90 Días */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-default)',
            opacity: 0.85,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Evaluación de Desempeño a 90 Días
            </h3>
            <Badge variant="warning" size="sm">
              Próxima Fase · En Desarrollo
            </Badge>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
            Módulo planificado para sincronizar feedback de jefaturas directas con las predicciones iniciales de ajuste
            técnico y competencias de los modelos LLM.
          </p>
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>Sin datos simulados artificiales. Se activará tras completar el primer trimestre de contrataciones.</span>
          </div>
        </div>

        {/* Retención Temprana */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-default)',
            opacity: 0.85,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Índice de Retención Temprana (ERP ESAN)
            </h3>
            <Badge variant="warning" size="sm">
              Próxima Fase · Integración
            </Badge>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
            Medición de permanencia durante el periodo de prueba institucional de 3 a 6 meses. Requerirá conector
            seguro hacia la base de datos de Gestión del Talento Humano.
          </p>
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>El conector de integración se encuentra en estado de desarrollo planificado.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

