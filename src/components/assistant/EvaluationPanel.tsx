import { useEffect, useRef, useState } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { EVALUATION_PREVIEW_PAGE_SIZE, EVALUATION_INTERVAL_MS, validateEvaluationPayload } from '../../services/evaluationContract.ts';
import { evaluatePreparedProfile, evaluationSnapshot, prepareEvaluation } from '../../services/evaluationService.ts';
import type { PreparedEvaluation } from '../../services/evaluationService.ts';
import '../../styles/evaluation.css';

let lastEvaluationStart = 0;
type Row = { prepared:PreparedEvaluation; viewed:boolean; status:'ready'|'done'|'partial'|'error'; message:string };
function delay(ms:number, signal:AbortSignal) {
  return new Promise<void>((resolve,reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelado','AbortError')); return; }
    const stop = () => { clearTimeout(timer); reject(new DOMException('Cancelado','AbortError')); };
    const timer = window.setTimeout(() => { signal.removeEventListener('abort',stop); resolve(); }, ms);
    signal.addEventListener('abort',stop,{ once:true });
  });
}
export function EvaluationPanel() {
  const { appState, activeJob, activeJobApplications, selectedApplicationIds, handleApplyEvaluation, handleUpdateEvaluationReference } = useApp();
  const stateRef = useRef(appState); stateRef.current = appState;
  const applyRef = useRef(handleApplyEvaluation); applyRef.current = handleApplyEvaluation;
  const controller = useRef<AbortController | null>(null);
  const [open,setOpen] = useState(false), [rows,setRows] = useState<Row[]>([]), [busy,setBusy] = useState(false);
  const [configuration,setConfiguration] = useState<boolean | null>(null), [error,setError] = useState(''), [progress,setProgress] = useState('');
  const [batchApproved,setBatchApproved] = useState(false), [pageIndex,setPageIndex] = useState(0);
  const [reference,setReference] = useState(activeJob?.evaluationReference || '');
  const [referenceError,setReferenceError] = useState('');
  useEffect(() => { setReference(activeJob?.evaluationReference || '');setReferenceError(''); },[activeJob?.id,activeJob?.evaluationReference]);
  const saveReference = () => { try {
    if (reference.trim()) validateEvaluationPayload({ requestId:crypto.randomUUID(),profile:[{label:'Puesto',text:'Perfil de prueba'}],job:{title:'Puesto',reference,criteria:[{key:'criterion-1',label:'Experiencia',weightPct:100}]} });
    handleUpdateEvaluationReference(activeJob!.id,reference);setReferenceError('');
  } catch (e) {setReferenceError(e instanceof Error ? e.message : 'Revisa la referencia.');} };
  const [currentId,setCurrentId] = useState<string | null>(null);
  const stop = () => { controller.current?.abort(); controller.current = null; setBusy(false); setCurrentId(null); };
  const close = () => { stop(); setBatchApproved(false); setOpen(false); };
  useEffect(() => { close(); return () => controller.current?.abort(); }, [activeJob?.id]);
  const pending = activeJobApplications.filter((app) => app.stage === 'postulado' && app.llmScore === null);
  const selectedPending = pending.filter((app) => selectedApplicationIds.includes(app.id));
  const patch = (id:string, update:Partial<Row>) => setRows((rows) => rows.map((row) => row.prepared.applicationId === id ? { ...row,...update } : row));
  async function preview(onlySelected = false) {
    setError(''); setProgress(''); setConfiguration(null); setBatchApproved(false); setPageIndex(0);
    const result = (onlySelected ? selectedPending : pending).map((app):Row => ({ prepared:prepareEvaluation(stateRef.current,app.id), viewed:false, status:'ready', message:'' }));
    setRows(result); setOpen(true);
    const c = new AbortController(); controller.current = c;
    try {
      const response = await fetch('/api/evaluate',{ signal:AbortSignal.any([c.signal,AbortSignal.timeout(10_000)]), cache:'no-store' });
      const body = await response.json();
      if (!response.ok || typeof body.configured !== 'boolean') throw new Error('No se pudo comprobar el evaluador. Cierra la vista previa y vuelve a abrirla.');
      if (!c.signal.aborted) setConfiguration(body.configured);
    } catch (e) { if (!c.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudo comprobar el evaluador.'); }
  }
  async function run() {
    const queue = rows.filter((row) => row.prepared.payload && !row.prepared.privacy.issues.length && ['ready','error'].includes(row.status));
    if (!queue.length || busy || !configuration || !batchApproved) return;
    controller.current?.abort(); const c = new AbortController(); controller.current = c;
    setBusy(true); setError('');
    let processed = 0, failed = false;
    try {
      for (const row of queue) {
        if (c.signal.aborted) break;
        const id = row.prepared.applicationId; setCurrentId(id);
        setProgress(`Procesando ${processed + 1} de ${queue.length}…`);
        try {
          const remaining = Math.max(0,EVALUATION_INTERVAL_MS - (Date.now() - lastEvaluationStart));
          if (remaining) { setProgress('Esperando antes del siguiente perfil…');await delay(remaining,c.signal); }
          setProgress(`Procesando ${processed + 1} de ${queue.length}…`);
          lastEvaluationStart = Date.now();
          if (evaluationSnapshot(stateRef.current,id) !== row.prepared.snapshot) throw new Error('El perfil cambió. Cierra y prepara una nueva vista previa.');
          const result = await evaluatePreparedProfile(row.prepared,c.signal);
          if (c.signal.aborted) break;
          applyRef.current(row.prepared,result.reply,result.hash);
          patch(id,{ status:result.reply.llmScore === null ? 'partial' : 'done',
            message:result.reply.llmScore === null ? 'Evaluación recibida: falta evidencia para algunos criterios. Puntaje pendiente.' : `Puntaje LLM: ${result.reply.llmScore}. Falta revisar el requisito si aún no está verificado.` });
          processed++;
        } catch (e) {
          if (c.signal.aborted) break;
          const message = e instanceof Error ? e.message : 'No se pudo evaluar el perfil.';
          failed = true; patch(id,{ status:'error', message });
          setProgress('Lote detenido.');
          setError(`${message} El lote se detuvo. Los resultados anteriores se conservaron; reintenta los pendientes.`); break;
        }
      }
      if (!c.signal.aborted && !failed) setProgress(`Lote completado: ${completed + processed} resultados recibidos. Revisa las evidencias y los requisitos antes de elegir Top-N.`);
    } catch { /* Pausa durante el intervalo. */ }
    finally { if (controller.current === c) { setBusy(false); setCurrentId(null); if (c.signal.aborted) setProgress(`Lote pausado. ${processed} resultados recibidos en esta ejecución.`); } }
  }
  function omit(id:string,index:number) {
    setBatchApproved(false);
    setRows((rows) => rows.map((row) => {
      if (row.prepared.applicationId !== id || !row.prepared.payload) return row;
      const fields = row.prepared.payload.profile.filter((_,i) => i !== index);
      let payload = null; const issues:string[] = [];
      try { payload = validateEvaluationPayload({ ...row.prepared.payload,profile:fields }); } catch { issues.push('No queda información profesional suficiente.'); }
      return { ...row, prepared:{ ...row.prepared, payload,privacy:{ ...row.prepared.privacy, fields,issues } } };
    }));
  }
  const ready = rows.filter((row) => row.prepared.payload && !row.prepared.privacy.issues.length && ['ready','error'].includes(row.status)).length;
  const blocked = rows.filter((row) => !row.prepared.payload || row.prepared.privacy.issues.length).length;
  const completed = rows.filter((row) => ['done','partial'].includes(row.status)).length;
  const pages = Math.ceil(rows.length / EVALUATION_PREVIEW_PAGE_SIZE);
  const first = pageIndex * EVALUATION_PREVIEW_PAGE_SIZE;
  const visibleRows = rows.slice(first,first + EVALUATION_PREVIEW_PAGE_SIZE);
  return <>
    <div className="evaluation-panel">
      <div><strong><ShieldCheck size={18} /> Evaluación automática · perfiles de prueba</strong><p>Una sola autorización para todos los pendientes. Se depuran los datos y Gemini evalúa cada criterio automáticamente.</p>
        <p>Los puntajes son apoyo a la revisión humana. Los originales y resultados permanecen en este navegador.</p></div>
      <div className="evaluation-actions"><Button icon={<Sparkles size={16}/>} disabled={!pending.length} onClick={() => void preview()}>Evaluar todos los pendientes</Button>
        {selectedApplicationIds.length > 0 && <Button size="sm" disabled={!selectedPending.length} onClick={() => void preview(true)}>Evaluar seleccionados</Button>}</div>
    </div>
    <details className="evaluation-reference"><summary>Referencia del puesto o syllabus</summary>
      <p className="evaluation-muted">Describe los requisitos profesionales, tecnologías y contenidos que se compararán. Si falta el syllabus o la referencia de un criterio, su puntaje queda pendiente. Excluye información personal de este texto.</p>
      <textarea aria-label="Referencia del puesto o syllabus" rows={5} maxLength={8000} value={reference} onChange={(e) => setReference(e.target.value)} />
      <Button size="sm" onClick={saveReference} disabled={reference.trim() === (activeJob?.evaluationReference || '')}>Guardar referencia</Button>
      {referenceError && <p role="alert" className="evaluation-error">{referenceError}</p>}
    </details>
    <Modal isOpen={open} onClose={close} title="Evaluar perfiles de prueba" maxWidth="850px" subtitle={`${activeJob?.code} · ${rows.length} perfiles · Autorización única`}
      footer={<><Button onClick={close} size="sm">Cerrar</Button>{busy ? <Button onClick={() => { controller.current?.abort(); }} size="sm">Pausar lote</Button>
        : <Button variant="primary" size="sm" onClick={run} disabled={!ready || !configuration || !batchApproved}>Evaluar {ready} {ready === 1 ? 'perfil' : 'perfiles'}</Button>}</>}>
      <div className="evaluation-notice">Modo de pruebas con perfiles creados por ti. Solo se envían a Google los campos profesionales depurados y los criterios. Puedes consultar la vista previa u omitir campos; no necesitas abrir cada perfil. La depuración reduce la exposición, pero no garantiza anonimato. El requisito obligatorio sigue siendo una revisión del equipo.</div>
      <p className="evaluation-muted">{configuration === null ? 'Comprobando conexión del evaluador…' : configuration ? 'Clave Gemini configurada. Cada perfil se envía por separado, con al menos 12 segundos entre inicios.' : 'Falta GEMINI_API_KEY. Configúrala en Vercel y vuelve a desplegar.'}</p>
      <div className="evaluation-batch-summary" aria-label="Resumen del lote"><strong>{rows.length} perfiles preparados</strong><span>{ready} pendientes listos · {blocked} requieren revisión · {completed} resultados recibidos</span></div>
      <label className="evaluation-consent evaluation-batch-consent"><input type="checkbox" checked={batchApproved} disabled={busy || !ready || !configuration}
        onChange={(e) => setBatchApproved(e.target.checked)}/> Ya revisé estos perfiles: son datos de prueba creados por mí y autorizo enviar todo el lote depurado a Google Gemini.</label>
      <p className="evaluation-muted">Se evaluarán todos los perfiles listos, incluidos los de otras páginas. Los que requieren revisión se omiten. Mantén esta pestaña abierta; puedes pausar y continuar sin repetir los resultados recibidos.</p>
      {error && <p role="alert" className="evaluation-error">{error}</p>}
      {progress && <p role="status" className="evaluation-progress">{progress}</p>}
      <details className="evaluation-job"><summary>Criterios que recibirá Gemini</summary><pre>{JSON.stringify(rows.find((row) => row.prepared.payload)?.prepared.payload?.job || {},null,2)}</pre></details>
      {pages > 1 && <nav className="evaluation-pagination" aria-label="Páginas de la vista previa">
        <Button size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex((page) => page - 1)}>Anterior</Button>
        <span>Página {pageIndex + 1} de {pages} · Perfiles {first + 1}–{Math.min(first + EVALUATION_PREVIEW_PAGE_SIZE,rows.length)}</span>
        <Button size="sm" disabled={pageIndex + 1 >= pages} onClick={() => setPageIndex((page) => page + 1)}>Siguiente</Button>
      </nav>}
      {visibleRows.map((row,index) => <article className="evaluation-row" key={row.prepared.applicationId}>
        <strong>{first + index + 1}. {row.prepared.candidateName}</strong><p className="evaluation-muted">{row.prepared.privacy.excludedFields} campos excluidos · {row.prepared.privacy.redactions} detecciones depuradas</p>
        {row.prepared.privacy.issues.map((issue) => <p className="evaluation-error" key={issue}>{issue}</p>)}
        <details open={row.viewed} onToggle={(e) => { const viewed = e.currentTarget.open; if (viewed !== row.viewed) patch(row.prepared.applicationId,{ viewed }); }}>
          <summary>Ver contenido depurado de {row.prepared.candidateName}</summary>
          {row.viewed && row.prepared.privacy.fields.map((field,i) => <div className="evaluation-field" key={i}><strong>{field.label}</strong><pre>{field.text}</pre>
            <Button size="sm" variant="ghost" onClick={() => omit(row.prepared.applicationId,i)} disabled={busy || !['ready','error'].includes(row.status)}>Omitir campo {i + 1}</Button></div>)}
        </details>
        {currentId === row.prepared.applicationId && busy && <p className="evaluation-muted">En evaluación…</p>}
        {row.message && <p className={row.status === 'error' ? 'evaluation-error' : 'evaluation-progress'}>{row.message}</p>}
      </article>)}
    </Modal>
  </>;
}
