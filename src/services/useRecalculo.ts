import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { supabase } from './supabase.ts';
import { servidorEncendido } from './multitest.ts';
import {
  avisarRecalculado, encolarRecalculo, esperarRecalculo, hayCambiosSinRecalcular, ultimoRecalculo, type EstadoRecalculo,
} from './pesosRequisitos.ts';

/** «Recalcular puntaje» de un aviso (Requisitos y pesos, Criterios y pesos, Sueldo): estado del servidor de la laptop de
 *  GTH, pedido en cola y su avance. Mientras `activo`, revisa el servidor cada 30 s y retoma un recálculo en marcha.
 *  `sinCambios`: no hay ediciones guardadas en ninguno de los 3 apartados desde el último recálculo (el botón se apaga);
 *  los modales llaman a `revisarCambios` después de guardar. */
export function useRecalculo(aviso: string, activo: boolean) {
  const { showToast } = useApp();
  const [servidor, setServidor] = useState<'revisando' | 'encendido' | 'apagado'>('revisando');
  const [recalculo, setRecalculo] = useState<EstadoRecalculo | null>(null);   // pendiente / en curso mientras se espera
  const recalculando = recalculo === 'pendiente' || recalculo === 'en_curso';
  const [sinCambios, setSinCambios] = useState(false);
  const revisarCambios = async () => {
    if (!supabase) return;
    try { setSinCambios(!(await hayCambiosSinRecalcular(supabase, aviso))); } catch { setSinCambios(false); }   // ante la duda, se deja recalcular
  };

  const esperar = async (id: number) => {
    if (!supabase) return;
    setRecalculo('pendiente');
    try {
      const fin = await esperarRecalculo(supabase, id, setRecalculo);
      if (fin.estado === 'ok') {
        avisarRecalculado(aviso);
        showToast(fin.mensaje || 'Puntaje recalculado.', 'success');
      } else {
        showToast(fin.mensaje || 'No se pudo recalcular el puntaje.', 'error');
      }
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setRecalculo(null);
      void revisarCambios();
    }
  };

  useEffect(() => {
    if (!activo || !supabase) return;
    const client = supabase;
    let vigente = true;
    const revisar = () => servidorEncendido(client).then(
      (on) => { if (vigente) setServidor(on ? 'encendido' : 'apagado'); },
      () => { if (vigente) setServidor('apagado'); });
    revisar();
    void revisarCambios();
    const timer = window.setInterval(revisar, 30_000);
    ultimoRecalculo(client, aviso).then((r) => {
      if (vigente && r && (r.estado === 'pendiente' || r.estado === 'en_curso') && !recalculando) void esperar(r.id);
    }).catch(() => undefined);
    return () => { vigente = false; window.clearInterval(timer); };
  }, [activo, aviso]);

  // El servidor recalcula con lo guardado: requisitos, pesos, criterios y oferta del aviso.
  const recalcular = async () => {
    if (!supabase || recalculando) return;
    try {
      if (!(await servidorEncendido(supabase))) {
        setServidor('apagado');
        showToast('Servidor apagado: enciende la laptop de GTH con el servidor y vuelve a intentarlo.', 'error');
        return;
      }
      await esperar(await encolarRecalculo(supabase, aviso));
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return { servidor, recalculo, recalculando, recalcular, sinCambios, revisarCambios };
}
