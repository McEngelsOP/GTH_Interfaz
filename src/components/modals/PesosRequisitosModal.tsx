import React, { useEffect, useMemo, useState } from 'react';
import { Info, Plus, Power, RefreshCw, Save, Trash2 } from 'lucide-react';
import type { JobPosting } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { supabase } from '../../services/supabase.ts';
import {
  agregarRequisito, alternarActivo, avisoDeJob, cambiarPeso, cargarRequisitos, guardarRequisitos, participacion, pesosValidos,
  requisitosDelJob, type RequisitoPeso,
} from '../../services/pesosRequisitos.ts';
import { useRecalculo } from '../../services/useRecalculo.ts';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';

interface Props { isOpen: boolean; onClose: () => void; job: JobPosting }

/** Requisitos del aviso con un peso de 0 a 100 cada uno. «Recalcular puntaje» pide al servidor de la laptop de GTH
 *  que recalcule el ranking con los requisitos y pesos guardados. */
export function PesosRequisitosModal({ isOpen, onClose, job }: Props) {
  const { showToast } = useApp();
  const aviso = avisoDeJob(job);
  const [inicial, setInicial] = useState<RequisitoPeso[]>([]);
  const [items, setItems] = useState<RequisitoPeso[]>([]);
  const [enBase, setEnBase] = useState<Set<string>>(new Set());
  const [quitados, setQuitados] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const { servidor, recalculo, recalculando, recalcular, sinCambios, revisarCambios } = useRecalculo(aviso, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    let vigente = true;
    setCargando(true); setError(''); setQuitados([]); setNuevo('');
    (supabase ? cargarRequisitos(supabase, aviso) : Promise.resolve([]))
      .then((guardados) => {
        if (!vigente) return;
        const lista = guardados.length ? guardados : requisitosDelJob(job);
        setInicial(lista); setItems(lista); setEnBase(new Set(guardados.map((r) => r.etiqueta)));
      })
      .catch(() => { if (vigente) setError('No se pudieron leer los pesos guardados. Revisa tu sesión y la conexión.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [isOpen, aviso]);

  const cambios = useMemo(() => quitados.length > 0 || JSON.stringify(items) !== JSON.stringify(inicial), [items, inicial, quitados]);
  const partes = participacion(items);
  const validos = pesosValidos(items);

  const añadir = () => {
    const lista = agregarRequisito(items, nuevo);
    if (!lista) { showToast(nuevo.trim() ? 'Ese requisito ya está en la lista.' : 'Escribe el requisito a añadir.', 'warning'); return; }
    const etiqueta = lista[lista.length - 1].etiqueta;
    setItems(lista); setNuevo(''); setQuitados((q) => q.filter((x) => x !== etiqueta));
  };

  const quitar = (i: number) => {
    const r = items[i];
    setItems(items.filter((_, k) => k !== i));
    if (enBase.has(r.etiqueta)) setQuitados((q) => [...q, r.etiqueta]);
  };

  const guardar = async () => {
    if (!supabase) return;
    setGuardando(true);
    try {
      await guardarRequisitos(supabase, aviso, items, quitados);
      setInicial(items); setEnBase(new Set(items.map((r) => r.etiqueta))); setQuitados([]);
      showToast('Pesos guardados. Pulsa «Recalcular puntaje» para reordenar el ranking.', 'success');
      void revisarCambios();
    } catch {
      showToast('No se pudieron guardar los pesos. Revisa tu sesión y tu acceso a este aviso.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const tituloRecalcular = cambios ? 'Guarda los cambios antes de recalcular'
    : enBase.size === 0 ? 'Aún no hay pesos guardados para este aviso'
    : sinCambios ? 'No hay cambios desde el último recálculo: edita Requisitos y pesos, Criterios y pesos o Sueldo'
    : servidor === 'apagado' ? 'Servidor apagado: el recálculo corre en la laptop de GTH'
    : 'Recalcular el ranking con los requisitos y pesos guardados';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Requisitos y pesos"
      subtitle={`${job.code} · ${job.title}`}
      maxWidth="720px"
      footer={
        <>
          <Button variant="secondary" icon={<Save size={15} />} onClick={guardar}
            disabled={!supabase || cargando || guardando || recalculando || !cambios || !validos}
            title={validos ? undefined : 'Debe haber al menos un requisito activo con peso mayor que 0'}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button variant="primary" icon={<RefreshCw size={15} />} onClick={recalcular}
            disabled={!supabase || cargando || guardando || cambios || enBase.size === 0 || sinCambios || servidor !== 'encendido' || recalculando}
            title={tituloRecalcular}>
            {recalculo === 'pendiente' ? 'En cola…' : recalculo === 'en_curso' ? 'Calculando…' : 'Recalcular puntaje'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem 0.9rem', fontSize: '0.8125rem', lineHeight: 1.45,
          backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
        }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--text-muted)' }} />
          <span>
            Cada requisito tiene un peso de 0 a 100: cuanto más alto, más importa en el puntaje. Añadir, quitar o desactivar
            uno no cambia los demás. <strong>Guardar</strong> deja los pesos para todo el equipo; <strong>Recalcular puntaje</strong> recalcula
            el ranking de este aviso con ellos en el servidor de la laptop de GTH.
          </span>
        </div>

        {supabase && servidor === 'apagado' && <p role="status" style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
          Servidor apagado: el recálculo corre en la laptop de GTH y no está prendida.
        </p>}

        {!supabase && <p role="alert" style={{ color: 'var(--status-failed-text)', fontSize: '0.84rem' }}>
          Esta instalación no está conectada a Supabase: los pesos no se pueden guardar.
        </p>}
        {error && <p role="alert" style={{ color: 'var(--status-failed-text)', fontSize: '0.84rem' }}>{error}</p>}
        {!cargando && !validos && <p role="alert" style={{ color: 'var(--status-failed-text)', fontSize: '0.84rem' }}>
          Debe haber al menos un requisito activo con peso mayor que 0.
        </p>}

        {cargando ? <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Cargando requisitos…</p> : (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {items.map((r, i) => (
              <li key={r.etiqueta} style={{
                padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-base)', opacity: r.activo ? 1 : 0.6, display: 'flex', flexDirection: 'column', gap: '0.45rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                    R{i + 1}. {r.etiqueta}{' '}
                    {r.origen === 'manual' && <Badge size="sm" variant="info">Añadido</Badge>}
                    {!r.activo && <Badge size="sm" variant="neutral">Desactivado</Badge>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                    <input type="number" min={0} max={100} value={r.peso} disabled={!r.activo}
                      aria-label={`Peso de ${r.etiqueta}`} className="focus-ring tabular-nums"
                      onChange={(e) => setItems(cambiarPeso(items, i, parseInt(e.target.value, 10)))}
                      style={{
                        width: '56px', padding: '0.25rem 0.4rem', fontSize: '0.875rem', fontWeight: 700, textAlign: 'center',
                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
                      }} />
                    <Button variant="ghost" size="sm" icon={<Power size={14} />}
                      onClick={() => setItems(alternarActivo(items, i))}
                      title={r.activo ? 'Desactivar: deja de contar en el puntaje' : 'Activar de nuevo'}>
                      {r.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                    {r.origen === 'manual' && (
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />}
                        onClick={() => quitar(i)} aria-label={`Quitar ${r.etiqueta}`} title="Quitar este requisito añadido" />
                    )}
                  </div>
                </div>
                <input type="range" min={0} max={100} value={r.peso} disabled={!r.activo}
                  aria-label={`Control de peso de ${r.etiqueta}`}
                  onChange={(e) => setItems(cambiarPeso(items, i, parseInt(e.target.value, 10)))}
                  style={{ width: '100%', accentColor: 'var(--primary-red)', cursor: r.activo ? 'pointer' : 'default' }} />
                {r.activo && (
                  <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Representa el {partes[i]}% del puntaje
                    {r.origen === 'manual' && !enBase.has(r.etiqueta) && ' (cuenta desde que se guarde y se recalcule)'}
                  </small>
                )}
              </li>
            ))}
          </ol>
        )}

        <form onSubmit={(e) => { e.preventDefault(); añadir(); }} style={{ display: 'flex', gap: '0.5rem' }}>
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} maxLength={500} disabled={cargando}
            placeholder="Nuevo requisito para esta convocatoria (p. ej. experiencia en sector educativo)"
            aria-label="Nuevo requisito" className="focus-ring"
            style={{
              flex: 1, minWidth: 0, padding: '0.5rem 0.7rem', fontSize: '0.84rem', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
            }} />
          <Button type="submit" variant="secondary" size="sm" icon={<Plus size={15} />} disabled={cargando}>Añadir requisito</Button>
        </form>
      </div>
    </Modal>
  );
}
