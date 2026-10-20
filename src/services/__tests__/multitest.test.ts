import { describe, expect, it } from 'vitest';
import { faltantesRegistro, procesoSugerido, registroMultitest } from '../multitest.ts';
import type { Candidate } from '../../types/index.ts';

const candidato = (records: Record<string, string>[], extra: Partial<Candidate> = {}): Candidate => ({
  id: 'c1', name: 'Ana María Pérez Gómez', email: 'ana@example.com', phone: null, currentTitle: '', currentCompany: '',
  source: 'Bumeran', summary: '', rawCvText: '', savedInTalentPool: false,
  importedProfile: { documentType: 'DNI', documentNumber: '12345678', externalId: 'aperez', records }, ...extra,
});

describe('Multitest', () => {
  it('sugiere el proceso cuyo nombre está en el título del aviso, sin importar tildes ni mayúsculas', () => {
    expect(procesoSugerido('Asistente de Gestión Académica')).toBe('532');
    expect(procesoSugerido('Técnico de Mantenimiento')).toBe('527');
    expect(procesoSugerido('Analista de cobranzas')).toBe('');
  });

  it('toma los datos del formulario del CSV de Bumeran', () => {
    const r = registroMultitest(candidato([{ Nombre: 'Ana María', Apellido: 'Pérez Gómez', Edad: '27 años', 'Género': 'Femenino',
      'Nro. Documento': '87654321', 'E-Mail': 'ana.perez@example.com' }]), '532');
    expect(r).toEqual({ proceso: 'Asistente De Gestión Académica', nombres: 'Ana María', apellidos: 'Pérez Gómez', edad: '27',
      dni: '87654321', genero: 'F', correo: 'ana.perez@example.com' });
    expect(faltantesRegistro(r)).toEqual([]);
  });

  it('usa la fila más reciente del CSV cuando cambiaron los datos (p. ej. el correo)', () => {
    const r = registroMultitest(candidato([{ Nombre: 'Ana', Apellido: 'Pérez', 'E-Mail': 'antiguo@example.com' },
      { Nombre: 'Ana', Apellido: 'Pérez', 'E-Mail': 'nuevo@example.com' }]), '532');
    expect(r.correo).toBe('nuevo@example.com');
  });

  it('sin CSV usa el perfil y avisa lo que falta', () => {
    const r = registroMultitest(candidato([], { email: null }), '');
    expect(r).toMatchObject({ nombres: 'Ana María', apellidos: 'Pérez Gómez', dni: '12345678', genero: '', correo: '' });
    expect(faltantesRegistro(r)).toEqual(['proceso', 'correo']);
  });
});
