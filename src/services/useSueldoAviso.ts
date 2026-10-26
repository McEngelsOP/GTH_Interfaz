import { useCallback, useEffect, useRef, useState } from 'react';
import type { JobPosting } from '../types/index.ts';
import { supabase } from './supabase.ts';
import { workflowJobId } from './sharedWorkflow.ts';
import { cargarCriterioSalarial, guardarModoSueldo, guardarSueldoOfertado, type CriterioSalarial, type ModoSueldo } from './salarios.ts';

/** Una lectura por aviso para todos los indicadores, el selector de criterios y el detalle salarial. */
export function useSueldoAviso(job: JobPosting | null | undefined) {
  const aviso = job ? workflowJobId(job) : '';
  const [estado, setEstado] = useState<{ aviso: string; criterio: CriterioSalarial | null; cargando: boolean; error: string }>({ aviso: '', criterio: null, cargando: true, error: '' });
  const [guardando, setGuardando] = useState(false);
  const vigente = useRef(0);
  const escribiendo = useRef(false);
  const cargar = useCallback(async () => {
    const version = ++vigente.current;
    setEstado({ aviso, criterio: null, cargando: true, error: '' });
    try {
      if (!supabase) throw new Error('Conecta la base de GTHC para consultar y guardar la oferta compartida.');
      const criterio = await cargarCriterioSalarial(supabase, aviso);
      if (version === vigente.current) setEstado({ aviso, criterio, cargando: false, error: '' });
    } catch (e) {
      if (version === vigente.current) setEstado({ aviso, criterio: null, cargando: false, error: (e as Error).message });
    }
  }, [aviso]);
  useEffect(() => {
    if (aviso) void cargar();
    return () => { vigente.current++; };
  }, [aviso, cargar]);

  const guardar = async (tipo: 'monto' | 'modo', valor: number | null | ModoSueldo) => {
    if (!supabase || escribiendo.current || estado.aviso !== aviso || !estado.criterio) throw new Error('Espera a que termine la consulta e inténtalo de nuevo.');
    escribiendo.current = true; setGuardando(true);
    const version = vigente.current;
    try {
      if (tipo === 'monto') {
        const monto = await guardarSueldoOfertado(supabase, aviso, valor as number | null);
        if (version === vigente.current) setEstado(s => ({ ...s, criterio: s.criterio && { ...s.criterio, monto } }));
      } else {
        const modo = await guardarModoSueldo(supabase, aviso, valor as ModoSueldo);
        if (version === vigente.current) setEstado(s => ({ ...s, criterio: s.criterio && { ...s.criterio, modo } }));
      }
    } finally { escribiendo.current = false; setGuardando(false); }
  };
  const coincide = estado.aviso === aviso;
  return {
    criterio: coincide ? estado.criterio : null, cargando: !coincide || estado.cargando,
    error: coincide ? estado.error : '', guardando, recargar: cargar,
    guardarMonto: (monto: number | null) => guardar('monto', monto),
    guardarModo: (modo: ModoSueldo) => guardar('modo', modo),
  };
}
export type SueldoAviso = ReturnType<typeof useSueldoAviso>;
