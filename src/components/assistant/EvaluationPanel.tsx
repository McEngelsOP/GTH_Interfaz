import { useEffect, useRef, useState } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { EVALUATION_PREVIEW_PAGE_SIZE, validateEvaluationPayload } from '../../services/evaluationContract.ts';
import { evaluatePreparedProfile, evaluationSnapshot, prepareEvaluation, EvaluationError } from '../../services/evaluationService.ts';
import type { PreparedEvaluation } from '../../services/evaluationService.ts';
import { evaluationQueueOptions, LEGACY_QUEUE_OPTIONS, runEvaluationQueue } from '../../services/evaluationQueue.ts';
import { evaluationSummary } from '../../services/evaluationSummary.ts';
import '../../styles/evaluation.css';

type Row = { prepared:PreparedEvaluation; viewed:boolean; status:'ready'|'done'|'partial'|'error'|'review'; message:string };
export function EvaluationPanel() {
  const { appState, activeJob, activeJobApplications, selectedApplicationIds, handleApplyEvaluation, handleEvaluationIssue, handleUpdateEvaluationReference, openCandidateDrawer } = useApp();
  const stateRef = useRef(appState); stateRef.current = appState;
  const applyRef = useRef(handleApplyEvaluation); applyRef.current = handleApplyEvaluation;
  const issueRef = useRef(handleEvaluationIssue); issueRef.current = handleEvaluationIssue;
  const controller = useRef<AbortController | null>(null);
  const [open,setOpen] = useState(false), [rows,setRows] = useState<Row[]>([]), [busy,setBusy] = useState(false);
  const [configuration,setConfiguration] = useState<boolean | null>(null), [error,setError] = useState(''), [progress,setProgress] = useState('');
  const [queueOptions,setQueueOptions] = useState(LEGACY_QUEUE_OPTIONS);
  const [batchApproved,setBatchApproved] = useState(false), [pageIndex,setPageIndex] = useState(0);
  const [reference,setReference] = useState(activeJob?.evaluationReference || '');
  const [referenceError,setReferenceError] = useState('');
  useEffect(() => { setReference(activeJob?.evaluationReference || '');setReferenceError(''); },[activeJob?.id,activeJob?.evaluationReference]);
  const saveReference = () => { try {
    if (reference.trim()) validateEvaluationPayload({ requestId:crypto.randomUUID(),profile:[{label:'Puesto',text:'Perfil profesional'}],job:{title:'Puesto',reference,criteria:[{key:'criterion-1',label:'Experiencia',weightPct:100}]} });
    handleUpdateEvaluationReference(activeJob!.id,reference);setReferenceError('');
  } catch (e) {setReferenceError(e instanceof Error ? e.message : 'Revisa la referencia.');} };
  const [currentIds,setCurrentIds] = useState<string[]>([]);
  const stop = () => { controller.current?.abort(); controller.current = null; setBusy(false); setCurrentIds([]); };
  const close = () => { stop(); setBatchApproved(false); setOpen(false); };
  useEffect(() => { close(); return () => controller.current?.abort(); }, [activeJob?.id]);
  const pending = activeJobApplications.filter((app) => app.stage === 'postulado' && app.llmScore === null && !app.llmEvaluation && !app.evaluationIssue);
  const specialCases = activeJobApplications.filter((app) => app.stage === 'postulado' && app.evaluationIssue);
  const partials = activeJobApplications.filter((app) => app.stage === 'postulado' && app.llmScore === null && app.llmEvaluation);
  const selectedPending = pending.filter((app) => selectedApplicationIds.includes(app.id));
  const patch = (id:string, update:Partial<Row>) => setRows((rows) => rows.map((row) => row.prepared.applicationId === id ? { ...row,...update } : row));
  async function preview(onlySelected = false, retryId?: string, retryPartials = false) {
    setError(''); setProgress(''); setConfiguration(null); setBatchApproved(false); setPageIndex(0);
    const applications = retryId ? specialCases.filter((app) => app.id === retryId) : retryPartials ? partials : onlySelected ? selectedPending : pending;
    const result = applications.map((app):Row => ({ prepared:prepareEvaluation(stateRef.current,app.id), viewed:false, status:'ready', message:'' }));
    setRows(result); setOpen(true);
    const c = new AbortController(); controller.current = c;
    try {
      const response = await fetch('/api/evaluate',{ signal:AbortSignal.any([c.signal,AbortSignal.timeout(10_000)]), cache:'no-store' });
      const body = await response.json();
      if (!response.ok || typeof body.configured !== 'boolean') throw new Error('No se pudo comprobar el evaluador. Cierra la vista previa y vuelve a abrirla.');
      if (!c.signal.aborted) { setConfiguration(body.configured);setQueueOptions(evaluationQueueOptions(body)); }
    } catch (e) { if (!c.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudo comprobar el evaluador.'); }
  }
  async function run() {
    const queue = rows.filter((row) => row.prepared.payload && !row.prepared.privacy.issues.length && ['ready','error'].includes(row.status));
    if (!queue.length || busy || !configuration || !batchApproved) return;
    controller.current?.abort(); const c = new AbortController(); controller.current = c;
    setBusy(true); setError('');
    let processed = 0, reviewed = 0;
    try {
      await runEvaluationQueue(queue,queueOptions,c.signal,async (row) => {
        const id = row.prepared.applicationId;
        setCurrentIds(ids => [...ids,id]);
        setProgress(`Procesando lote: ${processed + reviewed} de ${queue.length} finalizados…`);
        try {
          if (evaluationSnapshot(stateRef.current,id) !== row.prepared.snapshot) throw new EvaluationError('El perfil cambió. Prepara una nueva vista previa.', 'PROFILE_CHANGED', 422);
          const result = await evaluatePreparedProfile(row.prepared,c.signal);
          if (c.signal.aborted) return;
          try { applyRef.current(row.prepared,result.reply,result.hash); }
          catch (e) { throw new EvaluationError(e instanceof Error ? e.message : 'La respuesta requiere revisión.', 'INVALID_RESPONSE', 422); }
          const missing = result.reply.criteria.flatMap((item,index) => item.score === null ? [row.prepared.payload!.job.criteria[index].label] : []);
          patch(id,{ status:result.reply.llmScore === null ? 'partial' : 'done',
            message:result.reply.llmScore === null ? `Evaluación recibida: falta evidencia para ${missing.join('; ')}. El puntaje parcial se muestra en la tabla; el total requiere completar estos criterios.` : `Puntaje LLM: ${result.reply.llmScore}. Falta revisar el requisito si aún no está verificado.` });
          processed++;
        } catch (e) {
          if (c.signal.aborted) return;
          const message = e instanceof Error ? e.message : 'No se pudo evaluar el perfil.';
          if (e instanceof EvaluationError && e.isProfileIssue) {
            issueRef.current(id,e);
            patch(id,{ status:'review', message:`Caso especial: ${message}` });
            reviewed++;
            return;
          }
          patch(id,{ status:'error', message }); throw e;
        } finally {
          setCurrentIds(ids => ids.filter(current => current !== id));
        }
      },(row,waitMs) => {
        patch(row.prepared.applicationId,{status:'ready',message:'Espera por cuota; reintento automático.'});
        setProgress(`Esperando ${Math.ceil(waitMs / 1000)} segundos por cuota. El lote continuará automáticamente…`);
      });
      if (!c.signal.aborted) setProgress(`Lote completado: ${completed + processed} resultados recibidos · ${rows.filter((row) => row.status === 'review').length + reviewed} casos especiales. Revisa las evidencias y los requisitos antes de elegir Top-N.`);
    } catch (e) {
      if (!c.signal.aborted) { setProgress('Lote detenido.');setError(`${e instanceof Error ? e.message : 'No se pudo evaluar el lote.'} El lote se detuvo. Los resultados anteriores se conservaron; reintenta los pendientes.`); }
    }
    finally { if (controller.current === c) { setBusy(false); setCurrentIds([]); if (c.signal.aborted) setProgress(`Lote pausado. ${processed} resultados recibidos en esta ejecución.`); } }
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
  const reviewed = rows.filter((row) => row.status === 'review').length;
  const pages = Math.ceil(rows.length / EVALUATION_PREVIEW_PAGE_SIZE);
  const first = pageIndex * EVALUATION_PREVIEW_PAGE_SIZE;
  const visibleRows = rows.slice(first,first + EVALUATION_PREVIEW_PAGE_SIZE);
  return <>
    <div className="evaluation-panel">
      <div><strong><ShieldCheck size={18} /> Evaluación automática · perfiles pendientes</strong><p>Una sola autorización para evaluar los perfiles pendientes de esta convocatoria. Se depura la información profesional antes de enviarla a Gemini.</p>
        <p>{activeJob?.bumeran ? 'El ranking de embeddings de Bumeran es independiente. Esta evaluación LLM solo se ejecuta cuando el equipo la inicia y autoriza.' : 'Los puntajes son apoyo a la revisión humana. Los originales y resultados permanecen en este navegador.'}</p></div>
      <div className="evaluation-actions"><Button icon={<Sparkles size={16}/>} disabled={!pending.length} onClick={() => void preview()}>Evaluar todos los pendientes</Button>
        {selectedApplicationIds.length > 0 && <Button size="sm" disabled={!selectedPending.length} onClick={() => void preview(true)}>Evaluar seleccionados</Button>}</div>
    </div>
    {partials.length > 0 && <details className="evaluation-special-cases">
      <summary>Evaluaciones recibidas · evidencia incompleta ({partials.length})</summary>
      <p className="evaluation-muted">Los puntajes por criterio están guardados y pueden usarse para marcar perfiles en Top-N para revisión y compararlos. El parcial considera solo la evidencia disponible; revisa su cobertura. Completa la referencia del puesto o la información profesional para obtener el total antes de avanzar.</p>
      {partials.map(app => { const summary = evaluationSummary(app,activeJob!.criteria); return <article className="evaluation-row" key={app.id}>
        <strong>{appState.candidates.find(candidate => candidate.id === app.candidateId)?.name}</strong>
        <p className="evaluation-muted">{summary.partialScore === null ? 'Sin evidencia puntuable' : `Puntaje parcial: ${summary.partialScore}/100 · Cobertura: ${summary.coverage}%`}. Sin puntaje en: {summary.missingLabels.join('; ')}.</p>
        <Button size="sm" onClick={() => openCandidateDrawer(app)} disabled={open}>Ver criterios y evidencias</Button>
      </article>; })}
      <Button size="sm" onClick={() => void preview(false,undefined,true)} disabled={open}>Reevaluar perfiles incompletos</Button>
    </details>}
    {specialCases.length > 0 && <details className="evaluation-special-cases">
      <summary>Casos especiales · revisión de información ({specialCases.length})</summary>
      <p className="evaluation-muted">Estos perfiles se apartaron de la cola automática. Revisa el motivo y reintenta cada caso cuando corresponda. El fallo no implica que el candidato incumpla los requisitos.</p>
      {specialCases.map((app) => <article className="evaluation-row" key={app.id}>
        <strong>{appState.candidates.find((candidate) => candidate.id === app.candidateId)?.name}</strong>
        <p className="evaluation-review">{app.evaluationIssue!.message}</p>
        <p className="evaluation-muted">Intentos con incidencia: {app.evaluationIssue!.attempts} · Último: {new Date(app.evaluationIssue!.lastAttemptAt).toLocaleString('es-PE')}</p>
        <div className="evaluation-actions">
          <Button size="sm" onClick={() => openCandidateDrawer(app)} disabled={open}>Revisar perfil</Button>
          <Button size="sm" onClick={() => void preview(false,app.id)} disabled={open}>Reintentar evaluación</Button>
        </div>
      </article>)}
    </details>}
    <details className="evaluation-reference"><summary>Referencia del puesto o syllabus</summary>
      <p className="evaluation-muted">Describe los requisitos profesionales, tecnologías y contenidos que se compararán. Si falta el syllabus o la referencia de un criterio, su puntaje queda pendiente. Excluye información personal de este texto.</p>
      <textarea aria-label="Referencia del puesto o syllabus" rows={5} maxLength={8000} value={reference} onChange={(e) => setReference(e.target.value)} />
      <Button size="sm" onClick={saveReference} disabled={reference.trim() === (activeJob?.evaluationReference || '')}>Guardar referencia</Button>
      {referenceError && <p role="alert" className="evaluation-error">{referenceError}</p>}
    </details>
    <Modal isOpen={open} onClose={close} title="Evaluar perfiles pendientes" maxWidth="850px" subtitle={`${activeJob?.code} · ${rows.length} perfiles · Autorización única`}
      footer={<><Button onClick={close} size="sm">Cerrar</Button>{busy ? <Button onClick={() => { controller.current?.abort(); }} size="sm">Pausar lote</Button>
        : <Button variant="primary" size="sm" onClick={run} disabled={!ready || !configuration || !batchApproved}>Evaluar {ready} {ready === 1 ? 'perfil' : 'perfiles'}</Button>}</>}>
      <div className="evaluation-notice">Se enviarán a Google Gemini los campos profesionales seleccionados y depurados, junto con los criterios del puesto. Puedes revisar la vista previa u omitir campos antes de iniciar. La depuración reduce la exposición, pero no garantiza anonimato. El requisito obligatorio sigue siendo una revisión del equipo.</div>
      <p className="evaluation-muted">{configuration === null ? 'Comprobando conexión del evaluador…' : configuration ? `Clave Gemini configurada. Hasta ${queueOptions.concurrency} perfiles simultáneos, con ${queueOptions.intervalMs / 1000} segundos entre inicios. Las esperas por cuota se reintentan automáticamente.` : 'Falta GEMINI_API_KEY. Configúrala en Vercel y vuelve a desplegar.'}</p>
      <div className="evaluation-batch-summary" aria-label="Resumen del lote"><strong>{rows.length} perfiles preparados</strong><span>{ready} pendientes listos · {blocked} requieren revisión · {completed} resultados recibidos · {reviewed} casos especiales</span></div>
      <label className="evaluation-consent evaluation-batch-consent"><input type="checkbox" checked={batchApproved} disabled={busy || !ready || !configuration}
        onChange={(e) => setBatchApproved(e.target.checked)}/> Confirmo que tengo autorización para procesar estos perfiles reales y enviar la información profesional depurada a Google Gemini.</label>
      <p className="evaluation-muted">Se evaluarán todos los perfiles listos, incluidos los de otras páginas. Los que requieren revisión se omiten. Una respuesta inválida se aparta como caso especial y el lote continúa. Mantén esta pestaña abierta; puedes pausar y continuar sin repetir los resultados recibidos.</p>
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
        {currentIds.includes(row.prepared.applicationId) && busy && <p className="evaluation-muted">En evaluación…</p>}
        {row.message && <p className={row.status === 'error' ? 'evaluation-error' : row.status === 'review' ? 'evaluation-review' : 'evaluation-progress'}>{row.message}</p>}
      </article>)}
    </Modal>
  </>;
}

