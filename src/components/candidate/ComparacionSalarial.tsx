import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { supabase } from '../../services/supabase.ts';
import { esSuperadmin, usePerfil } from '../../services/permisos.ts';
import { cargarSueldoOfertado, guardarSueldoOfertado, compararSueldo, formatearSueldo, sueldoValido } from '../../services/salarios.ts';
import type { Application, JobPosting } from '../../types/index.ts';
import { workflowJobId } from '../../services/sharedWorkflow.ts';
import { Semaforo, type ColorSemaforo } from '../common/Semaforo.tsx';

type Comparacion = ReturnType<typeof compararSueldo>;
const COLOR: Record<Comparacion, ColorSemaforo> = { dentro: 'verde', supera: 'rojo', pendiente: 'amarillo' };
const TEXTO: Record<Comparacion, string> = {
  dentro: 'Pretensión dentro del presupuesto', supera: 'Pretensión superior al presupuesto', pendiente: 'Comparación pendiente',
};
/** Avisa a la pestaña «Sueldo» que cambió la oferta de un aviso, para actualizar su semáforo. */
const eventosSueldo = new EventTarget();

/** Semáforo de la pestaña «Sueldo»: verde si lo pretendido es igual o menor que lo ofertado, rojo si es mayor y
 *  amarillo si falta alguno de los dos. */
export function SemaforoSueldo({ job, app }: { job: JobPosting; app: Application }) {
  const [oferta, setOferta] = useState<number | null | undefined>(undefined);   // undefined: consultando o sin acceso
  const aviso = workflowJobId(job);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let vigente = true;
    const cargar = () => cargarSueldoOfertado(client, aviso).then((m) => { if (vigente) setOferta(m); }, () => { if (vigente) setOferta(undefined); });
    void cargar();
    const alGuardar = (e: Event) => { if ((e as CustomEvent<string>).detail === aviso) void cargar(); };
    eventosSueldo.addEventListener('guardado', alGuardar);
    return () => { vigente = false; eventosSueldo.removeEventListener('guardado', alGuardar); };
  }, [aviso]);
  if (oferta === undefined) return null;
  const comparacion = compararSueldo(oferta, sueldoValido(app.expectedSalary) ? app.expectedSalary : null);
  return <Semaforo color={COLOR[comparacion]} texto={TEXTO[comparacion]} />;
}

export function ComparacionSalarial({ job, app }: { job: JobPosting; app: Application }) {
  const puedeEditar = esSuperadmin(usePerfil());
  const [oferta, setOferta] = useState<number | null>(null);
  const [borrador, setBorrador] = useState('');
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'guardando' | 'error'>('cargando');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    setEstado('cargando'); setError('');
    if (!supabase) { setEstado('error'); setError('Conecta la base de GTHC para consultar y guardar la oferta compartida.'); return; }
    cargarSueldoOfertado(supabase, workflowJobId(job)).then(monto => {
      if (!vigente) return;
      setOferta(monto); setBorrador(monto === null ? '' : String(monto)); setEstado('listo');
    }).catch(e => { if (vigente) { setError(e.message); setEstado('error'); } });
    return () => { vigente = false; };
  }, [job.id, intento]);
  const pretension = sueldoValido(app.expectedSalary) ? app.expectedSalary : null;
  const comparacion = estado === 'error' || estado === 'cargando' ? 'pendiente' : compararSueldo(oferta, pretension);
  const color = comparacion === 'dentro' ? 'var(--status-verified-text)' : comparacion === 'supera' ? 'var(--status-failed-text)' : 'var(--text-secondary)';
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !puedeEditar || estado === 'guardando') return;
    const monto = borrador.trim() === '' ? null : Number(borrador);
    if (monto !== null && !sueldoValido(monto)) { setError('Ingresa un monto mayor que cero, hasta S/ 1 000 000 y con dos decimales como máximo.'); return; }
    setEstado('guardando'); setError(''); setMensaje('');
    try {
      const guardado = await guardarSueldoOfertado(supabase, workflowJobId(job), monto);
      setOferta(guardado); setBorrador(guardado === null ? '' : String(guardado));
      setMensaje('Oferta guardada para este aviso.');
      eventosSueldo.dispatchEvent(new CustomEvent('guardado', { detail: workflowJobId(job) }));
    } catch (e) { setError((e as Error).message); }
    finally { setEstado('listo'); }
  };
  return <section aria-label="Comparación salarial" style={{ paddingBlock: '1rem', marginBlock: '1rem', borderBlock: '1px solid var(--border-subtle)' }}>
    <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
      Comparación salarial mensual
      {estado !== 'cargando' && estado !== 'error' && <Semaforo color={COLOR[comparacion]} texto={TEXTO[comparacion]} size={17} />}
    </h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '1rem', marginTop: '.75rem' }}>
      <div>
        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>Sueldo ofertado</p>
        <strong>{estado === 'cargando' ? 'Consultando…' : estado === 'error' ? 'No disponible' : formatearSueldo(oferta)}</strong>
      </div>
      <div>
        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>Sueldo pretendido</p>
        <strong style={{ color, fontVariantNumeric: 'tabular-nums' }}>{formatearSueldo(pretension)}</strong>
        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>{pretension === null ? 'Sin monto mensual en soles verificable en esta postulación.' : 'Declarado por el postulante en el archivo del aviso.'}</p>
      </div>
    </div>
    <p role="status" style={{ display: 'flex', gap: '.4rem', alignItems: 'center', marginTop: '.75rem', color, fontWeight: 600, fontSize: '.875rem' }}>
      {comparacion === 'dentro' ? <CheckCircle2 size={16} aria-hidden /> : comparacion === 'supera' ? <AlertCircle size={16} aria-hidden /> : null}
      {comparacion === 'dentro' ? 'Pretensión dentro del presupuesto' : comparacion === 'supera' ? 'Pretensión superior al presupuesto' : 'Comparación pendiente'}
    </p>
    {puedeEditar && estado !== 'cargando' && estado !== 'error' && <form onSubmit={guardar} style={{ marginTop: '1rem', display: 'flex', gap: '.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 210px' }}><Input label="Oferta mensual del aviso (S/)" type="number" min="0.01" max="1000000" step="0.01" style={{ fontSize: '1rem' }} value={borrador} onChange={e => { setBorrador(e.target.value); setMensaje(''); }} disabled={estado === 'guardando'} placeholder="No registrada" /></div>
      <Button type="submit" variant="secondary" disabled={estado === 'guardando'}>{estado === 'guardando' ? 'Guardando…' : 'Guardar oferta'}</Button>
    </form>}
    {error && <p role="alert" style={{ marginTop: '.75rem', fontSize: '.875rem', color: 'var(--status-failed-text)' }}>{error}</p>}
    {estado === 'error' && supabase && <Button variant="secondary" size="sm" onClick={() => setIntento(i => i + 1)}>Reintentar</Button>}
    {mensaje && <p role="status" style={{ marginTop: '.5rem', fontSize: '.875rem' }}>{mensaje}</p>}
  </section>;
}
