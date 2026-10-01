/* ==========================================================================
   TalentAI | GTHC · ESAN — Reglas de Negocio Centralizadas
   ========================================================================== */

import {
  Application,
  EvaluationMethod,
  Stage,
  Candidate,
  ActivityLog,
  DecisionLog,
  EmailDraft,
  Criterion,
  CriteriaScore,
} from '../types/index.ts';

/**
 * Regla de Elegibilidad para Top-N y Primera Decisión de Avance:
 * 1. Debe estar en etapa 'postulado' (pendiente de primera decisión).
 * 2. Requisito obligatorio debe estar 'verificado' (sin_verificar nunca se asume cumplido).
 * 3. Debe contar con puntaje registrado para el método que ordena (ML o LLM).
 */
export function isEligibleForTopN(
  application: Application,
  method: EvaluationMethod
): { eligible: boolean; reason?: string } {
  if (application.stage !== 'postulado') {
    return {
      eligible: false,
      reason: `La postulación ya se encuentra en etapa "${application.stage}"`,
    };
  }

  if (application.mandatoryRequirementStatus !== 'verificado') {
    const statusText =
      application.mandatoryRequirementStatus === 'sin_verificar'
        ? 'Requisito obligatorio pendiente de verificación'
        : application.mandatoryRequirementStatus === 'parcial'
        ? 'Cumplimiento parcial de requisitos'
        : 'No cumple con el requisito obligatorio';
    return {
      eligible: false,
      reason: statusText,
    };
  }

  const score = method === 'ML' ? application.mlScore : application.llmScore;
  if (score === null || score === undefined) {
    return {
      eligible: false,
      reason: `Puntaje pendiente de cálculo para el método ${method}`,
    };
  }

  return { eligible: true };
}

/**
 * Obtiene el puntaje según el método especificado (0-100 o null)
 */
export function getScoreByMethod(
  application: Application,
  method: EvaluationMethod
): number | null {
  return method === 'ML' ? application.mlScore : application.llmScore;
}

/**
 * Selecciona los mejores candidatos pendientes según método y cantidad
 */
export function getTopCandidates(
  applications: Application[],
  method: EvaluationMethod,
  count: number
): Application[] {
  if (count <= 0) return [];

  // Filtrar solo candidatos elegibles pendientes
  const eligible = applications.filter((app) => isEligibleForTopN(app, method).eligible);

  // Ordenar de mayor a menor por el puntaje del método seleccionado
  const sorted = [...eligible].sort((a, b) => {
    const scoreA = getScoreByMethod(a, method) ?? -1;
    const scoreB = getScoreByMethod(b, method) ?? -1;
    return scoreB - scoreA;
  });

  return sorted.slice(0, count);
}

/**
 * Calcula métricas en tiempo real a partir del conjunto de postulaciones de un puesto
 */
export function calculateJobMetrics(
  applications: Application[],
  method: EvaluationMethod
) {
  const totalProcessed = applications.length;
  const activeApplications = applications.filter((app) => app.stage !== 'no_continua');
  const totalActive = activeApplications.length;

  const verifiedCount = activeApplications.filter(
    (app) => app.mandatoryRequirementStatus === 'verificado'
  ).length;

  // Promedio del método seleccionado solo para quienes tienen puntaje
  const scoresWithData = activeApplications
    .map((app) => getScoreByMethod(app, method))
    .filter((s): s is number => s !== null && s !== undefined);

  const avgScore =
    scoresWithData.length > 0
      ? Math.round(
          (scoresWithData.reduce((acc, curr) => acc + curr, 0) / scoresWithData.length) * 10
        ) / 10
      : null;

  const stageCounts: Record<Stage, number> = {
    postulado: 0,
    preseleccionado: 0,
    en_entrevista: 0,
    en_evaluacion: 0,
    en_oferta: 0,
    contratado: 0,
    no_continua: 0,
  };

  applications.forEach((app) => {
    if (stageCounts[app.stage] !== undefined) {
      stageCounts[app.stage]++;
    }
  });

  return {
    totalProcessed,
    totalActive,
    verifiedCount,
    avgScore,
    stageCounts,
  };
}

/**
 * Acción de Avanzar candidatos marcados a 'preseleccionado':
 * - Actualiza etapa a 'preseleccionado'.
 * - Deja borradores de correo locales sin enviar.
 * - Registra la decisión en ActivityLog y DecisionLog.
 * - Opción 'rejectOthersEvaluated': perfiles evaluados elegibles pendientes no elegidos pasan a no_continua.
 */
export function advanceApplications(params: {
  selectedAppIds: string[];
  applications: Application[];
  candidates: Candidate[];
  jobPostingTitle: string;
  method: EvaluationMethod;
  author?: string;
  rejectOthersEvaluated?: boolean;
  customEmailMessage?: string;
}): {
  updatedApplications: Application[];
  newActivities: ActivityLog[];
  newDecisions: DecisionLog[];
  newDrafts: EmailDraft[];
} {
  const {
    selectedAppIds,
    applications,
    candidates,
    jobPostingTitle,
    method,
    author = 'Equipo de GTHC',
    rejectOthersEvaluated = false,
    customEmailMessage,
  } = params;

  const now = new Date().toISOString();
  const selectedSet = new Set(selectedAppIds);

  const newActivities: ActivityLog[] = [];
  const newDecisions: DecisionLog[] = [];
  const newDrafts: EmailDraft[] = [];

  const updatedApplications = applications.map((app) => {
    if (selectedSet.has(app.id)) {
      // 1. Avanzar a Preseleccionado
      const previousStage = app.stage;
      const updatedApp: Application = {
        ...app,
        stage: 'preseleccionado',
        updatedAt: now,
      };

      // Registrar Actividad
      newActivities.push({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        applicationId: app.id,
        type: 'stage_change',
        title: 'Avance a Preseleccionado',
        details: `Candidato promovido a la etapa de Preselección mediante evaluación con método ${method}.`,
        author,
        timestamp: now,
      });

      // Registrar Auditoría / DecisionLog
      newDecisions.push({
        id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        jobPostingId: app.jobPostingId,
        applicationId: app.id,
        candidateId: app.candidateId,
        action: 'Avanzar a Preseleccionado',
        previousStage,
        newStage: 'preseleccionado',
        author,
        timestamp: now,
        criteriaVersion: 'v2.4 (Dual ML-Embeddings)',
        evaluationContext: {
          mlScore: app.mlScore,
          llmScore: app.llmScore,
          method,
        },
        notes: `Decisión de avance tomada para el puesto "${jobPostingTitle}".`,
      });

      // Crear borrador de correo local si se proporcionó o plantilla de avance
      const cand = candidates.find((c) => c.id === app.candidateId);
      const candName = cand?.name || 'Candidato';
      const bodyText = customEmailMessage
        ? customEmailMessage
            .replace(/{nombre}/g, candName)
            .replace(/{puesto}/g, jobPostingTitle)
        : `Estimado(a) ${candName},\n\nNos complace informarle que su postulación para la convocatoria "${jobPostingTitle}" ha avanzado a la etapa de Preseleccionado.\n\nPróximamente el equipo de GTHC de ESAN se comunicará con usted para coordinar las siguientes etapas.\n\nAtentamente,\nEquipo de GTHC · Universidad ESAN`;

      newDrafts.push({
        id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        applicationId: app.id,
        to: cand?.email || '',
        templateType: 'avance',
        lang: 'es',
        subject: `Avance en convocatoria: ${jobPostingTitle} · ESAN`,
        body: bodyText,
        status: 'borrador',
        updatedAt: now,
      });

      return updatedApp;
    }

    // Si se marcó "Los otros perfiles evaluados no avanzan", solo aplica a los pendientes evaluados elegibles
    if (
      rejectOthersEvaluated &&
      app.stage === 'postulado' &&
      isEligibleForTopN(app, method).eligible
    ) {
      const updatedApp: Application = {
        ...app,
        stage: 'no_continua',
        updatedAt: now,
      };

      newActivities.push({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        applicationId: app.id,
        type: 'stage_change',
        title: 'Cierre de postulación en convocatoria',
        details: `La postulación no avanzó a preselección. El perfil permanece disponible en Banco de Talento.`,
        author,
        timestamp: now,
      });

      newDecisions.push({
        id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        jobPostingId: app.jobPostingId,
        applicationId: app.id,
        candidateId: app.candidateId,
        action: 'No continúa en este proceso',
        previousStage: app.stage,
        newStage: 'no_continua',
        author,
        timestamp: now,
        criteriaVersion: 'v2.4',
        evaluationContext: {
          mlScore: app.mlScore,
          llmScore: app.llmScore,
          method,
        },
        notes: `No seleccionado en corte de mejores perfiles.`,
      });

      return updatedApp;
    }

    return app;
  });

  return {
    updatedApplications,
    newActivities,
    newDecisions,
    newDrafts,
  };
}

/**
 * Acción de Liberar Postulación:
 * - Pasa inmediatamente a 'no_continua'.
 * - Sale de 'En proceso' y de los mejores pendientes.
 * - Se preserva en el Banco de Talento (savedInTalentPool = true).
 * - Registra la decisión en Actividad e Historial.
 */
export function releaseApplication(params: {
  applicationId: string;
  applications: Application[];
  candidates: Candidate[];
  jobPostingTitle: string;
  author?: string;
  reason?: string;
}): {
  updatedApplications: Application[];
  updatedCandidates: Candidate[];
  newActivity: ActivityLog;
  newDecision: DecisionLog;
} {
  const {
    applicationId,
    applications,
    candidates,
    jobPostingTitle,
    author = 'Equipo de GTHC',
    reason = 'Liberación manual por el evaluador',
  } = params;

  const now = new Date().toISOString();
  let candidateIdTarget = '';
  let prevStage: Stage = 'postulado';
  let appTarget: Application | undefined;

  const updatedApplications = applications.map((app) => {
    if (app.id === applicationId) {
      appTarget = app;
      candidateIdTarget = app.candidateId;
      prevStage = app.stage;
      return {
        ...app,
        stage: 'no_continua' as Stage,
        updatedAt: now,
      };
    }
    return app;
  });

  // Asegurar que el candidato quede guardado en el Banco de Talento
  const updatedCandidates = candidates.map((cand) => {
    if (cand.id === candidateIdTarget) {
      return {
        ...cand,
        savedInTalentPool: true,
        talentPoolOriginJob: jobPostingTitle,
        talentPoolNotes: cand.talentPoolNotes || `Liberado de postulación en ${jobPostingTitle}: ${reason}`,
      };
    }
    return cand;
  });

  const newActivity: ActivityLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    applicationId,
    type: 'stage_change',
    title: 'Postulación liberada',
    details: `La postulación ya no continúa en "${jobPostingTitle}". El perfil sigue conservado en No continúan y en Banco de Talento.`,
    author,
    timestamp: now,
  };

  const newDecision: DecisionLog = {
    id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    jobPostingId: appTarget?.jobPostingId || '',
    applicationId,
    candidateId: candidateIdTarget,
    action: 'Liberar postulación (No continúa)',
    previousStage: prevStage,
    newStage: 'no_continua',
    author,
    timestamp: now,
    criteriaVersion: 'v2.4',
    evaluationContext: {
      mlScore: appTarget?.mlScore ?? null,
      llmScore: appTarget?.llmScore ?? null,
      method: 'ML',
    },
    notes: reason,
  };

  return {
    updatedApplications,
    updatedCandidates,
    newActivity,
    newDecision,
  };
}

/**
 * Simulación de Recálculo de Criterios (Sección 20)
 * Permite simular cómo cambiarían los puntajes si se ajustan las ponderaciones
 */
export function simulateScoreRecalculation(
  criteria: Criterion[],
  breakdown: Record<string, CriteriaScore>,
  method: EvaluationMethod
): number | null {
  const methodCriteria = criteria.filter((c) => c.type === method);
  if (methodCriteria.length === 0) return null;

  let totalWeight = 0;
  let weightedScore = 0;

  for (const crit of methodCriteria) {
    totalWeight += crit.weightPct;
    const scoreItem = breakdown[crit.id];
    if (scoreItem && scoreItem.score !== undefined) {
      weightedScore += (scoreItem.score * crit.weightPct) / 100;
    }
  }

  if (totalWeight === 0) return null;
  // Normalizar sobre 100 si el subconjunto de criterios no suma 100
  const normalized = (weightedScore / totalWeight) * 100;
  return Math.round(normalized * 10) / 10;
}

/**
 * Formatea fechas ISO a formato legible local en español
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return 'Fecha no registrada';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

