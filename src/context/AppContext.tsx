/* ==========================================================================
   TalentAI | GTHC · ESAN — Contexto Global de Estado y Acciones
   ========================================================================== */

import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import {
  AppStateData,
  JobPosting,
  Candidate,
  Application,
  EvaluationMethod,
  Criterion,
  EmailDraft,
  InterviewRecord,
  Stage,
} from '../types/index.ts';
import { supabase } from '../services/supabase.ts';
import { loadWorkflow, persistStageChanges, workflowCandidateId, type SharedAction } from '../services/sharedWorkflow.ts';
import { updateInternalComment } from '../services/internalComments.ts';
import { loadAppState } from '../services/storage.ts';
import { borrarEstado, guardarEstado } from '../services/persistence.ts';
import { advanceApplications, releaseApplication } from '../services/recruitmentRules.ts';
import { readRoute, routeHash } from '../services/navigation.ts';
import { createPendingApplication, hasValidCriteria, moveApplicationStage, releaseSelectedApplications, updateJobCriteria, validateStageTransition } from '../services/workflow.ts';
import { useTheme } from './useTheme.ts';
import { applyCandidateImport, ImportRow, ImportSummary } from '../services/candidateImport.ts';
import { applyPreparedEvaluation, recordEvaluationIssue, EvaluationError } from '../services/evaluationService.ts';
import type { PreparedEvaluation } from '../services/evaluationService.ts';
import type { EvaluationReply } from '../services/evaluationContract.ts';
import { reviewRequirement, updateEvaluationReference } from '../services/requirementReview.ts';
import type { RequirementStatus, EmbeddingMatch } from '../types/index.ts';
import { mergeBumeranJobs } from '../services/bumeranSync.ts';
import { guardarSueldoOfertado } from '../services/salarios.ts';
import { quitarAvisosNoVisibles, esSuperadmin, usePerfil } from '../services/permisos.ts';
import { embeddingVigente, enProceso, idsTopN } from '../services/rankingEmbeddings.ts';

export type ViewType =
  | 'convocatorias'
  | 'actualizacion_datos'
  | 'base_centralizada'
  | 'perfiles_puestos'
  | 'perfiles-puestos'
  | 'nueva_convocatoria'
  | 'nueva-convocatoria'
  | 'agregar_archivos'
  | 'agregar-archivos'
  | 'mejores_candidatos'
  | 'mejores-candidatos'
  | 'comparador'
  | 'avance_candidatos'
  | 'avance-candidatos'
  | 'banco_talento'
  | 'banco-talento'
  | 'criterios_evaluacion'
  | 'criterios-evaluacion'
  | 'historial_decisiones'
  | 'historial-decisiones'
  | 'resultados_proceso'
  | 'resultados-proceso'
  | 'resumen_general'
  | 'resumen-general'
  | 'ajustes_generales'
  | 'ajustes'
  | 'usuarios_permisos';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

/** Pestañas de «Ver perfil» que se pueden abrir directamente (CandidateDrawer). */
export type PestanaPerfil = 'perfil' | 'trayectoria' | 'postulaciones';

interface AppContextValue {
  appState: AppStateData;
  currentView: ViewType;
  activeJob: JobPosting | undefined;
  activeJobApplications: Application[];
  selectedApplicationIds: string[];
  selectedCandidateForDrawer: Application | null;
  candidateDrawerTab: PestanaPerfil;
  isAssistantOpen: boolean;
  toasts: ToastNotification[];
  // Navegación y vista
  setCurrentView: (view: ViewType) => void;
  setActiveJobPostingId: (jobId: string) => void;
  setActiveJobId: (jobId: string) => void;
  setSelectedMethod: (method: EvaluationMethod) => void;
  setTopN: (n: number) => void;
  // Selección de candidatos
  toggleApplicationSelection: (appId: string) => void;
  selectAllApplications: (appIds: string[]) => void;
  clearApplicationSelection: () => void;
  // Ficha drawer y asistente
  openCandidateDrawer: (app: Application | null, tab?: PestanaPerfil) => void;
  selectedCandidateId: string | null;
  setSelectedCandidateId: (id: string | null) => void;
  isCandidateDrawerOpen: boolean;
  setCandidateDrawerOpen: (open: boolean) => void;
  toggleAssistant: (open?: boolean) => void;
  isAssistantDrawerOpen: boolean;
  setAssistantDrawerOpen: (open: boolean) => void;
  // Apariencia
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
  setReducedMotion: (reduced: boolean) => void;
  // Notificaciones
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  // Acciones de negocio
  handleAdvanceApplications: (ids: string[], rejectOthers?: boolean, customMessage?: string) => Promise<boolean>;
  handleMoveStage: (appId: string, target: Stage, reason: string) => Promise<void>;
  handleSaveToTalentPool: (candidateId: string) => void;
  handleAdvanceSelected: (rejectOthers?: boolean, customMessage?: string) => Promise<boolean>;
  handleReleaseApplication: (appId: string, reason?: string) => Promise<boolean>;
  handleReleaseApplications: (ids: string[], reason: string) => Promise<boolean>;
  workflow: { ready: boolean; error: string; actions: SharedAction[]; userId: string; reload: () => Promise<void> };
  handleAddNote: (appId: string, noteText: string) => void;
  handleSaveInternalComment: (appId: string, text: string, bandera?: 'roja' | 'verde' | null) => void;
  handleScheduleInterview: (
    appId: string,
    interviewData: { title: string; scheduledAt: string; locationOrLink: string; notes?: string }
  ) => void;
  handleSaveEmailDraft: (draft: {
    applicationId: string;
    to: string;
    cc?: string;
    templateType: 'personal' | 'avance' | 'cierre' | 'entrevista';
    lang: 'es' | 'en';
    subject: string;
    body: string;
  }) => void;
  handleUpdateJobCriteria: (jobId: string, criteria: Criterion[]) => void;
  handleActivateJobPosting: (jobId: string) => void;
  handleCreateJobPosting: (newJob: JobPosting) => Promise<void>;
  handleApplyEvaluation: (prepared: PreparedEvaluation, reply: EvaluationReply, hash: string) => void;
  handleEvaluationIssue: (applicationId: string, error: EvaluationError) => void;
  handleUpdateEvaluationReference: (jobId: string, reference: string) => void;
  handleReviewRequirement: (applicationId: string, status: RequirementStatus, justification: string) => void;
  handleImportCandidates: (jobId: string, rows: ImportRow[]) => ImportSummary;
  handleApplyEmbeddingRanking: (results: Record<string, EmbeddingMatch>) => void;
  handleToggleTopNExtra: (applicationId: string) => void;
  handleSyncBumeranJobs: (jobs: JobPosting[], visibles?: Set<string>) => void;
  handleSyncBumeranCandidates: (jobId: string, rows: ImportRow[]) => void;
  handleLinkCandidateToJob: (candidateId: string, targetJobId: string) => void;
  handleQuickAdvanceToBest: (applicationId: string) => void;
  handleRevertToPostulado: (applicationId: string) => void;
  handleResetData: () => void;
  resetToInitialState: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children, initialState }: { children: ReactNode; initialState?: AppStateData }) {
  const perfilActual = usePerfil();
  const creandoConvocatoria = useRef(false);
  const [appState, setAppState] = useState<AppStateData>(() => {
    const state = initialState ?? loadAppState();
    const job = state.jobPostings.find((j) => j.id === readRoute(window.location.hash).jobId);
    return job ? { ...state, activeJobPostingId: job.id, topN: job.id === state.activeJobPostingId ? state.topN : job.defaultTopN } : state;
  });
  const [currentView, setCurrentViewState] = useState<ViewType>(() => readRoute(window.location.hash).view);
  const setCurrentView = (view: ViewType) => {
    const normalized = readRoute(`#view=${view}`).view;
    setCurrentViewState(normalized);
    const hash = routeHash(normalized, appState.activeJobPostingId);
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
  };
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [drawerApplicationId, setDrawerApplicationId] = useState<string | null>(null);
  const [candidateDrawerTab, setCandidateDrawerTab] = useState<PestanaPerfil>('perfil');
  const selectedCandidateForDrawer = appState.applications.find((app) => app.id === drawerApplicationId) || null;
  const setSelectedCandidateForDrawer = (app: Application | null) => setDrawerApplicationId(app?.id || null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const sync = () => {
      const route = readRoute(window.location.hash);
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      params.set('view', route.view);
      window.history.replaceState(null, '', `#${params}`);
      setCurrentViewState(route.view);
      setAppState((prev) => {
        const job = prev.jobPostings.find((j) => j.id === route.jobId);
        return job && job.id !== prev.activeJobPostingId ? { ...prev, activeJobPostingId: job.id, topN: job.defaultTopN } : prev;
      });
      setSelectedApplicationIds([]); setDrawerApplicationId(null);
    };
    window.addEventListener('hashchange', sync); window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  useEffect(() => { window.history.replaceState(null, '', routeHash(currentView, appState.activeJobPostingId)); }, [currentView, appState.activeJobPostingId]);

  // Sincronizar persistencia ante cualquier cambio en appState
  useEffect(() => {
    guardarEstado(appState).then((res) => {
      if (res.warning) showToast(res.warning, 'warning');
    });
  }, [appState]);

  useTheme(appState.theme, appState.reducedMotion);

  // Notificaciones Toast
  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4200);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Convocatoria activa y sus postulaciones
  const activeJob = useMemo(() => {
    return appState.jobPostings.find((j) => j.id === appState.activeJobPostingId);
  }, [appState.jobPostings, appState.activeJobPostingId]);

  const activeJobApplications = useMemo(() => {
    return appState.applications.filter((a) => a.jobPostingId === appState.activeJobPostingId);
  }, [appState.applications, appState.activeJobPostingId]);

  // Cambiar convocatoria activa
  const setActiveJobPostingId = (jobId: string) => {
    const job = appState.jobPostings.find((j) => j.id === jobId);
    if (!job) return;
    setAppState((prev) => ({ ...prev, activeJobPostingId: jobId, topN: job.defaultTopN }));
    setSelectedApplicationIds([]); // Limpiar marcas de otra convocatoria
    setSelectedCandidateForDrawer(null);
  };

  const setSelectedMethod = (method: EvaluationMethod) => {
    setAppState((prev) => ({ ...prev, selectedMethod: method }));
  };

  const setTopN = (n: number) => {
    const val = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
    setAppState((prev) => ({ ...prev, topN: val }));
  };

  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    setAppState((prev) => ({ ...prev, theme }));
    showToast(`Tema configurado en: ${theme === 'dark' ? 'Oscuro' : theme === 'light' ? 'Claro' : 'Según mi equipo'}`, 'info');
  };

  const setReducedMotion = (reduced: boolean) => {
    setAppState((prev) => ({ ...prev, reducedMotion: reduced }));
    showToast(reduced ? 'Animaciones reducidas activadas' : 'Animaciones normales activadas', 'info');
  };

  // Manejo de marcas de selección
  const toggleApplicationSelection = (appId: string) => {
    setSelectedApplicationIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const selectAllApplications = (appIds: string[]) => {
    const allowed = new Set(activeJobApplications.map((app) => app.id));
    setSelectedApplicationIds([...new Set(appIds)].filter((id) => allowed.has(id)));
  };

  const clearApplicationSelection = () => {
    setSelectedApplicationIds([]);
  };

  const openCandidateDrawer = (app: Application | null, tab: PestanaPerfil = 'perfil') => {
    setCandidateDrawerTab(tab);
    setSelectedCandidateForDrawer(app);
  };

  const toggleAssistant = (open?: boolean) => {
    setIsAssistantOpen((prev) => (open !== undefined ? open : !prev));
  };

  const stateRef = useRef(appState);
  stateRef.current = appState;
  const workflowBusy = useRef(false);
  const workflowRequest = useRef(0);
  const [workflowReady, setWorkflowReady] = useState(false);
  const [workflowError, setWorkflowError] = useState('');
  const [workflowActions, setWorkflowActions] = useState<SharedAction[]>([]);
  const [workflowUser, setWorkflowUser] = useState('');
  const [workflowLoadedJob, setWorkflowLoadedJob] = useState('');
  const workflowJob = activeJob?.id;
  const workflowIds = activeJobApplications.map(app => app.id).sort().join('|');
  const reloadWorkflow = useCallback(async () => {
    if (!supabase || workflowBusy.current) return;
    const snapshot = stateRef.current;
    const job = snapshot.jobPostings.find(j => j.id === workflowJob);
    if (!job) return;
    const request = ++workflowRequest.current;
    try {
      const { data } = await supabase.auth.getUser();
      const result = await loadWorkflow(job, snapshot.applications.filter(a => a.jobPostingId === job.id), snapshot.candidates);
      if (request !== workflowRequest.current || workflowBusy.current || stateRef.current.activeJobPostingId !== workflowJob) return;
      const stages = new Map(result.stages.map(row => [row.id_postulante, row.etapa]));
      const people = new Map(snapshot.candidates.map(c => [c.id, c]));
      setAppState(prev => {
        let changed = false;
        const applications = prev.applications.map(app => {
          const person = people.get(app.candidateId);
          const stage = app.jobPostingId === job.id && person ? stages.get(workflowCandidateId(person)) : undefined;
          if (!stage || stage === app.stage) return app;
          changed = true; return { ...app, stage };
        });
        return changed ? { ...prev, applications } : prev;
      });
      setWorkflowActions(result.actions); setWorkflowUser(data.user?.id || ''); setWorkflowLoadedJob(job.id);
      setWorkflowReady(true); setWorkflowError('');
    } catch (error) {
      if (request !== workflowRequest.current) return;
      setWorkflowReady(false); setWorkflowError(error instanceof Error ? error.message : 'No se pudo sincronizar el avance.');
    }
  }, [workflowJob, workflowIds]);
  const reloadWorkflowRef = useRef(reloadWorkflow);
  reloadWorkflowRef.current = reloadWorkflow;
  useEffect(() => {
    setWorkflowReady(false); setWorkflowActions([]); setWorkflowError('');
    void reloadWorkflow();
    const timer = window.setInterval(() => void reloadWorkflow(), 15000);
    const focus = () => void reloadWorkflow();
    window.addEventListener('focus', focus);
    return () => { ++workflowRequest.current; window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [reloadWorkflow]);

  const commitWorkflowState = async (next: AppStateData) => {
    if (workflowBusy.current) { showToast('Espera a que termine la acción anterior.', 'warning'); return false; }
    const before = appState;
    const changes = next.applications.filter(app => before.applications.some(old => old.id === app.id && old.stage !== app.stage));
    if (!changes.length) return false;
    const job = before.jobPostings.find(j => j.id === changes[0].jobPostingId);
    if (!job) return false;
    workflowBusy.current = true; ++workflowRequest.current;
    try {
      await persistStageChanges(job, before.applications.filter(a => a.jobPostingId === job.id), next.applications.filter(a => a.jobPostingId === job.id), before.candidates);
      const updates = new Map(changes.map(app => [app.id, app]));
      const additions = <T extends { id: string }>(items: T[], previous: T[], current: T[]) => {
        const existing = new Set(previous.map(item => item.id));
        return [...items.filter(item => !existing.has(item.id)), ...current];
      };
      setAppState(prev => ({ ...prev,
        applications: prev.applications.map(app => updates.has(app.id) ? { ...app, stage: updates.get(app.id)!.stage, updatedAt: updates.get(app.id)!.updatedAt } : app),
        candidates: prev.candidates.map(c => {
          const updated = next.candidates.find(n => n.id === c.id);
          if (!updated || updated === before.candidates.find(n => n.id === c.id)) return c;
          return { ...c, savedInTalentPool: updated.savedInTalentPool, talentPoolOriginJob: updated.talentPoolOriginJob, talentPoolNotes: updated.talentPoolNotes };
        }),
        activities: additions(next.activities, before.activities, prev.activities),
        decisionLogs: additions(next.decisionLogs, before.decisionLogs, prev.decisionLogs),
        emailDrafts: additions(next.emailDrafts, before.emailDrafts, prev.emailDrafts),
      }));
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se guardó la acción.', 'error'); return false;
    } finally {
      workflowBusy.current = false;
      // La recarga posterior usa los expedientes de la próxima renderización.
      window.setTimeout(() => void reloadWorkflowRef.current(), 0);
    }
  };

  // La decisión siempre identifica explícitamente sus expedientes y convocatoria.
  const handleAdvanceApplications = async (ids: string[], rejectOthers = false, customMessage?: string) => {
    const target = appState.applications.find((app) => app.id === ids[0]);
    const job = appState.jobPostings.find((j) => j.id === target?.jobPostingId);
    if (!job || job.status !== 'activa') { showToast('Seleccione una convocatoria activa.', 'warning'); return false; }
    // Top-N del ranking por Score Embeddings: también pueden avanzar; el resto con score recibe el correo de cierre
    const delPuesto = appState.applications.filter((app) => app.jobPostingId === job.id);
    const elegiblesPorRanking = idsTopN(delPuesto, appState.candidates, job, appState.topN);
    const evaluadosPorRanking = new Set(delPuesto.filter((app) => enProceso(app) && embeddingVigente(app, job)).map((app) => app.id));
    const apply = (state: AppStateData) => advanceApplications({
      elegiblesPorRanking, evaluadosPorRanking,
      selectedAppIds: ids, applications: state.applications, candidates: state.candidates,
      jobPostingId: job.id, jobPostingTitle: state.jobPostings.find((j) => j.id === job.id)?.title || job.title, criteriaVersion: state.jobPostings.find((j) => j.id === job.id)?.criteriaVersion || job.criteriaVersion,
      method: state.selectedMethod, rejectOthersEvaluated: rejectOthers, customEmailMessage: customMessage,
    });
    const result = apply(appState);
    if (!result.newDecisions.length) {
      showToast('Revise la selección: todos deben estar pendientes y dentro del Top-N (o verificados y evaluados) del mismo puesto.', 'warning'); return false;
    }
    const next = { ...appState, applications: result.updatedApplications, candidates: result.updatedCandidates,
      activities: [...result.newActivities, ...appState.activities], decisionLogs: [...result.newDecisions, ...appState.decisionLogs], emailDrafts: [...result.newDrafts, ...appState.emailDrafts] };
    if (!await commitWorkflowState(next)) return false;
    clearApplicationSelection();
    showToast(`${new Set(ids).size} perfiles avanzaron a Preseleccionado. Se guardaron borradores de avance${rejectOthers ? ' y cierre' : ''}.`, 'success');
    return true;
  };

  const handleAdvanceSelected = (rejectOthers = false, customMessage?: string) => {
    const ids = selectedApplicationIds.filter((id) => activeJobApplications.some((a) => a.id === id));
    return handleAdvanceApplications(ids, rejectOthers, customMessage);
  };

  const handleMoveStage = async (appId: string, target: Stage, reason: string) => {
    const app = appState.applications.find((a) => a.id === appId);
    const error = app && validateStageTransition(app, target, appState.selectedMethod);
    if (!app || error || !reason.trim()) { showToast(error || 'Registre el motivo de la decisión.', 'warning'); return; }
    if (moveApplicationStage(appState, appId, target, reason) === appState) {
      showToast('La convocatoria debe estar activa.', 'warning'); return;
    }
    if (!await commitWorkflowState(moveApplicationStage(appState, appId, target, reason))) return;
    setSelectedApplicationIds((prev) => prev.filter((id) => id !== appId));
    showToast('Cambio de etapa registrado en el expediente y el historial.', 'success');
  };

  const handleSaveToTalentPool = (candidateId: string) => {
    if (!appState.candidates.some((c) => c.id === candidateId)) return;
    setAppState((prev) => ({ ...prev, candidates: prev.candidates.map((c) => c.id === candidateId ? {
      ...c, savedInTalentPool: true, talentPoolOriginJob: c.talentPoolOriginJob || activeJob?.title,
    } : c) }));
    showToast('Perfil conservado en el Banco de Talento.', 'success');
  };

  // Liberar postulación
  const handleReleaseApplications = async (ids: string[], reason: string) => {
    const jobId = activeJob?.id;
    if (!jobId || releaseSelectedApplications(appState, jobId, ids, reason) === appState) {
      showToast('Revisa el lote: selecciona expedientes activos de esta convocatoria y registra un motivo.', 'warning');
      return false;
    }
    if (!await commitWorkflowState(releaseSelectedApplications(appState, jobId, ids, reason))) return false;
    const released = new Set(ids);
    setSelectedApplicationIds(prev => prev.filter(id => !released.has(id)));
    if (selectedCandidateForDrawer && released.has(selectedCandidateForDrawer.id)) setSelectedCandidateForDrawer(null);
    showToast(`${released.size} postulaciones descartadas. Los perfiles y evaluaciones se conservan en No continúan y Banco de Talento.`, 'info');
    return true;
  };

  const handleReleaseApplication = async (appId: string, reason = 'Liberación manual por el evaluador') => {
    const target = appState.applications.find((a) => a.id === appId);
    const job = appState.jobPostings.find((j) => j.id === target?.jobPostingId);
    if (!job) return false;
    const result = releaseApplication({
      applicationId: appId,
      applications: appState.applications,
      candidates: appState.candidates,
      jobPostingTitle: job.title, criteriaVersion: job.criteriaVersion, method: appState.selectedMethod,
      reason,
    });

    if (!result) { showToast('El expediente ya está cerrado o el motivo no es válido.', 'warning'); return false; }

    const next = { ...appState, applications: result.updatedApplications, candidates: result.updatedCandidates,
      activities: [result.newActivity, ...appState.activities], decisionLogs: [result.newDecision, ...appState.decisionLogs] };
    if (!await commitWorkflowState(next)) return false;
    setSelectedApplicationIds(prev => prev.filter(id => id !== appId));
    if (selectedCandidateForDrawer?.id === appId) setSelectedCandidateForDrawer(null);

    showToast('Postulación liberada. El perfil continúa conservado en No continúan y en Banco de Talento.', 'info');
    return true;
  };

  // Añadir nota
  const handleSaveInternalComment = (appId: string, text: string, bandera: 'roja' | 'verde' | null = null) => {
    setAppState((prev) => updateInternalComment(prev, appId, text, bandera));
  };

  const handleAddNote = (appId: string, noteText: string) => {
    if (!noteText.trim() || !appState.applications.some((a) => a.id === appId)) return;
    const now = new Date().toISOString();
    const newAct = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      applicationId: appId,
      type: 'note' as const,
      title: 'Nota de evaluación agregada',
      details: noteText,
      author: 'Equipo de GTHC',
      timestamp: now,
    };

    setAppState((prev) => ({
      ...prev,
      activities: [newAct, ...prev.activities],
    }));

    showToast('Nota guardada en la actividad de la postulación.', 'success');
  };

  // Registrar una entrevista en el expediente local
  const handleScheduleInterview = (
    appId: string,
    interviewData: { title: string; scheduledAt: string; locationOrLink: string; notes?: string }
  ) => {
    const now = new Date().toISOString();
    if (!appState.applications.some((a) => a.id === appId) || !interviewData.title.trim() || !interviewData.locationOrLink.trim() || !Number.isFinite(new Date(interviewData.scheduledAt).getTime())) return;
    const newRecord: InterviewRecord = {
      id: `int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      applicationId: appId,
      title: interviewData.title,
      scheduledAt: interviewData.scheduledAt,
      locationOrLink: interviewData.locationOrLink,
      notes: interviewData.notes,
      status: 'invitacion_pendiente',
      createdAt: now,
    };

    const newAct = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      applicationId: appId,
      type: 'interview' as const,
      title: `Entrevista registrada: ${interviewData.title}`,
      details: `Fecha programada: ${new Date(interviewData.scheduledAt).toLocaleString()} · Lugar/Enlace: ${interviewData.locationOrLink}. Estado: Invitación pendiente.`,
      author: 'Equipo de GTHC',
      timestamp: now,
    };

    setAppState((prev) => ({
      ...prev,
      interviewRecords: [newRecord, ...prev.interviewRecords],
      activities: [newAct, ...prev.activities],
    }));

    showToast('Entrevista registrada localmente (Invitación pendiente).', 'success');
  };

  // Guardar borrador de correo
  const handleSaveEmailDraft = (draft: {
    applicationId: string;
    to: string;
    cc?: string;
    templateType: 'personal' | 'avance' | 'cierre' | 'entrevista';
    lang: 'es' | 'en';
    subject: string;
    body: string;
  }) => {
    const now = new Date().toISOString();
    if (!appState.applications.some((a) => a.id === draft.applicationId) || !draft.subject.trim() || !draft.body.trim()) return;
    const newDraft: EmailDraft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...draft,
      status: 'borrador',
      updatedAt: now,
    };

    const newAct = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      applicationId: draft.applicationId,
      type: 'draft_email' as const,
      title: `Borrador de correo guardado: ${draft.subject}`,
      details: `Destinatario: ${draft.to || 'No registrado'}. El envío mediante Gmail se conectará posteriormente.`,
      author: 'Equipo de GTHC',
      timestamp: now,
    };

    setAppState((prev) => ({
      ...prev,
      emailDrafts: [newDraft, ...prev.emailDrafts],
      activities: [newAct, ...prev.activities],
    }));

    showToast('Borrador guardado. El correo aún no se ha enviado (Gmail pendiente de conexión).', 'info');
  };

  // Aplicar exactamente la simulación a pendientes con evidencias completas.
  const handleUpdateJobCriteria = (jobId: string, criteria: Criterion[]) => {
    if (!hasValidCriteria(criteria)) { showToast('Los criterios deben ser válidos y sumar 100%.', 'warning'); return; }
    setAppState((prev) => updateJobCriteria(prev, jobId, criteria));
    showToast('Criterios versionados y puntajes de pendientes recalculados. Los ya decididos conservan su evaluación.', 'success');
  };

  // Crear nueva convocatoria
  const handleCreateJobPosting = async (newJob: JobPosting) => {
    if (creandoConvocatoria.current) return;
    if (!newJob.code.trim() || !newJob.title.trim() || !hasValidCriteria(newJob.criteria) || appState.jobPostings.some((j) => j.id === newJob.id || j.code.toLowerCase() === newJob.code.toLowerCase())) {
      showToast('Revise los datos: el código debe ser único y los criterios válidos.', 'warning'); return;
    }
    if (newJob.offeredSalary != null) {
      if (!esSuperadmin(perfilActual) || !supabase) { showToast('Solo la superadministradora puede guardar la oferta.', 'error'); return; }
      creandoConvocatoria.current = true;
      try { await guardarSueldoOfertado(supabase, newJob.id, newJob.offeredSalary); }
      catch (error) { showToast((error as Error).message, 'error'); return; }
      finally { creandoConvocatoria.current = false; }
    }
    clearApplicationSelection(); setSelectedCandidateForDrawer(null);
    setAppState((prev) => ({
      ...prev,
      jobPostings: [newJob, ...prev.jobPostings],
      activeJobPostingId: newJob.id, topN: newJob.defaultTopN,
    }));
    setCurrentView('convocatorias');
    showToast(`Convocatoria "${newJob.title}" creada como ${newJob.status}.`, 'success');
  };

  const handleActivateJobPosting = (jobId: string) => {
    const job = appState.jobPostings.find((j) => j.id === jobId);
    if (!job || job.status !== 'borrador' || !hasValidCriteria(job.criteria) || !job.knockoutRule.trim()) return;
    const now = new Date().toISOString();
    setAppState((prev) => ({ ...prev,
      jobPostings: prev.jobPostings.map((j) => j.id === jobId ? { ...j, status: 'activa', phase: 'Convocatoria Abierta' } : j),
      decisionLogs: [{ id: `dec-job-${Date.now()}`, jobPostingId: jobId, applicationId: '', candidateId: '',
        action: 'Convocatoria activada', author: 'Equipo de GTHC', timestamp: now, criteriaVersion: job.criteriaVersion,
        evaluationContext: { llmScore: null, method: prev.selectedMethod }, notes: 'Borrador activado sin registrar postulaciones.' }, ...prev.decisionLogs] }));
    showToast('Convocatoria activada. Las postulaciones se incorporan desde Carga o Banco de Talento.', 'success');
  };

  const handleApplyEvaluation = (prepared: PreparedEvaluation, reply: EvaluationReply, hash: string) => {
    applyPreparedEvaluation(appState, prepared, reply, hash);
    setAppState((prev) => {
      try { return applyPreparedEvaluation(prev, prepared, reply, hash); }
      catch { queueMicrotask(() => showToast('El perfil cambió. La evaluación anterior no se aplicó.', 'warning')); return prev; }
    });
  };
  const handleUpdateEvaluationReference = (jobId: string, reference: string) => {
    updateEvaluationReference(appState,jobId,reference);
    setAppState((prev) => updateEvaluationReference(prev,jobId,reference));
    showToast('Referencia del puesto guardada. Puntajes pendientes de evaluación para este puesto.', 'success');
  };
  const handleEvaluationIssue = (applicationId: string, error: EvaluationError) => {
    setAppState((prev) => recordEvaluationIssue(prev, applicationId, error));
  };
  const handleReviewRequirement = (applicationId: string, status: RequirementStatus, justification: string) => {
    reviewRequirement(appState, applicationId, status, justification);
    setAppState((prev) => reviewRequirement(prev, applicationId, status, justification));
    showToast('Revisión humana del requisito guardada.', 'success');
  };

  const handleImportCandidates = (jobId: string, rows: ImportRow[]) => {
    const result = applyCandidateImport(appState, jobId, rows);
    setAppState((prev) => prev.jobPostings.some((job) => job.id === jobId) ? applyCandidateImport(prev, jobId, rows).state : prev);
    const { newApplications, updatedCandidates } = result.plan.summary;
    showToast(`${newApplications} postulaciones nuevas; ${updatedCandidates} fichas actualizadas. Evaluación LLM pendiente.`, 'success');
    return result.plan.summary;
  };

  // Score de embeddings: se guarda aparte de llmScore y no altera etapas ni el historial.
  const handleApplyEmbeddingRanking = (results: Record<string, EmbeddingMatch>) => {
    setAppState((prev) => ({ ...prev, applications: prev.applications.map((app) =>
      results[app.id] ? { ...app, embeddingMatch: results[app.id] } : app) }));
  };

  // Estrella del ranking: agrega o quita a alguien del Top-N además de los N primeros (se guarda en la convocatoria).
  const handleToggleTopNExtra = (applicationId: string) => {
    setAppState((prev) => {
      const app = prev.applications.find((a) => a.id === applicationId);
      if (!app) return prev;
      return { ...prev, jobPostings: prev.jobPostings.map((job) => {
        if (job.id !== app.jobPostingId) return job;
        const extras = job.topNExtras || [];
        return { ...job, topNExtras: extras.includes(applicationId) ? extras.filter((id) => id !== applicationId) : [...extras, applicationId] };
      }) };
    });
  };

  // Avisos de Bumeran (Supabase): se agregan como convocatorias sin tocar las existentes. Con `visibles` (todos los
  // avisos que el usuario puede ver), se quitan de la copia local los que dejó de ver (p. ej. marcados confidenciales).
  const handleSyncBumeranJobs = (jobs: JobPosting[], visibles?: Set<string>) => {
    setAppState((prev) => mergeBumeranJobs(visibles ? quitarAvisosNoVisibles(prev, visibles) : prev, jobs));
  };

  // Postulantes de un aviso de Bumeran: mismo importador que "Cargar CV" (sin duplicar fichas).
  const handleSyncBumeranCandidates = (jobId: string, rows: ImportRow[]) => {
    setAppState((prev) => prev.jobPostings.some((job) => job.id === jobId) ? applyCandidateImport(prev, jobId, rows).state : prev);
  };

  // Una nueva convocatoria requiere evaluación independiente; el perfil se conserva.
  const handleLinkCandidateToJob = (candidateId: string, targetJobId: string) => {
    const cand = appState.candidates.find((c) => c.id === candidateId);
    const job = appState.jobPostings.find((j) => j.id === targetJobId && j.status === 'activa');
    if (!cand || !job) { showToast('Seleccione una persona y una convocatoria activa.', 'warning'); return; }
    if (appState.applications.some((a) => a.candidateId === candidateId && a.jobPostingId === targetJobId)) {
      showToast('Esta persona ya cuenta con una postulación en esa convocatoria.', 'warning'); return;
    }
    const newApp = createPendingApplication(candidateId, job);
    setAppState((prev) => {
      if (prev.applications.some((a) => a.candidateId === candidateId && a.jobPostingId === targetJobId)) return prev;
      return { ...prev, applications: [newApp, ...prev.applications], activeJobPostingId: job.id, topN: job.defaultTopN,
        activities: [{ id: `act-link-${newApp.id}`, applicationId: newApp.id, type: 'note', title: 'Perfil vinculado desde Banco de Talento',
          details: 'Nueva postulación con requisitos y evaluaciones pendientes.', author: 'Equipo de GTHC', timestamp: newApp.createdAt }, ...prev.activities] };
    });
    setSelectedCandidateForDrawer(null); clearApplicationSelection();
    setCurrentView('mejores_candidatos');
    showToast(`${cand.name} vinculado a ${job.code}. Requisitos y puntajes pendientes; perfil conservado en Banco de Talento.`, 'success');
  };

  const handleQuickAdvanceToBest = (applicationId: string) => handleAdvanceApplications([applicationId]);
  const handleRevertToPostulado = (applicationId: string) => handleMoveStage(applicationId, 'postulado', 'Revisión de la preselección por el equipo de GTHC');

  // Limpiar los datos locales de selección
  const handleResetData = () => {
    const initial = borrarEstado();
    setAppState(initial);
    setSelectedApplicationIds([]);
    setSelectedCandidateForDrawer(null);
    setSelectedCandidateIdState(null);
    showToast('Datos de candidatos restablecidos.', 'info');
  };

  const [selectedCandidateId, setSelectedCandidateIdState] = useState<string | null>(null);

  const setSelectedCandidateId = (candId: string | null) => {
    setSelectedCandidateIdState(candId);
    setSelectedCandidateForDrawer(null);
    if (!candId) {
      setSelectedCandidateForDrawer(null);
    } else {
      const foundApp =
        (activeJob && appState.applications.find((a) => a.candidateId === candId && a.jobPostingId === activeJob.id)) ||
        appState.applications.find((a) => a.candidateId === candId);
      if (foundApp) {
        setSelectedCandidateForDrawer(foundApp);
      }
    }
  };

  const setCandidateDrawerOpen = (open: boolean) => {
    if (!open) {
      setSelectedCandidateForDrawer(null);
      setSelectedCandidateIdState(null);
    }
  };

  const isCandidateDrawerOpen = !!selectedCandidateForDrawer;

  const value: AppContextValue = {
    appState,
    currentView,
    activeJob,
    activeJobApplications,
    selectedApplicationIds,
    selectedCandidateForDrawer,
    candidateDrawerTab,
    isAssistantOpen,
    toasts,
    setCurrentView,
    setActiveJobPostingId,
    setActiveJobId: setActiveJobPostingId,
    setSelectedMethod,
    setTopN,
    toggleApplicationSelection,
    selectAllApplications,
    clearApplicationSelection,
    openCandidateDrawer,
    selectedCandidateId,
    setSelectedCandidateId,
    isCandidateDrawerOpen,
    setCandidateDrawerOpen,
    toggleAssistant,
    isAssistantDrawerOpen: isAssistantOpen,
    setAssistantDrawerOpen: (open: boolean) => setIsAssistantOpen(open),
    setTheme,
    setThemePreference: setTheme,
    setReducedMotion,
    showToast,
    removeToast,
    handleAdvanceApplications,
    workflow: { ready: workflowReady && workflowLoadedJob === activeJob?.id, error: workflowError, actions: workflowLoadedJob === activeJob?.id ? workflowActions : [], userId: workflowUser, reload: reloadWorkflow },
    handleMoveStage,
    handleSaveToTalentPool,
    handleAdvanceSelected,
    handleReleaseApplication,
    handleReleaseApplications,
    handleAddNote,
    handleSaveInternalComment,
    handleScheduleInterview,
    handleSaveEmailDraft,
    handleUpdateJobCriteria,
    handleCreateJobPosting,
    handleActivateJobPosting,
    handleImportCandidates,
    handleApplyEmbeddingRanking,
    handleToggleTopNExtra,
    handleSyncBumeranJobs,
    handleSyncBumeranCandidates,
    handleApplyEvaluation,
    handleEvaluationIssue,
    handleReviewRequirement,
    handleUpdateEvaluationReference,
    handleLinkCandidateToJob,
    handleQuickAdvanceToBest,
    handleRevertToPostulado,
    handleResetData,
    resetToInitialState: handleResetData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser utilizado dentro de un AppProvider');
  }
  return context;
}

