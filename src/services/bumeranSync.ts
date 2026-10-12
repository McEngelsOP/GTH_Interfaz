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
  detalle_texto: string | null; detalle_json: { caracteristicas?: string[] } | null;
  url_publica: string | null; ultimo_csv_at: string | null; ranking_at?: string | null;
};
export type PostulanteRow = { id_postulante: string | null; datos_json: Record<string, string> };
/** Fila de ranking_embeddings: el scraper la calcula al bajar el CSV (scraping/ranking.py). */
export type RankingRow = {
  id_postulante: string | null; criterios_version: string; backend: 'e5' | 'tfidf'; ranking: number | null;
  score: number | null; req_sims: (number | null)[] | null; req_fragmentos: string[] | null;
  explicacion: string | null; calculado_at: string | null;
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

export function avisoToJob(row: AvisoRow): JobPosting {
  const title = row.titulo?.trim() || `Aviso ${row.aviso_id}`;
  const criteria = equalCriteria(extractRequirements(row.detalle_texto, title));
  const features = row.detalle_json?.caracteristicas || [];
  const vacancies = Number(features.map((f) => f.match(/(\d+)\s+vacante/i)?.[1]).find(Boolean)) || null;
  return {
    id: `${BUMERAN_PREFIX}${row.aviso_id}`, code: `${BUMERAN_PREFIX}${row.aviso_id}`, title, category: category(title),
    department: `Bumeran · ${features.find((f) => !NOT_AREA.test(f)) || 'Aviso publicado'}`,
    period: `Publicado el ${formatDate(row.publicado_el)}`, status: 'activa', phase: 'Recepción de CVs',
    vacancies, knockoutRule: BUMERAN_KNOCKOUT, criteria,
    criteriaVersion: `Bumeran ${shortHash(criteria.map((c) => c.label).join('|'))}`,
    defaultTopN: 5, evaluationReference: row.detalle_texto?.slice(0, 8000) || undefined,
    createdAt: row.publicado_el || new Date().toISOString().slice(0, 10),
    bumeran: { avisoId: row.aviso_id, updatedAt: row.ultimo_csv_at, publicUrl: row.url_publica, received: row.recibidos,
      rankingAt: row.ranking_at ?? null },
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
  return changed ? { ...state, jobPostings: [...kept, ...incoming.values()] } : state;
}

/** Filas de v_postulaciones como una tabla del importador (mismas columnas del CSV de Bumeran). */
export function postulantesToTable(avisoId: string, rows: PostulanteRow[]): ImportTable {
  const headers = ['ID postulante'];
  const seen = new Set(headers);
  for (const row of rows) for (const key of Object.keys(row.datos_json || {})) if (!seen.has(key)) { seen.add(key); headers.push(key); }
  return { fileName: `Bumeran · aviso ${avisoId}`,
    rows: [headers, ...rows.map((row) => headers.map((h, i) => i === 0 ? row.id_postulante || '' : String(row.datos_json?.[h] ?? '')))] };
}

export async function fetchAvisos(client: SupabaseClient): Promise<AvisoRow[]> {
  const { data, error } = await client.from('avisos')
    .select('aviso_id, titulo, publicado_el, recibidos, detalle_texto, detalle_json, url_publica, ultimo_csv_at, ranking_at')
    .eq('en_ultima_lista', 1).order('publicado_el', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as AvisoRow[];
}

export async function fetchPostulantes(client: SupabaseClient, avisoId: string): Promise<PostulanteRow[]> {
  const rows: PostulanteRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('v_postulaciones').select('id_postulante, datos_json')
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
      .select('id_postulante, criterios_version, backend, ranking, score, req_sims, req_fragmentos, explicacion, calculado_at')
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
