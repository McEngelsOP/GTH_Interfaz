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
import { evaluationSummary } from './evaluationSummary.ts';

/**
 * Regla de Elegibilidad para Top-N y Primera Decisión de Avance:
 * 1. Debe estar en etapa 'postulado' (pendiente de primera decisión).
 * 2. Requisito obligatorio debe estar 'verificado' (sin_verificar nunca se asume cumplido).
 * 3. Debe contar con puntaje registrado para el método que ordena (LLM).
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

  const score = application.llmScore;
  if (!isValidScore(score)) {
    return {
      eligible: false,
      reason: `Puntaje pendiente de cálculo para el método ${method}`,
    };
  }

  return { eligible: true };
}

/**
 * Puede pasar a Preselección: por la regla LLM (requisito verificado y puntaje) o porque está en el Top-N del
 * ranking por Score Embeddings (`topIds`). La vía Top-N solo aplica a postulaciones pendientes (etapa «postulado»).
 */
export function puedeAvanzar(application: Application, method: EvaluationMethod, topIds?: Set<string>): boolean {
  return isEligibleForTopN(application, method).eligible
    || (application.stage === 'postulado' && Boolean(topIds?.has(application.id)));
}

/**
 * Obtiene el puntaje según el método especificado (0-100 o null)
 */
export function getScoreByMethod(
  application: Application,
  method: EvaluationMethod
): number | null {
  const score = application.llmScore;
  return isValidScore(score) ? score : null;
}

export function isValidScore(score: unknown): score is number {
  return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100;
}

/** Explica por qué la selección automática está disponible o pendiente. */
export function getTopNAvailability(applications: Application[], method: EvaluationMethod) {
  const pending = applications.filter((app) => app.stage === 'postulado');
  const eligibleCount = pending.filter((app) => isEligibleForTopN(app, method).eligible).length;
  const pendingScoreCount = pending.filter((app) => getScoreByMethod(app, method) === null).length;
  const pendingRequirementCount = pending.filter((app) =>
    app.mandatoryRequirementStatus === 'sin_verificar' || app.mandatoryRequirementStatus === 'parcial'
  ).length;
  const hint = eligibleCount > 0
    ? 'Ordenado por LLM. Solo se seleccionan perfiles con puntaje y requisitos verificados.'
    : !applications.length
    ? 'Carga perfiles para comenzar la revisión y evaluación.'
    : !pending.length
    ? 'No hay postulaciones pendientes de una primera decisión.'
    : pendingScoreCount && pendingRequirementCount
    ? 'Selección pendiente: faltan puntajes LLM y requisitos verificados.'
    : pendingScoreCount
    ? 'Selección pendiente: faltan puntajes LLM.'
    : pendingRequirementCount
    ? 'Selección pendiente: falta verificar los requisitos obligatorios.'
    : 'Ningún perfil pendiente cumple los requisitos de selección.';
  return { eligibleCount, pendingScoreCount, pendingRequirementCount, hint };
}

/**
 * Selecciona los mejores candidatos pendientes según método y cantidad
 */
export function getTopCandidates(
  applications: Application[],
  method: EvaluationMethod,
  count: number
): Application[] {
  if (!Number.isFinite(count) || count <= 0) return [];

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
  method: EvaluationMethod,
  criteria: Criterion[] = []
) {
  const totalProcessed = applications.length;
  const activeApplications = applications.filter((app) => app.stage !== 'no_continua' && app.stage !== 'contratado');
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

  // Los parciales tienen evidencia puntuable, pero conservan el total nulo.
  // Se informan aparte para evitar mezclarlos con evaluaciones completas.
  const incompleteEvaluations = activeApplications
    .filter((app) => app.llmScore === null && app.llmEvaluation)
    .map((app) => evaluationSummary(app, criteria));
  const partials = incompleteEvaluations
    .filter((summary): summary is typeof summary & { partialScore: number } => summary.partialScore !== null);
  const avgPartialScore = partials.length > 0
    ? Math.round(partials.reduce((sum, summary) => sum + summary.partialScore, 0) / partials.length * 10) / 10
    : null;
  const avgPartialCoverage = partials.length > 0
    ? Math.round(partials.reduce((sum, summary) => sum + summary.coverage, 0) / partials.length * 10) / 10
    : null;
  const evaluatedWithoutScoreCount = incompleteEvaluations.filter((summary) => summary.partialScore === null).length;

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
    scoredCount: scoresWithData.length,
    avgPartialScore,
    avgPartialCoverage,
    partialScoreCount: partials.length,
    evaluatedWithoutScoreCount,
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
  jobPostingId: string;
  criteriaVersion: string;
  selectedAppIds: string[];
  applications: Application[];
  candidates: Candidate[];
  jobPostingTitle: string;
  method: EvaluationMethod;
  author?: string;
  rejectOthersEvaluated?: boolean;
  customEmailMessage?: string;
  /** Top-N del ranking por Score Embeddings: pueden avanzar aunque no tengan puntaje LLM. */
  elegiblesPorRanking?: Set<string>;
  /** Postulaciones con Score Embeddings: con «los otros no avanzan» reciben el correo de cierre (agradecimiento). */
  evaluadosPorRanking?: Set<string>;
}): {
  updatedApplications: Application[];
  updatedCandidates: Candidate[];
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
    jobPostingId,
    criteriaVersion,
    elegiblesPorRanking,
    evaluadosPorRanking,
  } = params;

  const now = new Date().toISOString();
  const selectedSet = new Set(selectedAppIds);

  const newActivities: ActivityLog[] = [];
  const newDecisions: DecisionLog[] = [];
  const newDrafts: EmailDraft[] = [];
  const selected = applications.filter((app) => selectedSet.has(app.id));
  // Revalidar toda la decisión: ni expedientes ajenos ni estados ya decididos.
  if (!selected.length || selected.length !== selectedSet.size || selected.some((app) =>
    app.jobPostingId !== jobPostingId || !puedeAvanzar(app, method, elegiblesPorRanking)
  )) {
    return { updatedApplications: applications, updatedCandidates: candidates, newActivities, newDecisions, newDrafts };
  }
  const closedCandidateIds = new Set<string>();

  const updatedApplications = applications.map((app) => {
    if (app.jobPostingId !== jobPostingId) return app;
    if (selectedSet.has(app.id)) {
      // 1. Avanzar a Preseleccionado
      const previousStage = app.stage;
      const viaTopN = !isEligibleForTopN(app, method).eligible;   // entró por el ranking de embeddings
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
        details: viaTopN
          ? 'Candidato promovido a la etapa de Preselección por estar en el Top-N del ranking por Score Embeddings.'
          : `Candidato promovido a la etapa de Preselección mediante evaluación con método ${method}.`,
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
        criteriaVersion,
        evaluationContext: {
          llmScore: app.llmScore,
          method,
          ...(viaTopN ? { embeddingScore: app.embeddingMatch?.score ?? null, viaTopN: true } : {}),
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
      (isEligibleForTopN(app, method).eligible || Boolean(evaluadosPorRanking?.has(app.id)))
    ) {
      closedCandidateIds.add(app.candidateId);
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
        criteriaVersion,
        evaluationContext: {
          llmScore: app.llmScore,
          method,
        },
        notes: `No seleccionado en corte de mejores perfiles.`,
      });

      const cand = candidates.find((c) => c.id === app.candidateId);
      newDrafts.push({
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        applicationId: app.id, to: cand?.email || '', templateType: 'cierre', lang: 'es',
        subject: `Resultado de su postulación: ${jobPostingTitle} · ESAN`,
        body: `Estimado(a) ${cand?.name || 'Candidato'},\n\nGracias por participar en "${jobPostingTitle}". En esta oportunidad su postulación no continúa. Conservaremos su perfil en el Banco de Talento para futuras oportunidades.\n\nEquipo de GTHC · Universidad ESAN`,
        status: 'borrador', updatedAt: now,
      });

      return updatedApp;
    }

    return app;
  });

  return {
    updatedApplications,
    updatedCandidates: candidates.map((c) => closedCandidateIds.has(c.id)
      ? { ...c, savedInTalentPool: true, talentPoolOriginJob: jobPostingTitle } : c),
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
  criteriaVersion?: string;
  method?: EvaluationMethod;
}): {
  updatedApplications: Application[];
  updatedCandidates: Candidate[];
  newActivity: ActivityLog;
  newDecision: DecisionLog;
} | null {
  const {
    applicationId,
    applications,
    candidates,
    jobPostingTitle,
    author = 'Equipo de GTHC',
    reason = 'Liberación manual por el evaluador',
    criteriaVersion = 'v1.0',
    method = 'LLM',
  } = params;

  const target = applications.find((app) => app.id === applicationId);
  if (!target || target.stage === 'no_continua' || target.stage === 'contratado' || !reason.trim()) return null;

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
    criteriaVersion,
    evaluationContext: {
      llmScore: appTarget?.llmScore ?? null,
      method,
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
    if (!Number.isFinite(crit.weightPct) || crit.weightPct < 0) return null;
    if (crit.weightPct > 0 && !isValidScore(scoreItem?.score)) return null;
    if (scoreItem && isValidScore(scoreItem.score)) {
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
