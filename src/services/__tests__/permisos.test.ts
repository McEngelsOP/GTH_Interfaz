import { describe, expect, it } from 'vitest';
import { INITIAL_APP_STATE } from '../../data/initialData.ts';
import type { AppStateData, JobPosting } from '../../types/index.ts';
import { estadoConConvocatoriaDePrueba } from '../../../tests/fixtures/convocatoriaDePrueba.ts';
import { Perfil, puedeVerSeccion, quitarAvisosNoVisibles, VISTA_ADMIN } from '../permisos.ts';
import { handleUsuarios } from '../../../server/usuarios.ts';

const perfil = (cambios: Partial<Perfil> = {}): Perfil => ({
  user_id: 'u1', email: 'a@esan.edu.pe', nombre: '', nivel: 'general', secciones: null, avisos: null,
  debe_cambiar_clave: false, activo: true, ...cambios,
});

describe('puedeVerSeccion', () => {
  it('sin Supabase todo está permitido salvo la administración', () => {
    expect(puedeVerSeccion(null, 'base_centralizada')).toBe(true);
    expect(puedeVerSeccion(null, VISTA_ADMIN)).toBe(false);
  });
  it('una cuenta maestra ve todo, también la administración', () => {
    expect(puedeVerSeccion(perfil({ nivel: 'maestro', secciones: [] }), VISTA_ADMIN)).toBe(true);
    expect(puedeVerSeccion(perfil({ nivel: 'maestro', secciones: [] }), 'comparador')).toBe(true);
  });
  it('una cuenta general solo ve sus secciones y las pantallas que dependen de ellas', () => {
    const p = perfil({ secciones: ['convocatorias', 'mejores_candidatos'] });
    expect(puedeVerSeccion(p, 'convocatorias')).toBe(true);
    expect(puedeVerSeccion(p, 'nueva_convocatoria')).toBe(true);
    expect(puedeVerSeccion(p, 'agregar_archivos')).toBe(true);
    expect(puedeVerSeccion(p, 'base_centralizada')).toBe(false);
    expect(puedeVerSeccion(p, VISTA_ADMIN)).toBe(false);
    expect(puedeVerSeccion(perfil(), 'base_centralizada')).toBe(true);
    expect(puedeVerSeccion(perfil(), VISTA_ADMIN)).toBe(false);
  });
});

describe('quitarAvisosNoVisibles', () => {
  const conAvisos = (): AppStateData => {
    const state = estadoConConvocatoriaDePrueba();
    const base = state.jobPostings[0];
    const bum = (avisoId: string): JobPosting => ({ ...structuredClone(base), id: `BUM-${avisoId}`, code: `BUM-${avisoId}`,
      bumeran: { avisoId, updatedAt: null, publicUrl: null, received: 0, rankingAt: null } as JobPosting['bumeran'] });
    state.jobPostings = [state.jobPostings[0], bum('100'), bum('200')];
    const app = (id: string, jobPostingId: string, candidateId: string) => ({ ...structuredClone(INITIAL_APP_STATE.applications[0] || {}),
      id, jobPostingId, candidateId, stage: 'postulado' }) as AppStateData['applications'][number];
    const cand = (id: string) => ({ id, name: id }) as AppStateData['candidates'][number];
    state.candidates = [cand('c1'), cand('c2'), cand('c3')];
    state.applications = [app('a1', 'BUM-100', 'c1'), app('a2', 'BUM-200', 'c2'), app('a3', 'BUM-200', 'c3'), app('a4', 'BUM-100', 'c3')];
    state.decisionLogs = [{ id: 'd1', jobPostingId: 'BUM-200', applicationId: 'a2' } as AppStateData['decisionLogs'][number]];
    state.comentariosInternos = { [JSON.stringify(['200', 'x'])]: { texto: 'secreto', at: '' }, [JSON.stringify(['100', 'x'])]: { texto: 'ok', at: '' } };
    state.activeJobPostingId = 'BUM-200';
    return state;
  };

  it('quita el aviso que dejó de verse con todo lo suyo y conserva lo demás', () => {
    const r = quitarAvisosNoVisibles(conAvisos(), new Set(['100']));
    expect(r.jobPostings.map((j) => j.id)).toEqual(['TEST-CONV-001', 'BUM-100']);
    expect(r.applications.map((a) => a.id)).toEqual(['a1', 'a4']);
    expect(r.candidates.map((c) => c.id)).toEqual(['c1', 'c3']);   // c3 sigue en el aviso 100
    expect(r.decisionLogs).toEqual([]);
    expect(Object.values(r.comentariosInternos || {}).map((c) => c.texto)).toEqual(['ok']);
    expect(r.activeJobPostingId).toBe('TEST-CONV-001');
  });
  it('no cambia nada si todos siguen visibles', () => {
    const state = conAvisos();
    expect(quitarAvisosNoVisibles(state, new Set(['100', '200']))).toBe(state);
  });
});

describe('api/usuarios', () => {
  const post = (body: unknown, headers: Record<string, string> = {}) => new Request('https://x/api/usuarios',
    { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  it('sin clave service_role responde 503', async () => {
    const r = await handleUsuarios(post({ accion: 'listar' }), { env: {} });
    expect(r.status).toBe(503);
  });
  it('solo acepta POST', async () => {
    const r = await handleUsuarios(new Request('https://x/api/usuarios'), { env: {} });
    expect(r.status).toBe(405);
  });
  it('sin sesión responde 403 sin consultar Supabase', async () => {
    const r = await handleUsuarios(post({ accion: 'crear', email: 'x@esan.edu.pe' }), { env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' } });
    expect(r.status).toBe(403);
  });
});
