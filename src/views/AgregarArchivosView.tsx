import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Users, ArrowRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { ActiveJobBanner } from '../components/layout/ActiveJobBanner.tsx';
import { Button } from '../components/common/Button.tsx';
import { analyzeCandidateTables, ImportAnalysis, ImportSummary, planCandidateImport, readCandidateFile } from '../services/candidateImport.ts';
import '../styles/import.css';

export function AgregarArchivosView() {
  const { activeJob, appState, handleImportCandidates, setCurrentView } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  useEffect(() => {
    request.current++; setAnalysis(null); setSummary(null); setFileErrors([]); setReading(false);
    return () => { request.current++; };
  }, [activeJob?.id]);
  const plan = useMemo(() => activeJob && analysis ? planCandidateImport(appState, activeJob, analysis.rows) : null, [appState, activeJob, analysis]);
  const issues = [...(analysis?.issues || []), ...(plan?.issues || [])];
  const errors = [...fileErrors, ...(analysis?.errors || [])];
  const changeCount = (plan?.summary.newApplications || 0) + (plan?.summary.updatedCandidates || 0);
  const readFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    const selectedFiles = Array.from(files);
    const ticket = ++request.current;
    setReading(true); setSummary(null); setAnalysis(null); setFileErrors([]);
    const result = await Promise.allSettled(selectedFiles.map(readCandidateFile));
    if (ticket !== request.current) return;
    const tables = result.flatMap((item) => item.status === 'fulfilled' ? item.value : []);
    setFileErrors(result.flatMap((item, index) => item.status === 'rejected' ? [`${selectedFiles[index].name}: ${item.reason instanceof Error ? item.reason.message : 'No se pudo leer el archivo.'}`] : []));
    setAnalysis(analyzeCandidateTables(tables)); setReading(false);
  };
  const clear = () => { request.current++; setAnalysis(null); setSummary(null); setFileErrors([]); setReading(false); };
  const confirm = () => {
    if (!analysis || !activeJob || !changeCount) return;
    try { setSummary(handleImportCandidates(activeJob.id, analysis.rows)); }
    catch (error) { setFileErrors([error instanceof Error ? error.message : 'No se pudo incorporar el lote.']); }
  };
  if (!activeJob) return null;
  return <div className="candidate-import animate-fade-in">
    <ActiveJobBanner />
    <header className="import-heading">
      <div className="import-heading-icon"><Upload size={25} /></div>
      <div><h1>Cargar CV</h1><p>Incorpora perfiles desde una exportación CSV o Excel a la convocatoria seleccionada.</p></div>
    </header>
    <section className="import-card">
      <div className="import-section-title"><FileSpreadsheet size={20} /><h2>Importar candidatos</h2></div>
      <p className="import-muted">Reconocemos columnas de contacto, experiencia y estudios, incluso cuando los encabezados empiezan después de las primeras filas.</p>
      <input ref={input} id="candidate-upload" aria-label="Archivo de candidatos" type="file" accept=".csv,.xlsx" multiple
        onChange={(event) => { if (event.target.files) void readFiles(event.target.files); event.target.value = ''; }} hidden />
      <button type="button" className={`import-dropzone${dragging ? ' is-dragging' : ''}`} disabled={reading || activeJob.status !== 'activa'}
        onClick={() => input.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (activeJob.status === 'activa') void readFiles(event.dataTransfer.files); }}>
        <Upload size={30} aria-hidden="true" /><strong>{reading ? 'Analizando archivos…' : 'Seleccionar CSV o Excel'}</strong>
        <span>También puedes arrastrar archivos aquí. Hasta 10 MB por archivo.</span>
      </button>
      {activeJob.status !== 'activa' && <p role="alert" className="import-warning">Selecciona una convocatoria activa para incorporar candidatos.</p>}
      <div className="import-notes"><p><strong>Una ficha por persona.</strong> Consolidamos coincidencias por documento, correo o ID de candidato. Una persona puede participar en distintas convocatorias.</p>
        <p><strong>Evaluación pendiente.</strong> La carga organiza la información del perfil. El puntaje LLM y la verificación de requisitos se registrarán después.</p>
        <p>Los archivos se procesan en tu navegador y los perfiles se guardan en este dispositivo. PDF, Word e imágenes requieren la integración de extracción documental.</p></div>
    </section>
    {errors.length > 0 && <section className="import-card import-error" role="alert"><div className="import-section-title"><AlertCircle size={19} /><h2>Archivos que necesitan revisión</h2></div>
      <ul>{errors.map((error, i) => <li key={i}>{error}</li>)}</ul></section>}
    {analysis && plan && <section className="import-card">
      <div className="import-section-title import-section-between"><div className="import-section-title"><Users size={20} /><h2>{summary ? 'Carga completada' : 'Revisar antes de incorporar'}</h2></div>
        <Button variant="ghost" size="sm" onClick={clear} icon={<X size={16} />}>Limpiar revisión</Button></div>
      <div className="import-file-list">{analysis.files.map((file, i) => <p key={i}><strong>{file.name}</strong>{file.sheet && ` · ${file.sheet}`} · Encabezado en fila {file.headerRow} · {file.count} registros</p>)}</div>
      <div className="import-stats" aria-live="polite">
        {Object.entries({ 'Candidatos nuevos': (summary || plan.summary).newCandidates, 'Postulaciones nuevas': (summary || plan.summary).newApplications,
          'Repetidos en el lote': (summary || plan.summary).duplicateRows, 'Ya vinculados': (summary || plan.summary).existingApplications,
          'Fichas actualizadas': (summary || plan.summary).updatedCandidates, 'Conflictos de identidad': (summary || plan.summary).conflicts }).map(([label, count]) =>
          <div key={label}><strong>{count}</strong><span>{label}</span></div>)}
      </div>
      {summary ? <div className="import-success" role="status"><CheckCircle2 size={21} /><div><strong>Perfiles incorporados a {activeJob.code}</strong><p>Los nuevos expedientes están pendientes de evaluación LLM y revisión de requisitos.</p></div></div> : <>
        {plan.preview.length > 0 && <div className="import-table-scroll"><table><caption>Vista previa de {Math.min(plan.preview.length, 10)} de {plan.preview.length} perfiles únicos</caption>
          <thead><tr><th>Candidato</th><th>Correo</th><th>Origen</th><th>Acción prevista</th></tr></thead><tbody>
            {plan.preview.slice(0, 10).map((candidate, i) => <tr key={i}><td>{candidate.name}</td><td>{candidate.email || 'No registrado'}</td><td>{candidate.source}</td><td>{candidate.action}</td></tr>)}
          </tbody></table></div>}
        {!analysis.rows.length && <p>No hay registros válidos para incorporar. Revisa los encabezados y los identificadores.</p>}
        {analysis.rows.length > 0 && !changeCount && <p>Los perfiles válidos de este lote ya están incorporados o necesitan revisión. No se crearán duplicados.</p>}
      </>}
      {issues.length > 0 && <details className="import-issues"><summary>Advertencias y registros para revisar ({issues.length})</summary><ul>
        {issues.slice(0, 100).map((issue, i) => <li key={i}>{issue.fileName} · Fila {issue.row}: {issue.message}</li>)}
        {issues.length > 100 && <li>Hay {issues.length - 100} advertencias adicionales. Divide el lote para revisarlas.</li>}
      </ul></details>}
      <div className="import-actions">{summary ? <Button variant="primary" icon={<ArrowRight size={17} />} onClick={() => setCurrentView('mejores_candidatos')}>Ver candidatos</Button> :
        <Button variant="primary" icon={<CheckCircle2 size={17} />} disabled={!changeCount || activeJob.status !== 'activa' || reading} onClick={confirm}>Incorporar perfiles válidos</Button>}
        {!summary && <span className="import-muted">Los registros con conflictos de identidad se omiten para revisión.</span>}</div>
    </section>}
  </div>;
}
