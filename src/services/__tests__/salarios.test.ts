import { describe, it, expect } from 'vitest';
import { compararSueldo, evaluarAjusteSalarial, extraerSueldoPretendido, leerSueldo } from '../salarios.ts';
import { analyzeCandidateTables, applyCandidateImport } from '../candidateImport.ts';
import { estadoConConvocatoriaDePrueba } from '../../../tests/fixtures/convocatoriaDePrueba.ts';

describe('comparación salarial', () => {
  const job = estadoConConvocatoriaDePrueba().jobPostings[0];
  const app = { ...estadoConConvocatoriaDePrueba().applications[0], expectedSalary: 4500,
    embeddingMatch: { score: .7, criteriaVersion: job.criteriaVersion } } as Parameters<typeof evaluarAjusteSalarial>[1];
  it('por defecto estricto: el exceso se señala aunque tenga puntaje alto', () => {
    expect(evaluarAjusteSalarial({ monto: 4000, modo: 'estricto', admiteModo: true }, app, job)).toBe('supera');
  });
  it.each([.7, .8, .9, 1])('manejable con puntaje vigente alto (%s), sin cambiar los importes ni el puntaje', score => {
    const candidato = { ...app, embeddingMatch: { ...app.embeddingMatch!, score } };
    const antes = structuredClone(candidato);
    expect(evaluarAjusteSalarial({ monto: 4000, modo: 'manejable', admiteModo: true }, candidato, job)).toBe('manejable');
    expect(candidato).toEqual(antes);
  });
  it.each([.6999, 0, NaN, Infinity, 1.01])('puntaje %s no justifica marcar el exceso como manejable', score => {
    expect(evaluarAjusteSalarial({ monto: 4000, modo: 'manejable', admiteModo: true },
      { ...app, embeddingMatch: { ...app.embeddingMatch!, score } }, job)).toBe('supera');
  });
  it('puntajes ausentes o antiguos no justifican negociación; montos ausentes quedan pendientes', () => {
    const criterio = { monto: 4000, modo: 'manejable' as const, admiteModo: true };
    expect(evaluarAjusteSalarial(criterio, { ...app, embeddingMatch: undefined }, job)).toBe('supera');
    expect(evaluarAjusteSalarial(criterio, { ...app, embeddingMatch: { ...app.embeddingMatch!, criteriaVersion: 'vieja' } }, job)).toBe('supera');
    expect(evaluarAjusteSalarial(null, app, job)).toBe('pendiente');
    expect(evaluarAjusteSalarial({ ...criterio, monto: null }, app, job)).toBe('pendiente');
    expect(evaluarAjusteSalarial(criterio, { ...app, expectedSalary: null }, job)).toBe('pendiente');
    expect(evaluarAjusteSalarial(criterio, { ...app, expectedSalary: 4000 }, job)).toBe('dentro');
    expect(evaluarAjusteSalarial(criterio, { ...app, expectedSalary: 3500 }, job)).toBe('dentro');
  });
  it('verde para menor o igual y rojo solo para superior', () => {
    expect(compararSueldo(4000, 3500)).toBe('dentro');
    expect(compararSueldo(4000, 4000)).toBe('dentro');
    expect(compararSueldo(4000, 4000.01)).toBe('supera');
  });
  it.each([null, undefined, 0, -1, NaN, Infinity, 1000001])('no compara importes sin evidencia válida: %s', invalido => {
    expect(compararSueldo(invalido, 3500)).toBe('pendiente');
    expect(compararSueldo(4000, invalido)).toBe('pendiente');
  });
  it.each(['S/ 3,500', 'S/. 3.500', '3500.00', 'PEN 3 500,00', '3,500.00 soles mensuales', '3.500,00'])('lee formatos locales y de exportación: %s', valor => {
    expect(leerSueldo(valor)).toBe(3500);
  });
  it.each(['3500-4500', 'entre 3500 y 4500', 'USD 3500', '$3500', '-3500', '3500 anual', '3500 por hora', 'a convenir', '0', 'NaN', '3,50,000', '3500.1234'])('no inventa montos ante datos ambiguos: %s', valor => {
    expect(leerSueldo(valor)).toBeNull();
  });
  it('solo extrae campos explícitos en soles, no sueldos de empleos anteriores ni texto de CV', () => {
    expect(extraerSueldoPretendido([{ 'Salario Bruto Pretendido': 'S/ 3,500' }])).toBe(3500);
    expect(extraerSueldoPretendido([{ 'Pretensión salarial (PEN)': '3500' }])).toBe(3500);
    expect(extraerSueldoPretendido([{ 'Exp[1] Sueldo pretendido': '5000', 'Sueldo pretendido USD': '3500', Nombre: 'Ana' }])).toBeNull();
  });
  it('lee la columna «Preferencia Salarial» de Bumeran y, si no hay, la pregunta salarial del aviso', () => {
    expect(extraerSueldoPretendido([{ 'Preferencia Salarial': '2500' }])).toBe(2500);
    expect(extraerSueldoPretendido([{ '¿Cuál es tu expectativa salarial neta para un cambio?': '2000', 'Preferencia Salarial': '1800' }])).toBe(1800);
    expect(extraerSueldoPretendido([{ 'Preferencia Salarial': '', '¿Cuáles son tus pretensiones salariales?': 'S/ 3,000' }])).toBe(3000);
    expect(extraerSueldoPretendido([{ '¿Cuál es tu expectativa salarial?': 'entre 2000 y 2500' }])).toBeNull();
    expect(extraerSueldoPretendido([{ '¿Tienes experiencia en ventas?': '3000' }])).toBeNull();
  });
  it('conserva sueldos distintos de una persona en dos avisos y los actualiza desde su propia fuente', () => {
    let state = estadoConConvocatoriaDePrueba();
    const base = state.jobPostings[0];
    state.jobPostings = [{ ...base, id: 'A', status: 'activa' }, { ...base, id: 'B', status: 'activa' }];
    const filas = (sueldo: string) => analyzeCandidateTables([{ fileName: 'bumeran.csv', rows: [
      ['Nombre', 'Email', 'Sueldo pretendido'], ['Ana', 'ana@example.test', sueldo],
    ] }]).rows;
    state = applyCandidateImport(state, 'A', filas('3500')).state;
    state = applyCandidateImport(state, 'B', filas('6000')).state;
    const sueldo = (id: string) => state.applications.find(a => a.jobPostingId === id)!.expectedSalary;
    expect(sueldo('A')).toBe(3500); expect(sueldo('B')).toBe(6000);
    state = applyCandidateImport(state, 'A', filas('4000')).state;
    expect(sueldo('A')).toBe(4000); expect(sueldo('B')).toBe(6000);
    state = applyCandidateImport(state, 'A', filas('')).state;
    expect(sueldo('A')).toBeNull(); expect(sueldo('B')).toBe(6000);
  });
});
