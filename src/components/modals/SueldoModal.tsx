import { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import type { JobPosting } from '../../types/index.ts';
import type { SueldoAviso } from '../../services/useSueldoAviso.ts';
import { sueldoValido, type ModoSueldo } from '../../services/salarios.ts';
import { esSuperadmin, usePerfil } from '../../services/permisos.ts';
import { avisoDeJob } from '../../services/pesosRequisitos.ts';
import { useRecalculo } from '../../services/useRecalculo.ts';
import { supabase } from '../../services/supabase.ts';
import { useApp } from '../../context/AppContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import '../../styles/sueldos.css';

const AYUDA_MODO: Record<ModoSueldo, string> = {
  estricto: 'Si el sueldo pretendido supera la oferta, el postulante se descarta: queda al final del ranking.',
  manejable: 'Si supera la oferta pero tiene puntaje alto (0,70 o más), se marca para negociar y no se descarta.',
};

/** Sueldo ofertado del aviso y criterio salarial. Como «Requisitos y pesos»: «Guardar» y luego «Recalcular puntaje»,
 *  porque en modo Estricto la oferta cambia el ranking. */
export function SueldoModal({ job, sueldo, onClose }: { job: JobPosting; sueldo: SueldoAviso; onClose: () => void }) {
  const { showToast } = useApp();
  const puedeEditar = esSuperadmin(usePerfil());
  const { criterio, cargando, guardando } = sueldo;
  const [monto, setMonto] = useState('');
  const [modo, setModo] = useState<ModoSueldo>('estricto');
  const [error, setError] = useState('');
  const { servidor, recalculo, recalculando, recalcular, sinCambios, revisarCambios } = useRecalculo(avisoDeJob(job), true);
  const montoGuardado = criterio?.monto ?? null;
  const modoGuardado = criterio?.modo ?? 'estricto';
  useEffect(() => { setMonto(montoGuardado === null ? '' : String(montoGuardado)); setModo(modoGuardado); }, [montoGuardado, modoGuardado]);
  const montoNuevo = monto.trim() === '' ? null : Number(monto);
  const cambios = montoNuevo !== montoGuardado || modo !== modoGuardado;

  const guardar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!puedeEditar || guardando || !criterio) return;
    if (montoNuevo !== null && !sueldoValido(montoNuevo)) { setError('Ingresa un monto mayor que cero, hasta S/ 1 000 000 y con dos decimales como máximo.'); return; }
    setError('');
    try {
      if (montoNuevo !== montoGuardado) await sueldo.guardarMonto(montoNuevo);
      if (modo !== modoGuardado && criterio.admiteModo) await sueldo.guardarModo(modo);
      showToast('Sueldo guardado. Pulsa «Recalcular puntaje» para aplicarlo al ranking.', 'success');
      void revisarCambios();
    } catch (err) { setError((err as Error).message); }
  };

  return <Modal isOpen onClose={() => { if (!guardando) onClose(); }} title="Sueldo" subtitle={`${job.code} · ${job.title}`} maxWidth="560px"
    footer={<>
      {puedeEditar && <Button variant="secondary" icon={<Save size={15} />} onClick={() => void guardar()}
        disabled={cargando || guardando || recalculando || !cambios || !criterio}>{guardando ? 'Guardando…' : 'Guardar'}</Button>}
      <Button variant="primary" icon={<RefreshCw size={15} />} onClick={() => void recalcular()}
        disabled={!supabase || cargando || guardando || cambios || sinCambios || servidor !== 'encendido' || recalculando}
        title={cambios ? 'Guarda los cambios antes de recalcular' : sinCambios ? 'No hay cambios desde el último recálculo: edita Requisitos y pesos, Criterios y pesos o Sueldo' : servidor === 'apagado' ? 'Servidor apagado: el recálculo corre en la laptop de GTH' : 'Recalcular el ranking con el sueldo guardado'}>
        {recalculo === 'pendiente' ? 'En cola…' : recalculo === 'en_curso' ? 'Calculando…' : 'Recalcular puntaje'}
      </Button>
    </>}>
    <form onSubmit={guardar} className="sueldo-simple">
      <Input label="Sueldo ofertado mensual (S/)" type="number" min="0.01" max="1000000" step="0.01" style={{ fontSize: '1rem' }}
        value={monto} onChange={e => { setMonto(e.target.value); setError(''); }} disabled={!puedeEditar || cargando || guardando}
        placeholder={cargando ? 'Consultando…' : 'No registrado'} />
      <div className="criterios-sueldo-control">
        <label htmlFor="modo-sueldo">Criterio salarial</label>
        <select id="modo-sueldo" className="focus-ring" value={modo} aria-describedby="modo-sueldo-ayuda"
          disabled={!puedeEditar || cargando || guardando || !criterio?.admiteModo} onChange={e => setModo(e.target.value as ModoSueldo)}>
          <option value="estricto">Estricto (predeterminado)</option>
          <option value="manejable">Manejable</option>
        </select>
        <small id="modo-sueldo-ayuda" className="sueldo-ayuda">{AYUDA_MODO[modo]}</small>
      </div>
      {!puedeEditar && <p className="sueldo-ayuda">Solo la superadministración puede cambiar el sueldo ofertado.</p>}
      {supabase && servidor === 'apagado' && <p role="status" className="sueldo-ayuda">Servidor apagado: el recálculo corre en la laptop de GTH y no está prendida.</p>}
      {sueldo.error && <div className="sueldo-error"><p role="alert">{sueldo.error}</p><Button variant="secondary" size="sm" onClick={() => void sueldo.recargar()}>Reintentar</Button></div>}
      {error && <p role="alert" className="sueldo-error">{error}</p>}
    </form>
  </Modal>;
}
