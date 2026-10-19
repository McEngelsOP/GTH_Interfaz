import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchHistorialPostulaciones } from '../postulaciones.ts';
import { fetchBaseExportacion, fetchBasePagina, SIN_FILTROS, type Persona } from '../baseCentralizada.ts';

const persona = (id: number) => ({ id: String(id), nombre: `Persona ${id}`, cv: { estado: 'pendiente', enlace: null, vista: null } } as Persona);
function clientFor(reply: (name: string, args: Record<string, unknown>) => unknown) {
  const rpc = vi.fn((name: string, args: Record<string, unknown>) => {
    const result = Promise.resolve(reply(name, args));
    return Object.assign(result, { abortSignal: () => result });
  });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe('consultas de postulaciones', () => {
  it('consulta la identidad del aviso sin enviar documentos ni correos al endpoint', async () => {
    const { client, rpc } = clientFor(() => ({ data: [{ aviso_id: 'A', score: 0 }], error: null }));
    expect((await fetchHistorialPostulaciones(client, 'A', 'p1'))[0].score).toBe(0);
    expect(rpc).toHaveBeenCalledWith('gth_historial_postulaciones', { p_aviso_id: 'A', p_id_postulante: 'p1' });
  });
  it('distingue el historial vacío de una consulta que no está disponible', async () => {
    const empty = clientFor(() => ({ data: [], error: null }));
    expect(await fetchHistorialPostulaciones(empty.client,'A','p1')).toEqual([]);
    const unavailable = clientFor(() => ({ data: null, error: { code: 'PGRST202' } }));
    await expect(fetchHistorialPostulaciones(unavailable.client,'A','p1')).rejects.toThrow('todavía no está disponible');
  });
  it('exporta todas las páginas filtradas y no solamente las 50 personas de pantalla', async () => {
    const { client, rpc } = clientFor((_name, args) => {
      const pagina = args.p_pagina as number;
      return { data: { personas: Array.from({ length: pagina === 1 ? 250 : 12 }, (_, i) => persona((pagina - 1) * 250 + i)), total: 262 }, error: null };
    });
    const result = await fetchBaseExportacion(client, { ...SIN_FILTROS, texto: 'selección' });
    expect(result).toHaveLength(262);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls.every(([, args]) => (args.p_filtros as typeof SIN_FILTROS).texto === 'selección' && args.p_por_pagina === 250 && args.p_incluir_resumen === false)).toBe(true);
  });
  it('identifica la cancelación por tiempo de espera sin atribuirla a la conexión', async () => {
    const { client, rpc } = clientFor(() => ({ data: null, error: { code: '57014' } }));
    await expect(fetchBasePagina(client,SIN_FILTROS,1)).rejects.toThrow('tardó demasiado');
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('no disfraza un error de permisos de base vacía ni inicia la descarga antigua', async () => {
    const { client, rpc } = clientFor(() => ({ data: null, error: { code: '42501' } }));
    await expect(fetchBasePagina(client,SIN_FILTROS,1)).rejects.toThrow('No se pudo leer');
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
