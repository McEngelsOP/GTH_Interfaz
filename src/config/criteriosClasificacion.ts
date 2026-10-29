/** Matriz de clasificación de GTHC (Andrea) en «Criterios y pesos». Se guarda una intensidad de 0 a 100 por criterio
 *  (50 = las reglas validadas con GTH el 28/10/2026; Experiencia laboral empieza en 100). En el modal, Rubro y
 *  Categorización se muestran como lo que suman al score de la tabla por cada experiencia; Sobrecalificación, de 0 a 100
 *  con 50 = peso actual. Alta rotación es una penalización sobre el puntaje. El servidor de GTH los
 *  aplica al recalcular (scraping/ranking.py). */
export type ClaveCriterio = 'experiencia' | 'rotacion' | 'rubro' | 'sobrecalificacion' | 'escala_empresa';

export const CRITERIOS_CLASIFICACION: {
  clave: ClaveCriterio; nombre: string; tipo: 'linea' | 'penalizacion' | 'bono' | 'peso'; ayuda: string;
  /** Solo «bono»: bonificación por experiencia con la intensidad en 50, en la escala bruta (ranking.py: BONO_RUBRO,
   *  BONO_ESCALA × ESCALA_POR_EXPERIENCIA) */
  bonoBase?: number;
}[] = [
  { clave: 'experiencia', nombre: 'Experiencia laboral', tipo: 'linea',
    ayuda: 'Cuánto pesan los requisitos de años de experiencia: 100 es su peso completo y bajarlo los reduce. Solo cuenta la experiencia relacionada; las prácticas profesionales cuentan la mitad y las preprofesionales no suman.' },
  { clave: 'rotacion', nombre: 'Alta rotación laboral', tipo: 'penalizacion',
    ayuda: 'Se resta del puntaje a quien tiene cambios frecuentes entre empleadores (Rotación laboral en rojo), salvo que GTH registre la revisión como justificada.' },
  { clave: 'rubro', nombre: 'Rubro o sector de experiencia', tipo: 'bono', bonoBase: 0.25,
    ayuda: 'Se suma por cada experiencia en educación superior (universidades, institutos, escuelas de posgrado), el sector de ESAN; un colegio suma la mitad y, si el último trabajo es en educación, suma media bonificación más. Hasta 2 bonificaciones.' },
  { clave: 'sobrecalificacion', nombre: 'Análisis de sobrecalificación', tipo: 'peso',
    ayuda: 'Cuánto pesan los requisitos con nivel de herramienta o idioma (p. ej. «Excel intermedio»): 50 es su peso actual, 0 los apaga y 100 los duplica. Tener el nivel pedido o uno mayor da el 100 % del requisito; menor, intermedio 70 % y básico o sin nivel 30 %; no mencionarla, 20 %. También cuenta la respuesta a la pregunta del aviso. Quien supera lo pedido queda marcado como sobrecalificado.' },
  { clave: 'escala_empresa', nombre: 'Categorización de empresas por escala y complejidad', tipo: 'bono', bonoBase: 0.125,
    ayuda: 'Se suma por cada experiencia en una empresa grande (Tier 1) del diccionario de empresas del Perú; una startup de rápido crecimiento (Tier 1.5) suma el 75 %. Hasta 2 bonificaciones. Las demás quedan por determinar y no se penalizan.' },
];

/** Puestos de tecnología (mismo criterio que PUESTO_TEC en scraping/ranking.py): en ellos las herramientas pesan completo. */
export const PUESTO_TEC = /\b(?:datos|data|bi|business intelligence|analytics|sistemas|ti|tecnologias? de (?:la )?informacion|software|desarrollador|desarrolladora|programador|programadora|developer|soporte tecnico|infraestructura|ciberseguridad|devops|cloud|redes|informatica)\b/;
