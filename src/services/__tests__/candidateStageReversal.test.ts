import { describe, expect, it } from 'vitest';
import { meetingState } from '../../../tests/fixtures/gthMeetingData.ts';
import { moveApplicationStage, validateStageTransition } from '../workflow.ts';
import type { Stage } from '../../types/index.ts';

describe('retroceso del tablero', () => {
  it.each([
    ['contratado', 'en_entrevista'],
    ['en_entrevista', 'preseleccionado'],
    ['preseleccionado', 'postulado'],
  ] as [Stage, Stage][])('permite %s → %s y conserva evaluaciones y correos', (from, to) => {
    const state = structuredClone(meetingState);
    const app = state.applications[0]; app.stage = from;
    const before = structuredClone(state);
    expect(validateStageTransition(app, to, 'LLM')).toBeNull();
    const next = moveApplicationStage(state, app.id, to, 'Corrección de etapa por GTHC');
    expect(state).toEqual(before);
    expect(next.applications[0].stage).toBe(to);
    expect(next.applications[0].embeddingMatch).toEqual(app.embeddingMatch);
    expect(next.emailDrafts).toEqual(state.emailDrafts);
    expect(next.decisionLogs[0]).toMatchObject({ applicationId: app.id, previousStage: from, newStage: to, notes: 'Corrección de etapa por GTHC' });
    expect(next.activities).toHaveLength(state.activities.length + 1);
  });
  it('sigue bloqueando saltos, descartados y movimientos sin motivo', () => {
    const state = structuredClone(meetingState); state.applications[0].stage = 'contratado';
    for (const target of ['postulado', 'preseleccionado', 'no_continua', 'contratado'] as Stage[]) {
      expect(moveApplicationStage(state, state.applications[0].id, target, 'Prueba')).toBe(state);
    }
    expect(moveApplicationStage(state, state.applications[0].id, 'en_entrevista', '')).toBe(state);
    state.applications[0].stage = 'no_continua';
    expect(moveApplicationStage(state, state.applications[0].id, 'postulado', 'Prueba')).toBe(state);
  });
});
