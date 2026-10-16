import type { Application, Candidate, JobPosting, Stage } from '../types/index.ts';
import { supabase } from './supabase.ts';

export const PIPELINE_STAGES = [
  { id: 'postulado', label: 'Postulado', desc: 'Recepción y revisión de perfiles' },
  { id: 'preseleccionado', label: 'Preseleccionado', desc: 'Invitación a Multitest' },
  { id: 'en_entrevista', label: 'En entrevista', desc: 'Coordinación y cierre de selección' },
  { id: 'contratado', label: 'Contratado', desc: 'Incorporación confirmada' },
] as const;
export const pipelineStage = (stage: Stage): Stage => stage === 'en_evaluacion' || stage === 'en_oferta' ? 'en_entrevista' : stage;
export const workflowJobId = (job: JobPosting) => job.bumeran?.avisoId || job.id;
export const workflowCandidateId = (candidate: Candidate) => candidate.importedProfile?.externalId || candidate.id;
export type WorkflowAction = 'multitest' | 'agradecimiento' | 'entrevista';
export interface SharedAction {
  aviso_id: string; id_postulante: string; accion: WorkflowAction;
  estado: 'preparado' | 'confirmado'; creado_por: string; creado_at: string;
  detalle: { asunto: string; mensaje: string; canal: 'correo' | 'whatsapp'; fecha?: string; lugar?: string; destinatario: string };
}
export interface WorkflowRow { id_postulante: string; etapa: Stage }
export const WORKFLOW_SETUP_ERROR = 'No se pudo sincronizar el avance. Comprueba la conexión, los permisos y el SQL de avance compartido en GTH_Bumeran.';

export async function loadWorkflow(job: JobPosting, apps: Application[], candidates: Candidate[]) {
  if (!supabase) throw new Error(WORKFLOW_SETUP_ERROR);
  const map = new Map(candidates.map(c => [c.id, c]));
  const seeds = apps.map(app => {
    const candidate = map.get(app.candidateId);
    if (!candidate) throw new Error('Faltan datos del candidato. Recarga los perfiles.');
    return { id_postulante: workflowCandidateId(candidate), etapa: pipelineStage(app.stage) };
  });
  // El RPC inserta únicamente expedientes nuevos; nunca reemplaza las decisiones del equipo.
  for (let start = 0; start < seeds.length; start += 200) {
    const result = await supabase.rpc('gth_iniciar_avance', { p_aviso: workflowJobId(job), p_filas: seeds.slice(start, start + 200) });
    if (result.error) throw new Error(WORKFLOW_SETUP_ERROR);
  }
  const stages: WorkflowRow[] = [], actions: SharedAction[] = [];
  for (let start = 0; ; start += 500) {
    const result = await supabase.from('gth_avance').select('id_postulante,etapa').eq('aviso_id', workflowJobId(job)).order('id_postulante').range(start, start + 499);
    if (result.error) throw new Error(WORKFLOW_SETUP_ERROR);
    stages.push(...result.data);
    if (result.data.length < 500) break;
  }
  for (let start = 0; ; start += 500) {
    const result = await supabase.from('gth_acciones').select('*').eq('aviso_id', workflowJobId(job)).order('id_postulante').order('accion').range(start, start + 499);
    if (result.error) throw new Error(WORKFLOW_SETUP_ERROR);
    actions.push(...result.data);
    if (result.data.length < 500) break;
  }
  return { stages, actions };
}

export async function persistStageChanges(job: JobPosting, before: Application[], after: Application[], candidates: Candidate[]) {
  if (!supabase) return;
  const changes = after.filter(app => before.some(prev => prev.id === app.id && prev.stage !== app.stage));
  if (!changes.length) return;
  await loadWorkflow(job, before, candidates);
  const result = await supabase.rpc('gth_mover_etapas', { p_aviso: workflowJobId(job), p_cambios: changes.map(app => {
    const candidate = candidates.find(c => c.id === app.candidateId)!;
    return { id_postulante: workflowCandidateId(candidate), anterior: pipelineStage(before.find(prev => prev.id === app.id)!.stage), nueva: pipelineStage(app.stage) };
  }) });
  if (result.error) throw new Error('El expediente cambió o tiene una comunicación en preparación. Actualiza el tablero y revisa antes de repetir la acción.');
}

export async function reserveCommunication(job: JobPosting, action: WorkflowAction, recipients: { candidate: Candidate; detail: SharedAction['detalle'] }[]) {
  if (!supabase) throw new Error(WORKFLOW_SETUP_ERROR);
  const result = await supabase.rpc('gth_preparar_accion', { p_aviso: workflowJobId(job), p_accion: action,
    p_destinatarios: recipients.map(({ candidate, detail }) => ({ id_postulante: workflowCandidateId(candidate), detalle: detail })) });
  if (result.error) throw new Error('La acción ya fue registrada, está en preparación por otro colaborador o cambió la etapa. Actualiza los destinatarios.');
}
export async function finishCommunication(job: JobPosting, action: WorkflowAction, ids: string[], cancel = false) {
  if (!supabase) throw new Error(WORKFLOW_SETUP_ERROR);
  const result = await supabase.rpc('gth_finalizar_accion', { p_aviso: workflowJobId(job), p_accion: action, p_ids: ids, p_cancelar: cancel });
  if (result.error) throw new Error('No se pudo actualizar la comunicación. Solo quien la preparó puede confirmarla o liberarla.');
}
