import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppStateData, Application, Candidate, Criterion, EmbeddingMatch, JobCategory, JobPosting } from '../types/index.ts';
import type { ImportTable } from './candidateImport.ts';

// Avisos y postulantes que el scraper guarda en Supabase (tablas avisos y v_postulaciones).
// Cada aviso publicado se convierte en una convocatoria BUM-<id> y sus postulantes pasan por el
// mismo importador de "Cargar CV", así que la consolidación de fichas es idéntica a la carga manual.

export const BUMERAN_PREFIX = 'BUM-';
// Indicado por GTH: requisito obligatorio de todos los avisos publicados en Bumeran.
export const BUMERAN_KNOCKOUT = 'Disponibilidad para trabajo presencial en Santiago de Surco';
const MAX_CRITERIA = 10;

export type AvisoRow = {
  aviso_id: string; titulo: string | null; publicado_el: string | null; recibidos: number | null;
  detalle_texto: string | null;
  detalle_json: { caracteristicas?: string[]; migas?: string[]; ubicacion?: string; empresa?: string; url?: string } | null;
  url_publica: string | null; ultimo_csv_at: string | null; ranking_at?: string | null;
  /** Requisitos con que el scraper calculó el ranking guardado (scraping/ranking.py): los de «Requisitos y pesos» o,
   *  si no hay, los de la oferta. */
  criterios?: Criterion[] | null; criterios_version?: string | null;
};
export type PostulanteRow = { id_postulante: string | null; datos_json: Record<string, string>; cv_url?: string | null; cv_estado?: string | null };

/** Columnas que llevan el CV personal (Google Drive) dentro del perfil importado del postulante. */
export const COL_CV_ENLACE = 'CV personal (enlace)';
export const COL_CV_ESTADO = 'CV personal (estado)';
/** Fila de ranking_embeddings: el scraper la calcula al bajar el CSV (scraping/ranking.py). */
export type RankingRow = {
  id_postulante: string | null; criterios_version: string; backend: 'e5' | 'tfidf'; ranking: number | null;
  score: number | null; req_sims: (number | null)[] | null; req_fragmentos: string[] | null;
  explicacion: string | null; calculado_at: string | null;
  /** Similitud original por requisito, antes de reescalar dentro del aviso. */
  req_sims_bruto?: (number | null)[] | null;
  score_bruto?: number | null;
  /** Regla de prácticas y bonificación por rubro (educación superior) con que se calculó el puntaje. */
  ajustes?: { rubro?: { educacion_superior?: string[]; bono?: number } } | null;
};

export const isBumeranJob = (job: JobPosting | undefined) => !!job?.bumeran;

// Encabezados de sección: "Requisitos:", "Funciones :" o preguntas como "¿Qué buscamos?".
const SECTION = /^([A-Za-zÁÉÍÓÚÑáéíóúñ ]{3,40}\s*:|¿[^?]{3,60}\?)\s*$/;
const REQUIREMENTS = /^(requisitos\s*:?|¿\s*qu[ée] (buscamos|te pedimos|necesitas)\s*\?)\s*$/i;
const FUNCTIONS = /^(funciones\s*:?|responsabilidades\s*:?|¿\s*(qu[ée] har[áa]s|qu[ée] retos asumir[áa]s|cu[áa]l ser[áa] tu (reto|misi[óo]n))\s*\?)\s*$/i;
// Viñetas, incluidas las de emoji (✅ ✔): si vienen varias en una misma línea, se separan.
const BULLETS = /[•✅✔☑▪►✓]️?/gu;
const bullet = (line: string) => line.replace(/^[\s\-*·–]+/, '').trim();

function section(text: string, name: RegExp): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex((l) => name.test(l));
  if (start < 0) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (SECTION.test(line)) break;
    out.push(...line.split(BULLETS).map(bullet));
  }
  return out.filter(Boolean);
}

/** Requisitos publicados del aviso: líneas de la sección "Requisitos" (o "Funciones" si no la hay).
 *  Las de disponibilidad (presencial en Surco, turnos) no se puntúan: lo de Surco es el requisito obligatorio. */
export function extractRequirements(text: string | null, title: string): string[] {
  const clean = (items: string[]) => [...new Set(items.filter((l) => !/^disponibilidad\b/i.test(l) && l.length > 3))];
  let items = clean(section(text || '', REQUIREMENTS));
  if (!items.length) items = clean(section(text || '', FUNCTIONS));
  return (items.length ? items : [title]).slice(0, MAX_CRITERIA);
}

/** Pesos iguales que suman exactamente 100. */
export function equalCriteria(requirements: string[]): Criterion[] {
  const base = Math.floor(100 / requirements.length);
  const extra = 100 - base * requirements.length;
  return requirements.map((label, i) => ({ id: `r${i + 1}`, label, weightPct: base + (i < extra ? 1 : 0), type: 'LLM' }));
}

function shortHash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

function category(title: string): JobCategory {
  if (/docente|profesor/i.test(title)) return 'docente';
  if (/coordinador|jefe|gerente|director/i.test(title)) return 'directivo';
  if (/t[ée]cnico|auxiliar|almac[eé]n|mantenimiento|operari/i.test(title)) return 'operativo';
  return 'administrativo';
}

const NOT_AREA = /presencial|remoto|h[ií]brido|full-time|part-time|vacante|senior|junior|semi ?senior|trainee|pasant|indeterminado|temporal/i;
const formatDate = (iso: string | null) => iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : 'fecha no registrada';

const MODALIDAD = /^(presencial|remoto|h[ií]brido)$/i;
const JORNADA = /full-time|part-time|indeterminado|temporal|pasant|por horas/i;
const NIVEL = /^(junior|semi ?sr|semi ?senior|senior|trainee|gerencia|jefe)/i;

/** Ficha del aviso tal como la publica Bumeran: área › subárea (de las «migas»), ubicación, modalidad, jornada y nivel. */
export function detalleAviso(row: AvisoRow) {
  const d = row.detalle_json || {};
  const migas = (d.migas || []).filter((m) => m && !/^bolsa de empleo$/i.test(m));
  const features = d.caracteristicas || [];
  return {
    area: migas[0] || null, subarea: migas[1] || null,
    ubicacion: d.ubicacion?.replace(/,\s*Peru$/i, '') || null, empresa: d.empresa || null,
    modalidad: features.find((f) => MODALIDAD.test(f)) || migas.find((m) => MODALIDAD.test(m)) || null,
    jornada: features.find((f) => JORNADA.test(f)) || null,
    nivel: features.find((f) => NIVEL.test(f)) || null,
    inclusivo: features.some((f) => /discapacidad/i.test(f)),
    publicadoEl: row.publicado_el, url: row.url_publica || d.url || null,
  };
}
export type DetalleAviso = ReturnType<typeof detalleAviso>;

/** Requisitos del ranking guardado; si el scraper aún no los registró, los de la oferta con pesos iguales. */
function criteriaOf(row: AvisoRow, title: string): { criteria: Criterion[]; criteriaVersion: string } {
  const saved = Array.isArray(row.criterios) ? row.criterios.filter((c) => typeof c?.label === 'string' && c.label.trim()) : [];
  if (saved.length && row.criterios_version) {
    return {
      criteria: saved.map((c, i) => ({ id: c.id || `r${i + 1}`, label: c.label, weightPct: Number(c.weightPct) || 0, type: 'LLM' })),
      criteriaVersion: row.criterios_version,
    };
  }
  const criteria = equalCriteria(extractRequirements(row.detalle_texto, title));
  return { criteria, criteriaVersion: `Bumeran ${shortHash(criteria.map((c) => c.label).join('|'))}` };
}

export function avisoToJob(row: AvisoRow): JobPosting {
  const title = row.titulo?.trim() || `Aviso ${row.aviso_id}`;
  const { criteria, criteriaVersion } = criteriaOf(row, title);
  const features = row.detalle_json?.caracteristicas || [];
  const vacancies = Number(features.map((f) => f.match(/(\d+)\s+vacante/i)?.[1]).find(Boolean)) || null;
  return {
    id: `${BUMERAN_PREFIX}${row.aviso_id}`, code: `${BUMERAN_PREFIX}${row.aviso_id}`, title, category: category(title),
    department: `Bumeran · ${features.find((f) => !NOT_AREA.test(f)) || 'Aviso publicado'}`,
    period: `Publicado el ${formatDate(row.publicado_el)}`, status: 'activa', phase: 'Recepción de CVs',
    vacancies, knockoutRule: BUMERAN_KNOCKOUT, criteria, criteriaVersion,
    defaultTopN: 5, evaluationReference: row.detalle_texto?.slice(0, 8000) || undefined,
    createdAt: row.publicado_el || new Date().toISOString().slice(0, 10),
    bumeran: { avisoId: row.aviso_id, updatedAt: row.ultimo_csv_at, publicUrl: row.url_publica || row.detalle_json?.url || null,
      received: row.recibidos, rankingAt: row.ranking_at ?? null, detalle: detalleAviso(row) },
  };
}

/** Agrega o actualiza las convocatorias de Bumeran sin tocar las demás ni su orden (las nuevas van al final). */
export function mergeBumeranJobs(state: AppStateData, jobs: JobPosting[]): AppStateData {
  const incoming = new Map(jobs.map((job) => [job.id, job]));
  let changed = false;
  const kept = state.jobPostings.map((job) => {
    const next = incoming.get(job.id);
    if (!next) return job;
    incoming.delete(job.id);
    const merged = { ...job, ...next };
    if (JSON.stringify(merged) === JSON.stringify(job)) return job;
    changed = true;
    return merged;
  });
  if (incoming.size) changed = true;
  const jobPostings = [...kept, ...incoming.values()];
  return changed ? { ...state, jobPostings, activeJobPostingId: jobPostings.some((job) => job.id === state.activeJobPostingId) ? state.activeJobPostingId : (jobPostings[0]?.id || '') } : state;
}

/** Filas de v_postulaciones como una tabla del importador (mismas columnas del CSV de Bumeran). */
export function postulantesToTable(avisoId: string, rows: PostulanteRow[]): ImportTable {
  const headers = ['ID postulante'];
  const seen = new Set(headers);
  for (const row of rows) for (const key of Object.keys(row.datos_json || {})) if (!seen.has(key)) { seen.add(key); headers.push(key); }
  const conCv = rows.some((row) => row.cv_url || row.cv_estado);
  if (conCv) headers.push(COL_CV_ENLACE, COL_CV_ESTADO);
  const celda = (row: PostulanteRow, h: string, i: number) => i === 0 ? row.id_postulante || ''
    : h === COL_CV_ENLACE && conCv ? row.cv_url || '' : h === COL_CV_ESTADO && conCv ? row.cv_estado || '' : String(row.datos_json?.[h] ?? '');
  return { fileName: `Bumeran · aviso ${avisoId}`, rows: [headers, ...rows.map((row) => headers.map((h, i) => celda(row, h, i)))] };
}

/** Todos los avisos guardados: también los que ya no figuran en Bumeran (cerrados), con su último registro. */
export async function fetchAvisos(client: SupabaseClient): Promise<AvisoRow[]> {
  const { data, error } = await client.from('avisos')
    .select('aviso_id, titulo, publicado_el, recibidos, detalle_texto, detalle_json, url_publica, ultimo_csv_at, ranking_at, criterios, criterios_version')
    .order('publicado_el', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as AvisoRow[];
}

export async function fetchPostulantes(client: SupabaseClient, avisoId: string): Promise<PostulanteRow[]> {
  const rows: PostulanteRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('v_postulaciones').select('id_postulante, datos_json, cv_url, cv_estado')
      .eq('aviso_id', avisoId).eq('en_ultimo_csv', 1).order('id_postulante').range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data || []) as PostulanteRow[]));
    if (!data || data.length < 1000) return rows;
  }
}

export async function fetchRanking(client: SupabaseClient, avisoId: string, criteriaVersion: string): Promise<RankingRow[]> {
  const rows: RankingRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('ranking_embeddings')
      .select('id_postulante, criterios_version, backend, ranking, score, score_bruto, req_sims, req_sims_bruto, req_fragmentos, explicacion, calculado_at, ajustes')
      .eq('aviso_id', avisoId).eq('criterios_version', criteriaVersion).order('ranking').range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data || []) as RankingRow[]));
    if (!data || data.length < 1000) return rows;
  }
}

/** Ranking guardado en Supabase como EmbeddingMatch por applicationId. Se cruza por el ID postulante
 *  (importedProfile.externalId); solo se usan las filas con los criterios vigentes de la convocatoria. */
export function rankingToMatches(job: JobPosting, applications: Application[], candidates: Candidate[], rows: RankingRow[]) {
  const key = (id: string | null | undefined) => (id || '').trim().toLowerCase();
  const byId = new Map(rows.filter((r) => r.criterios_version === job.criteriaVersion && key(r.id_postulante)
    && r.ranking !== null && Number.isFinite(r.score)).map((r) => [key(r.id_postulante), r]));
  const externalIds = new Map(candidates.map((c) => [c.id, key(c.importedProfile?.externalId)]));
  const results: Record<string, EmbeddingMatch> = {};
  for (const app of applications) {
    const row = app.jobPostingId === job.id ? byId.get(externalIds.get(app.candidateId) || '') : undefined;
    if (!row) continue;
    results[app.id] = {
      score: row.score!, ranking: row.ranking!, explanation: row.explicacion || '', backend: row.backend,
      requirementSims: Object.fromEntries(job.criteria.map((c, k) => [c.id, row.req_sims?.[k] ?? null])),
      requirementEvidence: Object.fromEntries(job.criteria.map((c, k) => [c.id, row.req_fragmentos?.[k] || ''])),
      criteriaVersion: job.criteriaVersion, evaluatedAt: row.calculado_at || new Date().toISOString(),
      ...(row.ajustes?.rubro?.educacion_superior?.length ? { higherEducation: row.ajustes.rubro.educacion_superior } : {}),
    };
  }
  return results;
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'sin datos aún';
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (!Number.isFinite(minutes)) return 'sin datos aún';
  if (minutes < 1) return 'hace instantes';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}


// ---------------------------------------------------------------------------------------------------------------
// Corridas del proceso de extracción (tabla scrape_runs): cuándo se revisó Bumeran por última vez y qué trajo.
// ---------------------------------------------------------------------------------------------------------------
export type CorridaRow = {
  id: number; tipo: string; aviso_id: string | null; inicio: string; fin: string | null;
  estado: string; nuevos: number | null; total: number | null;
};
export type EstadoCorrida = 'ok' | 'error' | 'en_curso' | 'interrumpida';
export type ResumenRevision = {
  inicio: string; fin: string | null; estado: EstadoCorrida; duracionMin: number | null;
  avisosRevisados: number | null; avisosConCsv: number; postulantesNuevos: number; cvsNuevos: number; errores: number;
};
export type ResumenRanking = { fin: string; avisos: number; postulantes: number };

const HORAS_SIN_TERMINAR = 2;   // una corrida «en curso» más vieja que esto se cortó (equipo apagado, sin memoria…)

export function estadoCorrida(row: CorridaRow, now = Date.now()): EstadoCorrida {
  if (row.estado === 'ok' || row.estado === 'error') return row.estado;
  if (row.estado === 'en_curso' && now - Date.parse(row.inicio) < HORAS_SIN_TERMINAR * 3600_000) return 'en_curso';
  return 'interrumpida';
}

export async function fetchCorridas(client: SupabaseClient, limite = 500): Promise<CorridaRow[]> {
  const { data, error } = await client.from('scrape_runs')
    .select('id, tipo, aviso_id, inicio, fin, estado, nuevos, total')
    .order('inicio', { ascending: false }).limit(limite);
  if (error) throw new Error(error.message);
  return (data || []) as CorridaRow[];
}

/** Revisiones completas del scraper (tipo «corrida»), de la más reciente a la más antigua, con lo que trajo cada una:
 *  se suman los pasos (lista, csv, cvs) que empezaron entre su inicio y el de la corrida siguiente. */
export function resumirRevisiones(rows: CorridaRow[], now = Date.now()): ResumenRevision[] {
  const corridas = rows.filter((r) => r.tipo === 'corrida').sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));
  return corridas.map((c, i) => {
    const desde = Date.parse(c.inicio);
    const hasta = i > 0 ? Date.parse(corridas[i - 1].inicio) : Infinity;
    const pasos = rows.filter((r) => r.tipo !== 'corrida' && r.tipo !== 'ranking' && Date.parse(r.inicio) >= desde && Date.parse(r.inicio) < hasta);
    const sum = (tipo: string) => pasos.filter((r) => r.tipo === tipo).reduce((s, r) => s + (r.nuevos || 0), 0);
    const lista = pasos.find((r) => r.tipo === 'lista');
    return {
      inicio: c.inicio, fin: c.fin, estado: estadoCorrida(c, now),
      duracionMin: c.fin ? Math.max(0, Math.round((Date.parse(c.fin) - desde) / 60000)) : null,
      avisosRevisados: lista?.total ?? null, avisosConCsv: pasos.filter((r) => r.tipo === 'csv' && r.estado === 'ok').length,
      postulantesNuevos: sum('csv'), cvsNuevos: sum('cvs'),
      errores: pasos.filter((r) => estadoCorrida(r, now) === 'error').length + (estadoCorrida(c, now) === 'error' ? 1 : 0),
    };
  });
}

/** Último cálculo del ranking e5: el grupo de pasos «ranking» terminados con menos de 30 min entre uno y otro. */
export function resumirRanking(rows: CorridaRow[]): ResumenRanking | null {
  const ok = rows.filter((r) => r.tipo === 'ranking' && r.estado === 'ok' && r.fin)
    .sort((a, b) => Date.parse(b.fin!) - Date.parse(a.fin!));
  if (!ok.length) return null;
  const grupo = [ok[0]];
  for (const r of ok.slice(1)) {
    if (Date.parse(grupo[grupo.length - 1].inicio) - Date.parse(r.fin!) > 30 * 60000) break;
    grupo.push(r);
  }
  const calculados = grupo.filter((r) => (r.nuevos || 0) > 0);
  return { fin: ok[0].fin!, avisos: calculados.length, postulantes: calculados.reduce((s, r) => s + (r.nuevos || 0), 0) };
}

export function fechaHora(iso: string | null | undefined): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return '—';
  // Una fecha sin hora (2026-10-07) se muestra tal cual: convertirla a la hora de Lima la correría un día.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.split('-').reverse().join('/');
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------------------------------------------
// CV personal del postulante (PDF o Word) guardado por el scraper en Google Drive.
// ---------------------------------------------------------------------------------------------------------------
export type CvPersonal = { estado: 'disponible' | 'sin_adjunto' | 'pendiente'; enlace: string | null; vista: string | null };

/** El visor «/preview» de Drive muestra PDF y Word dentro de la app (la carpeta se comparte con enlace). */
export function vistaPreviaDrive(enlace: string | null | undefined): string | null {
  const id = enlace?.match(/\/d\/([\w-]{10,})/)?.[1] || enlace?.match(/[?&]id=([\w-]{10,})/)?.[1];
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

export function cvPersonal(records: Record<string, string>[] | undefined): CvPersonal {
  const conEnlace = (records || []).find((r) => r[COL_CV_ENLACE]);
  if (conEnlace) return { estado: 'disponible', enlace: conEnlace[COL_CV_ENLACE], vista: vistaPreviaDrive(conEnlace[COL_CV_ENLACE]) };
  if ((records || []).some((r) => r[COL_CV_ESTADO] === 'sin_adjunto')) return { estado: 'sin_adjunto', enlace: null, vista: null };
  return { estado: 'pendiente', enlace: null, vista: null };
}
