import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Criterion, EvaluationMethod } from '../types/index.ts';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { simulateScoreRecalculation } from '../services/recruitmentRules.ts';
import {
  Sliders,
  RotateCcw,
  Save,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function CriteriosEvaluacionView() {
  const { activeJob, activeJobApplications, appState, handleUpdateJobCriteria, setCurrentView, showToast } = useApp();

  const [criteria, setCriteria] = useState<Criterion[]>(() => {
    return activeJob ? JSON.parse(JSON.stringify(activeJob.criteria)) : [];
  });

  const [showSimulation, setShowSimulation] = useState(false);
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => { setCriteria(activeJob?.criteria.map((c) => ({ ...c })) || []); setShowSimulation(false); setCurrentPage(1); }, [activeJob?.id, activeJob?.criteriaVersion]);

  // Suma total y diferencia al 100%
  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weightPct) || 0), 0);
  const delta = 100 - totalWeight;

  const handleWeightChange = (id: string, newWeight: number) => {
    const val = Math.max(0, Math.min(100, Math.round(newWeight)));
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, weightPct: val } : c)));
  };

  const handleReset = () => {
    if (activeJob) {
      setCriteria(JSON.parse(JSON.stringify(activeJob.criteria)));
      showToast('Ponderaciones restablecidas a los valores de la versión activa.', 'info');
    }
  };

  // Simulación del impacto en los candidatos actuales (Sección 20)
  const simulationResults = useMemo(() => {
    if (!activeJob) return [];

    return activeJobApplications.filter((app) => app.stage === 'postulado').map((app) => {
      const cand = app;
      const simLLM = simulateScoreRecalculation(criteria, app.criteriaBreakdown, 'LLM');

      return {
        appId: app.id,
        candidateId: app.candidateId,
        oldLLM: app.llmScore,
        newLLM: simLLM,
      };
    });
  }, [activeJob, activeJobApplications, criteria]);

  // Paginación y control de volumen de la simulación
  const totalItems = simulationResults.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize || 1)));
  const validPage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedResults = useMemo(() => {
    if (pageSize === 0) return simulationResults;
    const start = (validPage - 1) * pageSize;
    return simulationResults.slice(start, start + pageSize);
  }, [simulationResults, validPage, pageSize]);

  const handleSave = () => {
    if (totalWeight !== 100) {
      showToast(`La ponderación debe sumar exactamente 100% (actualmente suma ${totalWeight}%).`, 'error');
      return;
    }
    if (!activeJob) return;

    handleUpdateJobCriteria(activeJob.id, criteria);
    setShowSimulation(false);
  };

  if (!activeJob) return null;

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
            <Sliders size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Criterios de Evaluación y Ponderaciones
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Ajuste de pesos relativos (suma 100%) y simulación previa de recálculo para {activeJob.code}.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={handleReset}>
            Restablecer
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => setShowSimulation(!showSimulation)}
            disabled={totalWeight !== 100}
          >
            {showSimulation ? 'Ocultar simulación' : 'Simular impacto'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Save size={14} />}
            disabled={totalWeight !== 100}
            onClick={handleSave}
          >
            Guardar nueva versión
          </Button>
        </div>
      </div>

      {/* Aviso de Simulación (Sección 20) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-base)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}
      >
        <Info size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.1rem' }} />
        <span>
          <strong>Simulación transparente:</strong> Esta pantalla representa una simulación interactiva sobre
          evidencias estructuradas conocidas. No afirma que se ejecutó un reentrenamiento de IA real en el servidor.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Panel Izquierdo: Editor de Ponderaciones */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Requisito obligatorio actual */}
          <div
            style={{
              padding: '0.85rem',
              backgroundColor: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
              <ShieldCheck size={16} style={{ color: 'var(--primary-red)' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Requisito Obligatorio (Knockout)
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{activeJob.knockoutRule}</p>
          </div>

          {/* Suma de Ponderaciones con Feedback Visual */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: totalWeight === 100 ? 'var(--status-verified-bg)' : 'var(--status-failed-bg)',
              color: totalWeight === 100 ? 'var(--status-verified-text)' : 'var(--status-failed-text)',
              border: `1px solid ${totalWeight === 100 ? 'var(--status-verified-border)' : 'var(--status-failed-border)'}`,
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {totalWeight === 100
                ? 'Ponderación completa (100%)'
                : `Ponderación inválida: Suma ${totalWeight}% (Diferencia: ${delta > 0 ? `+${delta}%` : `${delta}%`})`}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{totalWeight}%</span>
          </div>

          {/* Lista de Controles Deslizantes y Numéricos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {criteria.map((crit) => (
              <div
                key={crit.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {crit.label}
                    </span>
                    <Badge size="sm" variant={'purple'}>
                      {crit.type}
                    </Badge>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={crit.weightPct}
                      onChange={(e) => handleWeightChange(crit.id, parseInt(e.target.value) || 0)}
                      className="focus-ring"
                      style={{
                        width: '52px',
                        padding: '0.25rem 0.4rem',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>%</span>
                  </div>
                </div>

                {/* Control Deslizante (Slider) */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={crit.weightPct}
                  onChange={(e) => handleWeightChange(crit.id, parseInt(e.target.value) || 0)}
                  style={{ width: '100%', accentColor: 'var(--primary-red)', cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Panel Derecho: Simulación de Resultados Previos vs Nuevos */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Simulación de Impacto en Scores
            </h2>
            <Badge variant="purple" size="sm">
              Versión actual: {activeJob.criteriaVersion}
            </Badge>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Comparación de puntajes anteriores y recalculados para los candidatos de este puesto, usando la evaluación LLM.
          </p>

          {/* Contenedor con scroll interno y sticky header */}
          <div
            style={{
              maxHeight: '480px',
              overflowY: 'auto',
              overflowX: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface)',
              position: 'relative',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-base)' }}>
                <tr style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.65rem 0.75rem', backgroundColor: 'var(--bg-base)' }}>Candidato</th>
                  <th style={{ padding: '0.65rem 0.75rem', backgroundColor: 'var(--bg-base)' }}>LLM Anterior</th>
                  <th style={{ padding: '0.65rem 0.75rem', backgroundColor: 'var(--bg-base)' }}>LLM Simulado</th>
                </tr>
              </thead>
              <tbody>
                {activeJobApplications.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay candidatos registrados para simular en esta convocatoria.
                    </td>
                  </tr>
                ) : (
                  paginatedResults.map((res) => {
                    const cand = appState.candidates.find((c) => c.id === res.candidateId);
                    return (
                      <tr key={res.appId} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cand?.name || 'Candidato'}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>
                          {res.oldLLM ?? 'N/D'}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--method-llm-color)' }}>
                          {res.newLLM ?? 'Pendiente'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginación y Control de Límite */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span>Mostrar:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="focus-ring"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8125rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <option value={15}>15 por página</option>
                <option value={30}>30 por página</option>
                <option value={50}>50 por página</option>
                <option value={0}>Todos (con scroll interno)</option>
              </select>

              <span style={{ color: 'var(--text-muted)' }}>
                {totalItems === 0
                  ? '0 candidatos'
                  : pageSize === 0
                  ? `Mostrando todos los ${totalItems} candidatos`
                  : `Mostrando ${(validPage - 1) * pageSize + 1} - ${Math.min(validPage * pageSize, totalItems)} de ${totalItems} candidatos`}
              </span>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={validPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '0.25rem 0.55rem', height: '30px' }}
                >
                  <ChevronLeft size={15} />
                  <span style={{ fontSize: '0.75rem' }}>Anterior</span>
                </Button>
                <span style={{ fontWeight: 600, padding: '0 0.4rem', color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                  {validPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={validPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '0.25rem 0.55rem', height: '30px' }}
                >
                  <span style={{ fontSize: '0.75rem' }}>Siguiente</span>
                  <ChevronRight size={15} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

