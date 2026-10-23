import { useEffect, useId, useRef, useState } from 'react';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { supabase } from '../../services/supabase.ts';
import { cargarDetalleTrayectoria, cargarRevisionesTrayectoria, ESTADOS_TRAYECTORIA, ETIQUETAS_REVISION, guardarRevisionTrayectoria, useTrayectoria,
  type DetalleTrayectoria, type RevisionTrayectoria, type RevisionRegistrada } from '../../services/trayectoria.ts';
import '../../styles/trayectoria.css';

function resumenBreve(detalle: DetalleTrayectoria) {
  if (detalle.ventana) return `Se detectaron ${detalle.ventana.transiciones.length} transiciones en un intervalo de ${detalle.parametros.ventana_meses} meses.`;
  if (detalle.ventana_posible) return 'Las fechas sugieren cambios frecuentes; falta confirmar la modalidad contractual.';
  if (detalle.estado === 'sin_patron') return 'No se alcanza el umbral con la información evaluable.';
  if (detalle.estado === 'no_aplica') return 'Las experiencias evaluadas están excluidas del conteo.';
  const primera = detalle.incidencias[0];
  const referencia = primera?.match(/^Exp\[(\d+)\]: (.+)$/);
  if (referencia) {
    const empresa = detalle.experiencias.find((e) => e.indice === Number(referencia[1]))?.empresa;
    const motivo = referencia[2];
    const ausente = motivo.match(/^fecha de (inicio|fin) no registrada en la fuente$/);
    if (ausente) return `Falta confirmar la fecha de ${ausente[1]}${empresa ? ` en ${empresa}` : ""}.`;
    return `${motivo.charAt(0).toLocaleUpperCase('es-PE')}${motivo.slice(1)}${empresa ? ` en ${empresa}` : ''}.`;
  }
  return 'Hay información pendiente que impide concluir. Consulta el análisis para ver qué falta.';
}

export function TrayectoriaPanel({ aviso, postulante }: { aviso?: string; postulante?: string }) {
  const ctx = useTrayectoria();
  const row = ctx.aviso === aviso && postulante ? ctx.rows[postulante] : undefined;
  const [loaded, setLoaded] = useState<{ id: string; detalle: DetalleTrayectoria; revisiones: RevisionRegistrada[] } | null>(null);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState<RevisionTrayectoria | ''>('');
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [analisisAbierto, setAnalisisAbierto] = useState(false);
  const [revisionAbierta, setRevisionAbierta] = useState(false);
  const analisisId = useId();
  const revisionId = useId();
  const abrirRevisionRef = useRef<HTMLButtonElement>(null);
  const vigente = row && !['pendiente','desactualizado'].includes(row.estado);
  const detalle = vigente && loaded?.id === row?.analisis_id ? loaded.detalle : null;
  useEffect(() => {
    let alive = true;
    setLoaded(null); setError(''); setTexto(''); setEstado('');
    setAnalisisAbierto(false); setRevisionAbierta(false);
    if (!supabase || !row?.analisis_id || !vigente) return;
    const id = row.analisis_id;
    Promise.all([cargarDetalleTrayectoria(supabase, id), cargarRevisionesTrayectoria(supabase, id)])
      .then(([detalle, revisiones]) => { if (alive) setLoaded({ id, detalle, revisiones }); })
      .catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [row?.analisis_id, vigente]);
  const cerrarRevision = () => {
    setRevisionAbierta(false); setTexto(''); setEstado('');
    abrirRevisionRef.current?.focus();
  };
  const save = async () => {
    if (!supabase || !row?.analisis_id || !vigente || !estado) return;
    const id = row.analisis_id;
    setSaving(true); setError('');
    try {
      await guardarRevisionTrayectoria(supabase, id, estado, texto);
      setSavedId(id); cerrarRevision(); ctx.refresh();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const confirmarCambios = detalle?.estado === 'patron_detectado' || !!detalle?.ventana_posible;
  const indices = new Set<number>();
  for (const ventana of [detalle?.ventana, detalle?.ventana_posible])
    for (const t of ventana?.transiciones || []) { indices.add(t.desde); indices.add(t.hasta); }
  for (const incidencia of detalle?.incidencias || [])
    for (const match of incidencia.matchAll(/Exp\[(\d+)\]/g)) indices.add(Number(match[1]));
  const evidencias = detalle?.experiencias.filter((e) => e.excluida || indices.has(e.indice)) || [];
  const sinModalidad = detalle?.notas?.filter((n) => n.includes('modalidad contractual no documentada')).length || 0;
  const otrasNotas = [...new Set((detalle?.notas || []).filter((n) => !n.includes('modalidad contractual no documentada')).map((n) => n.replace(/^Exp\[\d+\]: /, '')))];
  const etiqueta = row?.estado === 'patron_detectado' ? 'Revisar' : row?.estado === 'informacion_insuficiente' ? 'No concluyente' : ESTADOS_TRAYECTORIA[row?.estado || 'pendiente'];

  return <section className="trayectoria-panel" aria-label="Cambios entre empleadores">
    <div className="trayectoria-heading">
      <strong>Cambios entre empleadores</strong>
      {!!aviso && !!supabase && <Badge size="sm" variant={row?.estado === 'patron_detectado' ? 'warning' : 'neutral'}>
        {ctx.loading ? 'Consultando…' : ctx.error ? 'No disponible' : etiqueta}
      </Badge>}
    </div>
    {!aviso || !supabase ? <p>Este perfil todavía no tiene un análisis compartido.</p> : <>
      {ctx.error && <p role="alert">{ctx.error}</p>}
      {!ctx.loading && !ctx.error && (!row || row.estado === 'pendiente' || row.estado === 'desactualizado') &&
        <p>El resultado estará disponible cuando el proceso de actualización analice la información laboral vigente.</p>}
      {vigente && !detalle && !error && <p role="status">Cargando análisis…</p>}
      {detalle && <>
        <p className="trayectoria-resumen">{resumenBreve(detalle)}</p>
        <div className="trayectoria-actions">
          <Button type="button" size="sm" variant="ghost" aria-expanded={analisisAbierto} aria-controls={analisisId}
            onClick={() => setAnalisisAbierto((v) => !v)}>{analisisAbierto ? 'Ocultar análisis' : 'Ver análisis'}</Button>
          <Button type="button" size="sm" variant="secondary" ref={abrirRevisionRef} aria-expanded={revisionAbierta} aria-controls={revisionId}
            disabled={saving} onClick={() => { if (revisionAbierta) cerrarRevision(); else { setSavedId(''); setRevisionAbierta(true); } }}>Registrar revisión</Button>
        </div>
        {row?.revision && <p className="trayectoria-revision">Revisión registrada: {ETIQUETAS_REVISION[row.revision]}.</p>}
        <div id={analisisId} hidden={!analisisAbierto} className="trayectoria-detalle">
          <p><strong>Criterio:</strong> al menos {detalle.parametros.transiciones} transiciones entre empleadores en un intervalo de {detalle.parametros.ventana_meses} meses, dentro de los últimos {detalle.parametros.horizonte_meses} meses. Fecha de análisis: {detalle.fecha_referencia}.</p>
          <p><strong>Resultado:</strong> {detalle.total_transiciones} transiciones acreditadas en los datos evaluables del horizonte.
            {!!detalle.total_transiciones_posibles && ` Otras ${detalle.total_transiciones_posibles} transiciones posibles requieren confirmar la modalidad.`}</p>
          {detalle.ventana && <p><strong>Ventana detectada: {detalle.ventana.inicio} a {detalle.ventana.fin}.</strong> Transiciones: {detalle.ventana.transiciones.map((t) => `Exp[${t.desde}] → Exp[${t.hasta}]`).join(' · ')}.</p>}
          {detalle.ventana_posible && <p><strong>Posibles cambios frecuentes: confirmar modalidad.</strong> Las fechas alcanzan el umbral entre {detalle.ventana_posible.inicio} y {detalle.ventana_posible.fin}; no se acredita un patrón de empleo dependiente.</p>}
          <p>Se cuentan cambios entre empleadores; la salida del último empleo no suma una transición. El resultado no determina el motivo de salida ni modifica el puntaje.</p>
          {!!detalle.incidencias.length && <><h4>Información por aclarar</h4><ul>{detalle.incidencias.map((i) => <li key={i}>{i}</li>)}</ul></>}
          {!!evidencias.length && <>
            <h4>Experiencias vinculadas al análisis</h4>
            <ul className="trayectoria-evidencias">{evidencias.map((e) => <li key={e.indice}>
              <strong>Exp[{e.indice}] · {e.empresa || 'Empresa no registrada'}</strong>
              <p>{e.fecha_inicio?.texto || e.inicio || 'Inicio no registrado'} — {e.fecha_fin?.texto || e.fin || 'Fin no registrado'}</p>
              {e.excluida && <p>Excluida del conteo: {e.motivo}.</p>}
              <details><summary>Fechas originales de Exp[{e.indice}]</summary>
                <p>Inicio «{e.inicio || '(vacío)'}»; fin «{e.fin || '(vacío)'}».
                  {(e.fecha_inicio?.precision === 'mes' || e.fecha_fin?.precision === 'mes') && ' La fuente indica mes y año; se evalúa el intervalo sin inventar un día exacto.'}</p>
              </details>
            </li>)}</ul>
          </>}
          {(sinModalidad > 0 || otrasNotas.length > 0) && <>
            <h4>Modalidad contractual</h4>
            {sinModalidad > 0 && <p>La fuente no especifica la modalidad contractual de {sinModalidad} {sinModalidad === 1 ? 'experiencia' : 'experiencias'}. No se presume empleo dependiente.</p>}
            {otrasNotas.map((n) => <p key={n}>{n}.</p>)}
          </>}
          <p>Fuente: campos laborales del CSV de Bumeran.</p>
          {!!loaded?.revisiones.length && <details><summary>Últimas revisiones registradas</summary>
            {loaded.revisiones.map((r) => <div key={r.id}><p><strong>{ETIQUETAS_REVISION[r.estado]}</strong> · {new Date(r.creada_at).toLocaleString('es-PE')}</p><p>{r.texto}</p></div>)}
          </details>}
          <Button type="button" size="sm" variant="ghost" onClick={ctx.refresh} disabled={ctx.loading || saving}>Actualizar análisis</Button>
        </div>
        {revisionAbierta && <form id={revisionId} aria-label="Registrar revisión de trayectoria" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <label htmlFor={`${revisionId}-resultado`}>Resultado de la revisión</label>
          <select id={`${revisionId}-resultado`} value={estado} onChange={(e) => setEstado(e.target.value as RevisionTrayectoria | '')} required disabled={saving} autoFocus>
            <option value="" disabled>Selecciona el resultado</option>
            {confirmarCambios && <option value="justificado">Cambios justificados</option>}
            <option value="dato_incorrecto">Reportar dato incorrecto</option><option value="revisado">Revisado por GTH</option>
          </select>
          <label htmlFor={`${revisionId}-motivo`}>Motivo y evidencia revisada</label>
          <textarea id={`${revisionId}-motivo`} value={texto} onChange={(e) => setTexto(e.target.value)} minLength={5} maxLength={2000} rows={3} required disabled={saving} />
          <div className="trayectoria-actions">
            <Button type="submit" size="sm" disabled={saving || !estado || texto.trim().length < 5}>{saving ? 'Guardando…' : 'Guardar revisión'}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={cerrarRevision} disabled={saving}>Cancelar</Button>
          </div>
        </form>}
      </>}
      {!detalle && <Button type="button" size="sm" variant="ghost" onClick={ctx.refresh} disabled={ctx.loading || saving}>Actualizar análisis</Button>}
      {error && <p role="alert">{error}</p>}
      {savedId && savedId === row?.analisis_id && <p role="status">Revisión guardada.</p>}
    </>}
  </section>;
}
