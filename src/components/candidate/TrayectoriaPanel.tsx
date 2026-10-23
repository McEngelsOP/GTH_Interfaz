import { useEffect, useState } from 'react';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { supabase } from '../../services/supabase.ts';
import { cargarDetalleTrayectoria, cargarRevisionesTrayectoria, ESTADOS_TRAYECTORIA, ETIQUETAS_REVISION, guardarRevisionTrayectoria, useTrayectoria,
  type DetalleTrayectoria, type RevisionTrayectoria, type RevisionRegistrada } from '../../services/trayectoria.ts';
import '../../styles/trayectoria.css';

export function TrayectoriaPanel({ aviso, postulante }: { aviso?: string; postulante?: string }) {
  const ctx = useTrayectoria();
  const row = ctx.aviso === aviso && postulante ? ctx.rows[postulante] : undefined;
  const [loaded, setLoaded] = useState<{ id: string; detalle: DetalleTrayectoria; revisiones: RevisionRegistrada[] } | null>(null);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState<RevisionTrayectoria>('justificado');
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [savedId, setSavedId] = useState('');
  const vigente = row && !['pendiente','desactualizado'].includes(row.estado);
  const detalle = vigente && loaded?.id === row?.analisis_id ? loaded?.detalle : null;
  useEffect(() => {
    let alive = true;
    setLoaded(null); setError(''); setTexto('');
    if (!supabase || !row?.analisis_id || !vigente) return;
    const id = row.analisis_id;
    Promise.all([cargarDetalleTrayectoria(supabase, id), cargarRevisionesTrayectoria(supabase, id)])
      .then(([detalle, revisiones]) => { if (alive) setLoaded({ id, detalle, revisiones }); })
      .catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [row?.analisis_id, vigente]);
  const save = async () => {
    if (!supabase || !row?.analisis_id || !vigente) return;
    setSaving(true); setError('');
    try {
      await guardarRevisionTrayectoria(supabase, row.analisis_id, estado, texto);
      setSavedId(row.analisis_id); setSaved('Revisión guardada para esta versión de la información.'); setTexto(''); ctx.refresh();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  return <section className="trayectoria-panel" aria-label="Trayectoria laboral">
    <h3>Trayectoria laboral</h3>
    {!aviso || !supabase ? <p>La revisión compartida se realiza sobre los perfiles sincronizados de Bumeran. Este perfil todavía no tiene un análisis compartido.</p>
      : <>
        <div className="trayectoria-heading">
          <Badge size="sm" variant={row?.estado === 'patron_detectado' ? 'warning' : 'neutral'}>
            {ctx.loading ? 'Consultando trayectoria…' : ctx.error ? 'Trayectoria no disponible' : ESTADOS_TRAYECTORIA[row?.estado || 'pendiente']}
          </Badge>
          <Button size="sm" variant="ghost" onClick={ctx.refresh} disabled={ctx.loading || saving}>Actualizar trayectoria</Button>
        </div>
        {ctx.error && <p role="alert">{ctx.error}</p>}
        {!ctx.loading && !ctx.error && (!row || row.estado === 'pendiente' || row.estado === 'desactualizado') &&
          <p>El resultado estará disponible cuando el proceso de actualización analice la información laboral vigente.</p>}
        {vigente && !detalle && !error && <p role="status">Cargando evidencia…</p>}
        {detalle && <>
          <p><strong>Criterio:</strong> al menos {detalle.parametros.transiciones} transiciones entre empleadores en un intervalo de {detalle.parametros.ventana_meses} meses, dentro de los últimos {detalle.parametros.horizonte_meses} meses. Fecha de análisis: {detalle.fecha_referencia}.</p>
          <p><strong>Resultado:</strong> {detalle.total_transiciones} transiciones acreditadas en los datos evaluables del horizonte.
            {!!detalle.total_transiciones_posibles && ` Otras ${detalle.total_transiciones_posibles} transiciones posibles requieren confirmar la modalidad.`}
            {detalle.estado === 'sin_patron' && ' No se alcanza el umbral de revisión.'}
            {detalle.estado === 'informacion_insuficiente' && ' La información pendiente impide concluir sobre el patrón.'}</p>
          {detalle.ventana && <p><strong>Ventana detectada: {detalle.ventana.inicio} a {detalle.ventana.fin}.</strong> Transiciones: {detalle.ventana.transiciones.map((t) => `Exp[${t.desde}] → Exp[${t.hasta}]`).join(' · ')}.</p>}
          {detalle.ventana_posible && <p><strong>Posibles cambios frecuentes: confirmar modalidad.</strong> Las fechas alcanzan el umbral entre {detalle.ventana_posible.inicio} y {detalle.ventana_posible.fin}; no se acredita un patrón de empleo dependiente.</p>}
          <p>Una transición requiere pasar de un empleador a otro. La salida del último empleo no suma otra transición. Este análisis no determina el motivo de salida ni modifica el puntaje.</p>
          {detalle.experiencias.map((e) => <details key={e.indice}>
            <summary>Exp[{e.indice}] · {e.puesto || 'Puesto no registrado'} · {e.empresa || 'Empresa no registrada'}</summary>
            <p>{e.fecha_inicio?.texto || e.inicio || 'Inicio no registrado en la fuente'} — {e.fecha_fin?.texto || e.fin || 'Fin no registrado en la fuente'}</p>
            {(e.fecha_inicio || e.fecha_fin) && <p>Valores originales: inicio «{e.inicio || '(vacío)'}»; fin «{e.fin || '(vacío)'}».
              {(e.fecha_inicio?.precision === 'mes' || e.fecha_fin?.precision === 'mes') && ' Las fechas mensuales se evalúan como intervalos; no se conoce el día exacto.'}</p>}
            <p><strong>{e.excluida ? 'Excluida del conteo' : 'Experiencia revisada'}:</strong> {e.motivo}.</p>
            {e.evidencia && <blockquote>{e.evidencia}</blockquote>}
          </details>)}
          {!!detalle.incidencias.length && <><h4>Información por aclarar</h4><ul>{detalle.incidencias.map((i) => <li key={i}>{i}</li>)}</ul></>}
          {!!detalle.notas?.length && <details><summary>Notas sobre la modalidad contractual</summary><ul>{detalle.notas.map((n) => <li key={n}>{n}</li>)}</ul></details>}
          <p>Fuente: campos laborales del CSV de Bumeran. Revisión registrada: {row?.revision ? ETIQUETAS_REVISION[row.revision] : 'pendiente'}.</p>
          {!!loaded?.revisiones.length && <details><summary>Últimas revisiones registradas</summary>
            {loaded.revisiones.map((r) => <div key={r.id}><p><strong>{ETIQUETAS_REVISION[r.estado]}</strong> · {new Date(r.creada_at).toLocaleString('es-PE')}</p><p>{r.texto}</p></div>)}
          </details>}
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <label htmlFor="trayectoria-revision">Registrar revisión</label>
            <select id="trayectoria-revision" value={estado} onChange={(e) => setEstado(e.target.value as RevisionTrayectoria)} disabled={saving}>
              <option value="justificado">Cambios justificados</option><option value="dato_incorrecto">Reportar dato incorrecto</option><option value="revisado">Revisado por GTH</option>
            </select>
            <label htmlFor="trayectoria-motivo">Motivo y evidencia revisada</label>
            <textarea id="trayectoria-motivo" value={texto} onChange={(e) => setTexto(e.target.value)} minLength={5} maxLength={2000} rows={3} required disabled={saving} />
            <Button type="submit" size="sm" disabled={saving || texto.trim().length < 5}>{saving ? 'Guardando…' : 'Guardar revisión'}</Button>
          </form>
        </>}
        {error && <p role="alert">{error}</p>}
        {saved && savedId === row?.analisis_id && <p role="status">{saved}</p>}
      </>}
  </section>;
}
