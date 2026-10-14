import type { AppStateData } from '../../src/types/index.ts';
import { INITIAL_APP_STATE, INITIAL_JOB_POSTINGS } from '../../src/data/initialData.ts';

// ETAPA-I arranca sin convocatorias y storage.ts retira las del catálogo ficticio (REQ-2026-…).
// Las pruebas de importación y evaluación usan copias de dos de ellas con IDs propios, que sobreviven a guardar
// y recargar el estado. Solo existen mientras corren las pruebas; la app nunca las carga.
export const ID_CONVOCATORIA_DE_PRUEBA = 'TEST-CONV-001';
const COPIAS: [string, string][] = [['REQ-2026-DOC-088', ID_CONVOCATORIA_DE_PRUEBA], ['REQ-2026-DOC-089', 'TEST-CONV-002']];

export function estadoConConvocatoriaDePrueba(): AppStateData {
  const state = structuredClone(INITIAL_APP_STATE);
  state.jobPostings = COPIAS.map(([origen, id]) => ({
    ...structuredClone(INITIAL_JOB_POSTINGS.find((job) => job.id === origen)!), id, code: id }));
  state.activeJobPostingId = ID_CONVOCATORIA_DE_PRUEBA;
  return state;
}
