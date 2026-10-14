import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { CandidateTable } from '../components/candidate/CandidateTable.tsx';
import { Tabs, TabItem } from '../components/common/Tabs.tsx';
import { Button } from '../components/common/Button.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { AdvanceDecisionModal } from '../components/modals/AdvanceDecisionModal.tsx';
import { ReleaseModal } from '../components/modals/ReleaseModal.tsx';
import { BulkReleaseModal } from '../components/modals/BulkReleaseModal.tsx';
import {
  calculateJobMetrics,
  isEligibleForTopN,
  puedeAvanzar,
} from '../services/recruitmentRules.ts';
import { exportarRankingExcel, AlcanceExport } from '../services/exportExcel.ts';
import { enProceso, idsTopN, idsTopNPorPosicion, ordenarPorEmbeddings } from '../services/rankingEmbeddings.ts';
import { useEnRevision } from '../services/enRevision.ts';
import { useEmbeddingRanking } from '../services/useEmbeddingRanking.ts';
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
  useEmbeddingRanking();
  const enRevision = useEnRevision(activeJob, activeJobApplications, appState.candidates);

  const [activeTab, setActiveTab] = useState<'en_proceso' | 'mejores' | 'preseleccionados' | 'contratados' | 'marcados' | 'revisados' | 'no_continuan' | 'todos'>('en_proceso');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<{ app: Application; cand: Candidate } | null>(null);
  const [bulkReleaseIds, setBulkReleaseIds] = useState<string[] | null>(null);
  useEffect(() => { setBulkReleaseIds(null); setReleaseTarget(null); setIsAdvanceModalOpen(false); }, [activeJob?.id]);

  // Métricas vivas calculadas del puesto activo
  const metrics = useMemo(() => {
    return calculateJobMetrics(activeJobApplications, appState.selectedMethod, activeJob?.criteria);
  }, [activeJobApplications, appState.selectedMethod, activeJob?.criteria]);

  // Candidatos que ya fueron designados y movidos a Los Mejores (Preseleccionados)
  const preselectedCandidates = useMemo(() => {
    return activeJobApplications.filter((a) => a.stage === 'preseleccionado');
  }, [activeJobApplications]);

  // Top-N: los N primeros del ranking por Score Embeddings (se resaltan en la tabla). El resto de los que siguen
  // en proceso queda «fuera del Top-N»: a ellos se les envía el correo de agradecimiento.
  const topIds = useMemo(() => idsTopN(activeJobApplications, appState.candidates, activeJob, appState.topN),
    [activeJobApplications, appState.candidates, activeJob, appState.topN]);
  const topPorPosicion = useMemo(() => idsTopNPorPosicion(activeJobApplications, appState.candidates, activeJob, appState.topN),
    [activeJobApplications, appState.candidates, activeJob, appState.topN]);
  const conEstrella = [...topIds].filter((id) => !topPorPosicion.has(id)).length;
  const ordenadas = useMemo(() => ordenarPorEmbeddings(activeJobApplications, appState.candidates, activeJob),
    [activeJobApplications, appState.candidates, activeJob]);
  const allBestApplications = useMemo(() => ordenadas.filter((app) => topIds.has(app.id)), [ordenadas, topIds]);
  const fueraDelTop = useMemo(() => ordenadas.filter((app) => enProceso(app) && !topIds.has(app.id)), [ordenadas, topIds]);
  const conScore = ordenadas.filter((app) => app.embeddingMatch?.criteriaVersion === activeJob?.criteriaVersion).length;
  const topNAvailability = { count: allBestApplications.length,
    hint: conScore ? `Los ${allBestApplications.length} primeros del ranking se resaltan en la tabla.` : 'Aún no hay Score Embeddings para este aviso.' };

  // Selección de conjunto según pestaña activa
  const displayedApplications = useMemo(() => {
    switch (activeTab) {
      case 'mejores':
        return allBestApplications;
      case 'preseleccionados': return preselectedCandidates;
      case 'contratados': return activeJobApplications.filter((a) => a.stage === 'contratado');
      case 'marcados':
        return activeJobApplications.filter((a) => selectedApplicationIds.includes(a.id));
      case 'revisados':
        return activeJobApplications.filter((a) => enRevision.porAplicacion.has(a.id));
      case 'no_continuan':
        return activeJobApplications.filter((a) => a.stage === 'no_continua');
      case 'todos':
        return activeJobApplications;
      case 'en_proceso':
      default:
        return activeJobApplications.filter((a) => a.stage !== 'no_continua' && a.stage !== 'contratado');
    }
  }, [activeTab, activeJobApplications, allBestApplications, selectedApplicationIds, preselectedCandidates, enRevision.porAplicacion]);

  // Pestañas con conteos sincronizados en tiempo real
  const candidateTabs: TabItem[] = [
    {
      id: 'en_proceso',
      label: 'En proceso',
      count: metrics.totalActive,
    },
    {
      id: 'mejores',
      label: 'Top-N',
      count: allBestApplications.length,
    },
    { id: 'preseleccionados', label: 'Preseleccionados', count: preselectedCandidates.length },
    {
      id: 'marcados',
      label: 'Marcados',
      count: selectedApplicationIds.length,
    },
    {
      id: 'revisados',
      label: 'Revisados',
      count: enRevision.porAplicacion.size,
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
    const topIds = allBestApplications.map((a) => a.id);
    if (topIds.length === 0) {
      showToast(topNAvailability.hint, 'info');
      return;
    }
    selectAllApplications(topIds);
    setActiveTab('mejores');
    showToast(`Se marcaron los ${topIds.length} primeros del ranking.`, 'info');
  };

  // Pasa todo el Top-N que sigue en «Postulado» a Preseleccionados: los marca y abre la confirmación de avance
  const topPorPreseleccionar = allBestApplications.filter((app) => app.stage === 'postulado');
  const handlePreseleccionarTopN = () => {
    if (!topPorPreseleccionar.length) return;
    selectAllApplications(topPorPreseleccionar.map((app) => app.id));
    setIsAdvanceModalOpen(true);
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
  const canAdvanceMarked = markedApps.length > 0 && markedApps.every(app => puedeAvanzar(app, appState.selectedMethod, topIds));
  const bulkReleaseApplications = activeJobApplications.filter(app => bulkReleaseIds?.includes(app.id));

  // Exportación del ranking a Excel: todo, Top-N, fuera del Top-N (agradecimiento) o marcados
  const [exportando, setExportando] = useState(false);
  const exportar = async (alcance: AlcanceExport) => {
    if (!activeJob) return;
    const conjunto = alcance === 'top' ? allBestApplications : alcance === 'fuera' ? fueraDelTop
      : alcance === 'marcados' ? ordenadas.filter((a) => selectedApplicationIds.includes(a.id)) : ordenadas;
    if (!conjunto.length) { showToast('No hay candidatos para exportar en esta opción.', 'warning'); return; }
    setExportando(true);
    try {
      const archivo = await exportarRankingExcel({ job: activeJob, ordenadas: conjunto, candidates: appState.candidates, topIds, alcance, rankingCompleto: ordenadas });
      showToast(`Excel descargado: ${archivo} (${conjunto.length} candidatos).`, 'success');
    } catch (error) {
      console.error(error);
      showToast('No se pudo generar el Excel. Inténtalo de nuevo.', 'error');
    } finally {
      setExportando(false);
    }
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
      {/* Aviso; a su derecha, candidatos activos y Top-N. Debajo, el aviso completo en un desplegable */}
      <ActiveJobBanner conDetalle aside={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="ranking-resumen">
          <div className="ranking-dato">
            <span>Candidatos activos</span>
            <strong className="tabular-nums">{metrics.totalActive}</strong>
          </div>
          <div className="ranking-dato" title="Los N primeros del ranking más los que marques con estrella. Se resaltan en la tabla; al resto se le envía el correo de agradecimiento.">
            <span>Top-N</span>
            <strong className="tabular-nums" aria-label="Total en el Top-N">{topIds.size}</strong>
            <div className="topn-control">
              <small>primeros</small>
              <button type="button" className="focus-ring" aria-label="Reducir Top-N" onClick={() => setTopN(appState.topN - 1)}><Minus size={12} /></button>
              <input type="number" aria-label="Cantidad Top-N" min={1} value={appState.topN} onChange={(e) => setTopN(parseInt(e.target.value) || 1)} />
              <button type="button" className="focus-ring" aria-label="Aumentar Top-N" onClick={() => setTopN(appState.topN + 1)}><Plus size={12} /></button>
            </div>
            <small>{conEstrella ? `+${conEstrella} con estrella · ` : ''}{fueraDelTop.length} fuera del Top-N</small>
          </div>
        </div>
          {/* Debajo de los recuadros, a todo su ancho, para que conserven su tamaño */}
          <Button variant="primary" size="sm" icon={<UserCheck size={14} />} style={{ justifyContent: 'center' }}
            disabled={!topPorPreseleccionar.length || activeJob.status !== 'activa'}
            onClick={handlePreseleccionarTopN}
            title={topPorPreseleccionar.length ? 'Revisar y confirmar el paso de todo el Top-N a Preseleccionados' : 'Todo el Top-N ya está en Preseleccionados o en una etapa posterior'}>
            Pasar Top-N a Preseleccionados ({topPorPreseleccionar.length})
          </Button>
        </div>
      } />

      {/* Exportación del ranking a Excel (franja compacta) */}
      <div className="export-franja">
        <span><FileSpreadsheet size={16} style={{ color: 'var(--status-verified-text)' }} /> Exportar ranking a Excel:</span>
        <Button variant="ghost" size="sm" disabled={exportando} onClick={() => exportar('todos')}>Todo ({ordenadas.length})</Button>
        <Button variant="ghost" size="sm" disabled={exportando} onClick={() => exportar('top')}>Top-N ({allBestApplications.length})</Button>
        <Button variant="ghost" size="sm" disabled={exportando} onClick={() => exportar('fuera')}
          title="Lista con correo de quienes no pasan a la siguiente ronda, para el correo de agradecimiento">
          Fuera del Top-N · agradecimiento ({fueraDelTop.length})
        </Button>
        {exportando && <span style={{ color: 'var(--text-muted)' }}>Generando…</span>}
      </div>

      {/* Pestañas con significado claro */}
      <div style={{ marginBottom: '1rem' }}>
        <Tabs tabs={candidateTabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as typeof activeTab)} />
        {(activeTab === 'marcados' || activeTab === 'revisados') && <p style={{ marginTop: '0.6rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {activeTab === 'revisados' ? 'Revisados: marca compartida con todo el equipo. Marcados: selección de casillas de tu sesión.' : 'Marcados: selección de casillas de tu sesión. Revisados: marca compartida con todo el equipo.'}
        </p>}
        {enRevision.error && <p role="alert" style={{ marginTop: '0.6rem', fontSize: '0.8125rem', color: 'var(--status-failed-text)' }}>No se pudieron cargar las marcas de revisados: {enRevision.error}</p>}
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
              onClick={() => exportar('marcados')}
              title="Descargar solo los candidatos marcados en Excel"
            >
              Exportar Excel ({selectedApplicationIds.length})
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


      {/* Tabla central de candidatos */}
      {!activeJobApplications.length && <div className="import-card" role="status">
        <p style={{ marginBottom: '.75rem' }}>{activeJob.bumeran ? 'Los candidatos se incorporan desde Bumeran. Si aún no aparecen, consulta el estado de sincronización y vuelve a cargar los datos.' : 'Esta convocatoria todavía no tiene candidatos. Importa un CSV o Excel para empezar.'}</p>
        {!activeJob.bumeran && <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCurrentView('agregar_archivos')}>Importar perfiles</Button>}
      </div>}
      <CandidateTable
        applications={displayedApplications}
        enRevision={enRevision}
        topIds={topIds}
        topPorPosicion={topPorPosicion}
        ordenRanking={ordenadas}
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
        topIds={topIds}
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
