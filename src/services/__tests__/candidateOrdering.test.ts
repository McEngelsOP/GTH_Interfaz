import { it, expect } from 'vitest';
import { compareCandidateNames } from '../candidateOrdering.ts';

it('ordena nombres según el alfabeto español y conserva la posición de la ñ', () => {
  const names = ['Zoe Prueba', 'Óscar Prueba', 'Beatriz Prueba', 'Álvaro Prueba', 'natalia Ejemplo', 'Ñora Prueba', 'Carlos Prueba', 'ana Ejemplo'];
  expect([...names].sort(compareCandidateNames)).toEqual([
    'Álvaro Prueba', 'ana Ejemplo', 'Beatriz Prueba', 'Carlos Prueba', 'natalia Ejemplo', 'Ñora Prueba', 'Óscar Prueba', 'Zoe Prueba',
  ]);
  expect(compareCandidateNames('  ÁNA Ejemplo ', 'ana ejemplo')).toBe(0);
});
