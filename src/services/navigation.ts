export const VIEWS = ['convocatorias', 'perfiles_puestos', 'nueva_convocatoria', 'agregar_archivos', 'mejores_candidatos', 'comparador', 'avance_candidatos', 'banco_talento', 'criterios_evaluacion', 'historial_decisiones', 'resultados_proceso', 'resumen_general', 'ajustes_generales'] as const;
export type CanonicalView = typeof VIEWS[number];
export function readRoute(hash: string): { view: CanonicalView; jobId: string | null } {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const name = (params.get('view') || '').replaceAll('-', '_');
  const normalized = name === 'ajustes' ? 'ajustes_generales' : name;
  return { view: VIEWS.includes(normalized as CanonicalView) ? normalized as CanonicalView : 'mejores_candidatos', jobId: params.get('job') };
}
export function routeHash(view: string, jobId: string): string {
  const normalized = readRoute(`#view=${view}`).view;
  return `#${new URLSearchParams({ view: normalized, job: jobId })}`;
}
