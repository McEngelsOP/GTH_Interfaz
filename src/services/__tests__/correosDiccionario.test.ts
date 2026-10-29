import { describe, expect, it } from 'vitest';
import type { AppStateData, Candidate } from '../../types/index.ts';
import { aplicarCorreo, correoValido } from '../correosPostulante.ts';
import { normalizarEmpresa } from '../diccionarioEmpresas.ts';
import { correoVigente } from '../candidateContact.ts';

const ficha = (id: string, externalId: string, correo: string) => ({
  id, name: id, email: correo, phone: null, currentTitle: '', currentCompany: '', source: 'Bumeran', summary: '', rawCvText: '',
  savedInTalentPool: false, importedProfile: { documentType: '', documentNumber: '', externalId, emails: [correo], records: [{ 'E-Mail': correo }] },
}) as Candidate;

describe('correo corregido del postulante', () => {
  it('se aplica a todas sus fichas (todos sus avisos) y gana sobre el del CSV', () => {
    const state = { candidates: [ficha('a1', 'bum-1', 'viejo@x.com'), ficha('a2', 'bum-1', 'viejo@x.com'), ficha('b', 'bum-2', 'otro@x.com')] } as AppStateData;
    const nuevo = aplicarCorreo(state, 'bum-1', ' Nuevo@X.com ');
    expect(nuevo.candidates.map(correoVigente)).toEqual(['nuevo@x.com', 'nuevo@x.com', 'otro@x.com']);
    expect(aplicarCorreo(state, 'nadie', 'a@b.co')).toBe(state);
  });
  it('valida el formato', () => {
    expect([correoValido('ana@esan.edu.pe'), correoValido('ana@'), correoValido(' ')]).toEqual([true, false, false]);
  });
});

describe('diccionario de empresas', () => {
  it('normaliza como el servidor: minúsculas, sin tildes ni símbolos', () => {
    expect(normalizarEmpresa('  Telefónica  del Perú S.A.A. ')).toBe('telefonica del peru s.a.a.');
    expect(normalizarEmpresa('Procter & Gamble')).toBe('procter & gamble');
  });
});
