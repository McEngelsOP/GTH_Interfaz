import type { Application, Candidate, EmbeddingMatch, JobPosting } from '../types/index.ts';
import { compareCandidateNames } from './candidateOrdering.ts';

// Ranking de la convocatoria por Score Embeddings (multilingual-e5): orden de la tabla, Top-N resaltado y
// los que quedan fuera del Top-N (correo de agradecimiento).

/** Resultado de embeddings vigente para los criterios actuales de la convocatoria. */
export function embeddingVigente(app: Application, job: JobPosting | null | undefined): EmbeddingMatch | null {
  return app.embeddingMatch && job && app.embeddingMatch.criteriaVersion === job.criteriaVersion ? app.embeddingMatch : null;
}

export const enProceso = (app: Application) => app.stage !== 'no_continua' && app.stage !== 'contratado';

/** De mayor a menor score; sin score al final; empates por nombre. */
export function ordenarPorEmbeddings(apps: Application[], candidates: Candidate[], job: JobPosting | null | undefined) {
  const nombres = new Map(candidates.map((c) => [c.id, c.name]));
  return [...apps].sort((a, b) =>
    (embeddingVigente(b, job)?.score ?? -1) - (embeddingVigente(a, job)?.score ?? -1)
    || compareCandidateNames(nombres.get(a.candidateId) || '', nombres.get(b.candidateId) || '')
    || a.id.localeCompare(b.id));
}

/** IDs de los N primeros del ranking entre las postulaciones en proceso que ya tienen score. */
export function idsTopNPorPosicion(apps: Application[], candidates: Candidate[], job: JobPosting | null | undefined, n: number): Set<string> {
  const conScore = apps.filter((app) => enProceso(app) && embeddingVigente(app, job));
  return new Set(ordenarPorEmbeddings(conScore, candidates, job).slice(0, Math.max(0, n)).map((app) => app.id));
}

/** Top-N: los N primeros del ranking más los que el reclutador agregó con la estrella (job.topNExtras). */
export function idsTopN(apps: Application[], candidates: Candidate[], job: JobPosting | null | undefined, n: number): Set<string> {
  const ids = idsTopNPorPosicion(apps, candidates, job, n);
  const enEsteAviso = new Set(apps.filter(enProceso).map((app) => app.id));
  for (const id of job?.topNExtras || []) if (enEsteAviso.has(id)) ids.add(id);
  return ids;
}

const limpiar = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** El scraper guarda la evidencia como etiqueta («Exp[1] Gestor de cobranza», «Est[2] Contabilidad», «Idiomas»).
 *  Se muestra completa con los datos del postulante: puesto, empresa y funciones, o estudio e institución. */
export function evidenciaLegible(etiqueta: string, candidate: Candidate | undefined): string {
  const datos = (candidate?.importedProfile?.records?.[0] || {}) as Record<string, string>;
  const m = /^(Exp|Est)\[(\d+)\]/.exec(etiqueta || '');
  if (m && m[1] === 'Exp') {
    const k = m[2];
    const cabecera = [limpiar(datos[`Exp[${k}] Puesto`]), limpiar(datos[`Exp[${k}] Empresa`])].filter(Boolean).join(' · ');
    const desc = limpiar(datos[`Exp[${k}] Descripción`] || datos[`Exp[${k}] Descripcion`]);
    return [cabecera, desc].filter(Boolean).join(' — ') || etiqueta;
  }
  if (m && m[1] === 'Est') {
    const k = m[2];
    const detalle = [limpiar(datos[`Est[${k}] Nivel`]), limpiar(datos[`Est[${k}] Estado`])].filter(Boolean).join(', ');
    const texto = [limpiar(datos[`Est[${k}] Titulo`]), limpiar(datos[`Est[${k}] Institucion`])].filter(Boolean).join(' · ');
    return (texto + (detalle ? ` (${detalle})` : '')) || etiqueta;
  }
  if (/^Idiomas/.test(etiqueta || '') && limpiar(datos.Idiomas)) return `Idiomas: ${limpiar(datos.Idiomas)}`;
  return etiqueta || '';
}
