import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { CandidateTable } from '../components/candidate/CandidateTable.tsx';
import { Tabs, TabItem } from '../components/common/Tabs.tsx';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { AdvanceDecisionModal } from '../components/modals/AdvanceDecisionModal.tsx';
import { EvaluationPanel } from '../components/assistant/EvaluationPanel.tsx';
import { ReleaseModal } from '../components/modals/ReleaseModal.tsx';
import { BulkReleaseModal } from '../components/modals/BulkReleaseModal.tsx';
import {
  calculateJobMetrics,
  isEligibleForTopN,
} from '../services/recruitmentRules.ts';
import { getReviewCandidates, reviewAvailability } from '../services/reviewRanking.ts';
import { exportCandidatesCSV } from '../services/exportService.ts';
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
  Download,
  Star,
  FileSpreadsheet,
  UserX,
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
    handleReleaseApplications,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'en_proceso' | 'mejores' | 'preseleccionados' | 'contratados' | 'marcados' | 'no_continuan' | 'todos'>('en_proceso');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<{ app: Application; cand: Candidate } | null>(null);
  const [bulkReleaseIds, setBulkReleaseIds] = useState<string[] | null>(null);
  useEffect(() => { setBulkReleaseIds(null); setReleaseTarget(null); setIsAdvanceModalOpen(false); }, [activeJob?.id]);

  // Métricas vivas calculadas del puesto activo
  const metrics = useMemo(() => {
    return calculateJobMetrics(activeJobApplications, appState.selectedMethod, activeJob?.criteria);
  }, [activeJobApplications, appState.selectedMethod, activeJob?.criteria]);
  const showingPartialAverage = metrics.avgScore === null && metrics.avgPartialScore !== null;
  const displayedAverage = metrics.avgScore ?? metrics.avgPartialScore;
  const topNAvailability = useMemo(() => reviewAvailability(activeJobApplications, activeJob?.criteria || []),
    [activeJobApplications, activeJob?.criteria]);

  // Candidatos que ya fueron designados y movidos a Los Mejores (Preseleccionados)
  const preselectedCandidates = useMemo(() => {
    return activeJobApplications.filter((a) => a.stage === 'preseleccionado');
  }, [activeJobApplications]);

  // Mejores perfiles calculados dinámicamente según método y cantidad (pendientes)
  const topReviewPending = useMemo(() => {
    return getReviewCandidates(activeJobApplications, activeJob?.criteria || [], appState.topN, appState.candidates);
  }, [activeJobApplications, activeJob?.criteria, appState.topN, appState.candidates]);

  // El Top-N contiene únicamente expedientes pendientes de primera decisión.
  const allBestApplications = topReviewPending;
  const evaluationApplications = activeJobApplications.filter(app => app.stage === 'postulado');

  // Selección de conjunto según pestaña activa
  const displayedApplications = useMemo(() => {
    switch (activeTab) {
      case 'mejores':
        return allBestApplications;
      case 'preseleccionados': return preselectedCandidates;
      case 'contratados': return activeJobApplications.filter((a) => a.stage === 'contratado');
      case 'marcados':
        return activeJobApplications.filter((a) => selectedApplicationIds.includes(a.id));
      case 'no_continuan':
        return activeJobApplications.filter((a) => a.stage === 'no_continua');
      case 'todos':
        return activeJobApplications;
      case 'en_proceso':
      default:
        return activeJobApplications.filter((a) => a.stage !== 'no_continua' && a.stage !== 'contratado');
    }
  }, [activeTab, activeJobApplications, allBestApplications, selectedApplicationIds]);

  // Pestañas con conteos sincronizados en tiempo real
  const candidateTabs: TabItem[] = [
    {
      id: 'en_proceso',
      label: 'En proceso',
      count: metrics.totalActive,
    },
    {
      id: 'mejores',
      label: 'Top-N para revisión',
      count: allBestApplications.length,
    },
    { id: 'preseleccionados', label: 'Preseleccionados', count: preselectedCandidates.length },
    { id: 'contratados', label: 'Contratados', count: metrics.stageCounts.contratado },
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

  // Marca un conjunto orientativo para revisar; no cambia etapas ni requisitos.
  const handleSelectTopN = () => {
    const topIds = topReviewPending.map((a) => a.id);
    if (topIds.length === 0) {
      showToast(topNAvailability.hint, 'info');
      return;
    }
    selectAllApplications(topIds);
    setActiveTab('mejores');
    showToast(`Se marcaron ${topIds.length} perfiles para revisión con los puntajes LLM disponibles. Revisa cobertura y requisitos antes de decidir el avance.`, 'info');
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
  const releasableMarkedApps = markedApps.filter(app => app.stage !== 'no_continua' && app.stage !== 'contratado');
  const canAdvanceMarked = markedApps.length > 0 && markedApps.every(app => isEligibleForTopN(app, appState.selectedMethod).eligible);
  const bulkReleaseApplications = activeJobApplications.filter(app => bulkReleaseIds?.includes(app.id));

  // Exportación CSV de todos los candidatos del puesto
  const handleExportAll = () => {
    if (!activeJob) return;
    if (activeJobApplications.length === 0) {
      showToast('No hay candidatos en este puesto para exportar.', 'warning');
      return;
    }
    exportCandidatesCSV({
      emailDrafts: appState.emailDrafts,
      applications: activeJobApplications,
      candidates: appState.candidates,
      job: activeJob,
      method: appState.selectedMethod,
      scopeName: 'Todos',
    });
    showToast(`Descargando CSV de todos los candidatos (${activeJobApplications.length}) de ${activeJob.code}.`, 'success');
  };

  // Exportación CSV de Los Mejores perfiles
  const handleExportBest = () => {
    if (!activeJob) return;
    if (allBestApplications.length === 0) {
      showToast('No hay perfiles catalogados como los mejores para exportar.', 'warning');
      return;
    }
    exportCandidatesCSV({
      emailDrafts: appState.emailDrafts,
      applications: allBestApplications,
      candidates: appState.candidates,
      job: activeJob,
      method: appState.selectedMethod,
      scopeName: 'Top_N_revision',
    });
    showToast(`Descargando CSV de los mejores perfiles (${allBestApplications.length}) de ${activeJob.code}.`, 'success');
  };

  // Exportación CSV de candidatos marcados
  const handleExportMarked = () => {
    if (!activeJob) return;
    if (markedApps.length === 0) {
      showToast('Seleccione al menos un candidato para exportar.', 'warning');
      return;
    }
    exportCandidatesCSV({
      emailDrafts: appState.emailDrafts,
      applications: markedApps,
      candidates: appState.candidates,
      job: activeJob,
      method: appState.selectedMethod,
      scopeName: 'Marcados',
    });
    showToast(`Descargando CSV de los ${markedApps.length} candidatos marcados.`, 'success');
  };

  // Mover marcados directamente a "Los Mejores" (Preseleccionados)
  const handleMoveMarkedToBest = () => {
    if (markedApps.length === 0) {
      showToast('No hay candidatos marcados para mover a Los Mejores.', 'warning');
      return;
    }
    setIsAdvanceModalOpen(true);
  };

  if (!activeJob) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Seleccione una convocatoria para comenzar</h2>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
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
          className="hover-lift"
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
          className="hover-lift"
          role="region"
          aria-label="Resumen del promedio LLM"
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
              backgroundColor: 'var(--method-llm-bg)',
              color: 'var(--method-llm-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {showingPartialAverage ? 'Promedio parcial' : 'Promedio'} ({appState.selectedMethod})
            </span>
            <span style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }} className="tabular-nums">
              {displayedAverage !== null ? `${displayedAverage} / 100` : metrics.evaluatedWithoutScoreCount > 0 ? 'Sin evidencia' : 'Sin datos'}
            </span>
            {metrics.avgScore !== null && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {metrics.scoredCount} {metrics.scoredCount === 1 ? 'evaluación completa' : 'evaluaciones completas'}
            </span>}
            {metrics.avgPartialScore !== null && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {!showingPartialAverage && <>Parciales: {metrics.avgPartialScore} / 100 · </>}
              {metrics.partialScoreCount} {metrics.partialScoreCount === 1 ? 'evaluación parcial' : 'evaluaciones parciales'} · cobertura media {metrics.avgPartialCoverage}%
            </span>}
            {displayedAverage === null && metrics.evaluatedWithoutScoreCount > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {metrics.evaluatedWithoutScoreCount} {metrics.evaluatedWithoutScoreCount === 1 ? 'evaluación recibida sin criterios puntuables' : 'evaluaciones recibidas sin criterios puntuables'}
            </span>}
          </div>
        </div>

        {/* KPI 3: Requisitos Obligatorios Verificados */}
        <div
          className="hover-lift"
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
          className="hover-lift"
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
              <Badge variant="purple" size="sm">LLM</Badge>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
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
                aria-label="Cantidad Top-N"
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
              disabled={topNAvailability.count === 0 || activeJob.status !== 'activa'}
              aria-describedby="top-n-availability"
              title={activeJob.status !== 'activa' ? 'La convocatoria debe estar activa para seleccionar perfiles.' : topNAvailability.hint}
              style={{ flex: 1 }}
            >
              Elegir los mejores
            </Button>
          </div>
          <span id="top-n-availability" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {activeJob.status !== 'activa' ? 'La convocatoria debe estar activa para seleccionar perfiles.' : topNAvailability.hint}
          </span>
        </div>
      </div>

      {/* Barra de Herramientas y Exportación CSV General */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1rem',
          padding: '0.65rem 1rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSpreadsheet size={18} style={{ color: 'var(--primary-red)' }} />
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Exportación CSV de la convocatoria ({activeJob.code}):
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportAll}
            title="Descargar todos los candidatos del puesto en archivo CSV"
          >
            Exportar todos ({metrics.totalProcessed})
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Star size={14} style={{ color: '#D97706' }} />}
            onClick={handleExportBest}
            title="Descargar el Top-N de expedientes pendientes en CSV"
          >
            Exportar Top-N ({allBestApplications.length})
          </Button>

          {selectedApplicationIds.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExportMarked}
              title="Descargar los perfiles marcados en CSV"
            >
              Exportar Marcados ({selectedApplicationIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Pestañas con significado claro */}
      <div style={{ marginBottom: '1rem' }}>
        <Tabs tabs={candidateTabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />
      </div>

      {/* Franja integrada para acciones sobre los marcados (Sección 10) */}
      {selectedApplicationIds.length > 0 && (
        <div
          className="glass-panel animate-slide-up"
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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
            <CheckSquare size={18} style={{ color: 'var(--primary-red)' }} />
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-red)' }}>
                Marcaste {selectedApplicationIds.length}{' '}
                {selectedApplicationIds.length === 1 ? 'perfil' : 'perfiles'} para revisarlos juntos.
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                Puedes comparar sus perfiles y revisar la decisión de avance.
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
              Ver marcados ({selectedApplicationIds.length})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExportMarked}
              title="Descargar solo los candidatos marcados en CSV"
            >
              Exportar CSV ({selectedApplicationIds.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Star size={14} fill="currentColor" />}
              onClick={handleMoveMarkedToBest}
              title={canAdvanceMarked ? 'Revisar y confirmar el avance a Preselección' : 'Revisar el puntaje completo y los requisitos necesarios para avanzar'}
            >
              {canAdvanceMarked ? 'Avanzar a Preselección' : 'Revisar avance'} ({selectedApplicationIds.length})
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
              variant="outline"
              size="sm"
              icon={<UserCheck size={16} />}
              onClick={() => setIsAdvanceModalOpen(true)}
              title="Personalizar decisión de avance y redactar borradores de correo"
            >
              Decidir con borrador...
            </Button>
            <Button variant="danger" size="sm" icon={<UserX size={16} />}
              disabled={!releasableMarkedApps.length || activeJob.status !== 'activa'}
              onClick={() => setBulkReleaseIds(releasableMarkedApps.map(app => app.id))}
              title="Descartar las postulaciones activas marcadas y conservar sus perfiles">
              Descartar marcados ({releasableMarkedApps.length})
            </Button>
          </div>
        </div>
      )}

      <EvaluationPanel />

      {/* Tabla central de candidatos */}
      {!activeJobApplications.length && <div className="import-card" role="status">
        <p style={{ marginBottom: '.75rem' }}>Esta convocatoria todavía no tiene candidatos. Carga un CSV o Excel para empezar.</p>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCurrentView('agregar_archivos')}>Cargar perfiles</Button>
      </div>}
      {evaluationApplications.some((app) => app.llmScore === null) && <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem', marginBottom: '1rem' }}>
        {evaluationApplications.filter((app) => app.llmScore === null && !app.llmEvaluation && !app.evaluationIssue).length} sin evaluar · {evaluationApplications.filter((app) => app.llmScore === null && app.llmEvaluation).length} con evidencia incompleta · {evaluationApplications.filter((app) => app.evaluationIssue).length} casos especiales. El Top-N para revisión usa los puntajes disponibles. Avanzar requiere puntaje completo y requisitos verificados.
      </p>}
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
      <BulkReleaseModal isOpen={bulkReleaseIds !== null} onClose={() => setBulkReleaseIds(null)}
        applications={bulkReleaseApplications} expectedCount={bulkReleaseIds?.length || 0} candidates={appState.candidates} job={activeJob}
        onConfirm={handleReleaseApplications} />
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
