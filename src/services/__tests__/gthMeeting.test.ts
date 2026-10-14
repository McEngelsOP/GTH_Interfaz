import { describe, it, expect } from 'vitest';
import { meetingState } from '../../../tests/fixtures/gthMeetingData.ts';
import { whatsappNumber, candidateWhatsappUrl } from '../candidateContact.ts';
import { correosSeleccionados, dividirTandas, gmailComposeUrl, prepararCorreoMultitest } from '../emailComposition.ts';
import { internalCommentKey, updateInternalComment } from '../internalComments.ts';
import { parseStoredState } from '../storage.ts';
import { applyCandidateImport } from '../candidateImport.ts';
import { mergeBumeranJobs } from '../bumeranSync.ts';
import { moveApplicationStage } from '../workflow.ts';

describe('contacto de candidatos', () => {
  it('normaliza celulares peruanos y números internacionales explícitos sin adivinar otros números', () => {
    for (const phone of ['987 654 321', '+51 (987) 654-321', '51987654321', '0051 987654321']) expect(whatsappNumber(phone)).toBe('51987654321');
    expect(whatsappNumber('+34 612 345 678')).toBe('34612345678');
    for (const phone of [null, '', '123', '01 1234567', '5191234567', '612345678', '987654321 / 999123456', '987654321 ext 1']) expect(whatsappNumber(phone)).toBeNull();
  });
  it('codifica nombre y puesto en un mensaje neutral y no genera enlace sin celular', () => {
    const url = new URL(candidateWhatsappUrl({ name: 'Ana & María', phone: '987654321' }, 'I+D / selección')!);
    expect(url.hostname).toBe('wa.me'); expect(url.pathname).toBe('/51987654321');
    expect(url.searchParams.get('text')).toContain('Ana & María');
    expect(url.searchParams.get('text')).toContain('«I+D / selección»');
    expect(candidateWhatsappUrl({ name: 'Ana', phone: null }, 'Puesto')).toBeNull();
  });
  it('usa únicamente los correos elegidos, los deduplica y mantiene tandas de 50 en CCO', () => {
    const candidates = new Map(meetingState.candidates.map((candidate) => [candidate.id, candidate]));
    const emails = correosSeleccionados(meetingState.applications.slice(1, 4), candidates);
    expect(emails).toEqual(['persona1@example.com', 'persona2@example.com', 'persona3@example.com']);
    candidates.set('qa-person-2', { ...candidates.get('qa-person-2')!, email: ' Persona1@Example.com ' });
    expect(correosSeleccionados(meetingState.applications.slice(1, 4), candidates)).toHaveLength(2);
    expect(dividirTandas(Array.from({ length: 101 }, (_, i) => `${i}@example.com`)).map((batch) => batch.length)).toEqual([50, 50, 1]);
    const url = new URL(gmailComposeUrl(emails, 'Asunto & selección', 'Mensaje\ncon enlace'));
    expect(url.searchParams.get('bcc')).toBe(emails.join(',')); expect(url.searchParams.has('to')).toBe(false);
    expect(url.searchParams.get('su')).toBe('Asunto & selección'); expect(url.searchParams.get('body')).toBe('Mensaje\ncon enlace');
  });
  it('prepara la base de Multitest con enlace HTTPS y plazo explícito, sin elegir etapa ni enviar', () => {
    expect(prepararCorreoMultitest({ puesto: 'Selección', enlace: 'https://example.com/prueba?id=1', plazo: 'Hasta el 20 de octubre' }).mensaje).toContain('https://example.com/prueba?id=1');
    for (const enlace of ['https://', 'http://example.com', 'javascript:alert(1)', 'https://user:pass@example.com']) expect(() => prepararCorreoMultitest({ puesto: 'Puesto', enlace, plazo: '48 horas' })).toThrow();
    expect(() => prepararCorreoMultitest({ puesto: 'Puesto', enlace: 'https://example.com', plazo: '' })).toThrow();
  });
});

describe('comentarios locales y avance del tablero', () => {
  it('conserva el comentario al guardar, recargar y sincronizar el aviso', () => {
    const state = updateInternalComment(structuredClone(meetingState), 'qa-application-1', '  Llamar el viernes  ');
    const key = internalCommentKey(state.jobPostings[0], state.candidates[1]);
    const restored = parseStoredState(JSON.stringify(state))!;
    expect(restored.comentariosInternos?.[key].texto).toBe('Llamar el viernes');
    const synced = mergeBumeranJobs(restored, [{ ...restored.jobPostings[0], title: 'Aviso actualizado' }]);
    expect(synced.comentariosInternos).toEqual(restored.comentariosInternos);
    const reimported = applyCandidateImport(synced, synced.jobPostings[0].id, [{ fileName: 'bumeran.csv', row: 2,
      candidate: { ...synced.candidates[1], id: 'nuevo-id-importado', rawCvText: 'CV actualizado desde Bumeran',
        importedProfile: { ...synced.candidates[1].importedProfile!, records: [{ 'Exp[1] Descripción': 'CV actualizado desde Bumeran' }] } } }]).state;
    expect(reimported.comentariosInternos?.[key].texto).toBe('Llamar el viernes');
    expect(reimported.candidates.find((candidate) => candidate.importedProfile?.externalId === 'qa-external-1')?.rawCvText).toContain('CV actualizado desde Bumeran');
    expect(internalCommentKey({ ...state.jobPostings[0], id: 'nuevo-id-local' }, { ...state.candidates[1], id: 'nuevo-id-local' })).toBe(key);
    expect(state.activities).toEqual(meetingState.activities);
    expect(state.applications).toEqual(meetingState.applications);
  });
  it('permite editar y eliminar sin afectar otras notas ni convocatorias', () => {
    let state = updateInternalComment(structuredClone(meetingState), 'qa-application-1', 'Uno');
    state = updateInternalComment(state, 'qa-application-2', 'Dos');
    state = updateInternalComment(state, 'qa-application-1', 'Editado');
    const key = internalCommentKey(state.jobPostings[0], state.candidates[1]);
    expect(state.comentariosInternos?.[key].texto).toBe('Editado');
    state = updateInternalComment(state, 'qa-application-1', '  ');
    expect(state.comentariosInternos?.[key]).toBeUndefined(); expect(Object.keys(state.comentariosInternos!)).toHaveLength(1);
    expect(internalCommentKey({ ...state.jobPostings[0], bumeran: { ...state.jobPostings[0].bumeran!, avisoId: 'otro-aviso' } }, state.candidates[1])).not.toBe(key);
  });
  it('ignora comentarios dañados sin perder el resto del estado ni las notas válidas', () => {
    const state = updateInternalComment(structuredClone(meetingState), 'qa-application-1', 'Válido');
    const raw = { ...state, comentariosInternos: { ...state.comentariosInternos, roto: { texto: 123, at: 'inválida' } } };
    const restored = parseStoredState(JSON.stringify(raw))!;
    expect(restored.applications).toEqual(state.applications); expect(restored.comentariosInternos).toEqual(state.comentariosInternos);
  });
  it('avanza con motivo fijo y conserva las reglas de etapas y el historial', () => {
    const next = moveApplicationStage(meetingState, 'qa-application-1', 'preseleccionado', 'Movido desde el tablero de avance');
    expect(next.applications[1].stage).toBe('preseleccionado'); expect(next.decisionLogs[0].notes).toBe('Movido desde el tablero de avance');
    expect(moveApplicationStage(meetingState, 'qa-application-1', 'en_oferta', 'Movido desde el tablero de avance')).toBe(meetingState);
  });
});
