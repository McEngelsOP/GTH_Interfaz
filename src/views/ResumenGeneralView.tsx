import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  UserX,
  Award,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Clock,
  History,
} from 'lucide-react';
import { formatDateTime } from '../services/recruitmentRules.ts';

export function ResumenGeneralView() {
  const { appState, setActiveJobId, setCurrentView, setSelectedCandidateId, setCandidateDrawerOpen } = useApp();

  // Métricas agregadas
  const metrics = useMemo(() => {
    const totalJobs = appState.jobPostings.length;
    const activeJobs = appState.jobPostings.filter((j) => j.status === 'activa').length;
    const totalCandidates = appState.candidates.length;
    const totalApps = appState.applications.length;

    const inProcessApps = appState.applications.filter(
      (a) => a.stage === 'postulado' || a.stage === 'en_evaluacion'
    ).length;

    const preselectedApps = appState.applications.filter(
      (a) => a.stage === 'preseleccionado' || a.stage === 'en_entrevista' || a.stage === 'en_oferta'
    ).length;

    const releasedApps = appState.applications.filter((a) => a.stage === 'no_continua').length;
    const hiredApps = appState.applications.filter((a) => a.stage === 'contratado').length;

    return {
      totalJobs,
      activeJobs,
      totalCandidates,
      totalApps,
      inProcessApps,
      preselectedApps,
      releasedApps,
      hiredApps,
    };
  }, [appState.jobPostings, appState.candidates, appState.applications]);

  // Últimas 5 decisiones registradas en el log
  const recentLogs = useMemo(() => {
    return appState.decisionLogs.slice(0, 5);
  }, [appState.decisionLogs]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Banner Principal Institucional */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          padding: '2rem',
          marginBottom: '1.75rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, var(--primary-red-subtle) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '820px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
            <Badge variant="purple" size="md" icon={<Sparkles size={13} />}>
              TalentAI · GTHC ESAN
            </Badge>
            <Badge variant="success" size="md">
              Versión Operativa V1
            </Badge>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Panel de Control y Resumen General
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Bienvenido al sistema inteligente de selección y gestión del talento humano de ESAN Graduate School of Business.
            Monitorea el avance de convocatorias, expedientes postulados y métricas clave de contratación en tiempo real.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            <Button
              variant="primary"
              size="md"
              icon={<Briefcase size={16} />}
              onClick={() => setCurrentView('convocatorias')}
            >
              Ver Convocatorias ({metrics.totalJobs})
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<Users size={16} />}
              onClick={() => setCurrentView('banco-talento')}
            >
              Banco de Talento ({metrics.totalCandidates})
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<FileSpreadsheet size={16} />}
              onClick={() => setCurrentView('agregar-archivos')}
            >
              Carga y Lotes de Prueba
            </Button>
            <Button
              variant="ghost"
              size="md"
              icon={<PlusCircle size={16} />}
              onClick={() => setCurrentView('nueva-convocatoria')}
            >
              Crear Convocatoria
            </Button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Globales */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onClick={() => setCurrentView('convocatorias')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Convocatorias Abiertas
            </span>
            <Briefcase size={18} style={{ color: 'var(--primary-red)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {metrics.activeJobs}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            De {metrics.totalJobs} registradas en el catálogo
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
          }}
          onClick={() => setCurrentView('banco-talento')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Candidatos Registrados
            </span>
            <Users size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {metrics.totalCandidates}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {metrics.totalApps} expedientes de postulación
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              En Evaluación Activa
            </span>
            <Clock size={18} style={{ color: 'var(--accent-gold)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {metrics.inProcessApps}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Revisión curricular y técnica
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Preseleccionados
            </span>
            <UserCheck size={18} style={{ color: 'var(--method-llm-color)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {metrics.preselectedApps}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            En entrevistas o etapas avanzadas
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Incorporados (Hires)
            </span>
            <Award size={18} style={{ color: 'var(--badge-success-text)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {metrics.hiredApps}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Contrataciones formalizadas
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Tabla Rápida de Convocatorias */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
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
                Convocatorias Destacadas
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Acceso directo a las convocatorias operativas de ESAN.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowRight size={14} />}
              onClick={() => setCurrentView('convocatorias')}
            >
              Ver todas ({metrics.totalJobs})
            </Button>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Código</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Puesto</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Postulantes</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Versión Criterios</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {appState.jobPostings.slice(0, 6).map((job) => {
                  const apps = appState.applications.filter((a) => a.jobPostingId === job.id);
                  return (
                    <tr
                      key={job.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {job.code}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{job.department}</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600 }}>{apps.length}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <Badge size="sm" variant="purple">
                          {job.criteriaVersion}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveJobId(job.id);
                            setCurrentView('mejores-candidatos');
                          }}
                        >
                          Abrir
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Últimas Acciones y Auditoría */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
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
                Actividad y Auditoría Reciente
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Últimas decisiones tomadas por los evaluadores de talento.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<History size={14} />}
              onClick={() => setCurrentView('historial-decisiones')}
            >
              Ver historial completo
            </Button>
          </div>

          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {recentLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay actividad registrada recientemente.
              </div>
            ) : (
              recentLogs.map((log) => {
                const cand = log.candidateId ? appState.candidates.find((c) => c.id === log.candidateId) : null;
                const job = appState.jobPostings.find((j) => j.id === log.jobPostingId);

                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-red)',
                        flexShrink: 0,
                      }}
                    >
                      <History size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cand ? cand.name : job?.code || 'Sistema'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {log.reason || log.notes || 'Registro de actividad del proceso'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Actor: {log.actor || log.author || 'Comité'} · Acción: {log.action}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recordatorio de Marco Ético */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <ShieldCheck size={24} style={{ color: 'var(--primary-red)', flexShrink: 0 }} />
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Marco de Inteligencia Artificial Responsable:</strong> En
          ESAN, la evaluación LLM actúa como asistente de análisis curricular estructurado y
          calibración de evidencias. La decisión de avance, entrevista o descarte es siempre responsabilidad humana y
          ética del comité evaluador de Gestión del Talento Humano.
        </div>
      </div>
    </div>
  );
}
