import type { Candidate } from '../types/index.ts';

// Registro de preseleccionados en Multitest (apps.multitestresources.com). La web arma la lista y la automatización
// local (scripts/multitest-envio.mjs, con Playwright) entra al proceso elegido y agrega a cada uno; Multitest le envía
// el correo con la prueba.

/** Procesos abiertos en el «Panel de Procesos» de Multitest. El nombre debe coincidir con el enlace del panel. */
export const PROCESOS_MULTITEST = [
  { id: '532', nombre: 'Asistente De Gestión Académica' },
  { id: '531', nombre: 'Asistente De Soporte Técnico' },
  { id: '529', nombre: 'Asesor De Atención Al Cliente' },
  { id: '527', nombre: 'Técnico De Mantenimiento' },
  { id: '526', nombre: 'Auxiliar De Innovación' },
  { id: '525', nombre: 'Asistente De Marketing Digital' },
  { id: '524', nombre: 'Practicante 2026' },
] as const;

export type ProcesoMultitest = (typeof PROCESOS_MULTITEST)[number];
/** Proceso elegido por postulación (applicationId → id del proceso). */
export type AsignacionMultitest = Record<string, string>;
export type RegistroMultitest = {
  proceso: string; dni: string; edad: string; genero: 'M' | 'F' | ''; nombres: string; apellidos: string; correo: string;
};

const normalizar = (texto: string) => texto.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const limpiar = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Proceso cuyo nombre está contenido en el título del aviso (p. ej. aviso «Asistente de Gestión Académica»
 *  → proceso 532). Vacío si ninguno coincide: GTH lo elige a mano. */
export function procesoSugerido(tituloAviso: string): string {
  const titulo = normalizar(tituloAviso);
  return PROCESOS_MULTITEST.find((p) => titulo.includes(normalizar(p.nombre)))?.id || '';
}

export function nombreProceso(id: string): string {
  return PROCESOS_MULTITEST.find((p) => p.id === id)?.nombre || '';
}

/** Datos que pide el formulario «+» del proceso, tomados del CSV de Bumeran (o del perfil si no hay CSV).
 *  Cada sincronización que trae datos distintos agrega su fila al final de `records`: se usa la más reciente. */
export function registroMultitest(candidate: Candidate, procesoId: string): RegistroMultitest {
  const d = (candidate.importedProfile?.records?.at(-1) || {}) as Record<string, string>;
  const partes = limpiar(candidate.name).split(' ');
  const nombres = limpiar(d.Nombre) || partes.slice(0, Math.max(1, partes.length - 2)).join(' ');
  const apellidos = limpiar(d.Apellido) || partes.slice(Math.max(1, partes.length - 2)).join(' ');
  const genero = normalizar(d['Género'] || d.Genero || '');
  const edad = limpiar(d.Edad).match(/\d+/)?.[0] || '';
  return {
    proceso: nombreProceso(procesoId), nombres, apellidos, edad,
    dni: limpiar(d['Nro. Documento'] || candidate.importedProfile?.documentNumber),
    genero: genero.startsWith('m') ? 'M' : genero.startsWith('f') ? 'F' : '',
    correo: limpiar(d['E-Mail'] || candidate.email),
  };
}

/** Lo que falta para registrar a alguien; Multitest necesita al menos nombre, apellido y correo. */
export function faltantesRegistro(r: RegistroMultitest): string[] {
  return [!r.proceso && 'proceso', !r.nombres && 'nombre', !r.apellidos && 'apellido',
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.correo) && 'correo'].filter((f): f is string => !!f);
}

export function cargarAsignacion(clave: string): AsignacionMultitest {
  try {
    const valor = JSON.parse(localStorage.getItem(clave) || 'null');
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
  } catch { return {}; }
}

export function guardarAsignacion(clave: string, asignacion: AsignacionMultitest) {
  try { localStorage.setItem(clave, JSON.stringify(asignacion)); } catch { /* sin almacenamiento: queda solo en pantalla */ }
}

/** Registro con el ID del avance compartido, para marcar luego a quién se le envió. */
export type EnvioMultitest = RegistroMultitest & { id: string };
export type ResultadoMultitest = { id: string; ok: boolean; error?: string };

/** Corre la automatización en la PC (servidor local de Vite) y espera a que termine: Multitest envía el correo al
 *  agregar a cada candidato. En la web publicada no existe ese servicio. */
export async function enviarMultitest(registros: EnvioMultitest[]): Promise<ResultadoMultitest[]> {
  let res: Response;
  try {
    res = await fetch('/api/multitest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registros }) });
  } catch { throw new Error('No se pudo contactar al servicio local de Multitest.'); }
  if (res.status === 404) throw new Error('El envío a Multitest solo funciona en la PC del equipo, abriendo la web con «npm run dev».');
  const datos = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(datos.resultados)) throw new Error(datos.error || 'No se pudo completar el envío a Multitest.');
  return datos.resultados;
}
