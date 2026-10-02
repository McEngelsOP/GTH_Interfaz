import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { StageBadge } from '../components/candidate/StageBadge.tsx';
import { RequirementPill } from '../components/candidate/RequirementPill.tsx';
import { ScoreBadge } from '../components/candidate/ScoreBadge.tsx';
import { AdvanceDecisionModal } from '../components/modals/AdvanceDecisionModal.tsx';
import {
  GitCompare,
  X,
  Plus,
  Eye,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { isEligibleForTopN, getTopCandidates, getTopNAvailability } from '../services/recruitmentRules.ts';
import { compareCandidateNames } from '../services/candidateOrdering.ts';
import { Application, Candidate } from '../types/index.ts';

export function ComparadorView() {
  const {
    activeJob,
    activeJobApplications,
    appState,
    selectedApplicationIds,
    toggleApplicationSelection,
    clearApplicationSelection,
    selectAllApplications,
    openCandidateDrawer,
    setCurrentView,
    handleAdvanceSelected,
    showToast,
  } = useApp();

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedCandidateToAdd, setSelectedCandidateToAdd] = useState('');

  // Candidatos actualmente en la comparación
  const comparedApplications = useMemo(() => {
    return activeJobApplications.filter((a) => selectedApplicationIds.includes(a.id));
  }, [activeJobApplications, selectedApplicationIds]);

  const candidateMap = useMemo(() => {
    const map = new Map<string, Candidate>();
    appState.candidates.forEach((c) => map.set(c.id, c));
    return map;
  }, [appState.candidates]);

  // El selector permite encontrar cualquier perfil por su nombre, de A a Z.
  const availableToAdd = useMemo(() => {
    return activeJobApplications.filter((app) => !selectedApplicationIds.includes(app.id)).sort((a, b) =>
      compareCandidateNames(candidateMap.get(a.candidateId)?.name || '', candidateMap.get(b.candidateId)?.name || '')
      || a.id.localeCompare(b.id)
    );
  }, [activeJobApplications, selectedApplicationIds, candidateMap]);
  const topNAvailability = useMemo(() => getTopNAvailability(activeJobApplications, appState.selectedMethod),
    [activeJobApplications, appState.selectedMethod]);
  const canQuickAdd = topNAvailability.eligibleCount >= 2;
  const quickAddHint = canQuickAdd ? 'Comparar hasta 3 perfiles con puntaje LLM y requisitos verificados.'
    : topNAvailability.eligibleCount === 1 ? 'Se necesitan al menos dos perfiles elegibles para la comparación automática.'
    : topNAvailability.hint;

  const handleAddCandidate = () => {
    if (!selectedCandidateToAdd) return;
    toggleApplicationSelection(selectedCandidateToAdd);
    setSelectedCandidateToAdd('');
  };

  const handleQuickAddTop3 = () => {
    const eligibleApps = getTopCandidates(activeJobApplications, appState.selectedMethod, 3).map((a) => a.id);
    if (eligibleApps.length < 2) return;
    selectAllApplications(eligibleApps);
    showToast(`Se agregaron ${eligibleApps.length} perfiles a la comparación.`, 'info');
  };

  if (!activeJob) return null;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <ActiveJobBanner />

      {/* Cabecera del Comparador */}
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
            <GitCompare size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Comparador de Candidatos
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Comparación horizontal de evidencias, requisitos y criterios. Sin ganador universal automático.
            </p>
          </div>
        </div>

        {/* Acciones del Comparador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={15} />}
            onClick={() => setCurrentView('mejores_candidatos')}
          >
            Volver a lista
          </Button>

          {comparedApplications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearApplicationSelection}>
              Limpiar comparación
            </Button>
          )}

          {comparedApplications.length >= 2 && (
            <Button
              variant="primary"
              size="sm"
              icon={<UserCheck size={16} />}
              onClick={() => setIsAdvanceModalOpen(true)}
            >
              Decidir quién avanza ({comparedApplications.length})
            </Button>
          )}
        </div>
      </div>

      {/* Selector para añadir más candidatos a la comparación */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Añadir perfil a la comparación:
        </span>
        <select
          aria-label="Candidato para comparar"
          value={selectedCandidateToAdd}
          onChange={(e) => setSelectedCandidateToAdd(e.target.value)}
          className="focus-ring"
          style={{
            padding: '0.45rem 0.75rem',
            fontSize: '0.84rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)',
            minWidth: '260px',
          }}
        >
          <option value="">-- Seleccionar candidato --</option>
          {availableToAdd.map((app) => {
            const cand = candidateMap.get(app.candidateId);
            return (
              <option key={app.id} value={app.id}>
                {cand?.name} (LLM: {app.llmScore ?? 'Pendiente'})
              </option>
            );
          })}
        </select>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={14} />}
          disabled={!selectedCandidateToAdd}
          onClick={handleAddCandidate}
        >
          Añadir
        </Button>

        {comparedApplications.length < 2 && (
          <Button variant="ghost" size="sm" onClick={handleQuickAddTop3} disabled={!canQuickAdd} title={quickAddHint}>
            Cargar 3 mejores activos
          </Button>
        )}
      </div>

      {/* Estado vacío si hay menos de 2 candidatos */}
      {comparedApplications.length < 2 ? (
        <div
          style={{
            padding: '4rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <GitCompare size={42} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Seleccione al menos dos perfiles para comparar
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0.5rem auto 1.25rem' }}>
            Marque perfiles en la lista de candidatos o utilice el selector superior para añadir candidatos a la matriz
            comparativa.
          </p>
          <Button variant="primary" onClick={handleQuickAddTop3} disabled={!canQuickAdd} aria-describedby={!canQuickAdd ? 'comparison-availability' : undefined} title={quickAddHint}>
            Comparar los 3 mejores perfiles
          </Button>
          {!canQuickAdd && <p id="comparison-availability" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.75rem auto 0', maxWidth: '460px' }}>
            {quickAddHint} Puedes comparar los perfiles pendientes añadiéndolos manualmente en el selector.
          </p>}
        </div>
      ) : (
        /* Matriz de Comparación con Desplazamiento Horizontal Controlado (Sección 12) */
        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              minWidth: `${280 + comparedApplications.length * 280}px`,
            }}
          >
            <thead>
              {/* Fila 1: Cabecera de candidatos */}
              <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '2px solid var(--border-default)' }}>
                <th
                  style={{
                    padding: '1.25rem 1rem',
                    width: '260px',
                    verticalAlign: 'bottom',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'var(--bg-base)',
                    zIndex: 2,
                    borderRight: '1px solid var(--border-subtle)',
                  }}
                >
                  Dimensión / Criterio
                </th>

                {comparedApplications.map((app) => {
                  const cand = candidateMap.get(app.candidateId);
                  const eligibility = isEligibleForTopN(app, appState.selectedMethod);

                  return (
                    <th
                      key={app.id}
                      style={{
                        padding: '1.25rem 1rem',
                        width: '280px',
                        verticalAlign: 'top',
                        borderRight: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <StageBadge stage={app.stage} size="sm" />
                          <button
                            onClick={() => toggleApplicationSelection(app.id)}
                            className="focus-ring"
                            aria-label={`Quitar ${cand?.name} de la comparación`}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '0.15rem',
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {cand?.name || 'Candidato'}
                        </span>

                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {cand?.currentTitle} · <strong>{cand?.currentCompany}</strong>
                        </span>

                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Eye size={13} />}
                            onClick={() => openCandidateDrawer(app)}
                            style={{ flex: 1, fontSize: '0.75rem' }}
                          >
                            Ver ficha
                          </Button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* Sección: Puntajes independientes */}

              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'var(--bg-surface)',
                    borderRight: '1px solid var(--border-subtle)',
                  }}
                >
                  Puntaje según LLM
                </td>
                {comparedApplications.map((app) => (
                  <td key={app.id} style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-subtle)' }}>
                    <ScoreBadge score={app.llmScore} method="LLM" />
                  </td>
                ))}
              </tr>

              {/* Sección: Requisito Obligatorio */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'var(--bg-surface)',
                    borderRight: '1px solid var(--border-subtle)',
                  }}
                >
                  Requisito Obligatorio
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                    {activeJob.knockoutRule}
                  </div>
                </td>
                {comparedApplications.map((app) => (
                  <td key={app.id} style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <RequirementPill
                        status={app.mandatoryRequirementStatus}
                        justification={app.requirementJustification}
                        criteriaBreakdown={app.criteriaBreakdown}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {app.requirementJustification || 'Sin justificación registrada'}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Sección: Fortalezas */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'var(--bg-surface)',
                    borderRight: '1px solid var(--border-subtle)',
                  }}
                >
                  Fortalezas Clave Registradas
                </td>
                {comparedApplications.map((app) => (
                  <td key={app.id} style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {app.whyScoreNotes.strengths.map((str, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                          <CheckCircle2 size={13} style={{ color: 'var(--status-verified-text)', flexShrink: 0 }} />
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Fila divisoria: Criterios específicos del puesto */}
              <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '2px solid var(--border-default)' }}>
                <td
                  colSpan={1 + comparedApplications.length}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  Criterios de Evaluación Específicos del Puesto (Suma 100%)
                </td>
              </tr>

              {activeJob.criteria.map((crit) => (
                <tr key={crit.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      color: 'var(--text-primary)',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'var(--bg-surface)',
                      borderRight: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>{crit.label}</div>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
                      <Badge size="sm" variant={'purple'}>
                        {crit.type} ({crit.weightPct}%)
                      </Badge>
                    </div>
                  </td>

                  {comparedApplications.map((app) => {
                    const item = app.criteriaBreakdown[crit.id];
                    return (
                      <td
                        key={app.id}
                        style={{
                          padding: '0.75rem 1rem',
                          verticalAlign: 'top',
                          borderRight: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span
                            style={{
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              color: item?.score !== undefined ? 'var(--primary-red)' : 'var(--text-muted)',
                            }}
                          >
                            {item?.score !== undefined ? `${item.score} / 100` : 'Sin evidencia'}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {item?.evidence || 'Evidencia no homologada'}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de decisión desde el comparador */}
      <AdvanceDecisionModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        selectedApplications={comparedApplications}
        candidates={appState.candidates}
        job={activeJob}
        method={appState.selectedMethod}
        onConfirmAdvance={(rejectOthers, customMsg) => {
          handleAdvanceSelected(rejectOthers, customMsg);
          setCurrentView('mejores_candidatos');
        }}
      />
    </div>
  );
}
