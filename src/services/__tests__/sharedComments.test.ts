import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSharedComments, persistSharedComment } from '../sharedComments.ts';
import { meetingState } from '../../../tests/fixtures/gthMeetingData.ts';

function clientWith(results: unknown[]) {
  const calls: [string, unknown[]][] = [];
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'upsert', 'delete']) {
    chain[method] = (...args: unknown[]) => { calls.push([method, args]); return chain; };
  }
  for (const method of ['single', 'range']) {
    chain[method] = (...args: unknown[]) => { calls.push([method, args]); return Promise.resolve(results.shift()); };
  }
  // Los DELETE terminan en select y son también awaitables.
  chain.then = (resolve: (value: unknown) => void) => resolve(results.shift());
  const from = vi.fn(() => chain);
  return { client: { from } as unknown as SupabaseClient, calls, from };
}
const job = meetingState.jobPostings[0];
const candidate = meetingState.candidates[0];

describe('comentarios compartidos', () => {
  it('lee todas las páginas con identidad externa y conserva convocatorias separadas', async () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ id_postulante: `p${i}`, texto: `Nota ${i}`, actualizado_at: '2026-10-15' }));
    const { client, calls } = clientWith([{ data: { user_id: 'member' } }, { data: rows }, { data: [{ id_postulante: 'last', texto: 'Última', actualizado_at: '2026-10-15' }] }]);
    const notes = await loadSharedComments(client, 'aviso-1');
    expect(Object.keys(notes)).toHaveLength(501);
    expect(notes['["aviso-1","last"]'].texto).toBe('Última');
    expect(notes['["aviso-2","last"]']).toBeUndefined();
    expect(calls.filter(([method]) => method === 'range').map(([, args]) => args)).toEqual([[0, 499], [500, 999]]);
  });
  it('rechaza lectura sin pertenecer al equipo y errores de red', async () => {
    const denied = clientWith([{ data: null, error: { message: 'denied' } }]);
    await expect(loadSharedComments(denied.client, 'aviso')).rejects.toThrow();
    expect(denied.from).toHaveBeenCalledTimes(1);
    const broken = clientWith([{ data: { user_id: 'member' } }, { error: { message: 'offline' } }]);
    await expect(loadSharedComments(broken.client, 'aviso')).rejects.toEqual({ message: 'offline' });
  });
  it('guarda por aviso y postulante externos, sin enviar autor ni fecha manipulables', async () => {
    const { client, calls } = clientWith([{ data: { texto: 'Nota', actualizado_at: '2026-10-15' } }]);
    await persistSharedComment(client, job, candidate, '  Nota  ', false);
    expect(calls.find(([method]) => method === 'upsert')?.[1]).toEqual([
      { aviso_id: 'QA-1410', id_postulante: 'qa-external-0', texto: 'Nota' }, { onConflict: 'aviso_id,id_postulante' },
    ]);
  });
  it('propaga un guardado rechazado y detecta borrados bloqueados por RLS', async () => {
    const rejected = clientWith([{ error: { message: 'denied' } }]);
    await expect(persistSharedComment(rejected.client, job, candidate, 'Nota', false)).rejects.toThrow('permisos');
    const blocked = clientWith([{ data: [] }]);
    await expect(persistSharedComment(blocked.client, job, candidate, '', true)).rejects.toThrow('permisos');
    const deleted = clientWith([{ data: [{ id_postulante: 'qa-external-0' }] }]);
    await expect(persistSharedComment(deleted.client, job, candidate, '', true)).resolves.toBeUndefined();
    expect(deleted.calls.filter(([method]) => method === 'eq').map(([, args]) => args)).toEqual([
      ['aviso_id', 'QA-1410'], ['id_postulante', 'qa-external-0'],
    ]);
  });
});
