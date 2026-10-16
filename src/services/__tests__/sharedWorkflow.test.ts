import { describe, expect, it, vi, beforeEach } from 'vitest';
import { meetingState } from '../../../tests/fixtures/gthMeetingData.ts';
const { client, rpc, range, eq } = vi.hoisted(() => {
  const rpc = vi.fn(), range = vi.fn(), eq = vi.fn();
  const chain: Record<string, unknown> = {};
  for (const name of ['select', 'order']) chain[name] = vi.fn(() => chain);
  chain.eq = eq.mockImplementation(() => chain); chain.range = range;
  return { rpc, range, eq, client: { rpc, from: vi.fn(() => chain) } };
});
vi.mock('../supabase.ts', () => ({ supabase: client }));
import { loadWorkflow, persistStageChanges, reserveCommunication, finishCommunication, pipelineStage } from '../sharedWorkflow.ts';
const job = meetingState.jobPostings[0];
beforeEach(() => { vi.clearAllMocks(); rpc.mockResolvedValue({ error: null }); range.mockResolvedValue({ data: [], error: null }); });
describe('avance compartido', () => {
  it('usa identidades externas y nunca hace upsert de etapas locales', async () => {
    await loadWorkflow(job, meetingState.applications, meetingState.candidates);
    expect(rpc).toHaveBeenCalledWith('gth_iniciar_avance', { p_aviso: 'QA-1410', p_filas: meetingState.applications.map((a, i) => ({ id_postulante: `qa-external-${i}`, etapa: a.stage })) });
    expect(eq).toHaveBeenCalledWith('aviso_id', 'QA-1410');
  });
  it('pagina todas las etapas y acciones', async () => {
    range.mockResolvedValueOnce({ data: Array(500).fill({ id_postulante: 'a', etapa: 'postulado' }) }).mockResolvedValueOnce({ data: [{ id_postulante: 'ultimo', etapa: 'contratado' }] })
      .mockResolvedValueOnce({ data: Array(500).fill({ accion: 'multitest' }) }).mockResolvedValueOnce({ data: [{ accion: 'entrevista' }] });
    const result = await loadWorkflow(job, [], []);
    expect(result.stages).toHaveLength(501); expect(result.actions).toHaveLength(501);
    expect(range.mock.calls).toEqual([[0, 499], [500, 999], [0, 499], [500, 999]]);
  });
  it('propaga ausencia de migración o permisos y fallos de red', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '42883' } });
    await expect(loadWorkflow(job, meetingState.applications, meetingState.candidates)).rejects.toThrow('GTH_Bumeran');
    range.mockResolvedValueOnce({ error: { code: '42501' } });
    await expect(loadWorkflow(job, [], [])).rejects.toThrow('GTH_Bumeran');
  });
  it('compara etapa anterior en el servidor antes de escribir y rechaza la versión obsoleta', async () => {
    const before = meetingState.applications;
    const after = before.map((a, i) => i === 1 ? { ...a, stage: 'preseleccionado' as const } : a);
    await persistStageChanges(job, before, after, meetingState.candidates);
    expect(rpc).toHaveBeenLastCalledWith('gth_mover_etapas', { p_aviso: 'QA-1410', p_cambios: [{ id_postulante: 'qa-external-1', anterior: 'postulado', nueva: 'preseleccionado' }] });
    rpc.mockImplementation((name) => Promise.resolve({ error: name === 'gth_mover_etapas' ? { message: 'stale' } : null }));
    await expect(persistStageChanges(job, before, after, meetingState.candidates)).rejects.toThrow('El expediente cambió');
  });
  it('reserva sin confirmar envío, y propaga conflicto entre colaboradores', async () => {
    const candidate = meetingState.candidates[0];
    const detail = { asunto: 'Multitest', mensaje: 'Invitación', canal: 'correo' as const, destinatario: 'test@example.com' };
    await reserveCommunication(job, 'multitest', [{ candidate, detail }]);
    expect(rpc).toHaveBeenLastCalledWith('gth_preparar_accion', { p_aviso: 'QA-1410', p_accion: 'multitest', p_destinatarios: [{ id_postulante: 'qa-external-0', detalle: detail }] });
    expect(rpc).not.toHaveBeenCalledWith('gth_finalizar_accion', expect.anything());
    rpc.mockResolvedValueOnce({ error: { code: '23505' } });
    await expect(reserveCommunication(job, 'multitest', [{ candidate, detail }])).rejects.toThrow('otro colaborador');
    await finishCommunication(job, 'multitest', ['qa-external-0']);
    expect(rpc).toHaveBeenLastCalledWith('gth_finalizar_accion', { p_aviso: 'QA-1410', p_accion: 'multitest', p_ids: ['qa-external-0'], p_cancelar: false });
    await finishCommunication(job, 'multitest', ['qa-external-0'], true);
    expect(rpc).toHaveBeenLastCalledWith('gth_finalizar_accion', expect.objectContaining({ p_cancelar: true }));
  });
  it('incluye etapas antiguas en entrevista y conserva los cierres', () => {
    expect(pipelineStage('en_evaluacion')).toBe('en_entrevista'); expect(pipelineStage('en_oferta')).toBe('en_entrevista');
    expect(pipelineStage('no_continua')).toBe('no_continua'); expect(pipelineStage('contratado')).toBe('contratado');
  });
});
