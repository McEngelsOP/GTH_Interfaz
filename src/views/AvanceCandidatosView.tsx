import { useEffect, useMemo, useRef, useState } from 'react';
import { Kanban, Search, Mail, Calendar, Settings, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Button } from '../components/common/Button.tsx';
import { WorkflowCommunicationModal } from '../components/modals/WorkflowCommunicationModal.tsx';
import { embeddingVigente, idsTopN, ordenarPorEmbeddings } from '../services/rankingEmbeddings.ts';
import { formatEmbeddingScore } from '../services/embeddingMatching.ts';
import { pipelineStage, PIPELINE_STAGES, type WorkflowAction, workflowCandidateId } from '../services/sharedWorkflow.ts';
import { prepararCorreoMultitest } from '../services/emailComposition.ts';
import { supabase } from '../services/supabase.ts';
import type { Stage } from '../types/index.ts';
import '../styles/workflow.css';

type MultitestConfig = { enlace: string; plazo: string };
const EMPTY_CONFIG = { enlace: '', plazo: '' };
function loadMultitest(key: string): MultitestConfig {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return typeof value?.enlace === 'string' && typeof value?.plazo === 'string' ? value : EMPTY_CONFIG; }
  catch { return EMPTY_CONFIG; }
}
export function AvanceCandidatosView() {
  const { activeJob, activeJobApplications, appState, workflow, handleMoveStage, showToast, setTopN } = useApp();
  const [stage, setStage] = useState<Stage>('postulado');
  const [onlyTop, setOnlyTop] = useState(false);
  const [query, setQuery] = useState('');
  const search = useRef<HTMLInputElement>(null);
  const [action, setAction] = useState<WorkflowAction | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<MultitestConfig>(EMPTY_CONFIG);
  const [draft, setDraft] = useState<MultitestConfig>(EMPTY_CONFIG);
  const [configError, setConfigError] = useState('');
  const [moving, setMoving] = useState<string | null>(null);
  const movingRef = useRef(false);
  const configKey = `GTH_MULTITEST_${activeJob?.bumeran?.avisoId || activeJob?.id}`;
  useEffect(() => {
    const stored = loadMultitest(configKey); setConfig(stored); setDraft(stored);
    setStage('postulado'); setQuery(''); setOnlyTop(false); setAction(null); setConfigOpen(false); setConfigError('');
  }, [configKey]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k' || document.querySelector('[role="dialog"]')) return;
      event.preventDefault(); setStage('postulado');
      window.setTimeout(() => { search.current?.focus(); search.current?.select(); }, 0);
    };
    window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut);
  }, []);
  const candidates = useMemo(() => new Map(appState.candidates.map(c => [c.id, c])), [appState.candidates]);
  const ranked = useMemo(() => ordenarPorEmbeddings(activeJobApplications, appState.candidates, activeJob), [activeJobApplications, appState.candidates, activeJob]);
  const top = useMemo(() => idsTopN(activeJobApplications, appState.candidates, activeJob, appState.topN), [activeJobApplications, appState.candidates, activeJob, appState.topN]);
  const position = new Map(ranked.map((a, i) => [a.id, i + 1]));
  const inStage = ranked.filter(a => pipelineStage(a.stage) === stage);

  const rejected = ranked.filter(a => a.stage === 'postulado' || a.stage === 'no_continua');
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === stage);
  const canMove = activeJob?.status === 'activa' && (!supabase || workflow.ready);
  const move = async (id: string, target: Stage) => {
    if (movingRef.current || !canMove) return;
    movingRef.current = true; setMoving(id);
    try { await handleMoveStage(id, target, 'Movido desde el tablero de avance'); }
    finally { movingRef.current = false; setMoving(null); }
  };
  const saveConfig = () => {
    try {
      prepararCorreoMultitest({ puesto: activeJob!.title, ...draft });
      localStorage.setItem(configKey, JSON.stringify({ enlace: draft.enlace.trim(), plazo: draft.plazo.trim() }));
      setConfig({ enlace: draft.enlace.trim(), plazo: draft.plazo.trim() }); setConfigError(''); setConfigOpen(false);
      showToast('Configuración de Multitest guardada para esta convocatoria en este navegador.', 'success');
    } catch (e) { setConfigError(e instanceof Error ? e.message : 'No se pudo guardar la configuración.'); }
  };
  if (!activeJob) return null;
  const communicationAllowed = workflow.ready && activeJob.status === 'activa';
  return <div className="workflow-page">
    <ActiveJobBanner aside={<div className="workflow-banner-actions" aria-label={`Acciones de ${PIPELINE_STAGES[currentIndex].label}`}>
      <div className="workflow-banner-context"><span>{PIPELINE_STAGES[currentIndex].label}</span>
        {supabase && <Button size="sm" variant="ghost" aria-label="Actualizar avance" title="Actualizar avance" icon={<RefreshCw size={15} />} onClick={() => void workflow.reload()} />}
      </div>
        {stage === 'postulado' && <div className="workflow-filters">
          <div className="workflow-segment" aria-label="Mostrar candidatos">
            <button className="focus-ring" aria-pressed={!onlyTop} onClick={() => setOnlyTop(false)}>Todos</button>
            <button className="focus-ring" aria-pressed={onlyTop} title="Mismo Top-N del ranking, incluidos los perfiles añadidos con la estrella" onClick={() => setOnlyTop(true)}>Top-N</button>
          </div>
          {onlyTop && <label className="workflow-topn">N<input aria-label="Cantidad Top-N" type="number" min={1} max={500} value={appState.topN} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= 500) setTopN(n); }} /></label>}
          <label className="workflow-search"><Search size={16} aria-hidden="true" /><input ref={search} type="search" aria-label="Buscar candidato por nombre" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre" /><kbd>Ctrl K</kbd></label>
        </div>}
        {stage === 'preseleccionado' && <div className="workflow-buttons">
          <Button size="sm" variant="ghost" icon={<Settings size={15} />} onClick={() => { setDraft(config); setConfigOpen(!configOpen); }}>Configurar Multitest</Button>
          <Button size="sm" icon={<Mail size={15} />} disabled={!communicationAllowed || !inStage.length || !config.enlace || !config.plazo} onClick={() => setAction('multitest')}>Enviar Multitest</Button>
        </div>}
        {stage === 'en_entrevista' && <div className="workflow-buttons">
          <Button size="sm" variant="outline" icon={<Mail size={15} />} disabled={!communicationAllowed || !rejected.length} onClick={() => setAction('agradecimiento')}>Agradecer a no seleccionados</Button>
          <Button size="sm" icon={<Calendar size={15} />} disabled={!communicationAllowed || !inStage.length} onClick={() => setAction('entrevista')}>Agendar entrevista</Button>
        </div>}
      {stage === 'preseleccionado' && !config.enlace && !configOpen && <p className="workflow-banner-help">Configura el enlace y plazo de Multitest para habilitar la invitación.</p>}
    </div>} />
    <header className="workflow-header">
      <div><h2><Kanban size={22} />Avance de candidatos</h2><p>Selecciona una columna para cambiar las acciones del banner. Arrastra tarjetas o usa los botones para avanzar.</p></div>
    </header>
    {supabase && !workflow.ready && <div className="workflow-notice" role="status">{workflow.error || 'Sincronizando las decisiones del equipo…'} Las acciones compartidas estarán disponibles al sincronizar.</div>}
    {!supabase && <div className="workflow-notice">Vista local. Conecta Supabase y activa el SQL de avance compartido para habilitar comunicaciones con protección entre colaboradores.</div>}
      {stage === 'preseleccionado' && configOpen && <section className="workflow-config" aria-label="Configuración de Multitest">
        <h3>Configura tu invitación a Multitest</h3><p>Indica el enlace y el plazo reales. Se guardan por convocatoria en este navegador; podrás revisar el mensaje antes de enviarlo.</p>
        <div className="workflow-form-grid">
          <label>Enlace de Multitest<input type="url" value={draft.enlace} placeholder="https://" maxLength={2000} onChange={e => setDraft(prev => ({ ...prev, enlace: e.target.value }))} /></label>
          <label>Plazo para rendir las pruebas<input value={draft.plazo} placeholder="Ej.: hasta el 25 de octubre, 18:00 (Perú)" maxLength={300} onChange={e => setDraft(prev => ({ ...prev, plazo: e.target.value }))} /></label>
        </div>
        {configError && <p role="alert">{configError}</p>}
        <div className="workflow-buttons"><Button size="sm" onClick={saveConfig}>Guardar configuración</Button><Button size="sm" variant="ghost" onClick={() => setConfigOpen(false)}>Cancelar</Button></div>
      </section>}

    <div className="workflow-board" role="region" aria-label="Tablero de avance de candidatos" tabIndex={0}>
      <div className="workflow-kanban">
        <nav className="workflow-stages" aria-label="Etapas del proceso">
          {PIPELINE_STAGES.map(item => <button key={item.id} className="workflow-stage focus-ring" aria-pressed={stage === item.id}
            aria-controls={`workflow-column-${item.id}`}
            onClick={() => { setStage(item.id); setAction(null); }}
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) { setStage(item.id); void move(id, item.id); } }}>
            <span className="workflow-stage-title">{item.label}<strong>{ranked.filter(a => pipelineStage(a.stage) === item.id).length}</strong></span>
            <span className="workflow-stage-description">{item.desc}</span>
          </button>)}
        </nav>
        {PIPELINE_STAGES.map((stageItem, columnIndex) => {
          const columnApps = ranked.filter(a => pipelineStage(a.stage) === stageItem.id);
          const stageApps = stageItem.id === 'postulado' ? columnApps.filter(a => (!onlyTop || top.has(a.id)) && (candidates.get(a.candidateId)?.name || '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) : columnApps;
          return <section key={stageItem.id} id={`workflow-column-${stageItem.id}`} className="workflow-column" aria-label={`Candidatos en ${stageItem.label}`} data-selected={stage === stageItem.id}
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) { setStage(stageItem.id); void move(id, stageItem.id); } }}>
            {stageItem.id === 'postulado' && (onlyTop || query.trim()) && <p className="workflow-column-count">{stageApps.length} de {columnApps.length} candidatos</p>}
            <div className="workflow-candidates">
        {stageApps.map(app => {
          const candidate = candidates.get(app.candidateId);
          const score = embeddingVigente(app, activeJob);
          const records = candidate ? workflow.actions.filter(a => a.id_postulante === workflowCandidateId(candidate)) : [];
          const locked = records.some(a => a.estado === 'preparado');
          return <article className="workflow-candidate" aria-label={candidate?.name || 'Candidato'} key={app.id} draggable={canMove && !locked && !moving}
            onDragStart={e => { e.dataTransfer.setData('text/plain', app.id); e.dataTransfer.effectAllowed = 'move'; }}>
            <div className="workflow-candidate-info">
              <h4 className="workflow-name">{candidate?.name || 'Candidato'}</h4>
              <p>{candidate?.currentTitle || 'Sin profesión registrada'}{candidate?.currentCompany && <> · <strong>{candidate.currentCompany}</strong></>}</p>
            </div>
            <div className="workflow-score"><strong>{score ? formatEmbeddingScore(score.score) : 'Pendiente'}</strong><small>· #{position.get(app.id)} del ranking</small></div>
            <div className="workflow-card-actions">
              <Button size="sm" variant="ghost" aria-label={`Volver de etapa a ${candidate?.name}`} title={locked ? 'Primero confirma o libera la comunicación preparada' : columnIndex > 0 ? `Volver a ${PIPELINE_STAGES[columnIndex - 1].label}` : 'Primera etapa'} disabled={!canMove || !!moving || locked || columnIndex === 0 || stageItem.id === 'contratado'} onClick={() => void move(app.id, PIPELINE_STAGES[columnIndex - 1].id)} icon={<ChevronLeft size={15} />}>Atrás</Button>
              <Button size="sm" variant="outline" aria-label={`Avanzar de etapa a ${candidate?.name}`} title={locked ? 'Primero confirma o libera la comunicación preparada' : columnIndex < 3 ? `Avanzar a ${PIPELINE_STAGES[columnIndex + 1].label}` : 'Etapa final'} disabled={!canMove || !!moving || locked || columnIndex === 3} onClick={() => void move(app.id, PIPELINE_STAGES[columnIndex + 1].id)} iconPosition="right" icon={<ChevronRight size={15} />}>{moving === app.id ? 'Guardando…' : 'Avanzar'}</Button>
            </div>
          </article>;
        })}
        {!stageApps.length && <div className="workflow-empty"><Search size={24} /><h4>{columnApps.length ? 'No hay perfiles con estos filtros' : 'Sin candidatos en esta etapa'}</h4><p>{columnApps.length ? 'Prueba otro nombre o selecciona Todos.' : 'Los perfiles aparecerán aquí cuando avancen en el proceso.'}</p>{columnApps.length > 0 && <Button size="sm" variant="ghost" onClick={() => { setOnlyTop(false); setQuery(''); }}>Limpiar filtros</Button>}</div>}
            </div>
          </section>;
        })}
      </div>
    </div>
    {ranked.some(a => a.stage === 'no_continua') && <p className="workflow-inline-help">{ranked.filter(a => a.stage === 'no_continua').length} postulaciones no continúan. Sus perfiles se conservan en «Candidatos y ranking».</p>}
    {action && <WorkflowCommunicationModal key={`${activeJob.id}-${action}`} action={action} job={activeJob} applications={action === 'agradecimiento' ? rejected : inStage} multitest={config} onClose={() => setAction(null)} />}
  </div>;
}
