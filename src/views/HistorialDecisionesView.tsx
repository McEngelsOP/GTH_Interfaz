import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Input } from '../components/common/Input.tsx';
import { Select } from '../components/common/Select.tsx';
import {
  History,
  Filter,
  Search,
  Calendar,
  User,
  ArrowRight,
  ShieldAlert,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Sliders,
  PlusCircle,
  Link2,
} from 'lucide-react';
import { formatDateTime } from '../services/recruitmentRules.ts';

export function HistorialDecisionesView() {
  const { appState, activeJob, setSelectedCandidateId, setCandidateDrawerOpen } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');

  // Filter decision logs
  const filteredLogs = useMemo(() => {
    return appState.decisionLogs.filter((log) => {
      // Job filter
      if (selectedJobFilter !== 'ALL' && log.jobPostingId !== selectedJobFilter) {
        return false;
      }
      // Action filter
      if (selectedActionFilter !== 'ALL' && log.action !== selectedActionFilter) {
        return false;
      }
      // Search query (candidate name, reason, actor, details)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cand = log.candidateId ? appState.candidates.find((c) => c.id === log.candidateId) : null;
        const matchesName = cand?.name.toLowerCase().includes(q);
        const matchesReason = (log.reason || log.notes || '').toLowerCase().includes(q);
        const matchesActor = (log.actor || log.author || '').toLowerCase().includes(q);
        const matchesAction = log.action.toLowerCase().includes(q);
        if (!matchesName && !matchesReason && !matchesActor && !matchesAction) {
          return false;
        }
      }
      return true;
    });
  }, [appState.decisionLogs, appState.candidates, selectedJobFilter, selectedActionFilter, searchQuery]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'advance':
        return (
          <Badge variant="success" size="sm" icon={<CheckCircle2 size={12} />}>
            Preselección
          </Badge>
        );
      case 'release':
        return (
          <Badge variant="danger" size="sm" icon={<XCircle size={12} />}>
            Liberación
          </Badge>
        );
      case 'stage_change':
        return (
          <Badge variant="info" size="sm" icon={<ArrowRight size={12} />}>
            Cambio de Etapa
          </Badge>
        );
      case 'criteria_update':
        return (
          <Badge variant="purple" size="sm" icon={<Sliders size={12} />}>
            Ajuste Criterios
          </Badge>
        );
      case 'job_created':
        return (
          <Badge variant="warning" size="sm" icon={<PlusCircle size={12} />}>
            Nueva Convocatoria
          </Badge>
        );
      case 'candidate_link':
        return (
          <Badge variant="neutral" size="sm" icon={<Link2 size={12} />}>
            Vinculación a Puesto
          </Badge>
        );
      default:
        return <Badge size="sm">{action}</Badge>;
    }
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
            <History size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Historial de Decisiones y Auditoría
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Trazabilidad inmutable de preselecciones, liberaciones de candidatos, cambios de fase y ajustes de ponderación.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge variant="neutral" size="md">
            {filteredLogs.length} eventos registrados
          </Badge>
        </div>
      </div>

      {/* Honest Disclaimer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          backgroundColor: 'var(--bg-base)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
        }}
      >
        <ShieldAlert size={18} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
        <span>
          <strong>Garantía de Transparencia Ética:</strong> Toda decisión humana registrada en esta bitácora conserva
          el autor, fecha/hora exacta, justificación obligatoria y estado de los puntajes antes y después. Este registro
          se mantiene en el almacenamiento local versionado de la demo.
        </span>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
        }}
      >
        <Input
          placeholder="Buscar por candidato, motivo o actor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={16} />}
        />

        <Select
          value={selectedJobFilter}
          onChange={(e) => setSelectedJobFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'Todas las convocatorias' },
            ...appState.jobPostings.map((j) => ({
              value: j.id,
              label: `${j.code} · ${j.title}`,
            })),
          ]}
        />

        <Select
          value={selectedActionFilter}
          onChange={(e) => setSelectedActionFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'Todos los tipos de acción' },
            { value: 'advance', label: 'Preselección (Avanzar)' },
            { value: 'release', label: 'Liberación (No continúa)' },
            { value: 'stage_change', label: 'Cambio de etapa manual' },
            { value: 'criteria_update', label: 'Actualización de criterios' },
            { value: 'job_created', label: 'Creación de convocatoria' },
            { value: 'candidate_link', label: 'Candidato postulado a puesto' },
          ]}
        />
      </div>

      {/* Línea de tiempo / Tabla de Registros */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <History size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              No se encontraron registros de auditoría
            </h3>
            <p style={{ fontSize: '0.84rem', marginTop: '0.25rem' }}>
              Prueba cambiando o limpiando los filtros de búsqueda seleccionados.
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
                  <th style={{ padding: '0.75rem 1rem' }}>Fecha y Hora</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Acción</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Convocatoria</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Candidato / Elemento</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Transición</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Justificación / Detalle</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const cand = log.candidateId ? appState.candidates.find((c) => c.id === log.candidateId) : null;
                  const job = appState.jobPostings.find((j) => j.id === log.jobPostingId);

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={13} />
                          {formatDateTime(log.timestamp)}
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {getActionBadge(log.action)}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {job ? job.code : 'General'}
                        </span>
                        {job && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.title}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        {cand ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCandidateId(cand.id);
                              setCandidateDrawerOpen(true);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontWeight: 600,
                              color: 'var(--primary-red)',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              fontSize: '0.84rem',
                            }}
                          >
                            {cand.name}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>Configuración de Convocatoria</span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {log.previousStage || log.newStage ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{log.previousStage || 'inicio'}</span>
                            <ArrowRight size={12} />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.newStage}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', maxWidth: '300px' }}>
                        <div style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {log.reason || log.notes || 'Sin justificación registrada'}
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {Object.entries(log.metadata)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <User size={13} style={{ color: 'var(--text-muted)' }} />
                          {log.actor || log.author || 'Comité Evaluador'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
