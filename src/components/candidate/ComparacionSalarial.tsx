import { useEffect, useState } from 'react';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { esSuperadmin, usePerfil } from '../../services/permisos.ts';
import { evaluarAjusteSalarial, formatearSueldo, sueldoValido } from '../../services/salarios.ts';
import type { SueldoAviso } from '../../services/useSueldoAviso.ts';
import type { Application, JobPosting } from '../../types/index.ts';
import { IndicadorSueldo } from './IndicadorSueldo.tsx';

export function ComparacionSalarial({ job, app, sueldo }: { job: JobPosting; app?: Application; sueldo: SueldoAviso }) {
  const puedeEditar = esSuperadmin(usePerfil());
  const { criterio, cargando, guardando, error: errorCarga } = sueldo;
  const [borrador, setBorrador] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const oferta = criterio?.monto ?? null;
  useEffect(() => { setBorrador(oferta === null ? '' : String(oferta)); }, [oferta]);
  const pretension = sueldoValido(app?.expectedSalary) ? app.expectedSalary : null;
  const comparacion = app ? evaluarAjusteSalarial(criterio, app, job) : 'pendiente';
  const diferencia = oferta !== null && pretension !== null ? pretension - oferta : null;
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!puedeEditar || guardando) return;
    const monto = borrador.trim() === '' ? null : Number(borrador);
    if (monto !== null && !sueldoValido(monto)) { setError('Ingresa un monto mayor que cero, hasta S/ 1 000 000 y con dos decimales como máximo.'); return; }
    setError(''); setMensaje('');
    try { await sueldo.guardarMonto(monto); setMensaje('Oferta guardada para este aviso.'); }
    catch (e) { setError((e as Error).message); }
  };
  return <section aria-label="Comparación salarial" className="sueldo-panel">
    <h3>Comparación salarial mensual</h3>
    <dl className="sueldo-importes">
      <div><dt>Sueldo ofertado</dt><dd>{cargando ? 'Consultando…' : errorCarga ? 'No disponible' : formatearSueldo(oferta)}</dd></div>
      <div><dt>Sueldo pretendido</dt><dd className={`sueldo-${comparacion}`}>{formatearSueldo(pretension)}</dd>
        <p>{!app ? 'Selecciona una postulación para comparar.' : pretension === null ? 'Sin monto mensual en soles verificable en esta postulación.' : 'Declarado por el postulante en el archivo del aviso.'}</p>
      </div>
    </dl>
    <div role="status" className="sueldo-resultado">
      {cargando ? <span>Consultando la oferta…</span> : <IndicadorSueldo estado={comparacion} />}
      {diferencia !== null && !errorCarga && <span className="sueldo-diferencia">
        {diferencia === 0 ? 'Coincide con la oferta.' : diferencia > 0
          ? `${formatearSueldo(diferencia)} por encima (+${(diferencia / oferta! * 100).toFixed(1)}%).`
          : `${formatearSueldo(-diferencia)} por debajo de la oferta.`}
      </span>}
    </div>
    {comparacion === 'manejable' && <p className="sueldo-ayuda">Perfil con similitud alta (puntaje vigente de 0,70 o más). Revisar la diferencia y negociar antes de aprobar el sueldo.</p>}
    {criterio && <p className="sueldo-ayuda">Criterio guardado: <strong>{criterio.modo === 'estricto' ? 'Estricto' : 'Manejable'}</strong>. Se configura en «Criterios y pesos».</p>}
    {puedeEditar && criterio && !cargando && <form onSubmit={guardar} className="sueldo-oferta-form">
      <Input label="Oferta mensual del aviso (S/)" type="number" min="0.01" max="1000000" step="0.01" style={{ fontSize: '1rem' }}
        value={borrador} onChange={e => { setBorrador(e.target.value); setMensaje(''); setError(''); }} disabled={guardando} placeholder="No registrada" />
      <Button type="submit" variant="secondary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar oferta'}</Button>
      <p className="sueldo-ayuda">Se aplica a todas las postulaciones de este aviso. Deja el campo vacío para retirar la oferta.</p>
    </form>}
    {errorCarga && <div className="sueldo-error"><p role="alert">{errorCarga}</p><Button variant="secondary" size="sm" onClick={() => void sueldo.recargar()}>Reintentar</Button></div>}
    {error && <p role="alert" className="sueldo-error">{error}</p>}
    {mensaje && <p role="status" className="sueldo-ayuda">{mensaje}</p>}
  </section>;
}
