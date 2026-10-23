import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cargarResumenTrayectoria, cargarDetalleTrayectoria, guardarRevisionTrayectoria } from '../trayectoria.ts';

const row = { id_postulante: 'persona', analisis_id: 'id', estado: 'patron_detectado', revision: null, calculado_at: null };
describe('trayectoria: contrato y consultas', () => {
  it('pagina el aviso sin una llamada por candidato', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ ...row, id_postulante: `p${i}` })) })
      .mockResolvedValueOnce({ data: [{ ...row, id_postulante: 'final' }] });
    const rows = await cargarResumenTrayectoria({ rpc } as unknown as SupabaseClient, 'A');
    expect(Object.keys(rows)).toHaveLength(501);
    expect(rpc).toHaveBeenNthCalledWith(2, 'gth_trayectoria_resumen', { p_aviso: 'A', p_desde: 500 });
  });
  it('migración ausente no se presenta como ausencia de patrón', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { code: 'PGRST202' } });
    await expect(cargarResumenTrayectoria({ rpc } as unknown as SupabaseClient, 'A')).rejects.toThrow('migración');
  });
  it('rechaza respuestas incompatibles', async () => {
    for (const data of [null, [{ ...row, estado: 'aprobado' }], [{ ...row, revision: 'falsa' }]]) {
      await expect(cargarResumenTrayectoria({ rpc: vi.fn().mockResolvedValue({ data }) } as unknown as SupabaseClient, 'A')).rejects.toThrow();
    }
  });
  it('valida revisión y no envía autor ni fecha manipulables', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { from } as unknown as SupabaseClient;
    await expect(guardarRevisionTrayectoria(client, 'id', 'justificado', ' ')).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
    await guardarRevisionTrayectoria(client, 'id', 'justificado', ' Contrato comprobado ');
    expect(insert).toHaveBeenCalledWith({ analisis_id: 'id', estado: 'justificado', texto: 'Contrato comprobado' });
  });
  it('no acepta un detalle ajeno a la solicitud', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'otro', detalle: {} } });
    const client = { from: () => ({ select: () => ({ eq: () => ({ single }) }) }) } as unknown as SupabaseClient;
    await expect(cargarDetalleTrayectoria(client, 'id')).rejects.toThrow('evidencia');
  });
  it('conserva fecha original y precisión calculadas por el scraper', async () => {
    const fecha = { original: 'junio de 2024', estado: 'valida', precision: 'mes', texto: 'jun. 2024' };
    const detalle = { estado: 'sin_patron', fecha_referencia: '2026-10-22', total_transiciones: 0,
      total_transiciones_posibles: 0, parametros: { transiciones: 3, ventana_meses: 6, horizonte_meses: 24 },
      ventana: null, ventana_posible: null, incidencias: [], notas: ['Modalidad sin especificar'],
      experiencias: [{ indice: 1, empresa: 'A', puesto: 'Analista', inicio: fecha.original, fin: '2025-12',
        motivo: 'Modalidad contractual no documentada', evidencia: '', excluida: false, fecha_inicio: fecha }] };
    const single = vi.fn().mockResolvedValue({ data: { id: 'id', detalle } });
    const client = { from: () => ({ select: () => ({ eq: () => ({ single }) }) }) } as unknown as SupabaseClient;
    expect((await cargarDetalleTrayectoria(client, 'id')).experiencias[0].fecha_inicio).toEqual(fecha);
    single.mockResolvedValue({ data: { id: 'id', detalle: { ...detalle, experiencias: [{ ...detalle.experiencias[0], fecha_inicio: { ...fecha, texto: 42 } }] } } });
    await expect(cargarDetalleTrayectoria(client, 'id')).rejects.toThrow('evidencia');
  });
  it('acepta detalles anteriores sin interpretación de fechas ni notas', async () => {
    const detalle = { estado: 'sin_patron', fecha_referencia: '2026-10-22', total_transiciones: 0,
      parametros: { transiciones: 3, ventana_meses: 6, horizonte_meses: 24 }, ventana: null, incidencias: [], experiencias: [] };
    const client = { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'id', detalle } }) }) }) }) } as unknown as SupabaseClient;
    expect(await cargarDetalleTrayectoria(client, 'id')).toEqual(detalle);
  });
});
