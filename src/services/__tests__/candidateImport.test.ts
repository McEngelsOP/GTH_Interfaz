import { describe, it, expect } from 'vitest';
import { estadoConConvocatoriaDePrueba } from '../../../tests/fixtures/convocatoriaDePrueba.ts';
import { analyzeCandidateTables, applyCandidateImport, tableFromCSV } from '../candidateImport.ts';
import { parseStoredState } from '../storage.ts';
import { applyLlmEvaluationResult, getLlmEvaluationRequest } from '../llmIntegration.ts';

const fresh = () => estadoConConvocatoriaDePrueba();
const analyze = (csv: string) => analyzeCandidateTables([tableFromCSV(csv, 'perfiles-prueba.csv')]);
const sample = 'Nombre;Apellido;E-Mail;DNI;Exp[1] Puesto;Exp[1] Empresa;Exp[1] Descripción;Est[1] Titulo\nAna;Ejemplo; ANA@EXAMPLE.COM ;00123456;Analista;Empresa ficticia;"Funciones; con detalle\ny varias líneas";Ingeniería';

describe('importación de candidatos desde archivos', () => {
  it('detecta encabezados desplazados y separadores sin perder BOM, comillas, tildes ni ceros', () => {
    for (const delimiter of [';', ',', '\t', '|']) {
      const csv = '\uFEFFExportación de prueba\nFecha de prueba\n\n\n' + sample.replaceAll(';', delimiter);
      const result = analyze(csv);
      expect(result.errors).toEqual([]);
      expect(result.files[0].headerRow).toBe(5);
      expect(result.rows[0].candidate.name).toBe('Ana Ejemplo');
      expect(result.rows[0].candidate.email).toBe('ana@example.com');
      expect(result.rows[0].candidate.importedProfile?.documentNumber).toBe('00123456');
      expect(result.rows[0].candidate.rawCvText).toContain('Est[1] Titulo: Ingeniería');
      expect(result.rows[0].candidate.rawCvText).toContain('varias líneas');
    }
  });
  it('consolida filas repetidas y repetir el archivo no crea personas ni postulaciones', () => {
    const state = fresh(), analysis = analyze(sample + '\n' + sample.split('\n').slice(1).join('\n'));
    const first = applyCandidateImport(state, state.activeJobPostingId, analysis.rows);
    expect(first.plan.summary.newCandidates).toBe(1);
    expect(first.plan.summary.duplicateRows).toBe(1);
    expect(first.state.candidates).toHaveLength(1);
    expect(first.state.applications).toHaveLength(1);
    expect(first.state.applications[0].llmScore).toBeNull();
    expect(first.state.applications[0].mandatoryRequirementStatus).toBe('sin_verificar');
    const second = applyCandidateImport(first.state, state.activeJobPostingId, analysis.rows);
    expect(second.state).toEqual(first.state);
    expect(second.plan.summary.newApplications).toBe(0);
    expect(second.plan.summary.updatedCandidates).toBe(0);
    expect(parseStoredState(JSON.stringify(second.state))).toEqual(second.state);
    expect(state.candidates).toEqual([]);
  });
  it('conserva una ficha con experiencias diferentes y postulación independiente por convocatoria', () => {
    const state = fresh(), first = applyCandidateImport(state, state.activeJobPostingId, analyze(sample).rows).state;
    const candidateId = first.candidates[0].id;
    first.candidates[0].talentPoolNotes = 'Nota manual que debe conservarse.';
    first.applications[0].stage = 'en_entrevista'; first.applications[0].llmScore = 90;
    first.activities.push({ id: 'note-1', applicationId: first.applications[0].id, type: 'note', title: 'Nota', details: 'Historia previa', author: 'GTH', timestamp: new Date().toISOString() });
    const updated = sample.replace('Analista', 'Coordinadora').replace('Empresa ficticia', 'Otra empresa ficticia');
    const second = applyCandidateImport(first, first.jobPostings[1].id, analyze(updated).rows);
    expect(second.state.candidates).toHaveLength(1);
    expect(second.state.candidates[0].id).toBe(candidateId);
    expect(second.state.candidates[0].rawCvText).toContain('Otra empresa ficticia');
    expect(second.state.candidates[0].rawCvText).toContain('Empresa ficticia');
    expect(second.state.candidates[0].talentPoolNotes).toBe('Nota manual que debe conservarse.');
    expect(second.state.applications).toHaveLength(2);
    expect(second.state.applications[0]).toEqual(first.applications[0]);
    expect(second.state.activities).toEqual(first.activities);
    expect(second.state.applications[1].llmScore).toBeNull();
  });
  it('devuelve a evaluación pendiente solo expedientes pendientes cuando hay nueva información', () => {
    const state = fresh(), first = applyCandidateImport(state, state.activeJobPostingId, analyze(sample).rows).state;
    first.applications[0].llmScore = 85; first.applications[0].mandatoryRequirementStatus = 'verificado';
    const next = applyCandidateImport(first, state.activeJobPostingId, analyze(sample.replace('Ingeniería', 'Ingeniería y especialización')).rows).state;
    expect(next.applications[0].id).toBe(first.applications[0].id);
    expect(next.applications[0].llmScore).toBeNull();
    expect(next.applications[0].mandatoryRequirementStatus).toBe('sin_verificar');
  });
  it('conserva correos anteriores al enriquecer una ficha y vuelve a reconocerlos', () => {
    const state = fresh();
    const original = applyCandidateImport(state, state.activeJobPostingId, analyze(sample).rows).state;
    const expanded = sample.replace('ANA@EXAMPLE.COM', 'new@example.com').replace('Ingeniería', 'Ingeniería y formación adicional');
    const changed = applyCandidateImport(original, state.activeJobPostingId, analyze(expanded).rows).state;
    expect(changed.candidates[0].importedProfile?.emails).toContain('ana@example.com');
    const byOldEmail = analyze('Nombre;E-Mail\nAna Ejemplo;ana@example.com');
    const reimported = applyCandidateImport(changed, state.activeJobPostingId, byOldEmail.rows);
    expect(reimported.state.candidates).toHaveLength(1);
    expect(reimported.state.applications).toHaveLength(1);
  });
  it('distingue IDs externos de diferentes fuentes y conserva columnas sin perderlas silenciosamente', () => {
    const csv = 'Nombre;ID candidato;Fuente\nUno Ejemplo;42;Bumeran\nUno Ejemplo;42;Bumeran (archivo)\nOtro Ejemplo;42;Otro portal';
    const state = fresh(), result = applyCandidateImport(state, state.activeJobPostingId, analyze(csv).rows);
    expect(result.state.candidates).toHaveLength(2);
    expect(result.plan.summary.duplicateRows).toBe(1);
    const unnamed = analyze('Nombre;E-Mail;\nUno Ejemplo;uno@example.com;Dato sin etiqueta');
    expect(unnamed.rows).toHaveLength(0);
    expect(unnamed.issues[0].message).toContain('sin encabezado');
  });
  it('no elimina homónimos y señala correos compartidos con documentos contradictorios', () => {
    const csv = 'Nombre;E-Mail;DNI\nAlex Ejemplo;alex1@example.com;00000001\nAlex Ejemplo;alex2@example.com;00000002\nOtra Persona;alex1@example.com;00000003';
    const state = fresh(), result = applyCandidateImport(state, state.activeJobPostingId, analyze(csv).rows);
    expect(result.state.candidates).toHaveLength(2);
    expect(result.plan.summary.conflicts).toBe(1);
    expect(result.plan.issues[0].row).toBe(4);
  });
  it('tolera columnas reordenadas y omite registros inválidos sin importar scores declarados', () => {
    const data = analyze('Puntaje LLM;DNI;E-Mail;Nombre completo;Apellido\n100;00000001;bad;Persona Ejemplo;Ejemplo\n99;;missing@;Otro Nombre;\n90;00000003;ok@example.com;;');
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0].candidate.name).toBe('Persona Ejemplo');
    expect(data.rows[0].candidate.email).toBeNull();
    const result = applyCandidateImport(fresh(), fresh().activeJobPostingId, data.rows);
    expect(result.state.applications[0].llmScore).toBeNull();
    expect(data.issues.some((issue) => issue.message.includes('Falta el nombre'))).toBe(true);
    expect(data.issues.some((issue) => issue.message.includes('identificador fiable'))).toBe(true);
    expect(analyze('Nombre,E-Mail,E-Mail\nUno,a@example.com,a@example.com').errors.length).toBeGreaterThan(0);
    expect(analyze('ID,Perfil,Categoría,Requisito\n1,Docente,docente,Maestría').errors.length).toBeGreaterThan(0);
    expect(() => analyze('Nombre;E-Mail\n"Sin cerrar;u@example.com')).toThrow();
  });
});

describe('contrato del motor LLM', () => {
  it('valida identidad y versión, exige evidencia y conserva la validación humana pendiente', () => {
    const state = applyCandidateImport(fresh(), fresh().activeJobPostingId, analyze(sample).rows).state;
    const request = getLlmEvaluationRequest(state, state.applications[0].id);
    const result = { ...request, llmScore: 81, explanation: 'Explicación de prueba.', strengths: ['Fortaleza de prueba'], evidenceSummary: 'Evidencia de prueba.',
      criteriaBreakdown: Object.fromEntries(request.criteria.map((criterion) => [criterion.id, { score: 80, evidence: 'Fragmento ficticio del perfil.' }])) };
    const next = applyLlmEvaluationResult(state, result);
    expect(next.applications[0].llmScore).toBe(81);
    expect(next.applications[0].mandatoryRequirementStatus).toBe('sin_verificar');
    for (const patch of [{ candidateId: 'other' }, { jobPostingId: 'other' }, { criteriaVersion: 'old' }, { llmScore: 101 }, { explanation: '' }, { criteriaBreakdown: {} }]) {
      expect(() => applyLlmEvaluationResult(state, { ...result, ...patch })).toThrow();
    }
    state.applications[0].stage = 'preseleccionado';
    expect(() => applyLlmEvaluationResult(state, result)).toThrow();
  });
});
