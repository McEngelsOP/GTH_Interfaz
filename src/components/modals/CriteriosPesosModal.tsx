import { useEffect, useState } from 'react';
import type { JobPosting } from '../../types/index.ts';
import type { SueldoAviso } from '../../services/useSueldoAviso.ts';
import type { ModoSueldo } from '../../services/salarios.ts';
import { esSuperadmin, usePerfil } from '../../services/permisos.ts';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { CRITERIOS_CLASIFICACION } from '../../config/criteriosClasificacion.ts';
import '../../styles/sueldos.css';

export function CriteriosPesosModal({ job, sueldo, onClose }: {
  job: JobPosting; sueldo: SueldoAviso; onClose: () => void;
}) {
  const puedeEditar = esSuperadmin(usePerfil());
  const [modo, setModo] = useState<ModoSueldo>(sueldo.criterio?.modo ?? 'estricto');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const guardado = sueldo.criterio?.modo;
  useEffect(() => { if (guardado) setModo(guardado); }, [guardado]);
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeEditar || sueldo.guardando || !sueldo.criterio?.admiteModo) return;
    setError(''); setMensaje('');
    try { await sueldo.guardarModo(modo); setMensaje('Criterio guardado para este aviso.'); }
    catch (e) { setError((e as Error).message); }
  };
  return <Modal isOpen onClose={onClose} title="Criterios y pesos" subtitle={`${job.code} · ${job.title}`} maxWidth="620px"
    footer={<><Button variant="ghost" onClick={onClose} disabled={sueldo.guardando}>Cerrar</Button>
      {puedeEditar && <Button type="submit" form="criterio-sueldo-form" variant="primary"
        disabled={sueldo.cargando || sueldo.guardando || !sueldo.criterio?.admiteModo || modo === guardado}>
        {sueldo.guardando ? 'Guardando…' : 'Guardar criterio'}</Button>}</>}>
    <form id="criterio-sueldo-form" onSubmit={guardar} className="criterios-sueldo-form">
      <ul className="criterios-clasificacion" aria-label="Criterios de clasificación">
        {CRITERIOS_CLASIFICACION.map(nombre => <li key={nombre}>{nombre}</li>)}
      </ul>
      <div className="criterios-sueldo-control criterio-sueldo-fila">
        <label htmlFor="modo-sueldo">Sueldo</label>
        <select id="modo-sueldo" className="focus-ring" value={modo}
          title={!puedeEditar ? 'Solo la superadministradora puede cambiar el criterio salarial' : undefined}
          disabled={!puedeEditar || sueldo.cargando || sueldo.guardando || !sueldo.criterio?.admiteModo}
          onChange={e => { setModo(e.target.value as ModoSueldo); setError(''); setMensaje(''); }}>
          <option value="estricto">Estricto (predeterminado)</option>
          <option value="manejable">Manejable</option>
        </select>
      </div>
      {sueldo.cargando && <p role="status" className="sueldo-ayuda">Consultando el criterio guardado…</p>}
      {sueldo.criterio && !sueldo.criterio.admiteModo && <p role="alert" className="sueldo-error">Falta aplicar la migración de criterios salariales en GTHC. Mientras tanto se usa Estricto.</p>}
      {sueldo.error && <div className="sueldo-error"><p role="alert">{sueldo.error}</p><Button variant="secondary" size="sm" onClick={() => void sueldo.recargar()}>Reintentar</Button></div>}
      {error && <p role="alert" className="sueldo-error">{error}</p>}
      {mensaje && <p role="status" className="sueldo-ayuda">{mensaje}</p>}
    </form>
  </Modal>;
}
