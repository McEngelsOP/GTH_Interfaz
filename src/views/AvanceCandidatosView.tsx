import React, { useState, useMemo } from 'react';
import { IS_STAGE_ONE } from '../config/edition.ts';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Stage, Application, Candidate } from '../types/index.ts';
import { embeddingVigente, ordenarPorEmbeddings } from '../services/rankingEmbeddings.ts';
import { formatEmbeddingScore } from '../services/embeddingMatching.ts';
import { AgradecimientoMasivoModal } from '../components/modals/AgradecimientoMasivoModal.tsx';
import { validateStageTransition } from '../services/workflow.ts';
import { Badge } from '../components/common/Badge.tsx';
import { Button } from '../components/common/Button.tsx';
import {
  ChevronRight,
  ChevronLeft,
  Eye,
  Kanban,
  CheckCircle,
  AlertCircle,
  Database,
  ArrowRight,
  Mail,
} from 'lucide-react';

const MOTIVO_TABLERO = 'Movido desde el tablero de avance';

const STAGES_ORDER: { id: Stage; label: string; desc: string }[] = [
  { id: 'postulado', label: 'Postulado', desc: 'Recepción inicial y matching' },
  { id: 'preseleccionado', label: 'Preseleccionado', desc: 'Filtro curricular aprobado' },
  { id: 'en_entrevista', label: 'En entrevista', desc: 'Sesión con comité evaluador' },
  { id: 'en_evaluacion', label: 'En evaluación', desc: 'Evaluación técnica / clase modelo' },
  { id: 'en_oferta', label: 'En oferta', desc: 'Propuesta económica enviada' },
  { id: 'contratado', label: 'Contratado', desc: 'Incorporación formal a ESAN' },
];

export function AvanceCandidatosView() {
  const {
    activeJob,
    activeJobApplications,
    appState,
    openCandidateDrawer,
    setCurrentView,
    showToast,
    handleMoveStage,
  } = useApp();

  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [agradecimientoAbierto, setAgradecimientoAbierto] = useState(false);

  const candidateMap = useMemo(() => {
    const map = new Map<string, Candidate>();
    appState.candidates.forEach((c) => map.set(c.id, c));
    return map;
  }, [appState.candidates]);

  // Posición en el ranking por Score Embeddings, la misma que muestra la tabla de «Candidatos y ranking»
  const posicion = useMemo(() => new Map(ordenarPorEmbeddings(activeJobApplications, appState.candidates, activeJob)
    .map((app, i) => [app.id, i + 1])), [activeJobApplications, appState.candidates, activeJob]);

  // Agrupar postulaciones por etapa activa
  const columns = useMemo(() => {
    const groups: Record<Stage, Application[]> = {
      postulado: [],
      preseleccionado: [],
      en_entrevista: [],
      en_evaluacion: [],
      en_oferta: [],
      contratado: [],
      no_continua: [],
    };

    activeJobApplications.forEach((app) => {
      if (groups[app.stage]) {
        groups[app.stage].push(app);
      }
    });

    return groups;
  }, [activeJobApplications]);

  const requestMoveStage = (appId: string, targetStage: Stage) => {
    const app = activeJobApplications.find((a) => a.id === appId);
    if (!app || app.stage === targetStage) return;
    const error = validateStageTransition(app, targetStage, appState.selectedMethod);
    if (error) { showToast(error, 'warning'); return; }
    handleMoveStage(app.id, targetStage, MOTIVO_TABLERO);
  };

  const handleNextStage = (app: Application) => {
    const currentIndex = STAGES_ORDER.findIndex((s) => s.id === app.stage);
    if (currentIndex >= 0 && currentIndex < STAGES_ORDER.length - 1) {
      requestMoveStage(app.id, STAGES_ORDER[currentIndex + 1].id);
    }
  };

  const handlePrevStage = (app: Application) => {
    const currentIndex = STAGES_ORDER.findIndex((s) => s.id === app.stage);
    if (currentIndex > 0) {
      requestMoveStage(app.id, STAGES_ORDER[currentIndex - 1].id);
    }
  };

  // Preseleccionados o más allá; el resto (postulados y los que no continúan) recibe el agradecimiento
  const seleccionados = activeJobApplications.length - columns.postulado.length - columns.no_continua.length;
  const noSeleccionados = [...columns.postulado, ...columns.no_continua];

  if (!activeJob) return null;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <ActiveJobBanner />

      {/* Cabecera del Tablero de Etapas */}
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
            <Kanban size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Avance de Candidatos
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Flujo visual por las 6 etapas del proceso de selección. Mueva tarjetas o use los botones de avance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
        {/* Con preseleccionados: correo de agradecimiento a todos los que no fueron seleccionados */}
        {seleccionados > 0 && (
          <Button variant="primary" size="sm" icon={<Mail size={14} />} onClick={() => setAgradecimientoAbierto(true)}
            disabled={!noSeleccionados.length}
            title="Abrir Gmail con el mensaje de agradecimiento para quienes no están en Preseleccionado ni en una etapa posterior">
            Agradecer a no seleccionados ({noSeleccionados.length})
          </Button>
        )}

        {/* Acceso a perfiles liberados que no continúan */}
        {columns.no_continua.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: 'var(--bg-base)',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8125rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              {columns.no_continua.length} postulaciones liberadas:
            </span>
            {!IS_STAGE_ONE && <Button
              variant="outline"
              size="sm"
              icon={<Database size={13} />}
              onClick={() => setCurrentView('banco_talento')}
            >
              Ver en Banco
            </Button>}
          </div>
        )}
        </div>
      </div>

      {/* Contenedor del Tablero Kanban con Scroll Horizontal Fluido */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(240px, 1fr))',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
        }}
      >
        {STAGES_ORDER.map((stageItem, stageIdx) => {
          const stageApps = columns[stageItem.id] || [];

          return (
            <div
              key={stageItem.id}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={(event) => {
                event.preventDefault();
                const appId = event.dataTransfer.getData('text/plain') || draggedAppId;
                if (appId) requestMoveStage(appId, stageItem.id);
                setDraggedAppId(null);
              }}
              style={{
                backgroundColor: 'var(--bg-base)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '520px',
                maxHeight: '75vh',
              }}
            >
              {/* Cabecera de Columna */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stageItem.label}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {stageApps.length}
                    </Badge>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {stageItem.desc}
                  </span>
                </div>
              </div>

              {/* Lista de Tarjetas en la columna */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                {stageApps.length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      minHeight: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      padding: '1rem',
                    }}
                  >
                    Sin candidatos en esta etapa
                  </div>
                ) : (
                  stageApps.map((app) => {
                    const cand = candidateMap.get(app.candidateId);

                    return (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(event) => { event.dataTransfer.setData('text/plain', app.id); event.dataTransfer.effectAllowed = 'move'; setDraggedAppId(app.id); }}
                        onDragEnd={() => setDraggedAppId(null)}
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-default)',
                          boxShadow: 'var(--shadow-sm)',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          cursor: 'grab',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {/* Título de tarjeta y botón ver ficha */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <button
                            onClick={() => openCandidateDrawer(app)}
                            className="focus-ring"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: 'var(--primary-red)',
                            }}
                          >
                            {cand?.name || 'Candidato'}
                          </button>

                          <button
                            onClick={() => openCandidateDrawer(app)}
                            className="focus-ring"
                            title="Ver ficha técnica"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '0.15rem',
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        </div>

                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {cand?.currentTitle} · <strong>{cand?.currentCompany}</strong>
                        </span>

                        {/* Score Embeddings y posición en el ranking */}
                        <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                          title="Score Embeddings (similitud con los criterios del aviso) y posición en el ranking">
                          {embeddingVigente(app, activeJob)
                            ? <><strong style={{ color: 'var(--text-primary)' }}>{formatEmbeddingScore(embeddingVigente(app, activeJob)!.score)}</strong> · #{posicion.get(app.id)} del ranking</>
                            : 'Score Embeddings pendiente'}
                        </span>

                        {/* Botones de Navegación entre etapas (Accesibilidad / Móvil / Teclado) */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '0.45rem',
                            borderTop: '1px solid var(--border-subtle)',
                            marginTop: '0.25rem',
                          }}
                        >
                          <button
                            onClick={() => handlePrevStage(app)}
                            disabled={stageIdx === 0 || app.stage === 'contratado'}
                            className="focus-ring"
                            title={stageIdx > 0 ? `Volver a ${STAGES_ORDER[stageIdx - 1].label}` : undefined}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              background: 'transparent',
                              border: 'none',
                              color: stageIdx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                              cursor: stageIdx === 0 ? 'not-allowed' : 'pointer',
                              fontSize: '0.72rem',
                              padding: '0.2rem',
                              opacity: stageIdx === 0 ? 0.35 : 1,
                            }}
                          >
                            <ChevronLeft size={13} />
                            <span>Atrás</span>
                          </button>

                          <button
                            onClick={() => handleNextStage(app)}
                            disabled={stageIdx === STAGES_ORDER.length - 1}
                            className="focus-ring"
                            title={
                              stageIdx < STAGES_ORDER.length - 1
                                ? `Avanzar a ${STAGES_ORDER[stageIdx + 1].label}`
                                : undefined
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              background: 'transparent',
                              border: 'none',
                              color:
                                stageIdx === STAGES_ORDER.length - 1
                                  ? 'var(--text-muted)'
                                  : 'var(--primary-red)',
                              fontWeight: 600,
                              cursor: stageIdx === STAGES_ORDER.length - 1 ? 'not-allowed' : 'pointer',
                              fontSize: '0.72rem',
                              padding: '0.2rem',
                              opacity: stageIdx === STAGES_ORDER.length - 1 ? 0.35 : 1,
                            }}
                          >
                            <span>Avanzar</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      <AgradecimientoMasivoModal isOpen={agradecimientoAbierto} onClose={() => setAgradecimientoAbierto(false)}
        job={activeJob} noSeleccionados={noSeleccionados} candidates={candidateMap} />
    </div>
  );
}

