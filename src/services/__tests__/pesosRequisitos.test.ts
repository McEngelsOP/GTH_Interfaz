import { describe, expect, it } from 'vitest';
import type { RankingRow } from '../bumeranSync.ts';
import {
  agregarRequisito, alternarActivo, aplicarPesos, cambiarPeso, participacion, pesosParaCriterios, pesosValidos,
  PESO_INICIAL, SIN_INFORMACION, type RequisitoPeso,
} from '../pesosRequisitos.ts';

const req = (etiqueta: string, peso: number, activo = true, origen: RequisitoPeso['origen'] = 'bumeran'): RequisitoPeso =>
  ({ etiqueta, peso, activo, origen });

describe('pesos independientes', () => {
  const tres = [req('A', 50), req('B', 50), req('C', 50)];

  it('cambiar un peso no toca los demás y se limita a 0-100', () => {
    expect(cambiarPeso(tres, 0, 80).map((r) => r.peso)).toEqual([80, 50, 50]);
    expect(cambiarPeso(tres, 1, 150)[1].peso).toBe(100);
    expect(cambiarPeso(tres, 1, -5)[1].peso).toBe(0);
    expect(cambiarPeso(tres, 1, NaN)[1].peso).toBe(0);
  });

  it('añadir no cambia los demás; el nuevo entra con el peso inicial', () => {
    const r = agregarRequisito(tres, '  Experiencia   en sector educativo ')!;
    expect(r.map((x) => x.peso)).toEqual([50, 50, 50, PESO_INICIAL]);
    expect(r[3]).toMatchObject({ etiqueta: 'Experiencia en sector educativo', origen: 'manual', activo: true });
  });

  it('no añade vacíos ni repetidos (sin distinguir mayúsculas)', () => {
    expect(agregarRequisito(tres, '   ')).toBeNull();
    expect(agregarRequisito(tres, 'b')).toBeNull();
  });

  it('desactivar conserva el peso y no cambia los demás', () => {
    const r = alternarActivo(tres, 0);
    expect(r[0]).toMatchObject({ activo: false, peso: 50 });
    expect(alternarActivo(r, 0)[0].activo).toBe(true);
  });

  it('exige al menos un activo con peso mayor que 0', () => {
    expect(pesosValidos(tres)).toBe(true);
    expect(pesosValidos([req('A', 0), req('B', 70, false)])).toBe(false);
  });

  it('participación = peso / suma de activos', () => {
    expect(participacion([req('A', 100), req('B', 50), req('C', 50), req('D', 90, false)])).toEqual([50, 25, 25, 0]);
  });

  it('pesos por criterio: desactivado = 0, sin guardar = peso inicial', () => {
    expect(pesosParaCriterios(['A', 'b ', 'Nuevo'], [req('a', 80), req('B', 30, false)])).toEqual([80, 0, PESO_INICIAL]);
  });
});

describe('aplicarPesos', () => {
  const fila = (id: string, sims: number[], ranking: number, extra: Partial<RankingRow> = {}): RankingRow => ({
    id_postulante: id, criterios_version: 'v', backend: 'e5', ranking, score: 0.5, req_sims: sims, req_fragmentos: [],
    explicacion: 'ok', calculado_at: null, req_sims_bruto: sims,
    score_bruto: sims.length ? sims.reduce((s, x) => s + x, 0) / sims.length : 0, ...extra,
  });
  // P1 fuerte en A, P2 fuerte en B; con pesos iguales gana P1 por poco.
  const filas = [fila('P1', [0.9, 0.5], 1), fila('P2', [0.4, 0.95], 2), fila('P3', [0.6, 0.6], 3)];
  const orden = (rows: RankingRow[]) => [...rows].sort((a, b) => a.ranking! - b.ranking!).map((r) => r.id_postulante);

  it('sin pesos guardados deja el ranking igual', () => {
    expect(aplicarPesos(filas, ['A', 'B'], [])).toBe(filas);
  });

  it('pesos iguales devuelven el ranking original sin tocarlo', () => {
    expect(aplicarPesos(filas, ['A', 'B'], [req('A', 50), req('B', 50)])).toBe(filas);
    expect(aplicarPesos(filas, ['A', 'B'], [req('A', 80), req('B', 80)])).toBe(filas);
  });

  it('parte del puntaje original: solo suma el efecto del cambio de pesos', () => {
    // Un score_bruto con ruido de redondeo se conserva: el ajuste no recalcula desde cero.
    const conRuido = [fila('P1', [0.9, 0.5], 1, { score_bruto: 0.7004 }), fila('P2', [0.9, 0.5], 2, { score_bruto: 0.7 })];
    expect(orden(aplicarPesos(conRuido, ['A', 'B'], [req('A', 60), req('B', 40)]))).toEqual(['P1', 'P2']);
  });

  it('subir el peso de B reordena y reescala 0-1 dentro del aviso', () => {
    const r = aplicarPesos(filas, ['A', 'B'], [req('A', 10), req('B', 100)]);
    expect(orden(r)).toEqual(['P2', 'P3', 'P1']);
    expect(Math.max(...r.map((x) => x.score!))).toBe(1);
    expect(Math.min(...r.map((x) => x.score!))).toBe(0);
  });

  it('desactivar un requisito lo saca del puntaje', () => {
    expect(orden(aplicarPesos(filas, ['A', 'B'], [req('A', 50), req('B', 50, false)]))).toEqual(['P1', 'P3', 'P2']);
  });

  it('los CV sin información quedan al final con su puntaje', () => {
    const vacio = fila('P0', [], 4, { explicacion: SIN_INFORMACION, score: 0, req_sims_bruto: null });
    const r = aplicarPesos([...filas, vacio], ['A', 'B'], [req('A', 10), req('B', 100)]);
    expect(orden(r).at(-1)).toBe('P0');
    expect(r.find((x) => x.id_postulante === 'P0')!.score).toBe(0);
  });

  it('sin similitudes originales (ranking antiguo) no cambia nada', () => {
    const viejas = filas.map((f) => ({ ...f, req_sims_bruto: undefined }));
    expect(aplicarPesos(viejas, ['A', 'B'], [req('A', 10), req('B', 100)])).toBe(viejas);
  });
});
