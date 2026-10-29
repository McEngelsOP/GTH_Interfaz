import { useEffect, useState } from 'react';
import { Building2, RefreshCw, Save } from 'lucide-react';
import type { JobPosting } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { supabase } from '../../services/supabase.ts';
import { esSuperadmin, usePerfil } from '../../services/permisos.ts';
import { avisoDeJob } from '../../services/pesosRequisitos.ts';
import { useRecalculo } from '../../services/useRecalculo.ts';
import {
  cargarCriterios, CRITERIOS_BASE, guardarCriterios, intensidadDePuntos,
  limitarLinea, limitarPenalizacion, puntosDeBono, type CriteriosAviso,
} from '../../services/criteriosClasificacion.ts';
import { CRITERIOS_CLASIFICACION } from '../../config/criteriosClasificacion.ts';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { DiccionarioEmpresasModal } from '../common/DiccionarioEmpresas.tsx';

const campo: React.CSSProperties = {
  width: '64px', padding: '0.25rem 0.4rem', fontSize: '0.875rem', fontWeight: 700, textAlign: 'center',
  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
};
const etiqueta: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' };

/** Campo numérico que muestra una conversión de la intensidad guardada (puntos del score o % del peso): mientras se
 *  escribe conserva el texto y al salir muestra el valor convertido que quedó. */
function CampoConvertido({ valor, decimales, min, max, step, disabled, label, onCambio }: {
  valor: number; decimales: number; min: number; max: number; step: number; disabled: boolean; label: string; onCambio: (v: number) => void;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  return <input type="number" min={min} max={max} step={step} disabled={disabled} aria-label={label}
    className="focus-ring tabular-nums" style={{ ...campo, width: decimales > 2 ? '84px' : campo.width }} value={texto ?? valor.toFixed(decimales)}
    onChange={(e) => { setTexto(e.target.value); const v = parseFloat(e.target.value); if (Number.isFinite(v)) onCambio(v); }}
    onBlur={() => setTexto(null)} />;
}

/** Matriz de clasificación de GTHC y la penalización por alta rotación. Rubro y Categorización se muestran como lo que
 *  suman al score de la tabla por experiencia (igual en todos los avisos); Sobrecalificación va de 0 a 100 (50 = peso
 *  actual de los requisitos de herramientas). Se guarda la intensidad 0-100. Igual que «Requisitos y pesos»: «Guardar» los deja para el
 *  equipo y «Recalcular puntaje» pide al servidor de GTH que rehaga el ranking con ellos. */
export function CriteriosPesosModal({ job, onClose }: { job: JobPosting; onClose: () => void }) {
  const { showToast } = useApp();
  const puedeEditar = esSuperadmin(usePerfil());
  const aviso = avisoDeJob(job);
  const [inicial, setInicial] = useState<CriteriosAviso>(CRITERIOS_BASE);
  const [valores, setValores] = useState<CriteriosAviso>(CRITERIOS_BASE);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const { servidor, recalculo, recalculando, recalcular, sinCambios, revisarCambios } = useRecalculo(aviso, true);
  const [diccionario, setDiccionario] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargando(true); setError('');
    (supabase ? cargarCriterios(supabase, aviso) : Promise.resolve({ criterios: CRITERIOS_BASE, guardados: false }))
      .then((r) => { if (vigente) { setInicial(r.criterios); setValores(r.criterios); } })
      .catch((e: Error) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [aviso]);

  const cambios = JSON.stringify(valores) !== JSON.stringify(inicial);
  const cambiar = (clave: keyof CriteriosAviso, valor: number) =>
    setValores((v) => ({ ...v, [clave]: clave === 'rotacion' ? limitarPenalizacion(valor) : limitarLinea(valor) }));

  const guardar = async () => {
    if (!supabase || !puedeEditar) return;
    setGuardando(true);
    try {
      await guardarCriterios(supabase, aviso, valores);
      setInicial(valores);
      showToast('Criterios guardados. Pulsa «Recalcular puntaje» para reordenar el ranking.', 'success');
      void revisarCambios();
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setGuardando(false);
    }
  };
  const tituloRecalcular = cambios ? 'Guarda los cambios antes de recalcular'
    : sinCambios ? 'No hay cambios desde el último recálculo: edita Requisitos y pesos, Criterios y pesos o Sueldo'
    : servidor === 'apagado' ? 'Servidor apagado: el recálculo corre en la laptop de GTH'
    : 'Recalcular el ranking con los criterios guardados';
  const bloqueado = !puedeEditar || cargando || guardando;

  return (
    <Modal isOpen onClose={onClose} title="Criterios y pesos" subtitle={`${job.code} · ${job.title}`} maxWidth="720px"
      footer={<>
        {puedeEditar && <Button variant="secondary" icon={<Save size={15} />} onClick={() => void guardar()}
          disabled={!supabase || cargando || guardando || recalculando || !cambios}>{guardando ? 'Guardando…' : 'Guardar'}</Button>}
        <Button variant="primary" icon={<RefreshCw size={15} />} onClick={() => void recalcular()}
          disabled={!supabase || cargando || guardando || cambios || sinCambios || servidor !== 'encendido' || recalculando} title={tituloRecalcular}>
          {recalculo === 'pendiente' ? 'En cola…' : recalculo === 'en_curso' ? 'Calculando…' : 'Recalcular puntaje'}
        </Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {supabase && servidor === 'apagado' && <p role="status" style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
          Servidor apagado: el recálculo corre en la laptop de GTH y no está prendida.
        </p>}
        {error && <p role="alert" style={{ color: 'var(--status-failed-text)', fontSize: '0.84rem' }}>{error}</p>}
        {cargando ? <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Cargando criterios…</p> : (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {CRITERIOS_CLASIFICACION.map((c) => (
              <li key={c.clave} style={{
                padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-base)', display: 'flex', flexDirection: 'column', gap: '0.45rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{c.nombre}</span>
                  {c.tipo === 'linea'
                    ? <input type="number" min={0} max={100} value={valores[c.clave]} disabled={bloqueado} aria-label={`Intensidad de ${c.nombre}`}
                        className="focus-ring tabular-nums" style={campo} onChange={(e) => cambiar(c.clave, parseInt(e.target.value, 10))} />
                    : c.tipo === 'bono'
                    ? <label style={etiqueta}>
                        Suma por experiencia
                        <CampoConvertido valor={puntosDeBono(valores[c.clave], c.bonoBase!)} decimales={3} min={0}
                          max={Number(puntosDeBono(100, c.bonoBase!).toFixed(3))} step={0.005} disabled={bloqueado}
                          label={`Bonificación por experiencia de ${c.nombre}`}
                          onCambio={(v) => cambiar(c.clave, intensidadDePuntos(v, c.bonoBase!))} />
                        en el score
                      </label>
                    : c.tipo === 'peso'
                    ? <label style={etiqueta}>
                        Peso del requisito
                        <input type="number" min={0} max={100} value={valores[c.clave]} disabled={bloqueado} aria-label={`Peso de ${c.nombre}`}
                          className="focus-ring tabular-nums" style={campo} onChange={(e) => cambiar(c.clave, parseInt(e.target.value, 10))} />
                      </label>
                    : <label style={etiqueta}>
                        Penalización
                        <input type="number" min={0} max={1} step={0.1} value={valores[c.clave]} disabled={bloqueado} aria-label={`Penalización por ${c.nombre}`}
                          className="focus-ring tabular-nums" style={campo} onChange={(e) => cambiar(c.clave, parseFloat(e.target.value))} />
                      </label>}
                </div>
                {c.tipo !== 'penalizacion' && <input type="range" min={0} max={100} value={valores[c.clave]} disabled={bloqueado}
                  aria-label={`Control de intensidad de ${c.nombre}`} onChange={(e) => cambiar(c.clave, parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--primary-red)', cursor: bloqueado ? 'default' : 'pointer' }} />}
                <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{c.ayuda}</small>
                {c.clave === 'escala_empresa' && <Button variant="ghost" size="sm" icon={<Building2 size={14} />}
                  style={{ alignSelf: 'flex-start' }} onClick={() => setDiccionario(true)}>Ver diccionario de empresas</Button>}
              </li>
            ))}
          </ol>
        )}
      </div>
      {diccionario && <DiccionarioEmpresasModal onClose={() => setDiccionario(false)} />}
    </Modal>
  );
}
