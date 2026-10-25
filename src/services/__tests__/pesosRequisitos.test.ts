import { describe, expect, it } from 'vitest';
import {
  agregarRequisito, alternarActivo, cambiarPeso, participacion, pesosValidos, PESO_INICIAL, type RequisitoPeso,
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
});
