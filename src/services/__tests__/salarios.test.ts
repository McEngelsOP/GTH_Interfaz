import { describe,it,expect } from 'vitest';
import { compararSueldo,extraerSueldoPretendido } from '../salarios.ts';
describe('comparación salarial',()=>{
 it('verde para menor o igual',()=>{expect(compararSueldo(4000,3500)).toBe('dentro');expect(compararSueldo(4000,4000)).toBe('dentro')});
 it('rojo para superior y pendiente si faltan datos',()=>{expect(compararSueldo(4000,5000)).toBe('supera');expect(compararSueldo(null,3500)).toBe('pendiente')});
 it('lee campo explícito, no inventa un sueldo',()=>{expect(extraerSueldoPretendido([{'Sueldo pretendido':'S/ 3,500'}])).toBe(3500);expect(extraerSueldoPretendido([{Nombre:'Ana'}])).toBe(null)});
});
