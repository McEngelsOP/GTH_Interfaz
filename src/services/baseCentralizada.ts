import type { SupabaseClient } from '@supabase/supabase-js';
import { CvPersonal, vistaPreviaDrive } from './bumeranSync.ts';

// Base centralizada: todos los postulantes de todos los avisos (vista v_base_postulantes). No tiene score porque no
// se compara contra un aviso. Se lee de Supabase cada vez y no se guarda en el navegador.

export type FilaBase = {
  persona_id: string; aviso_id: string; aviso_titulo: string | null; aviso_area: string | null; id_postulante: string | null;
  nombre: string | null; apellido: string | null; email: string | null; telefono: string | null; fecha_postulacion: string | null;
  ciudad: string | null; puesto_actual: string | null; empresa_actual: string | null; area_experiencia: string | null;
  estudio: string | null; nivel_estudio: string | null; estado_estudio: string | null; institucion: string | null;
  idiomas: string | null; cv_url: string | null; sin_cv: boolean | null;
};

export type Idioma = { idioma: string; nivel: string };
export type Persona = {
  id: string; nombre: string; email: string | null; telefono: string | null; ciudad: string | null;
  puesto: string | null; empresa: string | null; areaExperiencia: string | null;
  estudio: string | null; nivelEstudio: string | null; estadoEstudio: string | null; institucion: string | null;
  idiomas: Idioma[]; ultimaPostulacion: string | null;
  avisos: { id: string; titulo: string; area: string | null; fecha: string | null }[];
  cv: CvPersonal;
};

export const ORDEN_NIVEL = ['Doctorado', 'Master', 'Posgrado', 'Universitario', 'Terciario/Técnico', 'Secundario', 'Curso', 'Otro'];
export const NIVELES_IDIOMA = ['Básico', 'Intermedio', 'Avanzado', 'Nativo'];
const rangoNivel = (n: string | null) => { const i = ORDEN_NIVEL.indexOf(n || ''); return i < 0 ? ORDEN_NIVEL.length : i; };

export async function fetchBase(client: SupabaseClient): Promise<FilaBase[]> {
  const filas: FilaBase[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('v_base_postulantes').select('*')
      .order('persona_id').order('aviso_id').range(from, from + 999);
    if (error) throw new Error(error.message);
    filas.push(...((data || []) as FilaBase[]));
    if (!data || data.length < 1000) return filas;
  }
}

/** «Inglés - Intermedio / Español - Nativo» → [{ idioma: 'Inglés', nivel: 'Intermedio' }, …] */
export function leerIdiomas(texto: string | null): Idioma[] {
  return (texto || '').split('/').map((parte) => {
    const [idioma, nivel] = parte.split(' - ').map((x) => x.trim());
    return { idioma, nivel: nivel || '' };
  }).filter((x) => x.idioma);
}

/** Distrito o ciudad con formato uniforme («San Juan De Lurigancho.» → «San Juan de Lurigancho»). */
export function normalizarCiudad(ciudad: string | null): string | null {
  const limpia = (ciudad || '').replace(/[.\s]+$/, '').trim();
  if (!limpia) return null;
  return limpia.toLowerCase().split(/\s+/).map((p, i) => (i > 0 && ['de', 'del', 'la', 'las', 'los', 'y'].includes(p)) ? p
    : p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

/** Une las postulaciones de una misma persona: sus avisos, la más reciente y el estudio de mayor nivel. */
export function agruparPersonas(filas: FilaBase[]): Persona[] {
  const grupos = new Map<string, FilaBase[]>();
  for (const f of filas) grupos.set(f.persona_id, [...(grupos.get(f.persona_id) || []), f]);
  return [...grupos.entries()].map(([id, fs]): Persona => {
    const reciente = [...fs].sort((a, b) => (b.fecha_postulacion || '').localeCompare(a.fecha_postulacion || ''))[0];
    const mejorEstudio = [...fs].sort((a, b) => rangoNivel(a.nivel_estudio) - rangoNivel(b.nivel_estudio))[0];
    const conCv = fs.find((f) => f.cv_url);
    return {
      id, nombre: [reciente.nombre, reciente.apellido].filter(Boolean).join(' ') || reciente.id_postulante || 'Postulante',
      email: reciente.email, telefono: reciente.telefono, ciudad: normalizarCiudad(reciente.ciudad),
      puesto: reciente.puesto_actual, empresa: reciente.empresa_actual, areaExperiencia: reciente.area_experiencia,
      estudio: mejorEstudio.estudio, nivelEstudio: mejorEstudio.nivel_estudio, estadoEstudio: mejorEstudio.estado_estudio,
      institucion: mejorEstudio.institucion, idiomas: leerIdiomas(reciente.idiomas), ultimaPostulacion: reciente.fecha_postulacion,
      avisos: fs.map((f) => ({ id: f.aviso_id, titulo: f.aviso_titulo || f.aviso_id, area: f.aviso_area, fecha: f.fecha_postulacion }))
        .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')),
      cv: conCv ? { estado: 'disponible', enlace: conCv.cv_url, vista: vistaPreviaDrive(conCv.cv_url) }
        : fs.some((f) => f.sin_cv) ? { estado: 'sin_adjunto', enlace: null, vista: null } : { estado: 'pendiente', enlace: null, vista: null },
    };
  }).sort((a, b) => (b.ultimaPostulacion || '').localeCompare(a.ultimaPostulacion || '') || a.nombre.localeCompare(b.nombre, 'es'));
}

export type FiltrosBase = {
  texto: string; aviso: string; area: string; nivel: string; estado: string; idioma: string; nivelIdioma: string;
  ciudad: string; desde: string; cv: string; varios: boolean;
};
export const SIN_FILTROS: FiltrosBase = { texto: '', aviso: '', area: '', nivel: '', estado: '', idioma: '', nivelIdioma: '',
  ciudad: '', desde: '', cv: '', varios: false };

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarPersonas(personas: Persona[], f: FiltrosBase): Persona[] {
  const q = sinTildes(f.texto.trim());
  return personas.filter((p) => {
    if (q && !sinTildes([p.nombre, p.puesto, p.empresa, p.estudio, p.institucion, p.areaExperiencia].filter(Boolean).join(' ')).includes(q)) return false;
    if (f.aviso && !p.avisos.some((a) => a.id === f.aviso)) return false;
    if (f.area && !p.avisos.some((a) => a.area === f.area)) return false;
    if (f.nivel && rangoNivel(p.nivelEstudio) > rangoNivel(f.nivel)) return false;      // «al menos» ese nivel
    if (f.estado && p.estadoEstudio !== f.estado) return false;
    if (f.idioma) {
      const minimo = NIVELES_IDIOMA.indexOf(f.nivelIdioma);
      if (!p.idiomas.some((i) => i.idioma === f.idioma && NIVELES_IDIOMA.indexOf(i.nivel) >= minimo)) return false;
    }
    if (f.ciudad && p.ciudad !== f.ciudad) return false;
    if (f.desde && (p.ultimaPostulacion || '') < f.desde) return false;
    if (f.cv === 'con' && p.cv.estado !== 'disponible') return false;
    if (f.cv === 'sin' && p.cv.estado === 'disponible') return false;
    if (f.varios && p.avisos.length < 2) return false;
    return true;
  });
}
