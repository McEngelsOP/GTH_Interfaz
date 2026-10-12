import { describe, expect, it } from 'vitest';
import { INITIAL_APP_STATE } from '../../data/initialData.ts';
import { analyzeCandidateTables, applyCandidateImport } from '../candidateImport.ts';
import { avisoToJob, BUMERAN_KNOCKOUT, equalCriteria, extractRequirements, mergeBumeranJobs, postulantesToTable, rankingToMatches, timeAgo } from '../bumeranSync.ts';
import type { PostulanteRow, RankingRow } from '../bumeranSync.ts';
import { hasValidCriteria } from '../workflow.ts';
import { parseStoredState } from '../storage.ts';

const OFERTA = `Importante Universidad busca Asistente

Requisitos :

Profesional técnico de Administración o afines.
- Mínimo 1 año de experiencia en atención al cliente.
Disponibilidad para trabajar de manera presencial en Surco.

Funciones:

Brindar soporte a los alumnos.

Beneficios:

EPS`;

const aviso = {
  aviso_id: '1110000001', titulo: 'Asistente de prueba', publicado_el: '2026-10-07', recibidos: 2,
  detalle_texto: OFERTA, detalle_json: { caracteristicas: ['Presencial', 'Atención al Cliente', 'Full-time', '2 vacantes disponibles'] },
  url_publica: 'https://example.test/aviso', ultimo_csv_at: '2026-10-12T00:42:00-05:00',
};

describe('avisos de Bumeran', () => {
  it('toma los requisitos publicados y omite la disponibilidad (que es el requisito obligatorio)', () => {
    expect(extractRequirements(OFERTA, 'x')).toEqual([
      'Profesional técnico de Administración o afines.', 'Mínimo 1 año de experiencia en atención al cliente.']);
    expect(extractRequirements('Funciones:\n\nAtender alumnos\n', 'x')).toEqual(['Atender alumnos']);
    expect(extractRequirements(null, 'Título')).toEqual(['Título']);
  });

  it('reparte pesos iguales que suman 100', () => {
    for (const n of [1, 3, 7]) expect(hasValidCriteria(equalCriteria(Array.from({ length: n }, (_, i) => `r${i}`)))).toBe(true);
  });

  it('convierte el aviso en una convocatoria activa y válida para el estado guardado', () => {
    const job = avisoToJob(aviso);
    expect(job).toMatchObject({ id: 'BUM-1110000001', status: 'activa', knockoutRule: BUMERAN_KNOCKOUT, vacancies: 2,
      department: 'Bumeran · Atención al Cliente', bumeran: { avisoId: '1110000001', updatedAt: aviso.ultimo_csv_at } });
    const state = mergeBumeranJobs(structuredClone(INITIAL_APP_STATE), [job]);
    expect(parseStoredState(JSON.stringify(state))?.jobPostings.at(-1)?.bumeran?.avisoId).toBe('1110000001');
  });

  it('agrega al final sin reordenar ni tocar las convocatorias existentes, y no cambia nada si ya está igual', () => {
    const base = structuredClone(INITIAL_APP_STATE);
    const once = mergeBumeranJobs(base, [avisoToJob(aviso)]);
    expect(once.jobPostings.slice(0, base.jobPostings.length)).toEqual(base.jobPostings);
    expect(mergeBumeranJobs(once, [avisoToJob(aviso)])).toBe(once);
  });

  it('importa los postulantes de la BD con el mismo importador y sin duplicar al repetir', () => {
    const rows: PostulanteRow[] = [
      { id_postulante: 'aprueba111', datos_json: { Nombre: 'Ana', Apellido: 'Prueba', 'E-Mail': 'ana@x.pe', 'Nro. Documento': '10000001', 'Exp[1] Puesto': 'Asistente' } },
      { id_postulante: 'bprueba222', datos_json: { Nombre: 'Beto', Apellido: 'Prueba', 'E-Mail': 'beto@x.pe', 'Nro. Documento': '10000002' } },
    ];
    const job = avisoToJob(aviso);
    const state = mergeBumeranJobs(structuredClone(INITIAL_APP_STATE), [job]);
    const analysis = analyzeCandidateTables([postulantesToTable('1110000001', rows)]);
    expect(analysis.rows.map((r) => r.candidate.importedProfile?.externalId)).toEqual(['aprueba111', 'bprueba222']);
    const first = applyCandidateImport(state, job.id, analysis.rows);
    expect(first.plan.summary.newApplications).toBe(2);
    expect(applyCandidateImport(first.state, job.id, analysis.rows).plan.summary.newApplications).toBe(0);
  });

  it('muestra hace cuánto se actualizó', () => {
    const now = Date.parse('2026-10-12T03:42:00-05:00');
    expect(timeAgo(aviso.ultimo_csv_at, now)).toBe('hace 3 h');
    expect(timeAgo(null, now)).toBe('sin datos aún');
  });

  it('calcula la misma versión de criterios que el scraper (scraping/criterios.py)', () => {
    const job = avisoToJob({ ...aviso, titulo: 'Asistente',
      detalle_texto: 'Requisitos:\n✅ Técnico en Administración ✅ Inglés básico 😊\n- Disponibilidad inmediata\n\nBeneficios:\nEPS' });
    expect(job.criteria.map((c) => c.label)).toEqual(['Técnico en Administración', 'Inglés básico 😊']);
    expect(job.criteriaVersion).toBe('Bumeran 41c121'); // valor que da criterios_aviso() en Python
  });

  it('aplica el ranking de Supabase por ID postulante y solo con los criterios vigentes', () => {
    const rows: PostulanteRow[] = [
      { id_postulante: 'aprueba111', datos_json: { Nombre: 'Ana', Apellido: 'Prueba', 'E-Mail': 'ana@x.pe', 'Exp[1] Puesto': 'Asistente' } },
      { id_postulante: 'bprueba222', datos_json: { Nombre: 'Beto', Apellido: 'Prueba', 'E-Mail': 'beto@x.pe' } },
    ];
    const job = avisoToJob(aviso);
    const { state } = applyCandidateImport(mergeBumeranJobs(structuredClone(INITIAL_APP_STATE), [job]), job.id,
      analyzeCandidateTables([postulantesToTable('1110000001', rows)]).rows);
    const fila = (id: string, extra: Partial<RankingRow> = {}): RankingRow => ({ id_postulante: id, criterios_version: job.criteriaVersion,
      backend: 'e5', ranking: 1, score: 1, req_sims: [1, null], req_fragmentos: ['Exp[1] Asistente', ''],
      explicacion: 'r1 (1.00)', calculado_at: '2026-10-12T08:00:00Z', ...extra });
    const results = rankingToMatches(job, state.applications, state.candidates, [
      fila('APRUEBA111'), fila('bprueba222', { criterios_version: 'Bumeran viejo' }), fila('otro999', { ranking: 2 })]);
    const ana = state.candidates.find((c) => c.importedProfile?.externalId === 'aprueba111')!;
    const app = state.applications.find((a) => a.candidateId === ana.id && a.jobPostingId === job.id)!;
    expect(Object.keys(results)).toEqual([app.id]);
    expect(results[app.id]).toMatchObject({ score: 1, ranking: 1, backend: 'e5', criteriaVersion: job.criteriaVersion,
      requirementSims: { r1: 1, r2: null }, requirementEvidence: { r1: 'Exp[1] Asistente', r2: '' } });
  });
});
