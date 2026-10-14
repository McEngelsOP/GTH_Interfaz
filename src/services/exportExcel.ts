import type { Application, Candidate, JobPosting, Stage } from '../types/index.ts';
import { embeddingVigente, evidenciaLegible } from './rankingEmbeddings.ts';

// Exportación del ranking a Excel (.xlsx) para el equipo de GTH: una hoja con el ranking y otra con el aviso.
export type AlcanceExport = 'todos' | 'top' | 'fuera' | 'marcados';

const NOMBRE_ALCANCE: Record<AlcanceExport, string> = {
  todos: 'Ranking completo', top: 'Top-N', fuera: 'Fuera del Top-N (agradecimiento)', marcados: 'Marcados',
};
const ETAPA: Record<Stage, string> = {
  postulado: 'Postulado', preseleccionado: 'Preseleccionado', en_entrevista: 'En entrevista', en_evaluacion: 'En evaluación',
  en_oferta: 'En oferta', contratado: 'Contratado', no_continua: 'No continúa',
};

const encabezado = (value: string) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#F3F4F6' });

export async function exportarRankingExcel(params: {
  job: JobPosting; ordenadas: Application[]; candidates: Candidate[]; topIds: Set<string>; alcance: AlcanceExport;
  /** Ranking completo de la convocatoria: la «Posición» es la del ranking, no la de la lista exportada. */
  rankingCompleto?: Application[];
}) {
  const { job, ordenadas, candidates, topIds, alcance, rankingCompleto } = params;
  const porId = new Map(candidates.map((c) => [c.id, c]));
  const posicion = new Map((rankingCompleto || ordenadas).map((app, i) => [app.id, i + 1]));
  const criterios = job.criteria;

  const filas = ordenadas.map((app) => {
    const cand = porId.get(app.candidateId);
    const emb = embeddingVigente(app, job);
    const sims = criterios.map((c) => {
      const s = emb?.requirementSims?.[c.id];
      return s === null || s === undefined ? null : Math.round(s * 100);
    });
    const evidencias = criterios.map((c, k) => {
      const e = emb?.requirementEvidence?.[c.id];
      return e ? `R${k + 1}: ${evidenciaLegible(e, cand)}` : '';
    }).filter(Boolean).join('\n');
    return [
      posicion.get(app.id) ?? null, cand?.name || '', cand?.email || '', cand?.phone || '',
      cand?.currentTitle || '', cand?.currentCompany || '',
      emb ? Math.round(emb.score * 100) / 100 : null,
      topIds.has(app.id) ? 'Sí' : 'No', ETAPA[app.stage] || app.stage,
      ...sims, evidencias,
    ];
  });

  const cabecera = ['Posición', 'Candidato', 'Correo', 'Teléfono', 'Puesto actual', 'Empresa', 'Score Embeddings (0-1)',
    'Top-N', 'Etapa', ...criterios.map((_, k) => `R${k + 1} (%)`), 'Evidencia por requisito'].map(encabezado);
  const aviso = [
    [encabezado('Convocatoria'), job.title], [encabezado('Código'), job.code], [encabezado('Exportación'), NOMBRE_ALCANCE[alcance]],
    [encabezado('Top-N'), topIds.size], [encabezado('Fecha'), new Date().toLocaleString('es-PE')], [null, null],
    [encabezado('Código'), encabezado('Requisito'), encabezado('Peso %')],
    ...criterios.map((c, k) => [`R${k + 1}`, c.label, c.weightPct]),
  ];

  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const fecha = new Date().toISOString().slice(0, 10);
  const archivo = `Ranking_${job.code}_${NOMBRE_ALCANCE[alcance].replace(/[^A-Za-z0-9]+/g, '_')}_${fecha}.xlsx`;
  await writeExcelFile([
    { sheet: 'Ranking', data: [cabecera, ...filas] as any,
      columns: [{ width: 9 }, { width: 30 }, { width: 30 }, { width: 14 }, { width: 28 }, { width: 24 }, { width: 14 },
        { width: 8 }, { width: 14 }, ...criterios.map(() => ({ width: 9 })), { width: 80 }] },
    { sheet: 'Aviso', data: aviso as any, columns: [{ width: 16 }, { width: 70 }, { width: 10 }] },
  ]).toFile(archivo);
  return archivo;
}
