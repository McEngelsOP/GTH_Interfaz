import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { CandidateTable } from '../components/candidate/CandidateTable.tsx';
import { Tabs, TabItem } from '../components/common/Tabs.tsx';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { AdvanceDecisionModal } from '../components/modals/AdvanceDecisionModal.tsx';
import { ReleaseModal } from '../components/modals/ReleaseModal.tsx';
import {
  calculateJobMetrics,
  getTopCandidates,
  isEligibleForTopN,
} from '../services/recruitmentRules.ts';
import {
  Users,
  Award,
  ShieldCheck,
  CheckSquare,
  Sparkles,
  GitCompare,
  UserCheck,
  RotateCcw,
  Plus,
  Minus,
  Info,
} from 'lucide-react';
import { Application, Candidate } from '../types/index.ts';

export function MejoresCandidatosView() {
  const {
    activeJob,
    activeJobApplications,
    appState,
    selectedApplicationIds,
    selectAllApplications,
    clearApplicationSelection,
    setSelectedMethod,
    setTopN,
    setCurrentView,
    handleAdvanceSelected,
    handleReleaseApplication,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'en_proceso' | 'mejores' | 'marcados' | 'no_continuan' | 'todos'>('en_proceso');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<{ app: Application; cand: Candidate } | null>(null);

  // Métricas vivas calculadas del puesto activo
  const metrics = useMemo(() => {
    return calculateJobMetrics(activeJobApplications, appState.selectedMethod);
  }, [activeJobApplications, appState.selectedMethod]);

  // Mejores perfiles calculados dinámicamente según método y cantidad
  const topEligiblePending = useMemo(() => {
    return getTopCandidates(activeJobApplications, appState.selectedMethod, appState.topN);
  }, [activeJobApplications, appState.selectedMethod, appState.topN]);

  // Selección de conjunto según pestaña activa
  const displayedApplications = useMemo(() => {
    switch (activeTab) {
      case 'mejores':
        return topEligiblePending;
      case 'marcados':
        return activeJobApplications.filter((a) => selectedApplicationIds.includes(a.id));
      case 'no_continuan':
        return activeJobApplications.filter((a) => a.stage === 'no_continua');
      case 'todos':
        return activeJobApplications;
      case 'en_proceso':
      default:
        return activeJobApplications.filter((a) => a.stage !== 'no_continua');
    }
  }, [activeTab, activeJobApplications, topEligiblePending, selectedApplicationIds]);

  // Pestañas con conteos sincronizados en tiempo real
  const candidateTabs: TabItem[] = [
    {
      id: 'en_proceso',
      label: 'En proceso',
      count: metrics.totalActive,
    },
    {
      id: 'mejores',
      label: 'Mejores perfiles',
      count: topEligiblePending.length,
    },
    {
      id: 'marcados',
      label: 'Marcados',
      count: selectedApplicationIds.length,
    },
    {
      id: 'no_continuan',
      label: 'No continúan',
      count: metrics.stageCounts.no_continua,
    },
    {
      id: 'todos',
      label: 'Todos',
      count: metrics.totalProcessed,
    },
  ];

  // Acción "Elegir los mejores": marca Top-N elegibles
  const handleSelectTopN = () => {
    const topIds = topEligiblePending.map((a) => a.id);
    if (topIds.length === 0) {
      showToast('No hay candidatos pendientes elegibles para seleccionar con los criterios actuales.', 'warning');
      return;
    }
    selectAllApplications(topIds);
    if (topIds.length < appState.topN) {
      showToast(
        `Se marcaron ${topIds.length} perfiles elegibles (menos de los ${appState.topN} solicitados debido a requisitos o puntajes pendientes).`,
        'info'
      );
    } else {
      showToast(`Se marcaron los ${topIds.length} mejores perfiles según ${appState.selectedMethod}.`, 'success');
    }
  };

  // Comparar seleccionados
  const handleGoToComparator = () => {
    if (selectedApplicationIds.length < 2) {
      showToast('Seleccione al menos dos perfiles para comparar.', 'warning');
      return;
    }
    setCurrentView('comparador');
  };

  // Abrir modal de liberación
  const handleOpenReleaseModal = (app: Application, cand: Candidate) => {
    setReleaseTarget({ app, cand });
  };

  // Confirmar avance
  const handleConfirmAdvance = (rejectOthers: boolean, customMessage: string) => {
    handleAdvanceSelected(rejectOthers, customMessage);
  };

  const markedApps = useMemo(() => {
    return activeJobApplications.filter((a) => selectedApplicationIds.includes(a.id));
  }, [activeJobApplications, selectedApplicationIds]);

  if (!activeJob) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Seleccione una convocatoria para comenzar</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Banner de Contexto de Convocatoria Activa */}
      <ActiveJobBanner />

      {/* Indicadores Compactos y Controles de Selección */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* KPI 1: Candidatos Activos */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
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
            <Users size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Candidatos Activos
            </span>
            <span style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }} className="tabular-nums">
              {metrics.totalActive}
            </span>
          </div>
        </div>

        {/* KPI 2: Puntaje Promedio del Método Seleccionado */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: appState.selectedMethod === 'ML' ? 'var(--method-ml-bg)' : 'var(--method-llm-bg)',
              color: appState.selectedMethod === 'ML' ? 'var(--method-ml-color)' : 'var(--method-llm-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Promedio ({appState.selectedMethod})
            </span>
            <span style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }} className="tabular-nums">
              {metrics.avgScore !== null ? `${metrics.avgScore} / 100` : 'Sin datos'}
            </span>
          </div>
        </div>

        {/* KPI 3: Requisitos Obligatorios Verificados */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--status-verified-bg)',
              color: 'var(--status-verified-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Requisitos Verificados
            </span>
            <span style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }} className="tabular-nums">
              {metrics.verifiedCount}{' '}
              <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                de {metrics.totalActive}
              </span>
            </span>
          </div>
        </div>

        {/* Panel de Control de Selección Top-N y Método */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '0.85rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--primary-red-border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Método que ordena:
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={() => setSelectedMethod('ML')}
                className="focus-ring"
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid transparent',
                  backgroundColor: appState.selectedMethod === 'ML' ? 'var(--method-ml-bg)' : 'var(--bg-base)',
                  color: appState.selectedMethod === 'ML' ? 'var(--method-ml-color)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                ML
              </button>
              <button
                onClick={() => setSelectedMethod('LLM')}
                className="focus-ring"
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid transparent',
                  backgroundColor: appState.selectedMethod === 'LLM' ? 'var(--method-llm-bg)' : 'var(--bg-base)',
                  color: appState.selectedMethod === 'LLM' ? 'var(--method-llm-color)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                LLM
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                onClick={() => setTopN(appState.topN - 1)}
                className="focus-ring"
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <Minus size={13} />
              </button>
              <input
                type="number"
                min={1}
                value={appState.topN}
                onChange={(e) => setTopN(parseInt(e.target.value) || 1)}
                style={{
                  width: '42px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  padding: '0.2rem 0',
                }}
              />
              <button
                onClick={() => setTopN(appState.topN + 1)}
                className="focus-ring"
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles size={14} />}
              onClick={handleSelectTopN}
              title="Marcar automáticamente los mejores candidatos elegibles pendientes"
              style={{ flex: 1 }}
            >
              Elegir los mejores
            </Button>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Dos formas de revisar el perfil. Elige cuál ordena la lista.
          </span>
        </div>
      </div>

      {/* Pestañas con significado claro */}
      <div style={{ marginBottom: '1rem' }}>
        <Tabs tabs={candidateTabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />
      </div>

      {/* Franja integrada para acciones sobre los marcados (Sección 10) */}
      {selectedApplicationIds.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--primary-red-subtle)',
            border: '1px solid var(--primary-red-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.15rem',
            marginBottom: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.85rem',
            animation: 'fadeIn 150ms ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckSquare size={18} style={{ color: 'var(--primary-red)' }} />
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-red)' }}>
                Marcaste {selectedApplicationIds.length}{' '}
                {selectedApplicationIds.length === 1 ? 'perfil' : 'perfiles'} para revisarlos juntos.
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                Todavía no has cambiado su etapa.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={clearApplicationSelection}>
              Limpiar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('marcados')}
              style={{ border: '1px solid var(--border-default)' }}
            >
              Ver marcados
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<GitCompare size={15} />}
              onClick={handleGoToComparator}
              disabled={selectedApplicationIds.length < 2}
              title={selectedApplicationIds.length < 2 ? 'Marque al menos dos perfiles' : 'Comparar perfiles'}
            >
              Comparar ({selectedApplicationIds.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<UserCheck size={16} />}
              onClick={() => setIsAdvanceModalOpen(true)}
            >
              Decidir quién avanza
            </Button>
          </div>
        </div>
      )}

      {/* Tabla central de candidatos */}
      <CandidateTable
        applications={displayedApplications}
        selectedMethod={appState.selectedMethod}
        onOpenReleaseModal={handleOpenReleaseModal}
        onQuickAdvance={(app) => {
          selectAllApplications([app.id]);
          setIsAdvanceModalOpen(true);
        }}
      />

      {/* Modal de decisión de avance */}
      <AdvanceDecisionModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        selectedApplications={markedApps}
        candidates={appState.candidates}
        job={activeJob}
        method={appState.selectedMethod}
        onConfirmAdvance={handleConfirmAdvance}
      />

      {/* Modal de liberación */}
      <ReleaseModal
        isOpen={Boolean(releaseTarget)}
        onClose={() => setReleaseTarget(null)}
        application={releaseTarget?.app || null}
        candidate={releaseTarget?.cand || null}
        job={activeJob}
        onConfirmRelease={(appId, reason) => {
          handleReleaseApplication(appId, reason);
          setReleaseTarget(null);
        }}
      />
    </div>
  );
}
