import type { Application, Candidate, JobPosting } from '../types/index.ts';
import { embeddingVigente, evidenciaLegible } from './rankingEmbeddings.ts';

// Perfil del postulante tal como viene en el CSV de Bumeran (Exp[k], Est[k], Idiomas) y argumentos para comparar.

const limpiar = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const ORDEN_NIVEL = ['Doctorado', 'Master', 'Posgrado', 'Universitario', 'Terciario/Técnico', 'Secundario', 'Curso', 'Otro'];

export type Experiencia = { puesto: string; empresa: string; periodo: string; area: string; descripcion: string };
export type Estudio = { titulo: string; institucion: string; nivel: string; estado: string; periodo: string };

function periodo(inicio: string, fin: string) {
  const i = limpiar(inicio), f = limpiar(fin);
  return i || f ? `${i || '¿?'} – ${f || 'actualidad'}` : '';
}

export function perfilBumeran(candidate: Candidate | undefined) {
  const d = (candidate?.importedProfile?.records?.[0] || {}) as Record<string, string>;
  const experiencias: Experiencia[] = [];
  const estudios: Estudio[] = [];
  for (let k = 1; k <= 30; k++) {
    if (limpiar(d[`Exp[${k}] Puesto`])) experiencias.push({
      puesto: limpiar(d[`Exp[${k}] Puesto`]), empresa: limpiar(d[`Exp[${k}] Empresa`]),
      periodo: periodo(d[`Exp[${k}] Fecha Inicio`], d[`Exp[${k}] Fecha Fin`]),
      area: [limpiar(d[`Exp[${k}] Area`]), limpiar(d[`Exp[${k}] SubArea`])].filter(Boolean).join(' › '),
      descripcion: limpiar(d[`Exp[${k}] Descripción`] || d[`Exp[${k}] Descripcion`]),
    });
    if (limpiar(d[`Est[${k}] Titulo`])) estudios.push({
      titulo: limpiar(d[`Est[${k}] Titulo`]), institucion: limpiar(d[`Est[${k}] Institucion`]),
      nivel: limpiar(d[`Est[${k}] Nivel`]), estado: limpiar(d[`Est[${k}] Estado`]),
      periodo: periodo(d[`Est[${k}] Fecha Inicio`], d[`Est[${k}] Fecha Fin`]),
    });
  }
  const rango = (n: string) => { const i = ORDEN_NIVEL.indexOf(n); return i < 0 ? ORDEN_NIVEL.length : i; };
  const mejorEstudio = [...estudios].sort((a, b) => rango(a.nivel) - rango(b.nivel))[0] || null;
  return { experiencias, estudios, mejorEstudio, idiomas: limpiar(d.Idiomas), ciudad: limpiar(d.Ciudad || d['Lugar de residencia']) };
}

export type RequisitoComparado = { id: string; codigo: string; label: string; peso: number; pct: number | null; evidencia: string };

/** Similitud y evidencia por requisito; y los requisitos más y menos sustentados (para comparar y repreguntar). */
export function argumentosPorRequisito(app: Application, candidate: Candidate | undefined, job: JobPosting) {
  const emb = embeddingVigente(app, job);
  const requisitos: RequisitoComparado[] = job.criteria.map((c, k) => {
    const sim = emb?.requirementSims?.[c.id];
    const etiqueta = emb?.requirementEvidence?.[c.id];
    return { id: c.id, codigo: `R${k + 1}`, label: c.label, peso: c.weightPct,
      pct: sim === null || sim === undefined ? null : Math.round(sim * 100), evidencia: etiqueta ? evidenciaLegible(etiqueta, candidate) : '' };
  });
  const conValor = requisitos.filter((r) => r.pct !== null).sort((a, b) => b.pct! - a.pct!);
  return {
    requisitos,
    fuertes: conValor.filter((r) => r.pct! >= 70).slice(0, 2),
    aRevisar: [...conValor].reverse().filter((r) => r.pct! < 40).slice(0, 2).concat(requisitos.filter((r) => r.pct === null)).slice(0, 2),
  };
}

export const colorPct = (pct: number | null) => pct === null ? 'var(--text-muted)'
  : pct >= 70 ? 'var(--status-verified-text)' : pct >= 40 ? 'var(--comparison-medium-text, var(--status-partial-text))' : 'var(--status-failed-text)';
