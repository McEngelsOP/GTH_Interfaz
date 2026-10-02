import { useEffect, useRef, useState } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { MAX_EVALUATION_BATCH, EVALUATION_INTERVAL_MS, validateEvaluationPayload } from '../../services/evaluationContract.ts';
import { evaluatePreparedProfile, evaluationSnapshot, prepareEvaluation } from '../../services/evaluationService.ts';
import type { PreparedEvaluation } from '../../services/evaluationService.ts';
import '../../styles/evaluation.css';

let lastEvaluationStart = 0;
type Row = { prepared:PreparedEvaluation; viewed:boolean; approved:boolean; status:'ready'|'done'|'partial'|'error'; message:string };
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
  const [reference,setReference] = useState(activeJob?.evaluationReference || '');
  const [referenceError,setReferenceError] = useState('');
  useEffect(() => { setReference(activeJob?.evaluationReference || '');setReferenceError(''); },[activeJob?.id,activeJob?.evaluationReference]);
  const saveReference = () => { try {
    if (reference.trim()) validateEvaluationPayload({ requestId:crypto.randomUUID(),profile:[{label:'Puesto',text:'Perfil de prueba'}],job:{title:'Puesto',reference,criteria:[{key:'criterion-1',label:'Experiencia',weightPct:100}]} });
    handleUpdateEvaluationReference(activeJob!.id,reference);setReferenceError('');
  } catch (e) {setReferenceError(e instanceof Error ? e.message : 'Revisa la referencia.');} };
  const [currentId,setCurrentId] = useState<string | null>(null);
  const stop = () => { controller.current?.abort(); controller.current = null; setBusy(false); setCurrentId(null); };
  const close = () => { stop(); setOpen(false); };
  useEffect(() => { close(); return () => controller.current?.abort(); }, [activeJob?.id]);
  const pending = activeJobApplications.filter((app) => app.stage === 'postulado' && app.llmScore === null);
  const chosen = selectedApplicationIds.length ? pending.filter((app) => selectedApplicationIds.includes(app.id)) : pending;
  const patch = (id:string, update:Partial<Row>) => setRows((rows) => rows.map((row) => row.prepared.applicationId === id ? { ...row,...update } : row));
  async function preview() {
    setError(''); setProgress(''); setConfiguration(null);
    const result = chosen.slice(0,MAX_EVALUATION_BATCH).map((app):Row => ({ prepared:prepareEvaluation(stateRef.current,app.id), viewed:false, approved:false, status:'ready', message:'' }));
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
    const queue = rows.filter((row) => row.approved && row.prepared.payload && !row.prepared.privacy.issues.length && ['ready','error'].includes(row.status));
    if (!queue.length || busy || !configuration) return;
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
          patch(id,{ status:result.reply.llmScore === null ? 'partial' : 'done', approved:false,
            message:result.reply.llmScore === null ? 'Evaluación recibida: falta evidencia para algunos criterios. Puntaje pendiente.' : `Puntaje LLM: ${result.reply.llmScore}. Falta revisar el requisito si aún no está verificado.` });
          processed++;
        } catch (e) {
          if (c.signal.aborted) break;
          failed = true; patch(id,{ status:'error', message:e instanceof Error ? e.message : 'No se pudo evaluar el perfil.' });
          setError('El lote se detuvo. Los resultados anteriores se conservaron; revisa el error y reintenta los pendientes.'); break;
        }
      }
      if (!c.signal.aborted && !failed) setProgress(`Lote completado: ${processed} perfiles. Revisa las evidencias y los requisitos antes de elegir Top-N.`);
    } catch { /* Pausa durante el intervalo. */ }
    finally { if (controller.current === c) { setBusy(false); setCurrentId(null); if (c.signal.aborted) setProgress(`Lote pausado. ${processed} resultados recibidos en esta ejecución.`); } }
  }
  function omit(id:string,index:number) {
    setRows((rows) => rows.map((row) => {
      if (row.prepared.applicationId !== id || !row.prepared.payload) return row;
      const fields = row.prepared.payload.profile.filter((_,i) => i !== index);
      let payload = null; const issues:string[] = [];
      try { payload = validateEvaluationPayload({ ...row.prepared.payload,profile:fields }); } catch { issues.push('No queda información profesional suficiente.'); }
      return { ...row, approved:false, prepared:{ ...row.prepared, payload,privacy:{ ...row.prepared.privacy, fields,issues } } };
    }));
  }
  const ready = rows.filter((row) => row.approved && row.prepared.payload && ['ready','error'].includes(row.status)).length;
  return <>
    <div className="evaluation-panel">
      <div><strong><ShieldCheck size={18} /> Evaluación LLM con vista previa</strong><p>Se excluyen datos de identidad y contacto. Revisa el contenido profesional antes de compartirlo con Google Gemini.</p>
        <p>Los puntajes son apoyo a la revisión humana. Los originales y resultados permanecen en este navegador.</p></div>
      <Button icon={<Sparkles size={16}/>} disabled={!chosen.length} onClick={preview}>{selectedApplicationIds.length ? 'Evaluar seleccionados' : 'Evaluar pendientes'}</Button>
    </div>
    <details className="evaluation-reference"><summary>Referencia del puesto o syllabus</summary>
      <p className="evaluation-muted">Describe los requisitos profesionales, tecnologías y contenidos que se compararán. Si falta el syllabus o la referencia de un criterio, su puntaje queda pendiente. Excluye información personal de este texto.</p>
      <textarea aria-label="Referencia del puesto o syllabus" rows={5} maxLength={8000} value={reference} onChange={(e) => setReference(e.target.value)} />
      <Button size="sm" onClick={saveReference} disabled={reference.trim() === (activeJob?.evaluationReference || '')}>Guardar referencia</Button>
      {referenceError && <p role="alert" className="evaluation-error">{referenceError}</p>}
    </details>
    <Modal isOpen={open} onClose={close} title="Revisar perfiles antes de evaluar" maxWidth="850px" subtitle={`${activeJob?.code} · Hasta ${MAX_EVALUATION_BATCH} perfiles por lote`}
      footer={<><Button onClick={close} size="sm">Cerrar</Button>{busy ? <Button onClick={() => { controller.current?.abort(); }} size="sm">Pausar lote</Button>
        : <Button variant="primary" size="sm" onClick={run} disabled={!ready || !configuration}>Evaluar {ready} revisados</Button>}</>}>
      <div className="evaluation-notice">Solo viajan a Google los campos de la vista previa y los criterios. El filtro reduce la exposición y no garantiza anonimato. Revisa nombres o datos residuales; una trayectoria particular aún puede identificar a alguien. Omite cualquier campo que consideres sensible. El requisito obligatorio se verifica por el equipo.</div>
      <p className="evaluation-muted">{configuration === null ? 'Comprobando conexión del evaluador…' : configuration ? 'Clave Gemini configurada. Cada perfil se envía por separado, con al menos 12 segundos entre inicios.' : 'Falta GEMINI_API_KEY. Configúrala en Vercel y vuelve a desplegar.'}</p>
      {chosen.length > MAX_EVALUATION_BATCH && <p className="evaluation-muted">Se prepararon los primeros {MAX_EVALUATION_BATCH} pendientes. Al completar el lote puedes preparar el siguiente.</p>}
      {error && <p role="alert" className="evaluation-error">{error}</p>}
      {progress && <p role="status" className="evaluation-progress">{progress}</p>}
      <details className="evaluation-job"><summary>Criterios que recibirá Gemini</summary><pre>{JSON.stringify(rows.find((row) => row.prepared.payload)?.prepared.payload?.job || {},null,2)}</pre></details>
      {rows.map((row,index) => <article className="evaluation-row" key={row.prepared.applicationId}>
        <strong>{index + 1}. {row.prepared.candidateName}</strong><p className="evaluation-muted">{row.prepared.privacy.excludedFields} campos excluidos · {row.prepared.privacy.redactions} detecciones depuradas</p>
        {row.prepared.privacy.issues.map((issue) => <p className="evaluation-error" key={issue}>{issue}</p>)}
        <details onToggle={(e) => { if (e.currentTarget.open) patch(row.prepared.applicationId,{ viewed:true }); }}>
          <summary>Ver contenido depurado de {row.prepared.candidateName}</summary>
          {row.prepared.privacy.fields.map((field,i) => <div className="evaluation-field" key={i}><strong>{field.label}</strong><pre>{field.text}</pre>
            <Button size="sm" variant="ghost" onClick={() => omit(row.prepared.applicationId,i)} disabled={busy || !['ready','error'].includes(row.status)}>Omitir campo {i + 1}</Button></div>)}
        </details>
        <label className="evaluation-consent"><input type="checkbox" checked={row.approved} disabled={busy || !row.viewed || !row.prepared.payload || !['ready','error'].includes(row.status)}
          onChange={(e) => patch(row.prepared.applicationId,{ approved:e.target.checked })}/> Revisé la vista previa de {row.prepared.candidateName} y autorizo enviar este contenido depurado a Google Gemini.</label>
        {!row.viewed && <p className="evaluation-muted">Abre la vista previa para habilitar la autorización de este perfil.</p>}
        {currentId === row.prepared.applicationId && busy && <p className="evaluation-muted">En evaluación…</p>}
        {row.message && <p className={row.status === 'error' ? 'evaluation-error' : 'evaluation-progress'}>{row.message}</p>}
      </article>)}
    </Modal>
  </>;
}
