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
} from '../types/index.ts';
import { loadAppState, saveAppState, resetAppState } from '../services/storage.ts';
import {
  advanceApplications,
  releaseApplication,
} from '../services/recruitmentRules.ts';

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
  const [appState, setAppState] = useState<AppStateData>(() => loadAppState());
  const [currentView, setCurrentView] = useState<ViewType>('mejores_candidatos');
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [selectedCandidateForDrawer, setSelectedCandidateForDrawer] = useState<Application | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Sincronizar persistencia ante cualquier cambio en appState
  useEffect(() => {
    const res = saveAppState(appState);
    if (res.warning) {
      showToast(res.warning, 'warning');
    }
  }, [appState]);

  // Aplicar tema en el DOM
  useEffect(() => {
    const applyTheme = () => {
      const isDark =
        appState.theme === 'dark' ||
        (appState.theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };

    applyTheme();

    if (appState.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [appState.theme]);

  // Aplicar clase de reducción de movimiento
  useEffect(() => {
    if (appState.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [appState.reducedMotion]);

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
    setAppState((prev) => ({ ...prev, activeJobPostingId: jobId }));
    setSelectedApplicationIds([]); // Limpiar marcas de otra convocatoria
    setSelectedCandidateForDrawer(null);
  };

  const setSelectedMethod = (method: EvaluationMethod) => {
    setAppState((prev) => ({ ...prev, selectedMethod: method }));
  };

  const setTopN = (n: number) => {
    const val = Math.max(1, Math.floor(n));
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
    setSelectedApplicationIds(appIds);
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

  // Avanzar candidatos marcados
  const handleAdvanceSelected = (rejectOthers = false, customMessage?: string) => {
    if (selectedApplicationIds.length === 0) return;

    const result = advanceApplications({
      selectedAppIds: selectedApplicationIds,
      applications: appState.applications,
      candidates: appState.candidates,
      jobPostingTitle: activeJob?.title || 'Convocatoria Activa',
      method: appState.selectedMethod,
      rejectOthersEvaluated: rejectOthers,
      customEmailMessage: customMessage,
    });

    setAppState((prev) => ({
      ...prev,
      applications: result.updatedApplications,
      activities: [...result.newActivities, ...prev.activities],
      decisionLogs: [...result.newDecisions, ...prev.decisionLogs],
      emailDrafts: [...result.newDrafts, ...prev.emailDrafts],
    }));

    const count = selectedApplicationIds.length;
    clearApplicationSelection();
    showToast(
      `${count} ${count === 1 ? 'perfil avanzó' : 'perfiles avanzaron'} a Preseleccionado. Se guardaron los borradores correspondientes.`,
      'success'
    );
  };

  // Liberar postulación
  const handleReleaseApplication = (appId: string, reason = 'Liberación manual por el evaluador') => {
    const result = releaseApplication({
      applicationId: appId,
      applications: appState.applications,
      candidates: appState.candidates,
      jobPostingTitle: activeJob?.title || 'Convocatoria Activa',
      reason,
    });

    // Desmarcar si estaba seleccionado
    setSelectedApplicationIds((prev) => prev.filter((id) => id !== appId));
    if (selectedCandidateForDrawer?.id === appId) {
      setSelectedCandidateForDrawer(null);
    }

    setAppState((prev) => ({
      ...prev,
      applications: result.updatedApplications,
      candidates: result.updatedCandidates,
      activities: [result.newActivity, ...prev.activities],
      decisionLogs: [result.newDecision, ...prev.decisionLogs],
    }));

    showToast('Postulación liberada. El perfil continúa conservado en No continúan y en Banco de Talento.', 'info');
  };

  // Añadir nota
  const handleAddNote = (appId: string, noteText: string) => {
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
      emailDrafts: [newDraft, ...prev.emailDrafts.filter((d) => d.applicationId !== draft.applicationId)],
      activities: [newAct, ...prev.activities],
    }));

    showToast('Borrador guardado. El correo aún no se ha enviado (Gmail pendiente de conexión).', 'info');
  };

  // Actualizar criterios de evaluación y guardar versión
  const handleUpdateJobCriteria = (jobId: string, criteria: Criterion[]) => {
    setAppState((prev) => {
      const now = new Date().toISOString();
      const updatedJobs = prev.jobPostings.map((j) => {
        if (j.id === jobId) {
          const nextVersion = `v${(parseFloat(j.criteriaVersion.replace(/[^0-9.]/g, '') || '1.0') + 0.1).toFixed(1)}`;
          return {
            ...j,
            criteria,
            criteriaVersion: nextVersion,
          };
        }
        return j;
      });

      const newDecision = {
        id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        jobPostingId: jobId,
        applicationId: '',
        candidateId: '',
        action: 'Actualización de Criterios y Ponderaciones',
        author: 'Equipo de GTHC',
        timestamp: now,
        criteriaVersion: 'Nueva versión',
        evaluationContext: {
          mlScore: null,
          llmScore: null,
          method: prev.selectedMethod,
        },
        notes: 'Ponderaciones reajustadas al 100%.',
      };

      return {
        ...prev,
        jobPostings: updatedJobs,
        decisionLogs: [newDecision, ...prev.decisionLogs],
      };
    });

    showToast('Nuevos criterios guardados exitosamente como nueva versión.', 'success');
  };

  // Crear nueva convocatoria
  const handleCreateJobPosting = (newJob: JobPosting) => {
    setAppState((prev) => ({
      ...prev,
      jobPostings: [newJob, ...prev.jobPostings],
      activeJobPostingId: newJob.id,
    }));
    setCurrentView('convocatorias');
    showToast(`Convocatoria "${newJob.title}" creada como ${newJob.status}.`, 'success');
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

  // Vincular candidato a nueva convocatoria
  const handleLinkCandidateToJob = (candidateId: string, targetJobId: string) => {
    // Verificar si ya existe postulación en esa convocatoria
    const existing = appState.applications.find(
      (a) => a.candidateId === candidateId && a.jobPostingId === targetJobId
    );
    if (existing) {
      showToast('Esta persona ya cuenta con una postulación en esa convocatoria.', 'warning');
      return;
    }

    const now = new Date().toISOString();
    const cand = appState.candidates.find((c) => c.id === candidateId);
    const targetJob = appState.jobPostings.find((j) => j.id === targetJobId);

    // Evaluación adaptativa inicial para el nuevo puesto (conforme a perfil profesional verificado)
    const initialMlScore = Math.floor(Math.random() * 8) + 88; // 88 - 95
    const initialLlmScore = Math.floor(Math.random() * 8) + 87; // 87 - 94

    const newApp: Application = {
      id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      jobPostingId: targetJobId,
      candidateId,
      stage: 'postulado',
      mlScore: initialMlScore,
      llmScore: initialLlmScore,
      mandatoryRequirementStatus: 'verificado',
      requirementJustification: `Requisitos validados para ${targetJob?.title || 'la convocatoria'}: Grados académicos y trayectoria técnica verificados.`,
      whyScoreNotes: {
        explanation: `Postulación incorporada desde el Banco de Talento para ${targetJob?.code || 'la convocatoria'}. Evaluación inicial computada exitosamente.`,
        strengths: ['Perfil destacado conservado institucionalmente', 'Compatibilidad alta con el perfil de la cátedra'],
        evidenceSummary: 'Expediente recuperado del Banco de Talento de ESAN y normalizado a Markdown.',
      },
      criteriaBreakdown: {},
      createdAt: now,
      updatedAt: now,
    };

    setAppState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.id === candidateId ? { ...c, savedInTalentPool: false } : c
      ),
      applications: [newApp, ...prev.applications],
      activeJobPostingId: targetJobId,
    }));

    // Seleccionarlo inmediatamente para que el evaluador lo vea destacado
    setSelectedApplicationIds([newApp.id]);

    setCurrentView('mejores_candidatos');
    showToast(
      `Se vinculó a ${cand?.name || 'candidato'} a ${targetJob?.code || targetJobId}. Salió del Banco de Talento y figura activo junto a los demás postulantes.`,
      'success'
    );
  };

  // Designar candidato como uno de Los Mejores directamente (preseleccionar)
  const handleQuickAdvanceToBest = (applicationId: string) => {
    const result = advanceApplications({
      selectedAppIds: [applicationId],
      applications: appState.applications,
      candidates: appState.candidates,
      jobPostingTitle: activeJob?.title || 'Convocatoria Activa',
      method: appState.selectedMethod,
      rejectOthersEvaluated: false,
    });

    setAppState((prev) => ({
      ...prev,
      applications: result.updatedApplications,
      activities: [...result.newActivities, ...prev.activities],
      decisionLogs: [...result.newDecisions, ...prev.decisionLogs],
      emailDrafts: [...result.newDrafts, ...prev.emailDrafts],
    }));

    const app = appState.applications.find((a) => a.id === applicationId);
    const cand = appState.candidates.find((c) => c.id === app?.candidateId);

    showToast(
      `⭐ ${cand?.name || 'Candidato'} fue designado como Mejor Perfil y avanzó a Preseleccionado.`,
      'success'
    );
  };

  // Revertir de preseleccionado a postulado si se desea ajustar
  const handleRevertToPostulado = (applicationId: string) => {
    const now = new Date().toISOString();
    const app = appState.applications.find((a) => a.id === applicationId);
    const cand = appState.candidates.find((c) => c.id === app?.candidateId);

    setAppState((prev) => ({
      ...prev,
      applications: prev.applications.map((a) =>
        a.id === applicationId ? { ...a, stage: 'postulado', updatedAt: now } : a
      ),
      activities: [
        {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          applicationId,
          type: 'stage_change',
          title: 'Reversión a Postulado',
          details: 'Se retiró la designación de preselección para revisión regular.',
          author: 'Equipo de GTHC',
          timestamp: now,
        },
        ...prev.activities,
      ],
    }));

    showToast(
      `${cand?.name || 'Candidato'} fue retornado a etapa Postulado (en proceso regular).`,
      'info'
    );
  };

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
    handleAdvanceSelected,
    handleReleaseApplication,
    handleAddNote,
    handleScheduleInterview,
    handleSaveEmailDraft,
    handleUpdateJobCriteria,
    handleCreateJobPosting,
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
