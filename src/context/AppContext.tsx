/* ==========================================================================
   TalentAI | GTHC · ESAN — Contexto Global de Estado y Acciones
   ========================================================================== */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
import { loadAppState, saveAppState, resetAppState } from '../services/storage.ts';
import { advanceApplications, releaseApplication } from '../services/recruitmentRules.ts';
import { readRoute, routeHash } from '../services/navigation.ts';
import { createPendingApplication, hasValidCriteria, moveApplicationStage, updateJobCriteria, validateStageTransition } from '../services/workflow.ts';
import { useTheme } from './useTheme.ts';

export type ViewType =
  | 'convocatorias'
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
  | 'ajustes';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AppContextValue {
  appState: AppStateData;
  currentView: ViewType;
  activeJob: JobPosting | undefined;
  activeJobApplications: Application[];
  selectedApplicationIds: string[];
  selectedCandidateForDrawer: Application | null;
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
  openCandidateDrawer: (app: Application | null) => void;
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
  handleAdvanceApplications: (ids: string[], rejectOthers?: boolean, customMessage?: string) => void;
  handleMoveStage: (appId: string, target: Stage, reason: string) => void;
  handleSaveToTalentPool: (candidateId: string) => void;
  handleAdvanceSelected: (rejectOthers?: boolean, customMessage?: string) => void;
  handleReleaseApplication: (appId: string, reason?: string) => void;
  handleAddNote: (appId: string, noteText: string) => void;
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
  handleCreateJobPosting: (newJob: JobPosting) => void;
  handleAddBatchCandidates: (newCandidates: Candidate[], newApps: Application[]) => void;
  handleLinkCandidateToJob: (candidateId: string, targetJobId: string) => void;
  handleQuickAdvanceToBest: (applicationId: string) => void;
  handleRevertToPostulado: (applicationId: string) => void;
  handleResetData: () => void;
  resetToInitialState: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppStateData>(() => {
    const state = loadAppState();
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
  const selectedCandidateForDrawer = appState.applications.find((app) => app.id === drawerApplicationId) || null;
  const setSelectedCandidateForDrawer = (app: Application | null) => setDrawerApplicationId(app?.id || null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const sync = () => {
      const route = readRoute(window.location.hash);
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
    const res = saveAppState(appState);
    if (res.warning) {
      showToast(res.warning, 'warning');
    }
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

  const openCandidateDrawer = (app: Application | null) => {
    setSelectedCandidateForDrawer(app);
  };

  const toggleAssistant = (open?: boolean) => {
    setIsAssistantOpen((prev) => (open !== undefined ? open : !prev));
  };

  // La decisión siempre identifica explícitamente sus expedientes y convocatoria.
  const handleAdvanceApplications = (ids: string[], rejectOthers = false, customMessage?: string) => {
    const target = appState.applications.find((app) => app.id === ids[0]);
    const job = appState.jobPostings.find((j) => j.id === target?.jobPostingId);
    if (!job || job.status !== 'activa') { showToast('Seleccione una convocatoria activa.', 'warning'); return; }
    const apply = (state: AppStateData) => advanceApplications({
      selectedAppIds: ids, applications: state.applications, candidates: state.candidates,
      jobPostingId: job.id, jobPostingTitle: state.jobPostings.find((j) => j.id === job.id)?.title || job.title, criteriaVersion: state.jobPostings.find((j) => j.id === job.id)?.criteriaVersion || job.criteriaVersion,
      method: state.selectedMethod, rejectOthersEvaluated: rejectOthers, customEmailMessage: customMessage,
    });
    const result = apply(appState);
    if (!result.newDecisions.length) {
      showToast('Revise la selección: todos deben estar pendientes, verificados y evaluados para el mismo puesto.', 'warning'); return;
    }
    setAppState((prev) => {
      const latest = apply(prev);
      return { ...prev, applications: latest.updatedApplications, candidates: latest.updatedCandidates,
        activities: [...latest.newActivities, ...prev.activities],
        decisionLogs: [...latest.newDecisions, ...prev.decisionLogs], emailDrafts: [...latest.newDrafts, ...prev.emailDrafts] };
    });
    clearApplicationSelection();
    showToast(`${new Set(ids).size} perfiles avanzaron a Preseleccionado. Se guardaron borradores de avance${rejectOthers ? ' y cierre' : ''}.`, 'success');
  };

  const handleAdvanceSelected = (rejectOthers = false, customMessage?: string) => {
    const ids = selectedApplicationIds.filter((id) => activeJobApplications.some((a) => a.id === id));
    handleAdvanceApplications(ids, rejectOthers, customMessage);
  };

  const handleMoveStage = (appId: string, target: Stage, reason: string) => {
    const app = appState.applications.find((a) => a.id === appId);
    const error = app && validateStageTransition(app, target, appState.selectedMethod);
    if (!app || error || !reason.trim()) { showToast(error || 'Registre el motivo de la decisión.', 'warning'); return; }
    if (moveApplicationStage(appState, appId, target, reason) === appState) {
      showToast('La convocatoria debe estar activa.', 'warning'); return;
    }
    setAppState((prev) => moveApplicationStage(prev, appId, target, reason));
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
  const handleReleaseApplication = (appId: string, reason = 'Liberación manual por el evaluador') => {
    const target = appState.applications.find((a) => a.id === appId);
    const job = appState.jobPostings.find((j) => j.id === target?.jobPostingId);
    if (!job) return;
    const result = releaseApplication({
      applicationId: appId,
      applications: appState.applications,
      candidates: appState.candidates,
      jobPostingTitle: job.title, criteriaVersion: job.criteriaVersion, method: appState.selectedMethod,
      reason,
    });

    if (!result) { showToast('El expediente ya está cerrado o el motivo no es válido.', 'warning'); return; }

    // Desmarcar si estaba seleccionado
    setSelectedApplicationIds((prev) => prev.filter((id) => id !== appId));
    if (selectedCandidateForDrawer?.id === appId) {
      setSelectedCandidateForDrawer(null);
    }

    setAppState((prev) => {
      const latest = releaseApplication({ applicationId: appId, applications: prev.applications, candidates: prev.candidates,
        jobPostingTitle: job.title, reason, criteriaVersion: job.criteriaVersion, method: prev.selectedMethod });
      if (!latest) return prev;
      return { ...prev, applications: latest.updatedApplications, candidates: latest.updatedCandidates,
        activities: [latest.newActivity, ...prev.activities], decisionLogs: [latest.newDecision, ...prev.decisionLogs] };
    });

    showToast('Postulación liberada. El perfil continúa conservado en No continúan y en Banco de Talento.', 'info');
  };

  // Añadir nota
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

  // Agendar entrevista de demostración
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
  const handleCreateJobPosting = (newJob: JobPosting) => {
    if (!newJob.code.trim() || !newJob.title.trim() || !hasValidCriteria(newJob.criteria) || appState.jobPostings.some((j) => j.id === newJob.id || j.code.toLowerCase() === newJob.code.toLowerCase())) {
      showToast('Revise los datos: el código debe ser único y los criterios válidos.', 'warning'); return;
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
        evaluationContext: { mlScore: null, llmScore: null, method: prev.selectedMethod }, notes: 'Borrador activado sin añadir postulaciones ficticias.' }, ...prev.decisionLogs] }));
    showToast('Convocatoria activada. Las postulaciones se incorporan desde Carga o Banco de Talento.', 'success');
  };

  // Carga masiva de lotes de candidatos
  const handleAddBatchCandidates = (newCandidates: Candidate[], newApps: Application[]) => {
    setAppState((prev) => ({
      ...prev,
      candidates: [...prev.candidates, ...newCandidates],
      applications: [...prev.applications, ...newApps],
    }));
    showToast(`Se incorporaron ${newApps.length} perfiles a la convocatoria activa.`, 'success');
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

  // Restablecer datos iniciales de demo
  const handleResetData = () => {
    const initial = resetAppState();
    setAppState(initial);
    setSelectedApplicationIds([]);
    setSelectedCandidateForDrawer(null);
    setSelectedCandidateIdState(null);
    showToast('Datos de demostración restablecidos a su estado original.', 'info');
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
    handleMoveStage,
    handleSaveToTalentPool,
    handleAdvanceSelected,
    handleReleaseApplication,
    handleAddNote,
    handleScheduleInterview,
    handleSaveEmailDraft,
    handleUpdateJobCriteria,
    handleCreateJobPosting,
    handleActivateJobPosting,
    handleAddBatchCandidates,
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
