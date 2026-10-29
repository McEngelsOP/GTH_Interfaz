import { describe, expect, it } from 'vitest';
import type { Candidate } from '../../types/index.ts';
import {
  CRITERIOS_BASE, intensidadDePorcentaje, intensidadDePuntos, limitarLinea, limitarPenalizacion,
  pesoBaseHerramientas, porcentajeDePeso, puntosDeBono,
} from '../criteriosClasificacion.ts';
import { CRITERIOS_CLASIFICACION } from '../../config/criteriosClasificacion.ts';
import { preguntasDelAviso } from '../../components/candidate/PreguntasAviso.tsx';

describe('criterios y pesos', () => {
  it('cinco criterios de la matriz: experiencia en 100, los demás en 50 y la rotación con 0.5 de base', () => {
    expect(CRITERIOS_CLASIFICACION.map((c) => c.clave)).toEqual(['experiencia', 'rotacion', 'rubro', 'sobrecalificacion', 'escala_empresa']);
    expect(CRITERIOS_BASE).toEqual({ experiencia: 100, rotacion: 0.5, rubro: 50, sobrecalificacion: 50, escala_empresa: 50 });
  });
  it('las líneas van de 0 a 100 y la penalización de 0 a 1', () => {
    expect([limitarLinea(150), limitarLinea(-3), limitarLinea(NaN), limitarLinea(49.6)]).toEqual([100, 0, 0, 50]);
    expect([limitarPenalizacion(1.4), limitarPenalizacion(-1), limitarPenalizacion(0.456)]).toEqual([1, 0, 0.46]);
  });
  it('los bonos se muestran en puntos del score absoluto, iguales en todos los avisos', () => {
    expect(puntosDeBono(50, 0.25)).toBeCloseTo(0.025, 5);    // rubro: +0.025 por experiencia
    expect(puntosDeBono(50, 0.125)).toBeCloseTo(0.0125, 5);  // empresa Tier 1: +0.0125 por experiencia
    expect(intensidadDePuntos(0.025, 0.25)).toBe(50);
    expect(intensidadDePuntos(5, 0.25)).toBe(100);
  });
  it('herramientas: peso de partida 50 % en puestos que no son de tecnología y 100 % en los de tecnología', () => {
    expect(pesoBaseHerramientas('Analista de atención docente')).toBe(0.5);
    expect(pesoBaseHerramientas('Analista de Datos')).toBe(1);
    expect(porcentajeDePeso(50, 0.5)).toBe(50);
    expect(intensidadDePorcentaje(100, 0.5)).toBe(100);
    expect(intensidadDePorcentaje(100, 1)).toBe(50);
  });
});

describe('preguntas del aviso', () => {
  const candidato = (record: Record<string, string>) => ({ importedProfile: { records: [{ Nombre: 'Ana' }, record] } }) as unknown as Candidate;
  it('toma las preguntas de la fila más reciente tal cual, sin los campos de experiencia ni datos personales', () => {
    const p = preguntasDelAviso(candidato({
      Nombre: 'Ana', '¿Tienes portafolio? Adjunta el link': 'https://behance.net/ana', '¿?Cuál es tu expectativa salarial?': '2500',
      'Indícanos tu grado académico actual': 'Bachiller', 'Exp[1] Puesto': 'Diseñadora',
    }));
    expect(p).toEqual([
      { pregunta: '¿Tienes portafolio? Adjunta el link', respuesta: 'https://behance.net/ana' },
      { pregunta: '¿Cuál es tu expectativa salarial?', respuesta: '2500' },
      { pregunta: 'Indícanos tu grado académico actual', respuesta: 'Bachiller' },
    ]);
  });
  it('sin preguntas devuelve una lista vacía', () => {
    expect(preguntasDelAviso(candidato({ Nombre: 'Ana' }))).toEqual([]);
  });
});
